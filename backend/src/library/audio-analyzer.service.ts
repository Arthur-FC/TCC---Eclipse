import { Injectable } from '@nestjs/common';
import type { IAudioMetadata } from 'music-metadata';

export const AUDIO_ANALYZER_VERSION = 'eclipse-audio-v1';
export const AUDIO_ANALYZER_METHOD =
  'music-metadata + PCM local (autocorrelação de onsets e perfil tonal)';

interface DecodedAudio {
  channelData: Float32Array[];
  sampleRate: number;
}

export interface AudioAnalysisResult {
  detectedFormat: string;
  codec: string | null;
  durationSeconds: number;
  sampleRateHz: number | null;
  channels: number | null;
  bitrateBps: number | null;
  estimatedBpm: number | null;
  bpmConfidence: number | null;
  estimatedKey: string | null;
  keyConfidence: number | null;
  genreTags: string[];
  moodTags: string[];
  instrumentTags: string[];
  version: string;
  method: string;
}

type EsmLoader = (specifier: string) => Promise<unknown>;
const loadEsm = new Function(
  'specifier',
  'return import(specifier)',
) as EsmLoader;

@Injectable()
export class AudioAnalyzerService {
  async analyze(
    bytes: Uint8Array,
    contentType: string,
  ): Promise<AudioAnalysisResult> {
    if (bytes.length < 16) {
      throw new Error('O arquivo é curto demais para conter um áudio válido.');
    }
    if (
      contentType === 'audio/mpeg' &&
      String.fromCharCode(...bytes.slice(4, 8)) === 'ftyp'
    ) {
      throw new Error(
        'O conteúdo é MP4/AAC, apesar da extensão MP3. Converta o arquivo para MP3 ou WAV.',
      );
    }

    const [{ parseBuffer }, decoderModule] = await Promise.all([
      loadEsm('music-metadata') as Promise<{
        parseBuffer: (
          data: Uint8Array,
          fileInfo: { mimeType: string; size: number },
          options: { duration: boolean; skipCovers: boolean },
        ) => Promise<IAudioMetadata>;
      }>,
      loadEsm('audio-decode') as Promise<{
        decodeChunked: (
          source: AsyncIterable<Uint8Array>,
          format: 'mp3' | 'wav',
        ) => AsyncGenerator<DecodedAudio>;
      }>,
    ]);

    let metadata: IAudioMetadata;
    let decoded: DecodedAudio;
    try {
      [metadata, decoded] = await Promise.all([
        parseBuffer(
          bytes,
          { mimeType: contentType, size: bytes.length },
          { duration: true, skipCovers: true },
        ),
        this.decodeLimited(
          decoderModule.decodeChunked,
          bytes,
          contentType === 'audio/mpeg' ? 'mp3' : 'wav',
        ),
      ]);
    } catch {
      throw new Error(
        'O áudio está corrompido ou usa uma codificação que não pôde ser lida.',
      );
    }

    if (!decoded.channelData.length || !decoded.channelData[0]?.length) {
      throw new Error('O arquivo não contém amostras de áudio decodificáveis.');
    }

    const mono = this.prepareMono(decoded);
    const tempo = this.estimateTempo(mono.samples, mono.sampleRate);
    const key = this.estimateKey(mono.samples, mono.sampleRate);
    const signal = this.signalCharacteristics(mono.samples);
    const duration =
      metadata.format.duration ??
      decoded.channelData[0].length / decoded.sampleRate;
    if (!Number.isFinite(duration) || duration <= 0) {
      throw new Error('Não foi possível determinar a duração do áudio.');
    }

    const embeddedBpm = metadata.common.bpm;
    const estimatedBpm = tempo.bpm ??
      (embeddedBpm && embeddedBpm > 0 ? embeddedBpm : null);
    const genreTags = this.cleanTags(metadata.common.genre ?? []);
    const moodTags = this.buildMoodTags(
      metadata.common.mood,
      estimatedBpm,
      key.key,
      signal.rms,
    );
    const instrumentTags = this.buildInstrumentTags(
      metadata.common['performer:instrument'] ?? [],
      signal.zeroCrossingRate,
      tempo.onsetStrength,
    );

    return {
      detectedFormat:
        metadata.format.container ??
        (contentType === 'audio/mpeg' ? 'MP3' : 'WAV'),
      codec: metadata.format.codec ?? null,
      durationSeconds: this.round(duration, 3),
      sampleRateHz: metadata.format.sampleRate ?? decoded.sampleRate ?? null,
      channels:
        metadata.format.numberOfChannels ?? decoded.channelData.length ?? null,
      bitrateBps: metadata.format.bitrate
        ? Math.round(metadata.format.bitrate)
        : null,
      estimatedBpm: estimatedBpm ? this.round(estimatedBpm, 1) : null,
      bpmConfidence: tempo.bpm
        ? this.round(tempo.confidence, 3)
        : embeddedBpm
          ? 0.5
          : null,
      estimatedKey: key.key,
      keyConfidence: key.key ? this.round(key.confidence, 3) : null,
      genreTags,
      moodTags,
      instrumentTags,
      version: AUDIO_ANALYZER_VERSION,
      method: AUDIO_ANALYZER_METHOD,
    };
  }

  private async decodeLimited(
    decodeChunked: (
      source: AsyncIterable<Uint8Array>,
      format: 'mp3' | 'wav',
    ) => AsyncGenerator<DecodedAudio>,
    bytes: Uint8Array,
    format: 'mp3' | 'wav',
  ): Promise<DecodedAudio> {
    const chunkSize = 256 * 1_024;
    async function* chunks(): AsyncGenerator<Uint8Array> {
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        yield bytes.slice(offset, Math.min(bytes.length, offset + chunkSize));
      }
    }

    const collected: Float32Array[][] = [];
    let sampleRate = 0;
    let sampleCount = 0;
    for await (const piece of decodeChunked(chunks(), format)) {
      if (!piece.channelData.length || !piece.channelData[0]?.length) continue;
      sampleRate ||= piece.sampleRate;
      const remaining = Math.max(0, Math.floor(sampleRate * 185) - sampleCount);
      if (remaining === 0) break;
      const take = Math.min(remaining, piece.channelData[0].length);
      for (let channel = 0; channel < piece.channelData.length; channel++) {
        collected[channel] ??= [];
        collected[channel].push(piece.channelData[channel].slice(0, take));
      }
      sampleCount += take;
      if (sampleCount >= sampleRate * 185) break;
    }
    if (!sampleRate || sampleCount === 0) {
      throw new Error('Nenhuma amostra de áudio foi decodificada.');
    }
    return {
      sampleRate,
      channelData: collected.map(channelChunks => {
        const channel = new Float32Array(sampleCount);
        let offset = 0;
        for (const chunk of channelChunks) {
          channel.set(chunk, offset);
          offset += chunk.length;
        }
        return channel;
      }),
    };
  }

  private prepareMono(decoded: DecodedAudio): {
    samples: Float32Array;
    sampleRate: number;
  } {
    const targetRate = Math.min(11_025, decoded.sampleRate);
    const stride = Math.max(1, Math.floor(decoded.sampleRate / targetRate));
    const sourceLength = decoded.channelData[0].length;
    const skip = Math.min(
      Math.floor(decoded.sampleRate * 5),
      Math.floor(sourceLength * 0.1),
    );
    const maxSourceLength = Math.min(
      sourceLength - skip,
      Math.floor(decoded.sampleRate * 180),
    );
    const result = new Float32Array(Math.ceil(maxSourceLength / stride));
    const channelCount = decoded.channelData.length;
    let outputIndex = 0;
    for (
      let sourceIndex = skip;
      sourceIndex < skip + maxSourceLength;
      sourceIndex += stride
    ) {
      let value = 0;
      for (const channel of decoded.channelData) {
        value += channel[sourceIndex] ?? 0;
      }
      result[outputIndex++] = value / channelCount;
    }
    if (result.length < 2_048) {
      throw new Error('O áudio é curto demais para a análise técnica.');
    }
    return { samples: result, sampleRate: decoded.sampleRate / stride };
  }

  private estimateTempo(
    samples: Float32Array,
    sampleRate: number,
  ): { bpm: number | null; confidence: number; onsetStrength: number } {
    const frameSize = 1_024;
    const hop = 512;
    const energies: number[] = [];
    for (let offset = 0; offset + frameSize <= samples.length; offset += hop) {
      let energy = 0;
      for (let index = 0; index < frameSize; index++) {
        const sample = samples[offset + index];
        energy += sample * sample;
      }
      energies.push(Math.sqrt(energy / frameSize));
    }
    if (energies.length < 24) {
      return { bpm: null, confidence: 0, onsetStrength: 0 };
    }

    const onsets = energies.map((energy, index) =>
      index === 0 ? 0 : Math.max(0, energy - energies[index - 1]),
    );
    const onsetMean = onsets.reduce((sum, value) => sum + value, 0) / onsets.length;
    const minLag = Math.max(1, Math.floor((60 * sampleRate) / (200 * hop)));
    const maxLag = Math.min(
      onsets.length - 2,
      Math.ceil((60 * sampleRate) / (55 * hop)),
    );
    const scores: Array<{ lag: number; score: number }> = [];
    for (let lag = minLag; lag <= maxLag; lag++) {
      let score = 0;
      for (let index = lag; index < onsets.length; index++) {
        score += onsets[index] * onsets[index - lag];
      }
      scores.push({ lag, score });
    }
    scores.sort((first, second) => second.score - first.score);
    const best = scores[0];
    if (!best || best.score <= 0 || onsetMean < 0.00005) {
      return { bpm: null, confidence: 0, onsetStrength: onsetMean };
    }
    let bpm = (60 * sampleRate) / (best.lag * hop);
    while (bpm < 70) bpm *= 2;
    while (bpm > 190) bpm /= 2;
    const competing = scores.find(
      candidate => Math.abs(candidate.lag - best.lag) > 1,
    )?.score ?? 0;
    const confidence = this.clamp((best.score - competing) / best.score, 0, 1);
    return { bpm, confidence, onsetStrength: onsetMean };
  }

  private estimateKey(
    samples: Float32Array,
    sampleRate: number,
  ): { key: string | null; confidence: number } {
    const frameSize = 4_096;
    const maxFrames = 72;
    const availableFrames = Math.floor(samples.length / frameSize);
    if (availableFrames < 2) return { key: null, confidence: 0 };
    const frameStep = Math.max(1, Math.floor(availableFrames / maxFrames));
    const chroma = new Array<number>(12).fill(0);
    let frames = 0;
    for (
      let frameIndex = 0;
      frameIndex < availableFrames && frames < maxFrames;
      frameIndex += frameStep
    ) {
      const offset = frameIndex * frameSize;
      for (let midi = 36; midi <= 83; midi++) {
        const frequency = 440 * 2 ** ((midi - 69) / 12);
        chroma[midi % 12] += this.goertzel(
          samples,
          offset,
          frameSize,
          sampleRate,
          frequency,
        );
      }
      frames++;
    }
    const total = chroma.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total) || total <= 1e-8) {
      return { key: null, confidence: 0 };
    }

    const majorProfile = [
      6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29,
      2.88,
    ];
    const minorProfile = [
      6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34,
      3.17,
    ];
    const notes = ['Dó', 'Dó♯', 'Ré', 'Mi♭', 'Mi', 'Fá', 'Fá♯', 'Sol', 'Lá♭', 'Lá', 'Si♭', 'Si'];
    const candidates: Array<{ key: string; score: number }> = [];
    for (let root = 0; root < 12; root++) {
      candidates.push({
        key: `${notes[root]} maior`,
        score: this.profileScore(chroma, majorProfile, root),
      });
      candidates.push({
        key: `${notes[root]} menor`,
        score: this.profileScore(chroma, minorProfile, root),
      });
    }
    candidates.sort((first, second) => second.score - first.score);
    const best = candidates[0];
    const second = candidates[1];
    return {
      key: best?.key ?? null,
      confidence: best
        ? this.clamp((best.score - (second?.score ?? 0)) / Math.abs(best.score), 0, 1)
        : 0,
    };
  }

  private goertzel(
    samples: Float32Array,
    offset: number,
    length: number,
    sampleRate: number,
    frequency: number,
  ): number {
    const coefficient = 2 * Math.cos((2 * Math.PI * frequency) / sampleRate);
    let previous = 0;
    let previousPrevious = 0;
    for (let index = 0; index < length; index++) {
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (length - 1));
      const current =
        (samples[offset + index] ?? 0) * window +
        coefficient * previous -
        previousPrevious;
      previousPrevious = previous;
      previous = current;
    }
    return Math.max(
      0,
      previousPrevious * previousPrevious +
        previous * previous -
        coefficient * previous * previousPrevious,
    );
  }

  private profileScore(
    chroma: number[],
    profile: number[],
    root: number,
  ): number {
    let dot = 0;
    let chromaNorm = 0;
    let profileNorm = 0;
    for (let index = 0; index < 12; index++) {
      const expected = profile[(index - root + 12) % 12];
      dot += chroma[index] * expected;
      chromaNorm += chroma[index] ** 2;
      profileNorm += expected ** 2;
    }
    return dot / Math.sqrt(chromaNorm * profileNorm);
  }

  private signalCharacteristics(samples: Float32Array): {
    rms: number;
    zeroCrossingRate: number;
  } {
    let energy = 0;
    let crossings = 0;
    for (let index = 0; index < samples.length; index++) {
      energy += samples[index] ** 2;
      if (
        index > 0 &&
        ((samples[index] >= 0 && samples[index - 1] < 0) ||
          (samples[index] < 0 && samples[index - 1] >= 0))
      ) {
        crossings++;
      }
    }
    return {
      rms: Math.sqrt(energy / samples.length),
      zeroCrossingRate: crossings / samples.length,
    };
  }

  private buildMoodTags(
    embeddedMood: string | undefined,
    bpm: number | null,
    key: string | null,
    rms: number,
  ): string[] {
    const tags = embeddedMood ? [embeddedMood] : [];
    if (bpm !== null) {
      if (bpm >= 125) tags.push('energético');
      else if (bpm < 85) tags.push('calmo');
      else tags.push('andamento moderado');
    }
    if (key?.endsWith('menor')) tags.push('introspectivo');
    if (key?.endsWith('maior')) tags.push('luminoso');
    if (rms < 0.08) tags.push('suave');
    if (rms > 0.25) tags.push('intenso');
    return this.cleanTags(tags);
  }

  private buildInstrumentTags(
    embedded: string[],
    zeroCrossingRate: number,
    onsetStrength: number,
  ): string[] {
    const tags = [...embedded];
    if (onsetStrength > 0.003) tags.push('presença percussiva estimada');
    if (zeroCrossingRate < 0.06) tags.push('predomínio harmônico estimado');
    if (zeroCrossingRate > 0.18) tags.push('textura brilhante estimada');
    return this.cleanTags(tags);
  }

  private cleanTags(tags: string[]): string[] {
    return [...new Set(tags.map(tag => tag.trim()).filter(Boolean))].slice(0, 12);
  }

  private clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }

  private round(value: number, decimals: number): number {
    const factor = 10 ** decimals;
    return Math.round(value * factor) / factor;
  }
}
