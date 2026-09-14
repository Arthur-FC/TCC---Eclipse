import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const python = process.platform === 'win32'
  ? join(root, '.venv-stems', 'Scripts', 'python.exe')
  : join(root, '.venv-stems', 'bin', 'python');
if (!existsSync(python)) throw new Error(`Python do worker não encontrado: ${python}`);
const runner = join(root, 'scripts', 'demucs_local_runner.py');

const directory = mkdtempSync(join(tmpdir(), 'eclipse-stems-smoke-'));
const input = join(directory, 'smoke.wav');
const mp3Input = join(directory, 'smoke-mp3.mp3');
const sampleRate = 44_100;
const seconds = 2;
const channels = 2;
const samples = sampleRate * seconds;
const dataSize = samples * channels * 2;
const wav = Buffer.alloc(44 + dataSize);
wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * 2, 28);
wav.writeUInt16LE(channels * 2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);
for (let index = 0; index < samples; index++) {
  const time = index / sampleRate;
  const sample = Math.round((Math.sin(2 * Math.PI * 220 * time) * 0.25 + Math.sin(2 * Math.PI * 440 * time) * 0.15) * 32767);
  wav.writeInt16LE(sample, 44 + index * 4);
  wav.writeInt16LE(sample, 46 + index * 4);
}
writeFileSync(input, wav);

try {
  const converted = spawnSync(python, [join(root, 'scripts', 'wav_to_mp3.py'), input, mp3Input], { encoding: 'utf8' });
  if (converted.status !== 0) throw new Error(converted.stderr || 'Não foi possível criar o MP3 de teste.');
  for (const source of [input, mp3Input]) {
    const result = spawnSync(python, [runner, '--two-stems', 'vocals', '-n', 'htdemucs', '-o', directory, source], {
      encoding: 'utf8',
      timeout: 600_000,
    });
    if (result.status !== 0) {
      throw new Error(result.stderr || result.stdout || result.error?.message || `Demucs falhou (status=${result.status}, signal=${result.signal}).`);
    }
    const output = join(directory, 'htdemucs', basename(source, source.endsWith('.wav') ? '.wav' : '.mp3'));
    const vocals = readFileSync(join(output, 'vocals.wav'));
    const instrumental = readFileSync(join(output, 'no_vocals.wav'));
    if (vocals.length <= 44 || instrumental.length <= 44) throw new Error('Os stems gerados estão vazios.');
    console.log(`${source.endsWith('.wav') ? 'WAV' : 'MP3'} concluído: vocals=${vocals.length} bytes instrumental=${instrumental.length} bytes`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
