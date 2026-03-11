"""
Speech-to-Text (STT) implementations
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, AsyncIterator
import numpy as np


@dataclass
class TranscriptionResult:
    """Result of speech-to-text transcription"""
    text: str
    confidence: float
    language: Optional[str] = None
    duration_ms: Optional[int] = None
    word_timestamps: Optional[list[dict]] = None


class SpeechToText(ABC):
    """Abstract base class for STT implementations"""

    @abstractmethod
    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        """
        Transcribe audio to text.

        Args:
            audio: Audio samples as numpy array (float32, -1 to 1)
            sample_rate: Sample rate in Hz
            language: Optional language code (e.g., 'en', 'es')

        Returns:
            TranscriptionResult with text and metadata
        """
        pass

    @abstractmethod
    async def transcribe_stream(
        self,
        audio_stream: AsyncIterator[np.ndarray],
        sample_rate: int = 16000,
    ) -> AsyncIterator[TranscriptionResult]:
        """
        Transcribe streaming audio.

        Args:
            audio_stream: Async iterator of audio chunks
            sample_rate: Sample rate in Hz

        Yields:
            Partial transcription results
        """
        pass


class WhisperSTT(SpeechToText):
    """
    OpenAI Whisper-based speech-to-text.

    Supports multiple model sizes for accuracy/speed tradeoff:
    - tiny: Fastest, lowest accuracy
    - base: Good balance for real-time
    - small: Better accuracy, still reasonable speed
    - medium: High accuracy
    - large: Highest accuracy, slowest
    """

    def __init__(
        self,
        model_size: str = "base",
        device: str = "auto",
        compute_type: str = "auto",
    ):
        self.model_size = model_size
        self.device = device
        self.compute_type = compute_type
        self._model = None

    async def _load_model(self):
        """Lazy load the Whisper model"""
        if self._model is not None:
            return

        try:
            from faster_whisper import WhisperModel

            device = self.device
            if device == "auto":
                import torch
                device = "cuda" if torch.cuda.is_available() else "cpu"

            compute_type = self.compute_type
            if compute_type == "auto":
                compute_type = "float16" if device == "cuda" else "int8"

            self._model = WhisperModel(
                self.model_size,
                device=device,
                compute_type=compute_type,
            )
        except ImportError as e:
            raise ImportError(
                "faster-whisper is required for WhisperSTT. "
                "Install with: pip install faster-whisper"
            ) from e

    async def transcribe(
        self,
        audio: np.ndarray,
        sample_rate: int = 16000,
        language: Optional[str] = None,
    ) -> TranscriptionResult:
        await self._load_model()

        # Resample if necessary
        if sample_rate != 16000:
            audio = self._resample(audio, sample_rate, 16000)

        segments, info = self._model.transcribe(
            audio,
            language=language,
            vad_filter=True,
            word_timestamps=True,
        )

        # Collect all segments
        text_parts = []
        word_timestamps = []

        for segment in segments:
            text_parts.append(segment.text)
            if segment.words:
                for word in segment.words:
                    word_timestamps.append({
                        "word": word.word,
                        "start": word.start,
                        "end": word.end,
                        "probability": word.probability,
                    })

        text = " ".join(text_parts).strip()
        confidence = info.language_probability if info.language_probability else 0.0

        return TranscriptionResult(
            text=text,
            confidence=confidence,
            language=info.language,
            duration_ms=int(info.duration * 1000) if info.duration else None,
            word_timestamps=word_timestamps if word_timestamps else None,
        )

    async def transcribe_stream(
        self,
        audio_stream: AsyncIterator[np.ndarray],
        sample_rate: int = 16000,
    ) -> AsyncIterator[TranscriptionResult]:
        await self._load_model()

        buffer = np.array([], dtype=np.float32)
        min_chunk_duration = 0.5  # 500ms minimum for transcription

        async for chunk in audio_stream:
            if sample_rate != 16000:
                chunk = self._resample(chunk, sample_rate, 16000)

            buffer = np.concatenate([buffer, chunk])

            # Process when we have enough audio
            if len(buffer) >= int(16000 * min_chunk_duration):
                result = await self.transcribe(buffer, 16000)
                if result.text:
                    yield result
                buffer = np.array([], dtype=np.float32)

        # Process remaining audio
        if len(buffer) > 0:
            result = await self.transcribe(buffer, 16000)
            if result.text:
                yield result

    def _resample(
        self,
        audio: np.ndarray,
        orig_sr: int,
        target_sr: int,
    ) -> np.ndarray:
        """Resample audio to target sample rate"""
        try:
            import librosa
            return librosa.resample(audio, orig_sr=orig_sr, target_sr=target_sr)
        except ImportError:
            # Simple linear interpolation fallback
            ratio = target_sr / orig_sr
            new_length = int(len(audio) * ratio)
            indices = np.linspace(0, len(audio) - 1, new_length)
            return np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)
