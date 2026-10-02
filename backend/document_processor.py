"""
LEARNOVA Document Intelligence Engine
Extracts structure, sections, page numbers, chunks, and concepts from uploaded documents.
Supports PDF (via pypdf), Markdown, and TXT files.
"""

import os
import re
import uuid
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader

class DocumentProcessor:
    @staticmethod
    def extract_from_pdf(file_path: str, doc_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract pages, sections, and structured chunks from PDF."""
        reader = PdfReader(file_path)
        chunks: List[Dict[str, Any]] = []
        sections: List[Dict[str, Any]] = []
        current_section = "General Overview"
        
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            text = page.extract_text() or ""
            if not text.strip():
                continue
                
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            buffer = []
            
            for line in lines:
                # Detect section headers (all caps, numbered, or short bold-like lines)
                if re.match(r"^(\d+[\.\)]\s+|Chapter\s+\d+|Section\s+\d+|[A-Z\s]{4,30}$)", line) and len(line) < 60:
                    if buffer:
                        chunk_content = " ".join(buffer).strip()
                        if len(chunk_content) > 30:
                            chunks.append({
                                "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                                "document_id": doc_id,
                                "page_number": page_num,
                                "section": current_section,
                                "content": chunk_content,
                                "source_type": "pdf"
                            })
                        buffer = []
                    current_section = line
                    sections.append({
                        "id": f"sec_{len(sections)+1}",
                        "title": current_section,
                        "page": page_num
                    })
                else:
                    buffer.append(line)
                    if len(" ".join(buffer)) > 600:
                        chunks.append({
                            "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                            "document_id": doc_id,
                            "page_number": page_num,
                            "section": current_section,
                            "content": " ".join(buffer).strip(),
                            "source_type": "pdf"
                        })
                        buffer = []
                        
            if buffer:
                chunk_content = " ".join(buffer).strip()
                if len(chunk_content) > 30:
                    chunks.append({
                        "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                        "document_id": doc_id,
                        "page_number": page_num,
                        "section": current_section,
                        "content": chunk_content,
                        "source_type": "pdf"
                    })
                    
        return sections, chunks

    @staticmethod
    def extract_from_text(text: str, doc_id: str, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract structured sections and chunks from text/markdown."""
        lines = text.split("\n")
        sections: List[Dict[str, Any]] = []
        chunks: List[Dict[str, Any]] = []
        current_section = "Introduction"
        current_page = 1
        word_count = 0
        buffer: List[str] = []

        for line in lines:
            stripped = line.strip()
            if not stripped:
                continue

            # Page simulation: ~250 words per page
            line_words = len(stripped.split())
            word_count += line_words
            if word_count > 250:
                current_page += 1
                word_count = 0

            # Detect Markdown / numbered headings
            if stripped.startswith("#") or re.match(r"^\d+\.\s+[A-Za-z]", stripped):
                if buffer:
                    chunk_content = " ".join(buffer).strip()
                    if len(chunk_content) > 20:
                        chunks.append({
                            "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                            "document_id": doc_id,
                            "page_number": current_page,
                            "section": current_section,
                            "content": chunk_content,
                            "source_type": "text"
                        })
                    buffer = []
                
                header_text = re.sub(r"^#+\s*", "", stripped)
                current_section = header_text
                sections.append({
                    "id": f"sec_{len(sections)+1}",
                    "title": header_text,
                    "page": current_page
                })
            else:
                buffer.append(stripped)
                if len(" ".join(buffer)) > 500:
                    chunks.append({
                        "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                        "document_id": doc_id,
                        "page_number": current_page,
                        "section": current_section,
                        "content": " ".join(buffer).strip(),
                        "source_type": "text"
                    })
                    buffer = []

        if buffer:
            chunks.append({
                "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                "document_id": doc_id,
                "page_number": current_page,
                "section": current_section,
                "content": " ".join(buffer).strip(),
                "source_type": "text"
            })

        return sections, chunks

    @staticmethod
    def extract_concepts_and_graph(chunks: List[Dict[str, Any]], title: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Builds a structured knowledge graph (nodes + relationships).
        Uses pattern-based definition mining and semantic heuristics.
        """
        concepts: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []
        concept_names = set()

        # Definition indicators: "X is a", "X refers to", "X provides", "X consists of"
        def_pattern = re.compile(r"([A-Z][A-Za-z0-9\s\-_]{2,35})\s+(?:is a|is an|is the|refers to|provides|consists of|organizes|handles)\s+([^.]+)", re.IGNORECASE)

        for chunk in chunks:
            text = chunk["content"]
            section = chunk["section"]
            page = chunk["page_number"]

            # 1. Section as a macro-concept
            sec_clean = re.sub(r"^\d+\.?\s*", "", section).strip()
            if sec_clean and sec_clean.lower() not in concept_names and len(sec_clean) < 40:
                cid = f"c_{re.sub(r'[^a-zA-Z0-9]', '_', sec_clean).lower()}"
                concept_names.add(sec_clean.lower())
                concepts.append({
                    "id": cid,
                    "name": sec_clean,
                    "category": "Core Topic",
                    "summary": f"Key topic covered in {section} on page {page}.",
                    "page_number": page,
                    "mastery_score": 0.0,
                    "status": "unseen"
                })

            # 2. Extract defined terms
            matches = def_pattern.findall(text)
            for name, summary in matches:
                name_clean = name.strip()
                # filter out generic pronoun beginnings
                if any(name_clean.lower().startswith(w) for w in ["this", "that", "these", "it", "each", "which", "there"]):
                    continue
                if len(name_clean) > 3 and name_clean.lower() not in concept_names:
                    concept_names.add(name_clean.lower())
                    cid = f"c_{re.sub(r'[^a-zA-Z0-9]', '_', name_clean).lower()}"
                    concepts.append({
                        "id": cid,
                        "name": name_clean,
                        "category": "Concept",
                        "summary": summary.strip()[:140] + ("..." if len(summary.strip()) > 140 else ""),
                        "page_number": page,
                        "mastery_score": 0.0,
                        "status": "unseen"
                    })

        # 3. Build relationships between consecutive or co-occurring concepts
        for i in range(len(concepts)):
            c1 = concepts[i]
            for j in range(i + 1, min(i + 4, len(concepts))):
                c2 = concepts[j]
                rel_type = "part_of" if c1["category"] == "Core Topic" and c2["category"] == "Concept" else "depends_on"
                relationships.append({
                    "source": c1["id"],
                    "target": c2["id"],
                    "type": rel_type,
                    "description": f"{c2['name']} relates to {c1['name']} within the curriculum."
                })

        return concepts[:15], relationships[:20]
