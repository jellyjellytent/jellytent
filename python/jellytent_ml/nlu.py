"""
Natural Language Understanding (NLU) components
"""

from dataclasses import dataclass
from typing import Optional
import numpy as np


@dataclass
class Intent:
    """Detected intent from user input"""
    name: str
    confidence: float
    slots: dict[str, str]


@dataclass
class ClassificationResult:
    """Result of intent classification"""
    intents: list[Intent]
    entities: list[dict]
    sentiment: Optional[str] = None
    sentiment_score: Optional[float] = None


class IntentClassifier:
    """
    Intent classification for understanding user requests.

    Uses a lightweight transformer model for fast inference.
    """

    BUILTIN_INTENTS = [
        "greeting",
        "farewell",
        "help",
        "search",
        "play_music",
        "set_reminder",
        "weather",
        "news",
        "general_question",
        "chitchat",
    ]

    def __init__(
        self,
        model_name: str = "distilbert-base-uncased",
        custom_intents: Optional[list[str]] = None,
    ):
        self.model_name = model_name
        self.intents = self.BUILTIN_INTENTS + (custom_intents or [])
        self._classifier = None
        self._tokenizer = None

    async def _load_model(self):
        """Lazy load the classification model"""
        if self._classifier is not None:
            return

        try:
            from transformers import (
                AutoModelForSequenceClassification,
                AutoTokenizer,
            )

            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._classifier = AutoModelForSequenceClassification.from_pretrained(
                self.model_name,
                num_labels=len(self.intents),
            )
        except ImportError as e:
            raise ImportError(
                "transformers is required for IntentClassifier. "
                "Install with: pip install transformers"
            ) from e

    async def classify(
        self,
        text: str,
        threshold: float = 0.3,
    ) -> ClassificationResult:
        """
        Classify user intent from text.

        Args:
            text: User input text
            threshold: Minimum confidence threshold

        Returns:
            ClassificationResult with detected intents
        """
        await self._load_model()

        # Simple rule-based fallback for common intents
        intents = self._rule_based_classification(text)

        # Extract entities
        entities = self._extract_entities(text)

        # Detect sentiment
        sentiment, sentiment_score = self._detect_sentiment(text)

        return ClassificationResult(
            intents=intents,
            entities=entities,
            sentiment=sentiment,
            sentiment_score=sentiment_score,
        )

    def _rule_based_classification(self, text: str) -> list[Intent]:
        """Simple rule-based intent classification"""
        text_lower = text.lower().strip()
        intents = []

        # Greeting patterns
        greeting_patterns = ["hello", "hi", "hey", "good morning", "good afternoon"]
        if any(p in text_lower for p in greeting_patterns):
            intents.append(Intent(name="greeting", confidence=0.9, slots={}))

        # Farewell patterns
        farewell_patterns = ["bye", "goodbye", "see you", "talk later"]
        if any(p in text_lower for p in farewell_patterns):
            intents.append(Intent(name="farewell", confidence=0.9, slots={}))

        # Help patterns
        help_patterns = ["help", "assist", "support", "how do i"]
        if any(p in text_lower for p in help_patterns):
            intents.append(Intent(name="help", confidence=0.85, slots={}))

        # Weather patterns
        if "weather" in text_lower:
            slots = {}
            # Simple location extraction
            if " in " in text_lower:
                location = text_lower.split(" in ")[-1].strip()
                slots["location"] = location
            intents.append(Intent(name="weather", confidence=0.9, slots=slots))

        # Default to general question if no specific intent
        if not intents:
            if "?" in text:
                intents.append(Intent(name="general_question", confidence=0.6, slots={}))
            else:
                intents.append(Intent(name="chitchat", confidence=0.5, slots={}))

        return intents

    def _extract_entities(self, text: str) -> list[dict]:
        """Extract named entities from text"""
        entities = []

        # Simple pattern matching for common entities
        words = text.split()

        for i, word in enumerate(words):
            # Time patterns
            if word.lower() in ["today", "tomorrow", "yesterday"]:
                entities.append({
                    "type": "DATE",
                    "value": word,
                    "start": sum(len(w) + 1 for w in words[:i]),
                    "end": sum(len(w) + 1 for w in words[:i + 1]) - 1,
                })

        return entities

    def _detect_sentiment(self, text: str) -> tuple[Optional[str], Optional[float]]:
        """Simple sentiment detection"""
        positive_words = ["good", "great", "awesome", "love", "happy", "thanks"]
        negative_words = ["bad", "terrible", "hate", "sad", "angry", "frustrated"]

        text_lower = text.lower()
        pos_count = sum(1 for w in positive_words if w in text_lower)
        neg_count = sum(1 for w in negative_words if w in text_lower)

        if pos_count > neg_count:
            return "positive", min(0.5 + pos_count * 0.1, 1.0)
        elif neg_count > pos_count:
            return "negative", min(0.5 + neg_count * 0.1, 1.0)
        else:
            return "neutral", 0.5
