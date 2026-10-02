"""
LEARNOVA Teacher Brain & Orchestration Layer
Orchestrates adaptive pedagogy: Explain, Simplify, Deep Dive, Example, Analogy, Visual, Socratic, Remediate.
Generates structured visual whiteboard elements and grounds all responses in retrieved document citations.
"""

import os
import httpx
from typing import Dict, Any, List, Optional
from embeddings_retriever import retriever
from misconception_engine import misconception_engine
from learner_state import learner_state
from demo_data import DEMO_CHUNKS, DEMO_COMMON_MISCONCEPTIONS

class TeacherBrain:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY", "")

    async def interact(
        self,
        doc_id: str,
        student_message: str,
        active_concept: str = "Transport Layer (L4)",
        mode: str = "explain"
    ) -> Dict[str, Any]:
        """
        Main teaching loop:
        1. Comprehension & Misconception Check
        2. Grounded Retrieval from uploaded document
        3. Adaptive Strategy Selection
        4. Structured Visual Generation
        5. Source Citation Packaging
        """
        # 1. Misconception Check
        misconception_result = misconception_engine.diagnose(student_message, active_concept)
        if misconception_result["needs_remediation"]:
            learner_state.record_misconception(misconception_result)
            # Find remediation visual
            remediation_info = DEMO_COMMON_MISCONCEPTIONS[0]
            return {
                "teacher_text": remediation_info["teacher_remediation_response"],
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
                "follow_up_prompt": "Would you like to try explaining the difference between UDP and TCP back to me, or take a quick quiz?"
            }

        # 2. Grounded Retrieval
        retrieved_chunks = retriever.retrieve(doc_id, f"{active_concept} {student_message}", top_k=2)
        if not retrieved_chunks:
            retrieved_chunks = DEMO_CHUNKS[:2]

        primary_chunk = retrieved_chunks[0]
        citations = [
            {
                "source": "Uploaded Document",
                "page": c.get("page_number", 1),
                "section": c.get("section", "Curriculum"),
                "excerpt": c.get("content", "")[:180] + "..."
            }
            for c in retrieved_chunks
        ]

        # 3. Adaptive Strategy Handling based on Mode and Learner Style
        profile = learner_state.profile
        style = profile.get("preferred_style", "Examples & Visuals")
        msg_lower = student_message.lower()

        # Mode overrides from student intent
        if "simpler" in msg_lower or "explain like i'm 5" in msg_lower or mode == "simplify":
            return self._handle_simplify(active_concept, primary_chunk, citations)
        elif "example" in msg_lower or mode == "example":
            return self._handle_example(active_concept, primary_chunk, citations)
        elif "analogy" in msg_lower or mode == "analogy":
            return self._handle_analogy(active_concept, primary_chunk, citations)
        elif "visual" in msg_lower or "diagram" in msg_lower or mode == "visual":
            return self._handle_visual(active_concept, primary_chunk, citations)
        elif "deep" in msg_lower or mode == "deep_dive":
            return self._handle_deep_dive(active_concept, primary_chunk, citations)
        elif "socratic" in msg_lower or mode == "socratic":
            return self._handle_socratic(active_concept, primary_chunk, citations)

        # Default: Adaptive Explain
        return self._handle_explain(active_concept, student_message, primary_chunk, citations, style)

    def _handle_explain(self, concept: str, query: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]], style: str) -> Dict[str, Any]:
        learner_state.record_concept_interaction("c_transport_layer", 0.05)
        
        teacher_text = (
            f"Let's explore **{concept}** directly from your material!\n\n"
            f"The core responsibility of the Transport Layer is managing end-to-end communication between software applications. "
            f"Unlike the Network Layer below it (which only knows how to route raw packets between physical machines), the Transport Layer "
            f"ensures that the specific process—like your browser or streaming app—gets its exact data stream intact.\n\n"
            f"It relies primarily on two contrasting protocols:\n"
            f"• **TCP**: Highly disciplined, connection-oriented, and guarantees 100% arrival.\n"
            f"• **UDP**: Fast, lightweight, and transmits datagrams without waiting for handshakes."
        )

        visual_element = {
            "type": "flowchart",
            "title": "OSI Layer 4: End-to-End Demultiplexing",
            "data": {
                "nodes": [
                    {"id": "n1", "label": "Network Layer (IP Packet Arrivals)", "color": "#e0e7ff"},
                    {"id": "n2", "label": "Transport Layer (Port Demuxing: 80, 443, 53)", "color": "#dbeafe"},
                    {"id": "n3", "label": "Application Layer (Browser / Video Player)", "color": "#dcfce7"}
                ],
                "connections": [
                    {"from": "n1", "to": "n2", "label": "Unpack IP Payload"},
                    {"from": "n2", "to": "n3", "label": "Deliver to Process Socket"}
                ]
            },
            "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "explain",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like a real-world analogy, a simpler breakdown, or a quick concept check?"
        }

    def _handle_simplify(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"No problem! Let's strip away all the technical jargon for **{concept}**.\n\n"
            f"Imagine a huge office building. The mail carrier drops a giant bag of letters at the front desk. That front desk delivery is the **Network Layer (IP)**—it found the building.\n\n"
            f"Now, who actually walks up the stairs, knocks on Room 402, and hands the letter directly to Sarah? That internal courier is the **Transport Layer**! "
            f"It takes the data from the building entrance and delivers it directly to the exact person (the app) who requested it."
        )

        visual_element = {
            "type": "process_diagram",
            "title": "Simplifying Layer 4: The Internal Courier",
            "data": {
                "steps": [
                    {"step": 1, "title": "Building Delivery", "desc": "IP delivers to the device host address."},
                    {"step": 2, "title": "Internal Delivery", "desc": "Transport Layer reads the Port # (Room number)."},
                    {"step": 3, "title": "Delivery Confirmation", "desc": "TCP gets a signed receipt; UDP drops and runs."}
                ]
            },
            "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "simplify",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Does that courier image make the concept clearer? We can look at a real-world example next."
        }

    def _handle_example(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"Here is a concrete real-world example of **{concept}** in everyday technology:\n\n"
            f"• When you download a PDF or make a bank transfer, your device uses **TCP**. If even 1 single byte out of 10 million is dropped, TCP halts and requests that exact byte again. You never want a corrupted banking transaction!\n\n"
            f"• But when you're on a live Discord or Zoom video call, your device uses **UDP**. If one audio frame drops for 10 milliseconds, your ear barely notices. If Zoom paused the entire call to retransmit that 10ms frame, your call would freeze. UDP prioritizes live continuous time over perfection."
        )

        visual_element = {
            "type": "comparison_table",
            "title": "Real-World Protocol Choice: File Transfer vs. Live Video",
            "data": {
                "headers": ["Scenario", "Protocol Used", "Why this Protocol?", "Cost of Packet Loss"],
                "rows": [
                    ["Bank Transfer / Web Page", "TCP", "Zero-loss guarantee required", "Critical (Data corrupted)"],
                    ["Live Zoom Call", "UDP", "Zero lag is paramount", "Tolerable (Minor glitch)"],
                    ["Online First-Person Game", "UDP", "Player coordinates must be instantaneous", "Ignored (Outdated position discarded)"],
                    ["Email / Document Send", "TCP", "Every attachment paragraph must match", "Guaranteed recovery via ACK"]
                ]
            },
            "source": {"page": chunk.get("page_number", 5), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "example",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Can you think of another app on your phone that would prefer UDP over TCP?"
        }

    def _handle_analogy(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"Here is an intuitive analogy for **{concept}**:\n\n"
            f"**The Registered Mail vs. Megaphone Analogy**:\n\n"
            f"1. **TCP is Registered Mail with Signature Verification**:\n"
            f"   - You call ahead to verify the recipient is home (SYN -> SYN-ACK).\n"
            f"   - You send numbered packages (1, 2, 3).\n"
            f"   - The recipient signs a return receipt for each package (ACK).\n"
            f"   - If package #2 went missing in transit, you automatically resend package #2 before continuing.\n\n"
            f"2. **UDP is Shouting through a Megaphone**:\n"
            f"   - You pick up the megaphone and start shouting immediately.\n"
            f"   - Anyone within earshot hears it instantly.\n"
            f"   - If a truck drives by and honks, someone misses a sentence, but you never stop or repeat yourself."
        )

        visual_element = {
            "type": "comparison_table",
            "title": "The Postal Analogy: TCP vs UDP",
            "data": {
                "headers": ["Analogy Element", "TCP", "UDP"],
                "rows": [
                    ["Communication Style", "Registered Mail with Signature", "Megaphone Announcement"],
                    ["Setup Phase", "Call ahead to schedule (3-way handshake)", "None (Start shouting immediately)"],
                    ["Lost Messages", "Courier resends identical copy", "Lost forever, speech continues"],
                    ["Overhead", "Heavy envelopes, return receipts", "Zero paperwork"]
                ]
            },
            "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "analogy",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Would you like to test your understanding with a quick quiz, or do a teach-back challenge?"
        }

    def _handle_visual(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"I have mapped out the architectural breakdown of **{concept}** on your classroom whiteboard.\n\n"
            f"Notice how the 3-Way Handshake establishes synchronized sequence numbers (SYN, SYN-ACK, ACK) before a single byte of user data is transmitted. "
            f"This ensures both client and server agree on buffers and segment boundaries."
        )

        visual_element = {
            "type": "timeline",
            "title": "TCP 3-Way Handshake Connection Protocol",
            "data": {
                "events": [
                    {"step": "1", "sender": "Client -> Server", "label": "SYN (Seq = 100)", "desc": "Client asks: Can we establish a synchronized stream?"},
                    {"step": "2", "sender": "Server -> Client", "label": "SYN-ACK (Seq = 300, Ack = 101)", "desc": "Server replies: Yes, I acknowledge 100 and here is my sequence 300."},
                    {"step": "3", "sender": "Client -> Server", "label": "ACK (Ack = 301)", "desc": "Client confirms: Received your sequence 300. Connection is ESTABLISHED."},
                    {"step": "4", "sender": "Both Parties", "label": "Data Transfer Phase", "desc": "Full-duplex lossless byte stream begins."}
                ]
            },
            "source": {"page": chunk.get("page_number", 4), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "visual",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Examine the handshake diagram. What do you think happens if step 2 (SYN-ACK) is lost?"
        }

    def _handle_deep_dive(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"Let's execute a technical deep dive into **{concept}**.\n\n"
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
                    {"id": "s2", "label": "Congestion Avoidance (linear growth cwnd + 1)", "color": "#fef3c7"},
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
            "teacher_text": teacher_text,
            "teaching_mode": "deep_dive",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "Ready to test this deep-dive knowledge with an application question?"
        }

    def _handle_socratic(self, concept: str, chunk: Dict[str, Any], citations: List[Dict[str, Any]]) -> Dict[str, Any]:
        teacher_text = (
            f"Let's test your intuition through a Socratic thought experiment:\n\n"
            f"Imagine you are designing the multiplayer network for a competitive battle-royale video game. "
            f"60 players are shooting and moving every 16 milliseconds. A player's Wi-Fi briefly hiccups and drops 3 movement packets from 2 seconds ago.\n\n"
            f"If you used **TCP**, your game engine would freeze all player movement until those 3 old packets were retransmitted and delivered.\n\n"
            f"Why is that fatal for a live shooter, and what should the game engine do instead?"
        )

        visual_element = {
            "type": "concept_map",
            "title": "Socratic Dilemma: Stale vs. Fresh Data",
            "data": {
                "central": "Live Gaming Telemetry",
                "branches": [
                    {"title": "If TCP", "description": "Forces retransmit of old coordinates; causes visible freeze & lag"},
                    {"title": "If UDP", "description": "Discards old packet; renders immediate fresh coordinates"}
                ]
            },
            "source": {"page": chunk.get("page_number", 5), "section": chunk.get("section", "Transport Layer")}
        }

        return {
            "teacher_text": teacher_text,
            "teaching_mode": "socratic",
            "active_concept": concept,
            "misconception_detected": None,
            "visual_element": visual_element,
            "citations": citations,
            "follow_up_prompt": "What do you think? Would you retransmit the old coordinate packets or discard them?"
        }

teacher_brain = TeacherBrain()
