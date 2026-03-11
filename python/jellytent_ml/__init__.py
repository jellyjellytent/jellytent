"""
Jellytent ML - Speech recognition and synthesis for Jellytent

This module provides ML-powered speech-to-text and text-to-speech
capabilities for the Jellytent video chat agent.
"""

from jellytent_ml.stt import SpeechToText, WhisperSTT
from jellytent_ml.tts import TextToSpeech, CoquiTTS
from jellytent_ml.nlu import IntentClassifier

__version__ = "0.4.0"
__all__ = [
    "SpeechToText",
    "WhisperSTT",
    "TextToSpeech",
    "CoquiTTS",
    "IntentClassifier",
]
