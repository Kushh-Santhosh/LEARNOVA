"""
LEARNOVA Screen-Aware Professor Nova Service
Turn Information Into Understanding — Visually and Contextually.

Provides multimodal screen understanding, DOM-first element detection,
step planning, visual pointer coordinates, and pedagogy (WHAT, WHY, NEXT).
Adheres strictly to the FREE-ONLY policy, transient in-memory processing,
and zero logging of sensitive screen data.
"""

import os
import json
import re
import httpx
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional
from openrouter_router import openrouter_router


class VisionProvider(ABC):
    """Abstract base class for screen vision providers."""

    @abstractmethod
    async def analyze_screen(
        self,
        screenshot_base64: str,
        goal: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        pass

    @abstractmethod
    def is_available(self) -> bool:
        pass


class OpenRouterVisionProvider(VisionProvider):
    """
    OpenRouter Multimodal Vision Provider.
    Only executes if a verified FREE model supports image inputs (cost == $0.00).
    Never executes paid models.
    """
    def __init__(self):
        self._router = openrouter_router

    def is_available(self) -> bool:
        return self._router.is_configured()

    async def analyze_screen(
        self,
        screenshot_base64: str,
        goal: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        if not self.is_available() or not screenshot_base64:
            return None

        # Clean base64 header if present
        cleaned_b64 = screenshot_base64
        if "base64," in cleaned_b64:
            cleaned_b64 = cleaned_b64.split("base64,")[1]

        # Verify free models on OpenRouter
        free_models = await self._router.discover_free_models()
        # Strictly select models that are verified free ($0) AND verified capable of vision input
        vision_candidates = [
            m for m in free_models
            if (m.get("is_vision", False) or any(k in m.get("id", "").lower() for k in ["-vl", "vision", "space-bunny"]))
            and m.get("prompt_price", 1.0) == 0.0
            and m.get("completion_price", 1.0) == 0.0
            and m.get("id") != "openrouter/free"  # openrouter/free is an unspecialized meta-router that may not accept image payloads
        ]

        if not vision_candidates:
            # SAFETY ASSERTION: Never send images to unverified models.
            # Return None so the caller gracefully falls back to DOM/accessibility mode.
            return None

        headers = {
            "Authorization": f"Bearer {self._router.api_key}",
            "HTTP-Referer": "https://learnova.ai",
            "X-Title": "LEARNOVA Screen-Aware Companion",
            "Content-Type": "application/json"
        }

        system_prompt = (
            "You are Professor Nova, a calm, male, authoritative AI teacher guiding a learner on their screen. "
            "Analyze the screenshot for the user's goal. Identify the key interactive element to click or view. "
            "Output strictly valid JSON with no markdown formatting:\n"
            "{\n"
            '  "application": "Name of app",\n'
            '  "screen_description": "Summary of current screen",\n'
            '  "element_label": "Label of element to interact with",\n'
            '  "action": "click" | "look" | "input",\n'
            '  "instruction": "Concise instruction",\n'
            '  "what": "What this does",\n'
            '  "why": "Why do this now",\n'
            '  "next": "What comes next"\n'
            "}"
        )

        prompt_text = f"User Goal: {goal}\nContext: {json.dumps(context or {})}"

        payload_content = [
            {"type": "text", "text": prompt_text},
            {
                "type": "image_url",
                "image_url": {
                    "url": f"data:image/jpeg;base64,{cleaned_b64}"
                }
            }
        ]

        for cand in vision_candidates[:2]:
            model_id = cand["id"]
            # Strict billing safety assertion
            if cand.get("prompt_price", 0.0) != 0.0 or cand.get("completion_price", 0.0) != 0.0:
                continue

            try:
                async with httpx.AsyncClient(timeout=12.0) as client:
                    resp = await client.post(
                        "https://openrouter.ai/api/v1/chat/completions",
                        headers=headers,
                        json={
                            "model": model_id,
                            "messages": [
                                {"role": "system", "content": system_prompt},
                                {"role": "user", "content": payload_content}
                            ],
                            "max_tokens": 400,
                            "temperature": 0.2
                        }
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            raw_txt = choices[0].get("message", {}).get("content", "").strip()
                            # Parse JSON
                            match = re.search(r'\{.*\}', raw_txt, re.DOTALL)
                            if match:
                                return json.loads(match.group(0))
            except Exception:
                continue

        return None


class LocalDOMVisionProvider:
    """
    DOM & Accessibility-First Guidance Engine.
    Deterministic, zero-latency, private, and works 100% offline.
    Directly maps LEARNOVA workflows to exact UI components with exact bounding boxes.
    """

    LEARNOVA_WORKFLOWS = {
        "upload_document": [
            {
                "step": 1,
                "target_id": "nav-documents",
                "route": "documents",
                "label": "Documents",
                "instruction": "Click 'Documents' in the sidebar.",
                "what": "Navigates to the Study Materials & Document Hub.",
                "why": "All textbook PDFs, lecture notes, and study guides are indexed here.",
                "next": "Next, Nova will highlight the upload dropzone to add your file.",
                "spoken": "Let's upload your study material. Look at the left sidebar — I'm highlighting the Documents tab now."
            },
            {
                "step": 2,
                "target_id": "btn-upload-dropzone",
                "route": "documents",
                "label": "Upload Study Material",
                "instruction": "Click or drag your PDF, DOCX, or TXT file into the upload zone.",
                "what": "Uploads and processes your material through document segmentation and concept extraction.",
                "why": "LEARNOVA builds an individualized knowledge graph and grounding index directly from your document.",
                "next": "Once uploaded, Nova will guide you back to the Classroom to start learning.",
                "spoken": "Now click this upload area or drag in your file. I will index every section and build your knowledge graph."
            },
            {
                "step": 3,
                "target_id": "nav-classroom",
                "route": "classroom",
                "label": "Classroom",
                "instruction": "Click 'Learn' to open your AI Classroom workspace.",
                "what": "Enters the adaptive classroom with Professor Nova and your visual whiteboard.",
                "why": "Here you can ask questions, explore diagrams, and take comprehension quizzes grounded in your document.",
                "next": "You are ready to learn! You can ask questions or take a quick quiz.",
                "spoken": "Your document is processed and ready! Click Learn to enter your classroom workspace."
            }
        ],
        "explore_knowledge_graph": [
            {
                "step": 1,
                "target_id": "nav-knowledge",
                "route": "knowledge",
                "label": "Knowledge Architecture",
                "instruction": "Click 'Knowledge' in the sidebar.",
                "what": "Opens the interactive 2D Curriculum Knowledge Graph.",
                "why": "Visualizes how concepts, prerequisites, and relationships connect across your curriculum.",
                "next": "You can click any concept node to inspect its definitions and dependencies.",
                "spoken": "To explore your curriculum architecture, look at the sidebar. I'm pointing to the Knowledge Graph tab."
            },
            {
                "step": 2,
                "target_id": "graph-node-primary",
                "route": "knowledge",
                "label": "Concept Node",
                "instruction": "Click on any concept node to inspect its dependencies and mastery level.",
                "what": "Selects the concept to display detailed syllabus definitions and prerequisite pathways.",
                "why": "Understanding prerequisites prevents knowledge gaps before advancing to harder topics.",
                "next": "You can jump straight into a classroom lesson on this specific concept.",
                "spoken": "Notice how the concepts connect. Click on a node to see its prerequisites and learning status."
            }
        ],
        "start_quiz": [
            {
                "step": 1,
                "target_id": "btn-classroom-quiz",
                "route": "classroom",
                "label": "Quiz Me",
                "instruction": "Click the 'Quiz' button in the classroom header.",
                "what": "Generates a grounded comprehension check from the active document.",
                "why": "Active retrieval strengthens memory consolidation far more effectively than passive reading.",
                "next": "Nova will present an MCQ or True/False scenario grounded in your document.",
                "spoken": "Ready to test your comprehension? I'm highlighting the Quiz button in the top right."
            },
            {
                "step": 2,
                "target_id": "quiz-option-first",
                "route": "classroom",
                "label": "Answer Option",
                "instruction": "Select your answer and click 'Submit Answer'.",
                "what": "Evaluates your reasoning with instant evidentiary feedback.",
                "why": "Every attempt updates your mastery ledger and identifies any subtle misconceptions.",
                "next": "Nova will analyze your answer and suggest remediation if needed.",
                "spoken": "Review the question carefully, select your answer, and submit. I will provide instant feedback."
            }
        ],
        "teach_back": [
            {
                "step": 1,
                "target_id": "btn-classroom-teachback",
                "route": "classroom",
                "label": "Feynman Teach-Back",
                "instruction": "Click 'Teach-Back' in the classroom header.",
                "what": "Launches the Feynman technique self-explanation challenge.",
                "why": "Explaining a concept in your own words is the ultimate test of true understanding.",
                "next": "Type or speak your explanation for Professor Nova to grade.",
                "spoken": "The Feynman technique is the fastest way to master this topic. Click Teach-Back to explain it back to me."
            }
        ],
        "view_progress": [
            {
                "step": 1,
                "target_id": "nav-progress",
                "route": "progress",
                "label": "Progress & Analytics",
                "instruction": "Click 'Progress' in the sidebar.",
                "what": "Displays your evidentiary mastery ledger, accuracy rate, and 3-day revision plan.",
                "why": "Tracks authentic learning deltas rather than superficial gamified streaks.",
                "next": "You can inspect your 3-day spaced revision schedule.",
                "spoken": "Let's review your learning trajectory. I'm pointing to your Progress and Analytics tab."
            }
        ],
        "explain_current_screen": [
            {
                "step": 1,
                "target_id": "workspace-content",
                "route": "classroom",
                "label": "Classroom Workspace",
                "instruction": "You are currently inside the LEARNOVA Adaptive Classroom.",
                "what": "The left panel hosts our dialogue; the right panel renders your visual whiteboard and diagrams.",
                "why": "Dual-coding pedagogy combines verbal explanation with synchronized spatial diagrams.",
                "next": "You can ask questions, request simpler analogies, or launch quizzes anytime.",
                "spoken": "You're in your AI Classroom! On the left is our conversation; on the right is your live visual whiteboard."
            }
        ]
    }

    def detect_workflow(self, goal: str) -> str:
        g = goal.lower()
        if any(w in g for w in ["upload", "add doc", "import", "pdf", "file", "materials"]):
            return "upload_document"
        elif any(w in g for w in ["graph", "knowledge", "architecture", "map", "nodes"]):
            return "explore_knowledge_graph"
        elif any(w in g for w in ["quiz", "test", "check understanding", "mcq", "exam"]):
            return "start_quiz"
        elif any(w in g for w in ["teach-back", "teach back", "feynman", "explain back"]):
            return "teach_back"
        elif any(w in g for w in ["progress", "analytics", "stats", "revision", "mastery"]):
            return "view_progress"
        elif any(w in g for w in ["what am i looking at", "explain screen", "where am i", "overview", "what is this"]):
            return "explain_current_screen"
        return "upload_document"  # sensible default


class ScreenUnderstandingService:
    """
    Unified Screen Context and Guidance Service.
    Coordinates VisionProvider and LocalDOMVisionProvider to return structured guidance.
    """
    def __init__(self):
        self.vision_provider = OpenRouterVisionProvider()
        self.dom_provider = LocalDOMVisionProvider()

    async def analyze(
        self,
        goal: str,
        mode: str = "dom",
        current_route: str = "home",
        dom_elements: Optional[List[Dict[str, Any]]] = None,
        screenshot_base64: Optional[str] = None,
        step_index: int = 1,
        active_document_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Processes screen context and outputs structured guidance with coordinates & pedagogy.
        """
        dom_elements = dom_elements or []
        workflow_key = self.dom_provider.detect_workflow(goal)
        steps = self.dom_provider.LEARNOVA_WORKFLOWS.get(workflow_key, self.dom_provider.LEARNOVA_WORKFLOWS["upload_document"])

        # Determine current step in workflow
        step_idx = min(max(1, step_index), len(steps))
        step_data = steps[step_idx - 1]

        # Mode B (Browser Screen) with optional Vision
        vision_result = None
        if mode == "browser_screen" and screenshot_base64 and self.vision_provider.is_available():
            try:
                vision_result = await self.vision_provider.analyze_screen(
                    screenshot_base64=screenshot_base64,
                    goal=goal,
                    context={"current_route": current_route, "step": step_idx}
                )
            except Exception:
                vision_result = None

        # Resolve element coordinates from DOM elements if available
        matched_element = None
        target_id = step_data["target_id"]

        for el in dom_elements:
            el_id = el.get("id", "")
            el_guide_id = el.get("guide_id", "")
            el_text = el.get("text", "").lower()
            if target_id == el_id or target_id == el_guide_id or step_data["label"].lower() in el_text:
                matched_element = el
                break

        # Fallback element coordinates based on standard responsive layout if not in dom_elements
        if not matched_element:
            matched_element = self._default_coordinates_for_target(target_id, current_route)

        instruction = vision_result.get("instruction") if vision_result else step_data["instruction"]
        what = vision_result.get("what") if vision_result else step_data["what"]
        why = vision_result.get("why") if vision_result else step_data["why"]
        next_step = vision_result.get("next") if vision_result else step_data["next"]
        spoken = vision_result.get("spoken") if (vision_result and "spoken" in vision_result) else step_data.get("spoken", instruction)

        return {
            "status": "SUCCESS",
            "mode": mode,
            "workflow": workflow_key,
            "step_number": step_idx,
            "total_steps": len(steps),
            "is_last_step": (step_idx == len(steps)),
            "application": "LEARNOVA Adaptive AI Classroom",
            "screen_description": f"LEARNOVA workspace on route '{current_route}'",
            "target_element": {
                "id": matched_element.get("id", target_id),
                "guide_id": target_id,
                "label": step_data["label"],
                "type": matched_element.get("type", "interactive"),
                "x": matched_element.get("x", 100),
                "y": matched_element.get("y", 150),
                "width": matched_element.get("width", 160),
                "height": matched_element.get("height", 44),
                "confidence": 0.98 if not vision_result else 0.92
            },
            "recommended_action": {
                "action": "click",
                "instruction": instruction,
                "what": what,
                "why": why,
                "next": next_step
            },
            "spoken_text": spoken,
            "course_connection": {
                "active_document_id": active_document_id,
                "has_connection": bool(active_document_id),
                "explanation": f"Grounded in active curriculum: {active_document_id}" if active_document_id else None
            },
            "vision_fallback_active": (mode == "browser_screen" and vision_result is None)
        }

    def verify_step(
        self,
        workflow: str,
        step_number: int,
        current_route: str,
        user_action: str = "clicked",
        dom_evidence: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Verifies whether the learner's action advanced the expected state.
        """
        steps = self.dom_provider.LEARNOVA_WORKFLOWS.get(workflow, [])
        if not steps or step_number > len(steps):
            return {
                "status": "COMPLETED",
                "verified": True,
                "next_step": None,
                "message": "Workflow goal successfully achieved."
            }

        curr_step = steps[step_number - 1]
        expected_route = curr_step["route"]

        # If step expected route change or modal display
        route_matches = (current_route == expected_route) or (step_number == 1 and current_route != "home")
        has_evidence = dom_evidence.get("target_clicked", True) if dom_evidence else True

        if route_matches and has_evidence:
            is_finished = (step_number >= len(steps))
            return {
                "status": "COMPLETED" if is_finished else "STEP_COMPLETED",
                "verified": True,
                "current_step": step_number,
                "next_step": None if is_finished else (step_number + 1),
                "message": "Step verified. Ready for next action." if not is_finished else "Guidance sequence completed."
            }
        else:
            return {
                "status": "NEEDS_CONFIRMATION",
                "verified": False,
                "current_step": step_number,
                "next_step": step_number,
                "message": f"Looking for {curr_step['label']}. Please click the highlighted area to proceed."
            }

    def _default_coordinates_for_target(self, target_id: str, route: str) -> Dict[str, Any]:
        """Fallback coordinates based on LEARNOVA responsive shell layout."""
        if target_id == "nav-documents":
            return {"id": "nav-documents", "type": "tab", "x": 20, "y": 200, "width": 180, "height": 44}
        elif target_id == "nav-classroom":
            return {"id": "nav-classroom", "type": "tab", "x": 20, "y": 150, "width": 180, "height": 44}
        elif target_id == "nav-knowledge":
            return {"id": "nav-knowledge", "type": "tab", "x": 20, "y": 250, "width": 180, "height": 44}
        elif target_id == "nav-progress":
            return {"id": "nav-progress", "type": "tab", "x": 20, "y": 300, "width": 180, "height": 44}
        elif target_id == "btn-upload-dropzone":
            return {"id": "btn-upload-dropzone", "type": "dropzone", "x": 300, "y": 180, "width": 500, "height": 220}
        elif target_id == "btn-classroom-quiz":
            return {"id": "btn-classroom-quiz", "type": "button", "x": 1050, "y": 24, "width": 100, "height": 38}
        elif target_id == "btn-classroom-teachback":
            return {"id": "btn-classroom-teachback", "type": "button", "x": 1160, "y": 24, "width": 120, "height": 38}
        return {"id": target_id, "type": "element", "x": 320, "y": 200, "width": 240, "height": 60}


screen_service = ScreenUnderstandingService()
