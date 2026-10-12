"""
LEARNOVA Intent Router
Classifies user messages into clear, actionable pedagogical intents:
- GREETING: Fast, immediate local response (<5ms)
- EXPLICIT_LESSON: Structured curriculum or syllabus learning session
- RESEARCH: Live research via web research service with genuine citations
- DOCUMENT_QUESTION: Grounded retrieval across single or multiple documents
- GENERAL_QUESTION: Cloud LLM pedagogical answer without pre-seeded document constraints
"""

import re
from enum import Enum
from typing import Dict, Any, List, Optional


class ConversationIntent(str, Enum):
    GREETING = "greeting"
    GENERAL_QUESTION = "general_question"
    DOCUMENT_QUESTION = "document_question"
    RESEARCH = "research"
    EXPLICIT_LESSON = "explicit_lesson"


GREETING_PATTERNS = [
    r"^(?:hi|hello|hey|heya|howdy|greetings|hlo|hlw)\b",
    r"^(?:good\s+(?:morning|afternoon|evening|day))\b",
    r"^(?:how\s+are\s+you|how's\s+it\s+going|how\s+do\s+you\s+do)\b",
    r"^(?:who\s+are\s+you|what\s+can\s+you\s+do|introduce\s+yourself)\b",
    r"^(?:thank\s+you|thanks|thx|thank\s+u)\b",
    r"^(?:bye|goodbye|see\s+you|cya)\b",
    r"^(?:help|help\s+me)\b",
    r"^(?:namaste|namaskar|namaskara|vanakkam|namaskaram)\b",
    r"^(?:ನಮಸ್ಕಾರ|नमस्ते|నమస్కారం|வணக்கம்)\b",
]

LESSON_PATTERNS = [
    r"\bstart\s+a\s+lesson\s+on\b",
    r"\bteach\s+me\s+(?:.+?)\s+from\s+(?:scratch|the\s+beginning|start)\b",
    r"\bteach\s+me\s+(?:this\s+)?(?:chapter|pdf|document)\s+(?:by\s+chapter|step\s+by\s+step)\b",
    r"\bstart\s+(?:a\s+)?(?:structured\s+)?(?:course|curriculum|module)\b",
    r"\bteach\s+me\s+(?:computer\s+networks|packet\s+switching|python|c\+\+|machine\s+learning)\s+from\s+scratch\b",
]

RESEARCH_PATTERNS = [
    r"\bresearch\b",
    r"\bsearch\s+the\s+web\b",
    r"\blatest\s+developments\b",
    r"\brecent\s+papers\b",
    r"\bcurrent\s+(?:market|trends|cloud\s+platforms|state\s+of\s+the\s+art)\b",
    r"\bfind\s+(?:recent\s+)?articles\b",
    r"\blook\s+up\s+online\b",
]

DOC_PATTERNS = [
    r"\b(?:summarise|summarize)\s+(?:both|all|the\s+two)?\s*(?:documents?|files?|pdfs?|this|it)?\b",
    r"\b(?:difference\s+between\s+(?:the\s+two|both)|compare\s+(?:both|the\s+two|the\s+documents|the\s+files))\b",
    r"\b(?:in\s+this|from\s+this|in\s+it|from\s+it)\s*(?:pdf|doc|document|file|notes|paper|bill|invoice)?\b",
    r"\bexplain\s+(?:me\s+about\s+)?(?:this|the)\s+(?:pdf|doc|document|file|bill|invoice)\b",
    r"\b(?:what\s+does|what\s+is\s+in)\s+(?:the|this)\s+(?:pdf|doc|document|file|bill|invoice)\b",
    r"\b(?:what\s+does\s+)?page\s+\d+\s*(?:say)?\b",
    r"\b(?:chapter\s+\d+|the\s+second\s+page|the\s+first\s+page)\b",
    r"\bexam\s+questions\s+in\s+these\s+notes\b",
    r"\b(?:rates?|amounts?|charges?|fees?|totals?|grand\s+total|cost|price)\s+(?:in\s+(?:it|this|the\s+bill|the\s+pdf|the\s+document))\b",
    r"\bwhat\s+(?:are|is)\s+(?:the\s+)?(?:rates?|total|grand\s+total|total\s+amount|charges?|fees?|amount)\b",
]


class IntentRouter:
    """Classifies user queries with deterministic, testable heuristics."""

    @staticmethod
    def is_pure_greeting(text: str) -> bool:
        """Determines if the message is solely a greeting/pleasantry without a substantive question."""
        cleaned = text.strip().lower()
        if not cleaned:
            return True

        # Check against common standalone greeting words
        standalone = {"hi", "hello", "hey", "heya", "howdy", "sup", "namaste", "namaskara", "vanakkam", "thanks", "thank you", "bye", "goodbye"}
        words = re.findall(r"\b\w+\b", cleaned)
        if len(words) <= 3 and any(w in standalone for w in words):
            # Check if there is a substantive question word
            question_words = {"what", "why", "how", "explain", "teach", "summarize", "summarise", "solve", "write", "compare", "define", "show"}
            if not any(qw in words for qw in question_words):
                return True

        for pat in GREETING_PATTERNS:
            if re.search(pat, cleaned, re.IGNORECASE):
                remainder = re.sub(pat, "", cleaned, flags=re.IGNORECASE).strip(" ,!?.-\t\n")
                if not remainder:
                    return True
                remainder_words = set(re.findall(r"\b\w+\b", remainder))
                salutation_words = {"there", "nova", "professor", "prof", "tutor", "sir", "mam", "friend", "how", "are", "you", "doing", "today", "to", "see"}
                if remainder_words and remainder_words.issubset(salutation_words):
                    return True

        return False

    @classmethod
    def classify(
        cls,
        message: str,
        active_doc_id: Optional[str] = None,
        uploaded_doc_count: int = 0
    ) -> Dict[str, Any]:
        """
        Classifies incoming message into intent and extracted parameters.
        """
        clean_msg = message.strip()
        lower_msg = clean_msg.lower()

        # 1. Pure Greeting
        if cls.is_pure_greeting(clean_msg):
            return {
                "intent": ConversationIntent.GREETING,
                "confidence": 0.99,
                "requires_remote_llm": False,
                "requires_document": False,
            }

        # 2. Explicit Lesson
        for pat in LESSON_PATTERNS:
            if re.search(pat, lower_msg):
                return {
                    "intent": ConversationIntent.EXPLICIT_LESSON,
                    "confidence": 0.95,
                    "requires_remote_llm": True,
                    "requires_document": bool(active_doc_id and active_doc_id != "general_learning"),
                }

        # 3. Web Research Request
        for pat in RESEARCH_PATTERNS:
            if re.search(pat, lower_msg):
                return {
                    "intent": ConversationIntent.RESEARCH,
                    "confidence": 0.92,
                    "requires_remote_llm": True,
                    "requires_document": False,
                }

        # 4. Multi-document or single-document queries matching explicit patterns
        for pat in DOC_PATTERNS:
            if re.search(pat, lower_msg):
                return {
                    "intent": ConversationIntent.DOCUMENT_QUESTION,
                    "confidence": 0.94,
                    "requires_remote_llm": True,
                    "requires_document": True,
                }

        # If user explicitly references uploaded document by filename or format
        doc_terms = [
            ".pdf", ".docx", ".txt", ".c", ".cpp", ".py", ".java", ".csv",
            "pdf", "docx", "uploaded file", "uploaded document", "this document",
            "this file", "these notes", "uploaded notes", "both files", "both documents",
            "this pdf", "the pdf", "this bill", "the bill", "this invoice", "the invoice",
            "this attachment", "attached file", "attached pdf", "rates in it", "rates in this"
        ]
        if any(term in lower_msg for term in doc_terms):
            return {
                "intent": ConversationIntent.DOCUMENT_QUESTION,
                "confidence": 0.90,
                "requires_remote_llm": True,
                "requires_document": True,
            }

        # If user has an active document open and is asking something specific about it
        if active_doc_id and active_doc_id not in ("general_learning", "none", "null", ""):
            # Check if query asks for document-specific aspects or follow-ups
            doc_query_cues = [
                "summarize", "summarise", "summary", "overview", "explain this", "what is this",
                "what does it say", "key points", "quiz on this", "rates", "rate", "fee", "fees",
                "amount", "amounts", "total", "grand total", "subtotal", "tax", "charges", "charge",
                "page", "section", "in it", "in this", "from it", "from this", "who issued", "date"
            ]
            if any(k in lower_msg for k in doc_query_cues):
                return {
                    "intent": ConversationIntent.DOCUMENT_QUESTION,
                    "confidence": 0.88,
                    "requires_remote_llm": True,
                    "requires_document": True,
                }

        # 5. General question
        return {
            "intent": ConversationIntent.GENERAL_QUESTION,
            "confidence": 0.85,
            "requires_remote_llm": True,
            "requires_document": False,
        }

    @staticmethod
    def get_greeting_response(message: str = "", language: str = "en") -> Dict[str, Any]:
        """
        Instant local greeting (<1ms) without remote API delay.
        Supports natural small talk like 'how are you', 'thank you', and standard greetings.
        """
        lower = message.strip().lower()

        # Handle "how are you" / pleasantry specifically
        if any(p in lower for p in ["how are you", "how's it going", "how do you do", "how r u"]):
            return {
                "intent": "greeting",
                "spoken_text": "I'm doing wonderful, thank you for asking! What are we learning today?",
                "teacher_text": (
                    "I'm doing great, thank you for asking! 😊\n\n"
                    "I'm ready to help you explore any concept, analyze code, or study your documents.\n\n"
                    "What would you like to dive into today?"
                ),
                "teaching_mode": "greeting",
                "active_concept": "Conversational Greeting",
                "visual_element": None,
                "citations": [],
                "follow_up_prompt": "What would you like to explore today?",
                "language": language,
                "llm_metadata": {
                    "provider": "local_fast_greeting",
                    "model": "deterministic_tutor",
                    "cost_tier": "FREE ($0.00)",
                    "latency_ms": 0.5
                }
            }

        # Handle "thank you" / pleasantry specifically
        if any(p in lower for p in ["thank you", "thanks", "thx", "appreciate it"]):
            return {
                "intent": "greeting",
                "spoken_text": "You're very welcome! Let me know what you'd like to explore next.",
                "teacher_text": (
                    "You're very welcome! 😊 Keep up the curious thinking.\n\n"
                    "Whenever you're ready, we can continue our discussion, start a new topic, or try a quick quiz!"
                ),
                "teaching_mode": "greeting",
                "active_concept": "Acknowledgment",
                "visual_element": None,
                "citations": [],
                "follow_up_prompt": "What would you like to explore next?",
                "language": language,
                "llm_metadata": {
                    "provider": "local_fast_greeting",
                    "model": "deterministic_tutor",
                    "cost_tier": "FREE ($0.00)",
                    "latency_ms": 0.5
                }
            }

        greetings = {
            "en": {
                "spoken": "Hey! I'm Professor Nova. What are we learning today?",
                "teacher": (
                    "Hi! 😊 I'm **Professor Nova**, your adaptive AI tutor.\n\n"
                    "What would you like to learn today? You can:\n"
                    "• Ask any conceptual question (e.g. *\"What is machine learning?\"* or *\"Explain recursion\"*)\n"
                    "• Ask for code explanations or debugging (*\"Explain this C program\"*)\n"
                    "• Upload notes or documents to ask questions, compare files, or summarize them\n"
                    "• Or say *\"Teach me computer networks from scratch\"* to start a structured lesson!"
                )
            },
            "kn": {
                "spoken": "ನಮಸ್ಕಾರ! ನಾನು ಪ್ರೊಫೆಸರ್ ನೋವಾ. ಇಂದು ನಾವು ಏನನ್ನು ಕಲಿಯೋಣ?",
                "teacher": (
                    "ನಮಸ್ಕಾರ! 😊 ನಾನು **ಪ್ರೊಫೆಸರ್ ನೋವಾ**, ನಿಮ್ಮ ವೈಯಕ್ತಿಕ AI ಶಿಕ್ಷಕ.\n\n"
                    "ಇಂದು ನಾವು ಏನನ್ನು ಕಲಿಯೋಣ? ನೀವು ಯಾವುದೇ ವಿಷಯದ ಬಗ್ಗೆ ಪ್ರಶ್ನೆ ಕೇಳಬಹುದು ಅಥವಾ ಡಾಕ್ಯುಮೆಂಟ್ ಅಪ್‌ಲೋಡ್ ಮಾಡಬಹುದು."
                )
            },
            "hi": {
                "spoken": "नमस्ते! मैं प्रोफेसर नोवा हूँ। आज हम क्या सीखना चाहते हैं?",
                "teacher": (
                    "नमस्ते! 😊 मैं **प्रोफेसर नोवा** हूँ, आपका व्यक्तिगत AI शिक्षक।\n\n"
                    "आज आप क्या सीखना चाहते हैं? आप कोई भी सवाल पूछ सकते हैं या अपने नोट्स अपलोड कर सकते हैं।"
                )
            },
            "te": {
                "spoken": "నమస్కారం! నేను ప్రొఫెసర్ నోవాను. ఈ రోజు మనం ఏమి నేర్చుకుందాం?",
                "teacher": "నమస్కారం! 😊 నేను **ప్రొఫెసర్ నోవా**ను. ఈ రోజు మనం ఏమి నేర్చుకుందాం?"
            },
            "ta": {
                "spoken": "வணக்கம்! நான் பேராசிரியர் நோவா. இன்று நாம் என்ன கற்கலாம்?",
                "teacher": "வணக்கம்! 😊 நான் **பேராசிரியர் நோவா**. இன்று நாம் என்ன கற்கலாம்?"
            }
        }
        res = greetings.get(language, greetings["en"])
        return {
            "intent": "greeting",
            "spoken_text": res["spoken"],
            "teacher_text": res["teacher"],
            "teaching_mode": "greeting",
            "active_concept": "Welcome",
            "visual_element": None,
            "citations": [],
            "follow_up_prompt": "What would you like to explore today?",
            "language": language,
            "llm_metadata": {
                "provider": "local_fast_greeting",
                "model": "deterministic_tutor",
                "cost_tier": "FREE ($0.00)",
                "latency_ms": 0.5
            }
        }


intent_router = IntentRouter()
