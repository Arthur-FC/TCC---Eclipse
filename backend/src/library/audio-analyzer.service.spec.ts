import { AudioAnalyzerService } from './audio-analyzer.service';

function wavWithPulseAndTone(
  durationSeconds = 8,
  sampleRate = 11_025,
): Uint8Array {
  const sampleCount = durationSeconds * sampleRate;
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const write = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index++) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, dataSize, true);

  for (let index = 0; index < sampleCount; index++) {
    const time = index / sampleRate;
    const tone = 0.18 * Math.sin(2 * Math.PI * 261.63 * time);
    const beatPosition = time % 0.5;
    const pulse = beatPosition < 0.045
      ? 0.65 * (1 - beatPosition / 0.045) * Math.sin(2 * Math.PI * 90 * time)
      : 0;
    const sample = Math.max(-1, Math.min(1, tone + pulse));
    view.setInt16(44 + index * 2, Math.round(sample * 32_767), true);
  }
  return new Uint8Array(buffer);
}

describe('AudioAnalyzerService', () => {
  const analyzer = new AudioAnalyzerService();

  it('extracts local technical metadata and estimates musical attributes', async () => {
    const result = await analyzer.analyze(wavWithPulseAndTone(), 'audio/wav');

    expect(result.detectedFormat.toLocaleUpperCase()).toContain('WAV');
    expect(result.durationSeconds).toBeCloseTo(8, 1);
    expect(result.sampleRateHz).toBe(11_025);
    expect(result.channels).toBe(1);
    expect(result.estimatedBpm).not.toBeNull();
    expect(result.estimatedKey).not.toBeNull();
    expect(result.version).toBe('eclipse-audio-v1');
  });

  it('reports corrupted or incomplete audio', async () => {
    await expect(
      analyzer.analyze(Uint8Array.from({ length: 32 }, () => 0), 'audio/wav'),
    ).rejects.toThrow('corrompido');
  });

  it('explains when an MP4/AAC file was renamed to MP3', async () => {
    const disguisedMp4 = new Uint8Array(32);
    disguisedMp4.set([0x66, 0x74, 0x79, 0x70], 4);

    await expect(
      analyzer.analyze(disguisedMp4, 'audio/mpeg'),
    ).rejects.toThrow('MP4/AAC');
  });
});
