"""
LEARNOVA Knowledge Graph Engine
Manages hierarchical and relational concept graphs, node inspection, and curriculum pathways.
"""

from typing import Dict, Any, List, Optional
from demo_data import DEMO_CONCEPTS, DEMO_RELATIONSHIPS

class KnowledgeGraphManager:
    def __init__(self):
        # Maps doc_id -> {"concepts": [...], "relationships": [...]}
        self.graphs: Dict[str, Dict[str, Any]] = {}

    def set_graph(self, doc_id: str, concepts: List[Dict[str, Any]], relationships: List[Dict[str, Any]]):
        self.graphs[doc_id] = {
            "concepts": concepts,
            "relationships": relationships
        }

    def get_graph(self, doc_id: str) -> Dict[str, Any]:
        """Returns the full graph for a document, using default demo graph if not explicitly loaded."""
        if doc_id in self.graphs:
            return self.graphs[doc_id]
        return {
            "concepts": DEMO_CONCEPTS,
            "relationships": DEMO_RELATIONSHIPS
        }

    def get_concept_details(self, doc_id: str, concept_id: str) -> Optional[Dict[str, Any]]:
        graph = self.get_graph(doc_id)
        concept = next((c for c in graph["concepts"] if c["id"] == concept_id), None)
        if not concept:
            return None

        # Find incoming and outgoing relationships
        related = []
        for rel in graph["relationships"]:
            if rel["source"] == concept_id:
                target_c = next((c for c in graph["concepts"] if c["id"] == rel["target"]), None)
                if target_c:
                    related.append({
                        "id": target_c["id"],
                        "name": target_c["name"],
                        "relationship": rel["type"],
                        "direction": "outgoing",
                        "description": rel.get("description", "")
                    })
            elif rel["target"] == concept_id:
                src_c = next((c for c in graph["concepts"] if c["id"] == rel["source"]), None)
                if src_c:
                    related.append({
                        "id": src_c["id"],
                        "name": src_c["name"],
                        "relationship": rel["type"],
                        "direction": "incoming",
                        "description": rel.get("description", "")
                    })

        return {
            "concept": concept,
            "related_concepts": related
        }

kg_manager = KnowledgeGraphManager()
