"""
Text-to-Speech (TTS) implementations
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional, AsyncIterator
import numpy as np


@dataclass
class SynthesisResult:
    """Result of text-to-speech synthesis"""
    audio: np.ndarray
    sample_rate: int
    duration_ms: int


class TextToSpeech(ABC):
    """Abstract base class for TTS implementations"""

    @abstractmethod
    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> SynthesisResult:
        """
        Synthesize speech from text.

        Args:
            text: Text to synthesize
            voice_id: Optional voice identifier
            speed: Speech rate multiplier (0.5 - 2.0)

        Returns:
            SynthesisResult with audio samples
        """
        pass

    @abstractmethod
    async def synthesize_stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> AsyncIterator[np.ndarray]:
        """
        Stream synthesized speech.

        Args:
            text: Text to synthesize
            voice_id: Optional voice identifier
            speed: Speech rate multiplier

        Yields:
            Audio chunks as numpy arrays
        """
        pass

    @abstractmethod
    def list_voices(self) -> list[dict]:
        """List available voices"""
        pass


class CoquiTTS(TextToSpeech):
    """
    Coqui TTS implementation.

    Uses XTTS v2 for high-quality, multilingual speech synthesis
    with voice cloning capabilities.
    """

    def __init__(
        self,
        model_name: str = "tts_models/multilingual/multi-dataset/xtts_v2",
        device: str = "auto",
    ):
        self.model_name = model_name
        self.device = device
        self._tts = None
        self._sample_rate = 24000

    async def _load_model(self):
        """Lazy load the TTS model"""
        if self._tts is not None:
            return

        try:
            from TTS.api import TTS
            import torch

            device = self.device
            if device == "auto":
                device = "cuda" if torch.cuda.is_available() else "cpu"

            self._tts = TTS(self.model_name).to(device)
        except ImportError as e:
            raise ImportError(
                "TTS is required for CoquiTTS. "
                "Install with: pip install TTS"
            ) from e

    async def synthesize(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> SynthesisResult:
        await self._load_model()

        # Use default speaker if not specified
        speaker = voice_id or self._get_default_speaker()

        wav = self._tts.tts(
            text=text,
            speaker=speaker,
            language="en",
            speed=speed,
        )

        audio = np.array(wav, dtype=np.float32)
        duration_ms = int(len(audio) / self._sample_rate * 1000)

        return SynthesisResult(
            audio=audio,
            sample_rate=self._sample_rate,
            duration_ms=duration_ms,
        )

    async def synthesize_stream(
        self,
        text: str,
        voice_id: Optional[str] = None,
        speed: float = 1.0,
    ) -> AsyncIterator[np.ndarray]:
        # Coqui TTS doesn't support native streaming,
        # so we synthesize and chunk the output
        result = await self.synthesize(text, voice_id, speed)

        chunk_size = int(self._sample_rate * 0.1)  # 100ms chunks

        for i in range(0, len(result.audio), chunk_size):
            yield result.audio[i:i + chunk_size]

    def _get_default_speaker(self) -> str:
        """Get default speaker for the model"""
        if hasattr(self._tts, 'speakers') and self._tts.speakers:
            return self._tts.speakers[0]
        return "default"

    def list_voices(self) -> list[dict]:
        """List available voices"""
        if self._tts is None:
            return []

        voices = []
        if hasattr(self._tts, 'speakers') and self._tts.speakers:
            for speaker in self._tts.speakers:
                voices.append({
                    "id": speaker,
                    "name": speaker,
                    "language": "multilingual",
                })

        return voices

    async def clone_voice(
        self,
        reference_audio: np.ndarray,
        sample_rate: int = 16000,
    ) -> str:
        """
        Clone a voice from reference audio.

        Args:
            reference_audio: Reference audio samples
            sample_rate: Sample rate of reference audio

        Returns:
            Voice ID for the cloned voice
        """
        await self._load_model()

        # XTTS v2 supports voice cloning via speaker embedding
        # This would save the embedding and return an ID
        voice_id = f"cloned_{hash(reference_audio.tobytes()) % 10000:04d}"

        return voice_id
