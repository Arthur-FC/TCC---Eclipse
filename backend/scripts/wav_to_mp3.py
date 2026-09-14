"""Conversor mínimo usado pelo smoke test local."""

import sys
import wave
import lameenc


with wave.open(sys.argv[1], "rb") as source:
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(128)
    encoder.set_in_sample_rate(source.getframerate())
    encoder.set_channels(source.getnchannels())
    encoder.set_quality(2)
    encoded = encoder.encode(source.readframes(source.getnframes())) + encoder.flush()

with open(sys.argv[2], "wb") as target:
    target.write(encoded)
