"""Executa o Demucs com leitura e gravação locais sem depender do FFmpeg."""

import sys
from pathlib import Path

import soundfile as sf
import miniaudio
import numpy as np
import torch
import torchaudio


def load_audio(path):
    try:
        audio, sample_rate = sf.read(path, dtype="float32", always_2d=True)
    except sf.LibsndfileError:
        decoded = miniaudio.decode_file(path, output_format=miniaudio.SampleFormat.FLOAT32)
        audio = np.asarray(decoded.samples, dtype=np.float32).reshape(-1, decoded.nchannels)
        sample_rate = decoded.sample_rate
    return torch.from_numpy(audio.T.copy()), sample_rate


def save_audio(path, waveform, sample_rate, encoding=None, bits_per_sample=16, **_kwargs):
    subtype = "FLOAT" if encoding == "PCM_F" else f"PCM_{bits_per_sample}"
    sf.write(path, waveform.detach().cpu().numpy().T, sample_rate, subtype=subtype)


torchaudio.load = load_audio
torchaudio.save = save_audio

from demucs.separate import main


def option_value(args, short_name, long_name, default):
    for index, value in enumerate(args[:-1]):
        if value in (short_name, long_name):
            return args[index + 1]
    return default


def create_instrumental_mix(args):
    output_root = Path(option_value(args, "-o", "--out", "separated"))
    model_name = option_value(args, "-n", "--name", "htdemucs_6s")
    source = Path(args[-1])
    stem_directory = output_root / model_name / source.stem
    source_files = sorted(path for path in stem_directory.glob("*.wav") if path.name != "vocals.wav")
    if not source_files:
        raise RuntimeError("O Demucs não gerou faixas instrumentais para combinar.")

    mix = None
    sample_rate = None
    for path in source_files:
        audio, current_rate = sf.read(path, dtype="float32", always_2d=True)
        if sample_rate is None:
            sample_rate = current_rate
            mix = np.zeros_like(audio, dtype=np.float32)
        if current_rate != sample_rate or audio.shape != mix.shape:
            raise RuntimeError("As faixas instrumentais geradas são incompatíveis entre si.")
        mix += audio
    sf.write(stem_directory / "no_vocals.wav", np.clip(mix, -1.0, 1.0), sample_rate, subtype="PCM_16")


if __name__ == "__main__":
    make_instrumental = "--eclipse-mix-instrumental" in sys.argv
    if make_instrumental:
        sys.argv.remove("--eclipse-mix-instrumental")
    demucs_args = sys.argv[1:]
    main()
    if make_instrumental:
        create_instrumental_mix(demucs_args)
