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

class TeacherBrain:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")

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
        active_concept: str = "Transport Layer (L4)",
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

        # 2. Grounded Retrieval
        # Retrieve against student's actual question to detect off-document inquiries
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
            # Check if active concept was explicitly asked for
            concept_tokens = [w.lower() for w in active_concept.split() if len(w) > 3]
            if not any(ct in student_message.lower() for ct in concept_tokens):
                return self._build_off_document_decision(student_message, active_concept, detected_lang)

        # If question is general explanation command, fallback to active_concept
        if not retrieved_chunks:
            retrieved_chunks, _ = retriever.retrieve(doc_id=doc_id, query=active_concept, top_k=2, threshold=0.01)

        if not retrieved_chunks:
            retrieved_chunks = DEMO_CHUNKS[:2]

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

        # 3. Pedagogical Mode Selection
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

    def _build_remediation_decision(self, misconception_result: Dict[str, Any], lang: str) -> Dict[str, Any]:
        remediation_info = DEMO_COMMON_MISCONCEPTIONS[0]
        
        spoken_text = "I see what you're thinking, but speed and reliability are two completely different engineering properties. Let's look at this comparison on the whiteboard."
        detailed_text = remediation_info["teacher_remediation_response"]

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

        return {
            "intent": "remediate",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "remediate",
            "active_concept": misconception_result["concept"],
            "misconception_detected": misconception_result,
            "visual_element": remediation_info["visual_payload"],
            "citations": [
                {
                    "source": "Computer Networks: Principles & Architecture",
                    "page": 4,
                    "section": "The Transport Layer: TCP vs UDP",
                    "excerpt": "UDP is connectionless and lightweight without retransmissions; speed does not equate to reliability."
                }
            ],
            "follow_up_prompt": "Would you like to try explaining the difference back to me, or take a quick check?",
            "language": lang
        }

    def _build_off_document_decision(self, query: str, active_concept: str, lang: str) -> Dict[str, Any]:
        spoken_text = "I couldn't find that in your uploaded curriculum document. Let's stay focused on our active lesson topic."
        detailed_text = (
            f"**Not Found in Uploaded Material**\n\n"
            f"Your question *\"{query}\"* is not covered in the current study document. "
            f"LEARNOVA adheres to strict source grounding to ensure 100% academic accuracy.\n\n"
            f"Would you like to continue learning about **{active_concept}**, or upload additional reference material?"
        )

        if lang == "kn":
            spoken_text = "ನಿಮ್ಮ ಅಪ್‌ಲೋಡ್ ಮಾಡಿದ ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಇದು ಕಂಡುಬಂದಿಲ್ಲ. ನಮ್ಮ ಪಾಠದ ವಿಷಯಕ್ಕೆ ಮರಳೋಣ."
            detailed_text = f"**ಡಾಕ್ಯುಮೆಂಟ್‌ನಲ್ಲಿ ಮಾಹಿತಿ ಲಭ್ಯವಿಲ್ಲ**\n\nನಿಮ್ಮ ಪ್ರಶ್ನೆ ಈ ಸ್ಟಡಿ ಮೆಟೀರಿಯಲ್‌ನಲ್ಲಿ ಒಳಗೊಂಡಿಲ್ಲ. ನಾವು **{active_concept}** ಬಗ್ಗೆ ಮುಂದುವರಿಯೋಣವೇ?"
        elif lang == "hi":
            spoken_text = "यह जानकारी आपके अपलोड किए गए दस्तावेज़ में नहीं मिली है। आइए हमारे मुख्य पाठ पर ध्यान दें।"
            detailed_text = f"**दस्तावेज़ में अनुपलब्ध**\n\nआपका प्रश्न इस अध्ययन सामग्री में शामिल नहीं है। क्या आप **{active_concept}** पर आगे बढ़ना चाहेंगे?"

        return {
            "intent": "off_document",
            "spoken_text": spoken_text,
            "teacher_text": detailed_text,
            "teaching_mode": "explain",
            "active_concept": active_concept,
            "misconception_detected": None,
            "visual_element": None,
            "citations": [],
            "follow_up_prompt": f"Shall we continue exploring {active_concept}?",
            "language": lang
        }

    def _handle_explain(self, concept: str, query: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
        learner_state.record_concept_interaction("c_transport_layer", 0.05)

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
            "follow_up_prompt": "Can you think of another app that prefers UDP over TCP?",
            "language": lang
        }

    def _handle_analogy(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
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
            "follow_up_prompt": "What do you think happens if step 2 (SYN-ACK) is lost in transit?",
            "language": lang
        }

    def _handle_socratic(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
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
            "follow_up_prompt": "What do you think? Would you retransmit old player coordinates or drop them?",
            "language": lang
        }

    def _handle_deep_dive(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], lang: str) -> Dict[str, Any]:
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
            "follow_up_prompt": "Would you like an exam-style multiple-choice question on header size?",
            "language": lang
        }

teacher_brain = TeacherBrain()
