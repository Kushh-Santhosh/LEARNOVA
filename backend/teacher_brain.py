"""
LEARNOVA Adaptive Teacher Brain
Orchestrates pedagogy, multilingual explanations, visual artifact generation, and source grounding.
Separates concise spoken avatar text (1-3 sentences) from rich detailed written and visual explanations.
"""

import os
import re
from typing import Dict, Any, List, Optional
from embeddings_retriever import retriever
from misconception_engine import misconception_engine
from learner_state import learner_state
from demo_data import DEMO_CHUNKS, DEMO_COMMON_MISCONCEPTIONS

from openrouter_router import openrouter_router

class TeacherBrain:
    async def call_llm(self, prompt: str, system_prompt: str = "") -> Optional[Dict[str, Any]]:
        """Calls the free-only OpenRouter gateway."""
        return await openrouter_router.generate_completion(prompt=prompt, system_prompt=system_prompt)

    def detect_language(self, text: str, user_preference: Optional[str] = None) -> str:
        """Detects language script or explicit user requests ('in Kannada', 'in Hindi')."""
        t = text.lower()
        if "kannada" in t or "ಕನ್ನಡ" in text or re.search(r"[\u0C80-\u0CFF]", text):
            return "kn"
        elif "hindi" in t or "हिन्दी" in text or "हिंदी" in text or re.search(r"[\u0900-\u097F]", text):
            return "hi"
        elif "telugu" in t or "తెలుగు" in text or re.search(r"[\u0C00-\u0C7F]", text):
            return "te"
        elif "tamil" in t or "தமிழ்" in text or re.search(r"[\u0B80-\u0BFF]", text):
            return "ta"
        return user_preference if user_preference in ["kn", "hi", "te", "ta"] else "en"

    async def interact(
        self,
        doc_id: str,
        student_message: str,
        active_concept: str = "",
        mode: str = "explain",
        language: str = "en"
    ) -> Dict[str, Any]:
        """
        Main teaching loop:
        1. Language & Injection Check
        2. Misconception Check
        3. Grounded Retrieval & Off-document detection
        4. Structured Teacher Decision (Spoken Avatar vs. Detailed Workspace)
        5. Visual Artifact & Citations
        """
        detected_lang = self.detect_language(student_message, language)

        # 1. Misconception Check
        misconception_result = misconception_engine.diagnose(student_message, active_concept)
        if misconception_result["needs_remediation"]:
            learner_state.record_misconception(misconception_result)
            return self._build_remediation_decision(misconception_result, detected_lang)

        # 2. Grounded Retrieval / General Learning Mode
        is_general_mode = (
            not doc_id
            or doc_id in ("general_learning", "none", "null")
            or (doc_id not in retriever.doc_chunks and doc_id != "doc_networks_osi_101")
        )

        if is_general_mode:
            primary_chunk = {
                "content": f"Subject: {active_concept}\nTopic Context: {student_message}",
                "document_id": "general_learning",
                "page_number": 1,
                "section": active_concept or "Foundations"
            }
            citations = [
                {
                    "source": "LEARNOVA Knowledge Engine",
                    "page": 1,
                    "section": active_concept or "Foundations",
                    "excerpt": f"Educational knowledge base for {active_concept}: {student_message[:140]}"
                }
            ]
        else:
            # Document-grounded flow: retrieve against student's actual question to detect off-document inquiries
            retrieved_chunks, is_off_doc = retriever.retrieve(
                doc_id=doc_id,
                query=student_message,
                top_k=2,
                threshold=0.06
            )

            # Off-Document Handling: if query has zero grounded evidence and is not a greeting or pedagogical command
            is_greeting = any(k in student_message.lower() for k in ["hello", "hi", "hey", "who are you", "what can you do", "help"])
            is_pedagogical_cmd = mode != "explain" or any(k in student_message.lower() for k in ["exam", "simpler", "simplify", "analogy", "example", "visual", "diagram", "quiz", "teach", "summarize", "test me"])
            if is_off_doc and not is_greeting and not is_pedagogical_cmd:
                concept_tokens = [w.lower() for w in active_concept.split() if len(w) > 3]
                if not any(ct in student_message.lower() for ct in concept_tokens):
                    return self._build_off_document_decision(student_message, active_concept, detected_lang)

            if not retrieved_chunks:
                retrieved_chunks, _ = retriever.retrieve(doc_id=doc_id, query=active_concept, top_k=2, threshold=0.01)

            if not retrieved_chunks:
                doc_available = retriever.doc_chunks.get(doc_id, [])
                if doc_available:
                    retrieved_chunks = doc_available[:2]
                elif doc_id == "doc_networks_osi_101":
                    retrieved_chunks = DEMO_CHUNKS[:2]
                else:
                    return self._build_off_document_decision(student_message, active_concept, detected_lang)

            primary_chunk = retrieved_chunks[0]
            citations = [
                {
                    "source": "Curriculum Material",
                    "page": c.get("page_number", 1),
                    "section": c.get("section", "Curriculum"),
                    "excerpt": c.get("content", "")[:180] + "..."
                }
                for c in retrieved_chunks
            ]

        # 3. Dynamic OpenRouter LLM generation if configured (PRIMARY CLOUD INTELLIGENCE)
        if openrouter_router.is_configured():
            llm_result = await self._try_llm_explanation(
                active_concept=active_concept,
                student_message=student_message,
                primary_chunk=primary_chunk,
                citations=citations,
                lang=detected_lang,
                mode=mode
            )
            if llm_result:
                return llm_result

        # 4. Deterministic Local Pedagogical Mode Selection (FAILOVER / OFFLINE)
        msg_lower = student_message.lower()
        if "simpler" in msg_lower or "explain like i'm 5" in msg_lower or mode == "simplify":
            return self._handle_simplify(active_concept, primary_chunk, citations, detected_lang)
        elif "example" in msg_lower or mode == "example":
            return self._handle_example(active_concept, primary_chunk, citations, detected_lang)
        elif "analogy" in msg_lower or mode == "analogy":
            return self._handle_analogy(active_concept, primary_chunk, citations, detected_lang)
        elif "visual" in msg_lower or "diagram" in msg_lower or mode == "visual":
            return self._handle_visual(active_concept, primary_chunk, citations, detected_lang)
        elif "deep" in msg_lower or mode == "deep_dive":
            return self._handle_deep_dive(active_concept, primary_chunk, citations, detected_lang)
        elif "socratic" in msg_lower or mode == "socratic":
            return self._handle_socratic(active_concept, primary_chunk, citations, detected_lang)
        elif "exam" in msg_lower or mode == "exam":
            return self._handle_exam_mode(active_concept, primary_chunk, citations, detected_lang)

        return self._handle_explain(active_concept, student_message, primary_chunk, citations, detected_lang)

    async def _try_llm_explanation(
        self,
        active_concept: str,
        student_message: str,
        primary_chunk: Dict[str, Any],
        citations: List[Dict[str, Any]],
        lang: str,
        mode: str = "explain"
    ) -> Optional[Dict[str, Any]]:
        is_general = primary_chunk.get("document_id") == "general_learning"
        if is_general:
            system_prompt = (
                "You are Professor Nova, an advanced, calm, male, and highly intelligent AI teacher in LEARNOVA. "
                "Turn information into deep understanding. Teach the student with clarity, first principles, structured formatting, "
                "and engaging examples. Structure your output as:\n"
                "SPOKEN: [1-2 concise, clear sentences for the avatar voice]\n"
                "EXPLANATION: [Structured, engaging explanation with markdown, bullet points, and key takeaways]"
            )
            prompt = (
                f"Subject / Concept: {active_concept}\n"
                f"Student asks: {student_message}\n"
                f"Pedagogical mode: {mode}\n"
                f"Language target: {lang}\n"
            )
        else:
            system_prompt = (
                "You are Professor Nova, an advanced, calm, male, and highly intelligent AI teacher in LEARNOVA. "
                "Turn information into understanding. Ground your explanation strictly in the student's study materials. "
                "Structure your output as:\n"
                "SPOKEN: [1-2 concise, clear sentences for the avatar voice]\n"
                "EXPLANATION: [Structured, engaging explanation with bullet points and key takeaways]"
            )
            prompt = (
                f"Concept: {active_concept}\n"
                f"Curriculum excerpt:\n{primary_chunk.get('content', '')[:1000]}\n\n"
                f"Student asks: {student_message}\n"
                f"Pedagogical mode: {mode}\n"
                f"Language target: {lang}\n"
            )
        res = await self.call_llm(prompt, system_prompt)
        if not res or not res.get("text"):
            return None

        text = res["text"]
        # Strip reasoning models' internal thoughts or thinking preambles
        text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL)
        text = re.sub(r"<\|.*?\|>", "", text)
        if "Thinking Process:" in text and "SPOKEN:" in text:
            text = text[text.find("SPOKEN:"):]
        elif "Thinking Process:" in text and "EXPLANATION:" in text:
            text = text[text.find("EXPLANATION:"):]

        # Handle models that format as [SPOKEN('...')
        text = re.sub(r"^\[\s*SPOKEN\s*\(['\"]?", "SPOKEN: ", text)
        text = re.sub(r"['\"]?\s*,\s*EXPLANATION\s*=\s*['\"]?", "\nEXPLANATION:\n", text)
        text = re.sub(r"['\"]?\s*\]\s*$", "", text)

        spoken_text = ""
        detailed_text = text

        if "SPOKEN:" in text and "EXPLANATION:" in text:
            parts = text.split("EXPLANATION:")
            spoken_text = parts[0].replace("SPOKEN:", "").strip()
            detailed_text = parts[1].strip()
        elif "SPOKEN:" in text:
            spoken_text = text.replace("SPOKEN:", "").strip()
            detailed_text = spoken_text
        else:
            sentences = re.split(r'(?<=[.!?])\s+', text.strip())
            spoken_text = " ".join(sentences[:2]) if len(sentences) > 1 else sentences[0]

        concept_slug = re.sub(r'[^a-z0-9]+', '_', active_concept.lower()).strip('_')
        learner_state.record_concept_interaction(concept_slug, 0.05)
        return {
            "intent": "teach",
            "spoken_text": spoken_text[:200],
            "teacher_text": detailed_text,
            "teaching_mode": mode or "explain",
            "active_concept": active_concept,
            "misconception_detected": None,
            "visual_element": {
                "type": "flowchart",
                "title": f"{active_concept}: Concept Breakdown",
                "data": {
                    "nodes": [
                        {"id": "n1", "label": "Grounded Core Concept", "color": "#e0e7ff"},
                        {"id": "n2", "label": f"{active_concept} Mechanism", "color": "#dbeafe"},
                        {"id": "n3", "label": "Application Impact", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "n1", "to": "n2", "label": "Mechanism"},
                        {"from": "n2", "to": "n3", "label": "Enables"}
                    ]
                },
                "source": {"page": primary_chunk.get("page_number", 1), "section": primary_chunk.get("section", "Curriculum")}
            },
            "citations": citations,
            "follow_up_prompt": "Would you like to explore an analogy or test your understanding with a quick quiz?",
            "language": lang,
            "llm_metadata": {
                "provider": res.get("provider", "openrouter"),
                "model": res.get("model", "free_fallback"),
                "cost_tier": res.get("cost_tier", "FREE"),
                "latency_ms": res.get("latency_ms", 0.0)
            }
        }

    def _build_remediation_decision(self, misconception_result: Dict[str, Any], lang: str) -> Dict[str, Any]:
        concept_name = misconception_result.get("concept", "Active Concept")
        rule = next((r for r in DEMO_COMMON_MISCONCEPTIONS if r["concept"].lower() == concept_name.lower()), None)

        if rule:
            spoken_text = "I see what you're thinking, but speed and reliability are two completely different engineering properties. Let's look at this comparison on the whiteboard."
            detailed_text = rule["teacher_remediation_response"]
            visual_payload = rule["visual_payload"]
            citations = [
                {
                    "source": "Computer Networks: Principles & Architecture",
                    "page": 4,
                    "section": "The Transport Layer: TCP vs UDP",
                    "excerpt": "UDP is connectionless and lightweight without retransmissions; speed does not equate to reliability."
                }
            ]
            if lang == "kn":
                spoken_text = "ನೀವು ವೇಗ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹತೆಯನ್ನು ಮಿಶ್ರಣ ಮಾಡುತ್ತಿದ್ದೀರಿ. ವೈಟ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿರುವ ವ್ಯತ್ಯಾಸವನ್ನು ನೋಡೋಣ."
                detailed_text = (
                    "**ತಪ್ಪುಕಲ್ಪನೆ ಪತ್ತೆಯಾಗಿದೆ: ವೇಗ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹತೆ**\n\n"
                    "• **Reliability (ವಿಶ್ವಾಸಾರ್ಹತೆ)**: ಪ್ರತಿಯೊಂದು ಡೇಟಾ ಪ್ಯಾಕೆಟ್ ಯಾವುದೇ ನಷ್ಟವಿಲ್ಲದೆ ತಲುಪಿದೆಯೇ?\n"
                    "• **Speed (ವೇಗ)**: ಎಷ್ಟು ಕಡಿಮೆ ಮಿಲಿಸೆಕೆಂಡ್‌ಗಳಲ್ಲಿ ತಲುಪಿತು?\n\n"
                    "**UDP ಎಂಬುದು ಧ್ವನಿವರ್ಧಕ (Megaphone) ಇದ್ದಂತೆ**: ಇದು ಅತ್ಯಂತ ವೇಗ, ಆದರೆ ಶಬ್ದ ಕೇಳಿಸದಿದ್ದರೆ ಮತ್ತೆ ಹೇಳುವುದಿಲ್ಲ.\n"
                    "**TCP ಎಂಬುದು ನೋಂದಾಯಿತ ಅಂಚೆ (Registered Post) ಇದ್ದಂತೆ**: ಸಹಿ ಸಿಗುವವರೆಗೂ ವಿತರಣೆ ಖಚಿತಪಡಿಸುತ್ತದೆ ಮತ್ತು ಕಳೆದುಹೋದರೆ ಮರುಕಳುಹಿಸುತ್ತದೆ."
                )
            elif lang == "hi":
                spoken_text = "आप स्पीड और रिलायबिलिटी को मिला रहे हैं। चलिए व्हाइटबोर्ड पर इसका अंतर समझते हैं।"
                detailed_text = (
                    "**गलतफहमी पहचानी गई: स्पीड बनाम रिलायबिलिटी**\n\n"
                    "• **Reliability (विश्वसनीयता)**: क्या हर पैकेट बिना किसी नुकसान के पहुँचा?\n"
                    "• **Speed (गति)**: कितनी कम देरी में पैकेट पहुँचा?\n\n"
                    "**UDP एक लाउडस्पीकर की तरह है**: यह बहुत तेज है, लेकिन अगर पैकेट खो जाए तो यह दोबारा नहीं भेजता।\n"
                    "**TCP रजिस्टर्ड डाक की तरह है**: जब तक रसीद नहीं मिलती, यह पैकेट दोबारा भेजता रहता है।"
                )
        else:
            misconception_desc = misconception_result.get("misconception", "Common conceptual confusion")
            counterexample = misconception_result.get("counterexample", "")
            evidence = misconception_result.get("evidence", "Curriculum Material")
            spoken_text = f"Notice an important distinction regarding {concept_name}. Let's address this directly."
            detailed_text = (
                f"**Misconception Addressed: {concept_name}**\n\n"
                f"• **Identified Confusion**: {misconception_desc}\n"
                f"• **Key Distinction**: {counterexample or 'Understanding the precise principles prevents erroneous assumptions.'}\n\n"
                f"**Ground Truth**: {evidence}"
            )
            visual_payload = {
                "type": "comparison_table",
                "title": f"Key Distinction: {concept_name}",
                "data": {
                    "headers": ["Concept", "Common Misconception", "Verified Ground Truth"],
                    "rows": [
                        [concept_name, misconception_desc, counterexample or "Verified by uploaded course document."]
                    ]
                },
                "source": {"page": 1, "section": concept_name}
            }
            citations = [
                {
                    "source": "Uploaded Curriculum Material",
                    "page": 1,
                    "section": concept_name,
                    "excerpt": evidence[:180] if evidence else f"Grounded concept definition for {concept_name}"
                }
            ]

        return {
            "intent": "remediate",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "remediate",
            "active_concept": concept_name,
            "misconception_detected": misconception_result,
            "visual_element": visual_payload,
            "citations": citations,
            "follow_up_prompt": "Would you like to try explaining the difference back to me, or take a quick check?",
            "language": lang
        }

    def _build_off_document_decision(self, query: str, active_concept: str, lang: str) -> Dict[str, Any]:
        spoken_text = "I couldn't find that in your uploaded document. Would you like me to research it on the web?"
        detailed_text = (
            f"**Not Found in Uploaded Material**\n\n"
            f"Your question *\"{query}\"* is not covered in the current study document. "
            f"LEARNOVA adheres to strict source grounding to ensure academic accuracy.\n\n"
            f"Options:\n"
            f"• Continue learning about **{active_concept}** from your uploaded document.\n"
            f"• Ask me to **research this topic on the web** for you."
        )

        if lang == "kn":
            spoken_text = "ನಿಮ್ಮ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಇದು ಕಂಡುಬಂದಿಲ್ಲ. ವೆಬ್‌ನಲ್ಲಿ ಸಂಶೋಧಿಸಲು ಬಯಸುವಿರಾ?"
            detailed_text = f"**ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ**\n\nನಿಮ್ಮ ಪ್ರಶ್ನೆ ಈ ಸ್ಟಡಿ ಮೆಟೀರಿಯಲ್‌ನಲ್ಲಿ ಒಳಗೊಂಡಿಲ್ಲ. ನಾನು ವೆಬ್‌ನಲ್ಲಿ ಇದನ್ನು ಸಂಶೋಧಿಸಲೇ?"
        elif lang == "hi":
            spoken_text = "यह जानकारी आपके दस्तावेज़ में नहीं मिली। क्या मैं इसे वेब पर खोजूँ?"
            detailed_text = f"**दस्तावेज़ में अनुपलब्ध**\n\nआपका प्रश्न इस सामग्री में शामिल नहीं है। क्या आप चाहते हैं कि मैं इसे वेब पर खोजूँ?"
        elif lang == "te":
            spoken_text = "మీరు అప్‌లోడ్ చేసిన పత్రంలో ఇది కనుగొనబడలేదు. వెబ్‌లో శోధించమంటారా?"
            detailed_text = f"**పత్రంలో అందుబాటులో లేదు**\n\nమీ ప్రశ్న ఈ అధ్యయన సామగ్రిలో చేర్చబడలేదు. వెబ్‌లో శోధించమంటారా?"
        elif lang == "ta":
            spoken_text = "உங்கள் ஆவணத்தில் இது காணப்படவில்லை. வலையில் தேடட்டுமா?"
            detailed_text = f"**ஆவணத்தில் கிடைக்கவில்லை**\n\nஉங்கள் கேள்வி இந்த படிப்பு தொகுப்பில் சேர்க்கப்படவில்லை. வலையில் தேடட்டுமா?"

        return {
            "intent": "off_document",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "explain",
            "active_concept": active_concept,
            "misconception_detected": None,
            "visual_element": None,
            "citations": [],
            "follow_up_prompt": "Would you like me to research this on the web, or shall we continue with your uploaded material?",
            "language": lang
        }

    def _handle_general_pedagogy(
        self,
        concept: str,
        mode: str,
        citations: List[Dict[str, Any]],
        query: str = "",
        lang: str = "en",
    ) -> Dict[str, Any]:
        """
        Synthesizes high-quality pedagogy for General Learning (Python, C++, Backend, etc.)
        when no document is uploaded.
        Guaranteed to never mention TCP/UDP/Transport Layer unless explicitly asked.
        """
        text_lower = f"{concept} {query}".lower()
        is_python = "python" in text_lower
        is_cpp = any(k in text_lower for k in ["c++", "cpp", "pointer", "memory management"])
        is_backend = any(k in text_lower for k in ["backend", "fastapi", "rest", "api", "database", "sql", "docker", "auth", "http"])

        concept_title = concept or "Foundational Principles"
        follow_up = "Would you like an example, an analogy, or shall we take a quick quiz?"

        if is_python:
            if mode == "explain":
                spoken = f"Python emphasizes clarity, expressiveness, and first principles. Let's explore {concept_title}."
                teacher_text = (
                    f"### Understanding **{concept_title}** in Python\n\n"
                    f"Python is an interpreted, high-level language designed around readability and rapid development:\n\n"
                    f"• **Design Philosophy**: Explicit is better than implicit. Readable code reduces bugs and cognitive load.\n"
                    f"• **Execution Model**: Source code (`.py`) is compiled to bytecode (`.pyc`) and executed by the Python Virtual Machine (PVM).\n"
                    f"• **Standard Idioms**: Leverage built-in types (lists, dicts, tuples, sets), list comprehensions, and type hints.\n\n"
                    f"```python\n"
                    f"# Idiomatic Python pattern\n"
                    f"def process_items(items: list[str]) -> dict[str, int]:\n"
                    f"    return {{item: len(item) for item in items if item}}\n"
                    f"```\n\n"
                    f"**Best Practice**: Write clean, PEP 8-compliant code and choose idiomatic built-ins over manual loops."
                )
                visual = {
                    "type": "flowchart",
                    "title": f"Python: {concept_title} Execution",
                    "data": {
                        "nodes": [
                            {"id": "p1", "label": "Source Code (.py)", "color": "#e0e7ff"},
                            {"id": "p2", "label": "Bytecode Compiler (.pyc)", "color": "#dbeafe"},
                            {"id": "p3", "label": "PVM Runtime", "color": "#dcfce7"}
                        ],
                        "connections": [
                            {"from": "p1", "to": "p2", "label": "Compile"},
                            {"from": "p2", "to": "p3", "label": "Execute"}
                        ]
                    },
                    "source": {"page": 1, "section": "Python Foundations"}
                }
            elif mode == "simplify":
                spoken = f"In simple terms, Python lets you express code almost like readable plain English."
                teacher_text = (
                    f"### Simplifying **{concept_title}**\n\n"
                    f"**Everyday Mental Model:**\n\n"
                    f"• **Zero Boilerplate**: You don't have to configure memory pointers or write 20 lines of setup code.\n"
                    f"• **Indentation is Structure**: Indented blocks cleanly delineate functions and loops.\n"
                    f"• **Batteries Included**: The standard library handles JSON, HTTP, math, and file I/O out of the box."
                )
                visual = {
                    "type": "process_diagram",
                    "title": f"Simplifying Python: {concept_title}",
                    "data": {
                        "steps": [
                            {"step": 1, "title": "Write Intent", "desc": "Write readable logic with concise syntax."},
                            {"step": 2, "title": "Runtime Safety", "desc": "PVM manages memory, types, and garbage collection."},
                            {"step": 3, "title": "Verified Result", "desc": "Immediate feedback and clean execution."}
                        ]
                    },
                    "source": {"page": 1, "section": "Python Pedagogical Guide"}
                }
            elif mode == "example":
                spoken = f"Here is a concrete, idiomatic Python example for {concept_title}."
                teacher_text = (
                    f"### Concrete Example: **{concept_title}**\n\n"
                    f"```python\n"
                    f"# Demonstrating {concept_title}\n"
                    f"class DataStore:\n"
                    f"    def __init__(self, name: str):\n"
                    f"        self.name = name\n"
                    f"        self._records: list[dict] = []\n\n"
                    f"    def append_item(self, **kwargs):\n"
                    f"        self._records.append(kwargs)\n\n"
                    f"    def count(self) -> int:\n"
                    f"        return len(self._records)\n"
                    f"```\n\n"
                    f"• Notice how concise encapsulation and keyword arguments maintain flexibility without boilerplate."
                )
                visual = {
                    "type": "comparison_table",
                    "title": f"Python Patterns for {concept_title}",
                    "data": {
                        "headers": ["Aspect", "Idiomatic Pattern", "Common Antipattern"],
                        "rows": [
                            ["Iteration", "for item in collection:", "for i in range(len(collection)): item = collection[i]"],
                            ["Data Storage", "dataclasses / dicts", "Unstructured manual parallel lists"],
                            ["Files", "with open(...) as f:", "f = open(...); ...; f.close()"]
                        ]
                    },
                    "source": {"page": 1, "section": "Python Examples"}
                }
            elif mode == "analogy":
                spoken = f"Think of Python like an automatic transmission vehicle: you steer and drive while the car manages gear shifting."
                teacher_text = (
                    f"### Intuitive Analogy: **{concept_title}**\n\n"
                    f"**The Automatic Transmission Vehicle Metaphor:**\n\n"
                    f"• **Driving**: You focus on your route and destination (solving business problems and building features).\n"
                    f"• **Automatic Shifting**: Python manages reference counts, allocates heap buffers, and handles dynamic types behind the scenes.\n"
                    f"• **Result**: You ship working code faster with fewer manual crashes."
                )
                visual = {
                    "type": "comparison_table",
                    "title": "Analogy: Python as Automatic Transmission",
                    "data": {
                        "headers": ["Dimension", "Manual Transmission (Low-level)", "Automatic Transmission (Python)"],
                        "rows": [
                            ["Memory", "Explicit malloc / free", "Automatic Reference Counting + GC"],
                            ["Types", "Strict manual declarations", "Dynamic typing with optional type hints"],
                            ["Velocity", "More boilerplate to write", "Rapid iteration and clean readability"]
                        ]
                    },
                    "source": {"page": 1, "section": "Conceptual Models"}
                }
            elif mode == "visual":
                spoken = f"I have mapped the Python object and memory references on your whiteboard."
                teacher_text = (
                    f"Examine the **{concept_title}** object lifecycle on your visual workspace.\n\n"
                    f"Notice how variable names in the local stack frame point to dynamic objects in heap memory."
                )
                visual = {
                    "type": "flowchart",
                    "title": "Python Memory & Object References",
                    "data": {
                        "nodes": [
                            {"id": "m1", "label": "Stack Frame (Variable Names)", "color": "#fee2e2"},
                            {"id": "m2", "label": "Reference Pointer", "color": "#fef3c7"},
                            {"id": "m3", "label": "Heap PyObject (Type + Refcount + Value)", "color": "#dcfce7"}
                        ],
                        "connections": [
                            {"from": "m1", "to": "m2", "label": "Binds"},
                            {"from": "m2", "to": "m3", "label": "Points To"}
                        ]
                    },
                    "source": {"page": 1, "section": "Python Runtime Architecture"}
                }
            elif mode == "socratic":
                spoken = f"Consider why Python chooses reference counting with cycle detection instead of pure tracing garbage collection."
                teacher_text = (
                    f"**Socratic Thought Challenge: {concept_title}**\n\n"
                    f"CPython deallocates objects immediately when their reference count drops to zero. But reference counting cannot break circular references (e.g. `a.b = b; b.a = a`).\n\n"
                    f"To solve this, Python added a generational cyclic garbage collector.\n\n"
                    f"> **The Question**: Why not simply discard reference counting and use a pure tracing collector (like Go or Java)? What deterministic guarantees does immediate deallocation give Python developers?"
                )
                visual = {
                    "type": "concept_map",
                    "title": "Socratic Dilemma: Memory Deallocation Strategies",
                    "data": {
                        "central": "Python Memory Management",
                        "branches": [
                            {"title": "Immediate Ref Counting", "description": "Deterministic cleanup as soon as scope exits (files/sockets close instantly)"},
                            {"title": "Generational Collector", "description": "Runs intermittently on surviving container objects to break circular links"}
                        ]
                    },
                    "source": {"page": 1, "section": "CPython Architectural Decisions"}
                }
            elif mode == "deep_dive":
                spoken = f"Let's dive deep into Python internals: the PyObject structure, memory arenas, and the GIL."
                teacher_text = (
                    f"### Technical Deep Dive: **{concept_title}**\n\n"
                    f"Key CPython internal mechanisms:\n\n"
                    f"1. **PyObject Structure**: Every object begins with `ob_refcnt` and `*ob_type`. Even integers are full heap objects.\n"
                    f"2. **PyMalloc Sub-allocator**: Allocations <= 512 bytes are pooled into arenas and pools to prevent OS heap fragmentation.\n"
                    f"3. **The Global Interpreter Lock (GIL)**: A mutex serializing bytecode execution to guarantee thread safety for reference counts.\n"
                    f"4. **Optimization**: Python 3.12+ introduces immortal objects, per-interpreter GILs, and specializing adaptive interpreters."
                )
                visual = {
                    "type": "flowchart",
                    "title": "CPython Deep Dive Architecture",
                    "data": {
                        "nodes": [
                            {"id": "d1", "label": "PyObject Header", "color": "#fee2e2"},
                            {"id": "d2", "label": "PyMalloc Arena Pool", "color": "#fef3c7"},
                            {"id": "d3", "label": "Specialized Bytecode Interpreter", "color": "#dcfce7"}
                        ],
                        "connections": [
                            {"from": "d1", "to": "d2", "label": "Allocated In"},
                            {"from": "d2", "to": "d3", "label": "Evaluated By"}
                        ]
                    },
                    "source": {"page": 1, "section": "CPython Internals"}
                }
            else:  # exam
                spoken = f"Here are the high-yield Python concepts tested in technical interviews and certification exams."
                teacher_text = (
                    f"### High-Yield Exam Review: **{concept_title}**\n\n"
                    f"High-frequency exam topics:\n\n"
                    f"1. **Mutable Default Arguments**: `def append_to(item, target=[])` binds `target` once at module load, creating shared state bugs.\n"
                    f"2. **`==` vs. `is`**: `==` invokes `__eq__` (value equality); `is` compares memory addresses (`id(a) == id(b)`).\n"
                    f"3. **Generators & Space Complexity**: Generators produce items on demand using `yield`, running in O(1) auxiliary space."
                )
                visual = {
                    "type": "comparison_table",
                    "title": "Python Exam & Interview Matrix",
                    "data": {
                        "headers": ["Concept", "Theoretical Principle", "Exam Trap / Gotcha"],
                        "rows": [
                            ["Default Arguments", "Evaluated at definition time", "Never use mutable objects (list/dict) as defaults"],
                            ["Identity vs Equality", "is checks id(); == checks values", "Cached small integers (-5..256) can mislead identity tests"],
                            ["Generators", "Lazy evaluation via yield", "Generators cannot be indexed or re-iterated once exhausted"]
                        ]
                    },
                    "source": {"page": 1, "section": "Python Assessment Standards"}
                }

        elif is_cpp:
            if mode == "explain":
                spoken = f"C++ provides zero-cost abstractions, deterministic destruction, and direct hardware control. Let's look at {concept_title}."
                teacher_text = (
                    f"### Understanding **{concept_title}** in C++\n\n"
                    f"C++ is a compiled, statically typed systems language offering fine-grained control over system resources:\n\n"
                    f"• **Zero-Cost Abstractions**: What you don't use, you don't pay for. Classes and templates compile down to optimal machine instructions.\n"
                    f"• **RAII (Resource Acquisition Is Initialization)**: Resource lifetime is tied directly to object scope. Destructors clean up memory, file handles, and locks automatically.\n"
                    f"• **Pointers & References**: Direct access to memory addresses with strict type checking and const correctness."
                )
                visual = {
                    "type": "flowchart",
                    "title": f"C++: {concept_title} Compilation & Memory",
                    "data": {
                        "nodes": [
                            {"id": "c1", "label": "C++ Source (.cpp)", "color": "#e0e7ff"},
                            {"id": "c2", "label": "Optimizing Compiler", "color": "#dbeafe"},
                            {"id": "c3", "label": "Native Machine Binary", "color": "#dcfce7"}
                        ],
                        "connections": [
                            {"from": "c1", "to": "c2", "label": "Translate"},
                            {"from": "c2", "to": "c3", "label": "Link & Assemble"}
                        ]
                    },
                    "source": {"page": 1, "section": "C++ Systems Architecture"}
                }
            elif mode == "simplify":
                spoken = f"In simple terms, C++ is like building with high-precision steel tools instead of snap-together plastic blocks."
                teacher_text = (
                    f"### Simplifying **{concept_title}**\n\n"
                    f"**Everyday Mental Model:**\n\n"
                    f"• **Manual Control**: You have the steering wheel and manual gears. The car goes as fast as the engine can physically spin.\n"
                    f"• **Stack vs. Heap**: Small, fast variables live on the stack; larger dynamic allocations live on the heap.\n"
                    f"• **Deterministic Cleanup**: When a function ends, its local variables are destroyed instantly with zero delay."
                )
                visual = {
                    "type": "process_diagram",
                    "title": f"Simplifying C++: {concept_title}",
                    "data": {
                        "steps": [
                            {"step": 1, "title": "Scope Entry", "desc": "Variables allocated on stack with zero overhead."},
                            {"step": 2, "title": "Execution", "desc": "Hardware registers and CPU caches leveraged directly."},
                            {"step": 3, "title": "Scope Exit", "desc": "Destructors execute immediately; zero GC pauses."}
                        ]
                    },
                    "source": {"page": 1, "section": "C++ Mental Models"}
                }
            else:
                spoken = f"Let's explore {concept_title} with focus on memory safety, pointers, and modern C++ best practices."
                teacher_text = (
                    f"### C++ Focus: **{concept_title}**\n\n"
                    f"Key engineering guidelines for modern C++ (C++17/20):\n\n"
                    f"• **Prefer Smart Pointers**: Use `std::unique_ptr` and `std::shared_ptr` instead of raw `new` and `delete`.\n"
                    f"• **Move Semantics**: Use `std::move` and rvalue references (`&&`) to transfer ownership without expensive deep copies.\n"
                    f"• **Standard Template Library (STL)**: Rely on `std::vector`, `std::unordered_map`, and `<algorithm>`."
                )
                visual = {
                    "type": "comparison_table",
                    "title": f"Modern C++ Standards: {concept_title}",
                    "data": {
                        "headers": ["Technique", "Modern C++ (Safe & Fast)", "Legacy C++ (Vulnerable)"],
                        "rows": [
                            ["Dynamic Ownership", "std::unique_ptr<T>", "Raw T* with manual delete"],
                            ["Pass by Reference", "const T& (no copy)", "Pass by value (accidental copy)"],
                            ["Containers", "std::vector with reserve()", "Manual C-style arrays T[]"]
                        ]
                    },
                    "source": {"page": 1, "section": "Modern C++ Guidelines"}
                }

        elif is_backend:
            if mode == "explain":
                spoken = f"Backend systems power APIs, database persistence, and business logic. Let's explore {concept_title}."
                teacher_text = (
                    f"### Understanding **{concept_title}** in Backend Development\n\n"
                    f"Backend engineering focuses on building reliable, scalable, and secure server-side systems:\n\n"
                    f"• **Client-Server Architecture**: Clients send structured HTTP/gRPC requests; backends validate, execute logic, and respond with serialized data (JSON/Protobuf).\n"
                    f"• **Data Persistence**: Relational databases (PostgreSQL) provide ACID guarantees; document stores handle flexible schemas.\n"
                    f"• **APIs & Middleware**: RESTful principles, OpenAPI specifications, request rate-limiting, and authentication (JWT/OAuth2)."
                )
                visual = {
                    "type": "flowchart",
                    "title": f"Backend Architecture: {concept_title}",
                    "data": {
                        "nodes": [
                            {"id": "b1", "label": "Client / Browser", "color": "#e0e7ff"},
                            {"id": "b2", "label": "API Gateway / Reverse Proxy", "color": "#fef3c7"},
                            {"id": "b3", "label": "FastAPI Application", "color": "#dbeafe"},
                            {"id": "b4", "label": "Database Persistence", "color": "#dcfce7"}
                        ],
                        "connections": [
                            {"from": "b1", "to": "b2", "label": "HTTPS Request"},
                            {"from": "b2", "to": "b3", "label": "Reverse Proxy"},
                            {"from": "b3", "to": "b4", "label": "SQL Query"}
                        ]
                    },
                    "source": {"page": 1, "section": "Backend Architecture"}
                }
            elif mode == "simplify":
                spoken = f"In simple terms, frontend is the restaurant dining room, while backend is the kitchen and pantry preparing orders."
                teacher_text = (
                    f"### Simplifying **{concept_title}**\n\n"
                    f"**The Restaurant Kitchen Metaphor:**\n\n"
                    f"• **The Waiter (API Request)**: Takes the customer's order from the table to the kitchen.\n"
                    f"• **The Kitchen (Backend Logic)**: Verifies the ingredients, cooks the dish, and ensures food quality.\n"
                    f"• **The Pantry (Database)**: Organizes and securely stores all supplies so nothing is lost."
                )
                visual = {
                    "type": "process_diagram",
                    "title": f"Simplifying Backend: {concept_title}",
                    "data": {
                        "steps": [
                            {"step": 1, "title": "Client Request", "desc": "HTTP method (GET, POST) + payload sent to endpoint."},
                            {"step": 2, "title": "Validation & Business Logic", "desc": "Auth check, input validation, and logic processing."},
                            {"step": 3, "title": "Persistent State", "desc": "Transaction committed to database; status code returned."}
                        ]
                    },
                    "source": {"page": 1, "section": "Backend Mental Models"}
                }
            else:
                spoken = f"Let's look at key backend engineering best practices for {concept_title}: idempotency, authentication, and scaling."
                teacher_text = (
                    f"### Backend Engineering: **{concept_title}**\n\n"
                    f"Core principles for production-grade backend services:\n\n"
                    f"• **Statelessness**: Keep API instances stateless so they can scale horizontally behind a load balancer.\n"
                    f"• **Database Indexing**: Query performance degrades exponentially without B-tree indexes on foreign keys and filter columns.\n"
                    f"• **Defense in Depth**: Always sanitize inputs, use parameterized queries to stop SQL injection, and enforce HTTPS."
                )
                visual = {
                    "type": "comparison_table",
                    "title": f"Backend Production Checklist: {concept_title}",
                    "data": {
                        "headers": ["Component", "Production Standard", "Vulnerability / Risk"],
                        "rows": [
                            ["Database Queries", "Parameterized SQL / ORM", "SQL Injection"],
                            ["Authentication", "Signed JWTs with expiration", "Session hijacking / replay attacks"],
                            ["Deployment", "Containerized (Docker) behind NGINX", "Unmanaged port exposure"]
                        ]
                    },
                    "source": {"page": 1, "section": "Backend Production Standards"}
                }

        else:
            # General Computer Science & Engineering Pedagogy
            spoken = f"Let's explore {concept_title} from first principles and understand how it fits into software engineering."
            teacher_text = (
                f"### Understanding **{concept_title}**\n\n"
                f"When building comprehension of **{concept_title}**, starting from fundamental principles provides the strongest mental model:\n\n"
                f"• **Core Principle**: {concept_title} addresses a specific functional challenge in systems design and algorithmic logic.\n"
                f"• **Deterministic Behavior**: High-quality implementations produce predictable outputs for given inputs with well-defined edge cases.\n"
                f"• **Engineering Impact**: Mastering this pattern enables you to write cleaner abstractions, debug faster, and build resilient software."
            )
            visual = {
                "type": "flowchart",
                "title": f"{concept_title}: Conceptual Architecture",
                "data": {
                    "nodes": [
                        {"id": "g1", "label": f"{concept_title} Input", "color": "#e0e7ff"},
                        {"id": "g2", "label": "Core Mechanism", "color": "#fef3c7"},
                        {"id": "g3", "label": "Verified Output", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "g1", "to": "g2", "label": "Initializes"},
                        {"from": "g2", "to": "g3", "label": "Produces"}
                    ]
                },
                "source": {"page": 1, "section": "LEARNOVA Curriculum Engine"}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken,
            "teacher_text": teacher_text,
            "teaching_mode": mode or "explain",
            "active_concept": concept_title,
            "misconception_detected": None,
            "visual_element": visual,
            "citations": citations,
            "follow_up_prompt": follow_up,
            "language": lang
        }

    def _handle_explain(self, concept: str, query: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        concept_slug = re.sub(r'[^a-z0-9]+', '_', concept.lower()).strip('_')
        learner_state.record_concept_interaction(concept_slug, 0.05)

        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="explain",
                citations=citations,
                query=query,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            summary_snippet = " ".join(sentences[:3]) if sentences else raw_content[:240]
            lead_sentence = sentences[0] if sentences else summary_snippet

            spoken_text = f"From your material on {concept}: {lead_sentence[:120]}."
            detailed_text = (
                f"### Understanding **{concept}**\n\n"
                f"Grounded directly in **{section}** (Page {page}):\n\n"
                f"{summary_snippet}\n\n"
                f"**Key Focus Points:**\n"
                f"• **Foundational Principle**: {sentences[0] if len(sentences) > 0 else 'Core insight from study text.'}\n"
                f"• **Mechanism & Detail**: {sentences[1] if len(sentences) > 1 else 'Direct application from reading.'}\n"
                f"• **Key Takeaway**: {sentences[2] if len(sentences) > 2 else 'Key takeaway for this concept.'}"
            )
            if lang == "kn":
                spoken_text = f"ನಿಮ್ಮ ಪಠ್ಯದಲ್ಲಿ {concept} ವಿವರಣೆ ಇಲ್ಲಿದೆ: {lead_sentence[:80]}."
                detailed_text = (
                    f"**{concept} ಕುರಿತ ಮಾಹಿತಿ (ಪುಟ {page}):**\n\n"
                    f"{summary_snippet}\n\n"
                    f"• **ಮುಖ್ಯ ಅಂಶ**: {sentences[0] if len(sentences) > 0 else 'ಪ್ರಮುಖ ಪರಿಕಲ್ಪನೆ.'}\n"
                    f"• **ಅನ್ವಯ**: {sentences[1] if len(sentences) > 1 else 'ಉಪಯುಕ್ತ ಮಾಹಿತಿ.'}"
                )
            elif lang == "hi":
                spoken_text = f"आपकी सामग्री में {concept} का विवरण: {lead_sentence[:80]}."
                detailed_text = (
                    f"**{concept} का अध्ययन (पृष्ठ {page}):**\n\n"
                    f"{summary_snippet}\n\n"
                    f"• **मुख्य बिंदु**: {sentences[0] if len(sentences) > 0 else 'मूल सिद्धांत।'}\n"
                    f"• **विवरण**: {sentences[1] if len(sentences) > 1 else 'अनुप्रयोग।'}"
                )

            visual_element = {
                "type": "flowchart",
                "title": f"{concept}: Concept Structure",
                "data": {
                    "nodes": [
                        {"id": "n1", "label": concept, "color": "#e0e7ff"},
                        {"id": "n2", "label": section, "color": "#dbeafe"},
                        {"id": "n3", "label": "Key Insight", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "n1", "to": "n2", "label": "Defined in"},
                        {"from": "n2", "to": "n3", "label": "Produces"}
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = f"The Transport Layer manages true end-to-end communication between applications. Notice the demultiplexing flow on your whiteboard."
            detailed_text = (
                f"Let's explore **{concept}** directly from your material!\n\n"
                f"The core responsibility of the Transport Layer is managing end-to-end communication between software applications. "
                f"Unlike the Network Layer below it (which only knows how to route raw packets between physical machines), the Transport Layer "
                f"ensures that the specific process—like your browser or streaming app—gets its exact data stream intact.\n\n"
                f"It relies primarily on two contrasting protocols:\n"
                f"• **TCP**: Highly disciplined, connection-oriented, and guarantees 100% arrival.\n"
                f"• **UDP**: Fast, lightweight, and transmits datagrams without waiting for handshakes."
            )

            if lang == "kn":
                spoken_text = f"{concept} ಅಪ್ಲಿಕೇಶನ್‌ಗಳ ನಡುವೆ ಎಂಡ್-ಟು-ಎಂಡ್ ಸಂವಹನವನ್ನು ನಿರ್ವಹಿಸುತ್ತದೆ. ವೈಟ್‌ಬೋರ್ಡ್‌ನಲ್ಲಿರುವ ಫ್ಲೋಚಾರ್ಟ್ ಗಮನಿಸಿ."
                detailed_text = (
                    f"**{concept} ವಿವರಣೆ:**\n\n"
                    f"ಟ್ರಾನ್ಸ್‌ಪೋರ್ಟ್ ಲೇಯರ್ (Transport Layer) ಮುಖ್ಯವಾಗಿ ಸಾಫ್ಟ್‌ವೇರ್ ಅಪ್ಲಿಕೇಶನ್‌ಗಳ ನಡುವೆ **End-to-End** ಸಂವಹನವನ್ನು ಒದಗಿಸುತ್ತದೆ.\n\n"
                    f"ಇದು ಎರಡು ಪ್ರಮುಖ ಪ್ರೋಟೋಕಾಲ್‌ಗಳನ್ನು ಬಳಸುತ್ತದೆ:\n"
                    f"• **TCP**: ಕನೆಕ್ಷನ್-ಓರಿಯೆಂಟೆಡ್ ಮತ್ತು ವಿಶ್ವಾಸಾರ್ಹ (Reliable) ಡೆಲಿವರಿ ನೀಡುತ್ತದೆ.\n"
                    f"• **UDP**: ವೇಗದ ಮತ್ತು ಕನೆಕ್ಷನ್‌ಲೆಸ್ (Connectionless) ಡೇಟಾಗ್ರಾಮ್ ಸೇವೆ ನೀಡುತ್ತದೆ."
                )
            elif lang == "hi":
                spoken_text = f"{concept} एप्लिकेशन्स के बीच एंड-टू-एंड संचार संभालता है। व्हाइटबोर्ड पर फ़्लोचार्ट देखें।"
                detailed_text = (
                    f"**{concept} की व्याख्या:**\n\n"
                    f"ट्रांसपोर्ट लेयर मुख्य रूप से दो सॉफ्टवेयर प्रक्रियाओं के बीच **End-to-End** संचार सुनिश्चित करता है।\n\n"
                    f"इसके दो मुख्य प्रोटोकॉल हैं:\n"
                    f"• **TCP**: कनेक्शन-ओरिएंटेड और 100% डिलीवरी की गारंटी देता है।\n"
                    f"• **UDP**: हल्का और अत्यंत तेज, लेकिन बिना डिलीवरी गारंटी के।"
                )

            visual_element = {
                "type": "flowchart",
                "title": f"{concept}: Process-to-Process Demuxing",
                "data": {
                    "nodes": [
                        {"id": "n1", "label": "Network Layer (IP Packets)", "color": "#e0e7ff"},
                        {"id": "n2", "label": "Transport Layer (Port Demux: 80, 443)", "color": "#dbeafe"},
                        {"id": "n3", "label": "Application Layer (Browser Socket)", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "n1", "to": "n2", "label": "Unpack IP Payload"},
                        {"from": "n2", "to": "n3", "label": "Socket Dispatch"}
                    ]
                },
                "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "explain",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like a real-world analogy, a simpler breakdown, or a quick check?",
            "language": lang
        }

    def _handle_simplify(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="simplify",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            core_summary = sentences[0] if sentences else raw_content[:140]
            spoken_text = f"Simply put, {concept} means: {core_summary[:100]}."
            detailed_text = (
                f"### Simplifying **{concept}**\n\n"
                f"**In Everyday Language:**\n"
                f"Imagine breaking down this concept without the technical jargon:\n\n"
                f"• **Core Purpose**: {core_summary}\n"
                f"• **Why It Matters**: It gives your system a reliable foundation as described in *{section}* (Page {page}).\n\n"
                f"**Plain-English Rule:**\n"
                f"{sentences[1] if len(sentences) > 1 else 'Master this baseline before moving to the advanced subsections.'}"
            )
            visual_element = {
                "type": "process_diagram",
                "title": f"Simplifying {concept}",
                "data": {
                    "steps": [
                        {"step": 1, "title": "Foundation", "desc": core_summary[:70]},
                        {"step": 2, "title": "Application", "desc": f"Operates within {section}."},
                        {"step": 3, "title": "Outcome", "desc": "Produces predictable, verified results."}
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "Think of IP as the mail carrier delivering to an office building, while the Transport Layer is the internal courier bringing letters to your desk."
            detailed_text = (
                f"Let's simplify **{concept}** with an everyday analogy:\n\n"
                f"Imagine a huge office building. The mail carrier drops a giant bag of letters at the front desk. That front desk delivery is the **Network Layer (IP)**—it found the building.\n\n"
                f"Now, who actually walks up the stairs, knocks on Room 402, and hands the letter directly to Sarah? That internal courier is the **Transport Layer**! "
                f"It takes the data from the building entrance and delivers it directly to the exact process (Port) that requested it."
            )

            visual_element = {
                "type": "process_diagram",
                "title": "Simplifying Layer 4: The Internal Courier",
                "data": {
                    "steps": [
                        {"step": 1, "title": "Building Delivery", "desc": "IP delivers packet to device address."},
                        {"step": 2, "title": "Room Delivery", "desc": "Transport Layer routes to process port number."},
                        {"step": 3, "title": "Verification", "desc": "TCP gets a signed receipt; UDP drops and runs."}
                    ]
                },
                "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "simplify",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Does that courier image make the concept clearer?",
            "language": lang
        }

    def _handle_example(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="example",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            ex = sentences[1] if len(sentences) > 1 else (sentences[0] if sentences else raw_content[:140])
            spoken_text = f"Here is a concrete example regarding {concept}: {ex[:100]}."
            detailed_text = (
                f"### Concrete Example: **{concept}**\n\n"
                f"Grounded directly in **{section}** (Page {page}):\n\n"
                f"• **Practical Occurrence**: {ex}\n"
                f"• **Foundational Principle**: {sentences[0] if sentences else 'Described in the study material.'}\n\n"
                f"Notice how this example reinforces the principles from the document."
            )
            visual_element = {
                "type": "comparison_table",
                "title": f"Example Context: {concept}",
                "data": {
                    "headers": ["Aspect", "Document Specification", "Real-World Context"],
                    "rows": [
                        ["Subject", concept, "Active Lesson Topic"],
                        ["Manifestation", ex[:60], "Observed in Material"],
                        ["Grounded In", section, f"Page {page} of Uploaded Doc"]
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "Banking transactions demand TCP because zero data loss is required. Live Zoom video calls choose UDP because zero latency matters more than a dropped millisecond."
            detailed_text = (
                f"Here is a concrete real-world comparison for **{concept}**:\n\n"
                f"• **Banking Transfer (TCP)**: If even 1 single byte out of 10 million is dropped, TCP halts and requests that exact byte again. You never want corrupted financial data!\n\n"
                f"• **Live Zoom Call (UDP)**: If one audio frame drops for 10 milliseconds, your ear barely notices. If Zoom paused the entire call to retransmit that 10ms frame, your call would freeze. UDP prioritizes live continuous time over perfection."
            )
            visual_element = {
                "type": "comparison_table",
                "title": "Protocol Selection: Banking vs. Live Video",
                "data": {
                    "headers": ["Scenario", "Protocol", "Why Chosen?", "Packet Loss Cost"],
                    "rows": [
                        ["Bank Transfer / Web", "TCP", "Zero-loss guarantee required", "Critical (Data corrupted)"],
                        ["Live Zoom Call", "UDP", "Zero lag is paramount", "Tolerable (Minor glitch)"],
                        ["Online Gaming", "UDP", "Real-time coordinates matter", "Ignored (Outdated pos discarded)"]
                    ]
                },
                "source": {"page": chunk.get("page_number", 5), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "example",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like another example, or shall we try a quick quiz?",
            "language": lang
        }

    def _handle_analogy(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="analogy",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            core = sentences[0] if sentences else raw_content[:120]
            spoken_text = f"Think of {concept} like an organized system where inputs are transformed step by step."
            detailed_text = (
                f"### Intuitive Analogy: **{concept}**\n\n"
                f"**The Structured Assembly Analogy**:\n\n"
                f"To understand **{concept}**, imagine a specialized production facility:\n\n"
                f"1. **Input Stage**: The necessary components identified in *{section}* are gathered.\n"
                f"2. **Transformation Phase**: {core}\n"
                f"3. **Resulting Output**: The final state is systematically produced for use."
            )
            visual_element = {
                "type": "comparison_table",
                "title": f"Analogy: {concept} in Perspective",
                "data": {
                    "headers": ["Process Phase", "Everyday Metaphor", "Document Ground Truth"],
                    "rows": [
                        ["Input", "Gathering Raw Ingredients", f"Defined in {section}"],
                        ["Transformation", "Assembly Pipeline", core[:60]],
                        ["Outcome", "Finished Delivery", f"Grounded understanding of {concept}"]
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "TCP is like Registered Certified Mail with return receipts requested. UDP is like shouting an announcement through a megaphone."
            detailed_text = (
                f"**The Registered Mail vs. Megaphone Analogy** for **{concept}**:\n\n"
                f"1. **TCP (Registered Mail)**: Calls ahead to schedule delivery (3-way handshake), transmits numbered envelopes, collects signed receipts, and resends any missing parcel.\n\n"
                f"2. **UDP (Megaphone Announcement)**: Shouts immediately without scheduling. Anyone present hears it instantly. If traffic honks and words are lost, speech continues uninterrupted."
            )
            visual_element = {
                "type": "comparison_table",
                "title": "The Postal Analogy: TCP vs UDP",
                "data": {
                    "headers": ["Analogy Property", "TCP (Certified Mail)", "UDP (Megaphone)"],
                    "rows": [
                        ["Setup Phase", "Call ahead (3-way handshake)", "None (Start shouting immediately)"],
                        ["Lost Data", "Courier resends identical copy", "Lost permanently, speech continues"],
                        ["Overhead", "Heavy envelopes, return receipts", "Zero paperwork"]
                    ]
                },
                "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "analogy",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like to test your understanding with a quick quiz?",
            "language": lang
        }

    def _handle_visual(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="visual",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            core = sentences[0] if sentences else raw_content[:100]
            spoken_text = f"I have mapped the visual architecture of {concept} on your whiteboard."
            detailed_text = (
                f"Examine the **{concept}** relationship map on your visual workspace.\n\n"
                f"This visual breakdown highlights the sequence of actions and grounded principles documented in *{section}* (Page {page})."
            )
            visual_element = {
                "type": "timeline",
                "title": f"{concept}: Structural Flow",
                "data": {
                    "events": [
                        {"step": "1", "sender": "Initiation", "label": "Context Setup", "desc": f"Grounding established in {section}."},
                        {"step": "2", "sender": "Core Phase", "label": concept, "desc": core[:80]},
                        {"step": "3", "sender": "Integration", "label": "Synthesis", "desc": "Output utilized across adjacent concepts."}
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "I have diagrammed the 3-Way Handshake timeline on your whiteboard. Notice the sequence synchronization before payload data flows."
            detailed_text = (
                f"Examine the **{concept}** connection sequence on your visual whiteboard.\n\n"
                f"Notice how the 3-Way Handshake synchronizes sequence numbers (SYN, SYN-ACK, ACK) before a single byte of application data is sent. "
                f"This ensures both client and server agree on buffers and segment boundaries."
            )
            visual_element = {
                "type": "timeline",
                "title": "TCP 3-Way Handshake Connection Protocol",
                "data": {
                    "events": [
                        {"step": "1", "sender": "Client -> Server", "label": "SYN (Seq = 100)", "desc": "Client requests synchronization of sequence numbers."},
                        {"step": "2", "sender": "Server -> Client", "label": "SYN-ACK (Seq = 300, Ack = 101)", "desc": "Server acknowledges 100 and sends its own sequence 300."},
                        {"step": "3", "sender": "Client -> Server", "label": "ACK (Ack = 301)", "desc": "Client confirms receipt. Connection is ESTABLISHED."},
                        {"step": "4", "sender": "Both Parties", "label": "Data Transfer Phase", "desc": "Full-duplex lossless byte stream begins."}
                    ]
                },
                "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "visual",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like to explore deeper or take a quick quiz?",
            "language": lang
        }

    def _handle_socratic(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="socratic",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            core = sentences[0] if sentences else raw_content[:120]
            spoken_text = f"Consider the significance of {concept}. What would happen if this step were omitted?"
            detailed_text = (
                f"**Socratic Thought Challenge: {concept}**\n\n"
                f"Review this finding from *{section}* (Page {page}):\n\n"
                f"> \"{core}\"\n\n"
                f"If a system attempted to operate without this mechanism, what failure mode would occur first?"
            )
            visual_element = {
                "type": "concept_map",
                "title": f"Socratic Dilemma: {concept}",
                "data": {
                    "central": concept,
                    "branches": [
                        {"title": "With Mechanism Active", "description": "System maintains stability and verified output."},
                        {"title": "If Mechanism Omitted", "description": "Failure cascade due to unhandled dependencies."}
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "Consider a multiplayer game where a Wi-Fi glitch drops player coordinates from two seconds ago. If TCP forced retransmission, what would happen to the game?"
            detailed_text = (
                f"**Socratic Thought Challenge: {concept}**\n\n"
                f"Imagine you are engineering the multiplayer network for a competitive battle-royale video game. "
                f"60 players are moving every 16 milliseconds. A player's Wi-Fi briefly hiccups and drops 3 coordinate packets from 2 seconds ago.\n\n"
                f"If you used **TCP**, your game engine would freeze all player movement until those 3 old packets were retransmitted and delivered.\n\n"
                f"Why is that fatal for a live shooter, and what should the game engine do instead?"
            )
            visual_element = {
                "type": "concept_map",
                "title": "Socratic Dilemma: Stale vs. Fresh Data",
                "data": {
                    "central": "Live Gaming Telemetry",
                    "branches": [
                        {"title": "If TCP Used", "description": "Forces retransmit of old coordinates; causes visible freeze & lag"},
                        {"title": "If UDP Used", "description": "Discards old packet; renders immediate fresh coordinates"}
                    ]
                },
                "source": {"page": chunk.get("page_number", 5), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "check",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "socratic",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "What do you think? How would you answer this challenge?",
            "language": lang
        }

    def _handle_deep_dive(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="deep_dive",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            spoken_text = f"Let's explore the deeper mechanics of {concept} as documented in your material."
            detailed_text = (
                f"### Technical Deep Dive: **{concept}**\n\n"
                f"Comprehensive breakdown from **{section}** (Page {page}):\n\n"
                + "\n".join([f"• **Point {i+1}**: {s}" for i, s in enumerate(sentences[:4])])
            )
            visual_element = {
                "type": "flowchart",
                "title": f"Deep Dive: {concept} Architecture",
                "data": {
                    "nodes": [
                        {"id": "d1", "label": "Prerequisites", "color": "#fee2e2"},
                        {"id": "d2", "label": concept, "color": "#fef3c7"},
                        {"id": "d3", "label": "Synthesized Result", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "d1", "to": "d2", "label": "Initializes"},
                        {"from": "d2", "to": "d3", "label": "Produces"}
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "TCP implements sliding window flow control to protect receivers and congestion control algorithms like Slow Start to protect network bandwidth."
            detailed_text = (
                f"**Technical Deep Dive: {concept}**\n\n"
                f"Beyond simple acknowledgments, TCP implements **Sliding Window Flow Control** and **Congestion Control (Tahoe, Reno, BBR)**:\n\n"
                f"1. **Flow Control (Window Size `rwnd`)**: The receiver advertises its available buffer space in every ACK header. The sender is strictly forbidden from transmitting more bytes than `rwnd`, preventing fast senders from drowning slow receivers.\n\n"
                f"2. **Congestion Control (`cwnd`)**: TCP infers network bottleneck states through packet loss or latency jitter, dynamically executing Slow Start, Congestion Avoidance, and Fast Retransmit."
            )
            visual_element = {
                "type": "flowchart",
                "title": "TCP Congestion Control State Machine",
                "data": {
                    "nodes": [
                        {"id": "s1", "label": "Slow Start (cwnd doubles every RTT)", "color": "#fee2e2"},
                        {"id": "s2", "label": "Congestion Avoidance (linear cwnd + 1)", "color": "#fef3c7"},
                        {"id": "s3", "label": "Fast Recovery / Retransmit", "color": "#dcfce7"}
                    ],
                    "connections": [
                        {"from": "s1", "to": "s2", "label": "Reaches ssthresh threshold"},
                        {"from": "s2", "to": "s3", "label": "3 Duplicate ACKs received"},
                        {"from": "s3", "to": "s2", "label": "New ACK arrives"}
                    ]
                },
                "source": {"page": chunk.get("page_number", 5), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "deep_dive",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Ready to test this deep-dive knowledge with an application question?",
            "language": lang
        }

    def _handle_exam_mode(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        is_demo_doc = chunk.get("document_id") == "doc_networks_osi_101"
        section = chunk.get("section", "Curriculum Section")
        page = chunk.get("page_number", 1)
        raw_content = chunk.get("content", "").strip()

        if not is_demo_doc and (not raw_content or chunk.get("document_id") == "general_learning"):
            return self._handle_general_pedagogy(
                concept=concept,
                mode="exam",
                citations=citations,
                lang=lang
            )

        if not is_demo_doc and raw_content:
            sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', raw_content) if len(s.strip()) > 15]
            spoken_text = f"In exam mode, focus on the core definition and verified details of {concept}."
            detailed_text = (
                f"### High-Yield Exam Review: **{concept}**\n\n"
                f"Grounded directly in **{section}** (Page {page}):\n\n"
                + "\n".join([f"{i+1}. {s}" for i, s in enumerate(sentences[:3])])
            )
            visual_element = {
                "type": "comparison_table",
                "title": f"Exam Review: {concept}",
                "data": {
                    "headers": ["Specification", "Detail", "Significance"],
                    "rows": [
                        ["Core Concept", concept, "Primary Exam Topic"],
                        ["Key Definition", sentences[0][:50] if sentences else "Defined in source", "Tested on Assessments"],
                        ["Reference Section", section, f"Page {page}"]
                    ]
                },
                "source": {"page": page, "section": section}
            }
        else:
            spoken_text = "In exam mode, examine this protocol comparison matrix and be ready to justify architectural decisions."
            detailed_text = (
                f"**Exam Focus: {concept}**\n\n"
                f"Key points frequently tested on university and certification exams:\n"
                f"1. Transport layer addresses processes via 16-bit **Port Numbers** (e.g. HTTP 80, HTTPS 443).\n"
                f"2. TCP header is **20-60 bytes**; UDP header is fixed at **8 bytes**.\n"
                f"3. TCP connection teardown requires a 4-way handshake (FIN -> ACK -> FIN -> ACK)."
            )
            visual_element = {
                "type": "comparison_table",
                "title": "Exam High-Yield Protocol Specifications",
                "data": {
                    "headers": ["Specification", "TCP", "UDP"],
                    "rows": [
                        ["Header Size", "20-60 bytes (variable)", "8 bytes (fixed)"],
                        ["State Machine", "11 States (ESTABLISHED, TIME_WAIT...)", "Stateless"],
                        ["Checksum", "Mandatory with pseudo-header", "Optional in IPv4, Mandatory in IPv6"]
                    ]
                },
                "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
            }

        return {
            "intent": "teach",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "exam",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like an exam-style multiple-choice question on this topic?",
            "language": lang
        }

teacher_brain = TeacherBrain()
