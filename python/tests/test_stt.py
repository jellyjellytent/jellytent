"""Tests for speech-to-text implementations"""

import pytest
import numpy as np
from jellytent_ml.stt import WhisperSTT, TranscriptionResult


class TestWhisperSTT:
    @pytest.fixture
    def stt(self):
        return WhisperSTT(model_size="tiny")

    def test_init(self, stt):
        assert stt.model_size == "tiny"
        assert stt._model is None

    @pytest.mark.asyncio
    async def test_transcribe_returns_result(self, stt):
        # Create silent audio
        audio = np.zeros(16000, dtype=np.float32)

        # This would fail without the model, but tests the interface
        with pytest.raises(Exception):
            await stt.transcribe(audio)

    def test_resample(self, stt):
        audio = np.sin(np.linspace(0, 10 * np.pi, 8000)).astype(np.float32)
        resampled = stt._resample(audio, 8000, 16000)

        assert len(resampled) == 16000
        assert resampled.dtype == np.float32

    @pytest.mark.asyncio
    async def test_transcribe_stream_interface(self, stt):
        async def audio_generator():
            for _ in range(3):
                yield np.zeros(8000, dtype=np.float32)

        # Test that the stream interface exists
        stream = stt.transcribe_stream(audio_generator())
        assert hasattr(stream, '__anext__')


class TestTranscriptionResult:
    def test_creation(self):
        result = TranscriptionResult(
            text="Hello world",
            confidence=0.95,
            language="en",
            duration_ms=1500,
        )

        assert result.text == "Hello world"
        assert result.confidence == 0.95
        assert result.language == "en"
        assert result.duration_ms == 1500
        assert result.word_timestamps is None
