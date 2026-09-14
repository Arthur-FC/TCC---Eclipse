"""Executa o Demucs com leitura e gravação locais sem depender do FFmpeg."""

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


if __name__ == "__main__":
    main()
