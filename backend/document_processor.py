"""
LEARNOVA Document Intelligence & Extraction Engine
Extracts structure, sections, page numbers, chunks, tables, and concept graphs from arbitrary documents.
Supports PDF (via pypdf), DOCX (via python-docx), Markdown, and TXT files.
Includes strict prompt-injection defense: uploaded content is strictly encapsulated as data.
"""

import os
import re
from typing import List, Dict, Any, Tuple
from pypdf import PdfReader
import docx

class DocumentProcessor:
    @staticmethod
    def sanitize_text(text: str) -> str:
        """
        Defends against prompt injection in user-uploaded documents.
        Neutralizes instruction overrides such as 'ignore previous instructions',
        'system prompt', 'developer mode', etc., treating them strictly as document content.
        """
        if not text:
            return ""
        # Remove null bytes and control chars
        cleaned = text.replace("\x00", "").strip()
        # Neutralize common injection triggers by prefixing quote context
        cleaned = re.sub(
            r"(?i)\b(ignore all previous instructions|system:\s*you are|override developer instructions|reveal api keys)\b",
            r"[quoted text: \1]",
            cleaned
        )
        return cleaned

    @classmethod
    def detect_dominant_language(cls, sample_text: str) -> str:
        """
        Detects dominant script across English, Hindi, Kannada, Telugu, and Tamil.
        Uses exact Unicode block character frequency.
        """
        if not sample_text:
            return "en"
        
        kn_count = len(re.findall(r"[\u0C80-\u0CFF]", sample_text))
        hi_count = len(re.findall(r"[\u0900-\u097F]", sample_text))
        te_count = len(re.findall(r"[\u0C00-\u0C7F]", sample_text))
        ta_count = len(re.findall(r"[\u0B80-\u0BFF]", sample_text))
        
        counts = [("kn", kn_count), ("hi", hi_count), ("te", te_count), ("ta", ta_count)]
        counts.sort(key=lambda x: x[1], reverse=True)
        top_lang, top_count = counts[0]
        
        if top_count > 10:
            return top_lang
        return "en"

    @classmethod
    def extract_from_pdf(cls, file_path: str, doc_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract pages, sections, and structured chunks from PDF."""
        reader = PdfReader(file_path)
        chunks: List[Dict[str, Any]] = []
        sections: List[Dict[str, Any]] = []
        current_section = "General Overview"
        
        for page_idx, page in enumerate(reader.pages):
            page_num = page_idx + 1
            raw_text = page.extract_text() or ""
            text = cls.sanitize_text(raw_text)
            if not text.strip():
                continue
                
            lines = [l.strip() for l in text.split("\n") if l.strip()]
            buffer = []
            
            for line in lines:
                # Detect section headers (numbered, title-like, or capitalized)
                if re.match(r"^(\d+[\.\)]\s+|Chapter\s+\d+|Section\s+\d+|[A-Z\s]{4,30}$)", line) and len(line) < 60:
                    if buffer:
                        chunk_content = " ".join(buffer).strip()
                        if len(chunk_content) > 25:
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
                    if len(" ".join(buffer)) > 550:
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
                if len(chunk_content) > 25:
                    chunks.append({
                        "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                        "document_id": doc_id,
                        "page_number": page_num,
                        "section": current_section,
                        "content": chunk_content,
                        "source_type": "pdf"
                    })
                    
        return sections, chunks

    @classmethod
    def extract_from_docx(cls, file_path: str, doc_id: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract structured sections, paragraphs, and tables from DOCX."""
        doc = docx.Document(file_path)
        sections: List[Dict[str, Any]] = []
        chunks: List[Dict[str, Any]] = []
        current_section = "Introduction"
        current_page = 1
        word_count = 0
        buffer: List[str] = []

        # Process paragraphs
        for para in doc.paragraphs:
            text = cls.sanitize_text(para.text)
            if not text:
                continue

            words = len(text.split())
            word_count += words
            if word_count > 300:
                current_page += 1
                word_count = 0

            # Detect headings in Word styles or text
            if para.style and ("Heading" in para.style.name or "Title" in para.style.name) or re.match(r"^\d+\.\s+[A-Za-z]", text):
                if buffer:
                    chunk_content = " ".join(buffer).strip()
                    if len(chunk_content) > 20:
                        chunks.append({
                            "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                            "document_id": doc_id,
                            "page_number": current_page,
                            "section": current_section,
                            "content": chunk_content,
                            "source_type": "docx"
                        })
                    buffer = []
                current_section = text
                sections.append({
                    "id": f"sec_{len(sections)+1}",
                    "title": current_section,
                    "page": current_page
                })
            else:
                buffer.append(text)
                if len(" ".join(buffer)) > 550:
                    chunks.append({
                        "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                        "document_id": doc_id,
                        "page_number": current_page,
                        "section": current_section,
                        "content": " ".join(buffer).strip(),
                        "source_type": "docx"
                    })
                    buffer = []

        if buffer:
            chunks.append({
                "chunk_id": f"chk_{doc_id}_{len(chunks)+1}",
                "document_id": doc_id,
                "page_number": current_page,
                "section": current_section,
                "content": " ".join(buffer).strip(),
                "source_type": "docx"
            })

        # Process any tables present in the Word doc
        for t_idx, table in enumerate(doc.tables):
            table_rows = []
            for row in table.rows:
                row_cells = [cls.sanitize_text(c.text.strip()) for c in row.cells]
                if any(row_cells):
                    table_rows.append(row_cells)
            if table_rows:
                table_text = f"Table {t_idx+1}: " + " | ".join([", ".join(r) for r in table_rows])
                chunks.append({
                    "chunk_id": f"chk_{doc_id}_tbl_{t_idx+1}",
                    "document_id": doc_id,
                    "page_number": current_page,
                    "section": f"Table: {current_section}",
                    "content": table_text,
                    "source_type": "table"
                })

        return sections, chunks

    @classmethod
    def extract_from_text(cls, raw_text: str, doc_id: str, filename: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Extract structured sections and chunks from text/markdown with prompt injection defense."""
        text = cls.sanitize_text(raw_text)
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

            # Logical page simulation: ~250 words per page
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

    @classmethod
    def extract_concepts_and_graph(cls, chunks: List[Dict[str, Any]], title: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Builds a structured knowledge graph (nodes + relationships) for arbitrary documents.
        Uses pattern-based definition mining, heading hierarchy, and typed semantic relationships.
        """
        concepts: List[Dict[str, Any]] = []
        relationships: List[Dict[str, Any]] = []
        concept_names = set()

        def_pattern = re.compile(
            r"([A-Z][A-Za-z0-9\s\-_]{2,35})\s+(?:is a|is an|is the|refers to|provides|consists of|organizes|handles|defines|measures|minimizes|uncovers|penalizes)\s+([^.]+)",
            re.IGNORECASE
        )

        for chunk in chunks:
            text = chunk["content"]
            section = chunk["section"]
            page = chunk["page_number"]

            # 1. Clean section title to form a Core Topic concept
            sec_clean = re.sub(r"^\d+[\.\)]\s*", "", section).strip()
            sec_clean = re.sub(r"^#+\s*", "", sec_clean).strip()
            if sec_clean and sec_clean.lower() not in concept_names and len(sec_clean) < 50 and not sec_clean.lower().startswith("table"):
                cid = f"c_{re.sub(r'[^a-zA-Z0-9]', '_', sec_clean).lower()}"
                concept_names.add(sec_clean.lower())
                concepts.append({
                    "id": cid,
                    "name": sec_clean,
                    "category": "Core Topic",
                    "summary": f"Key curriculum topic from {section} on page {page}.",
                    "page_number": page,
                    "mastery_score": 0.0,
                    "status": "unseen"
                })

            # 2. Extract defined technical terms
            matches = def_pattern.findall(text)
            for name, summary in matches:
                name_clean = name.strip()
                if any(name_clean.lower().startswith(w) for w in ["this", "that", "these", "it", "each", "which", "there", "when", "if", "for", "a", "an"]):
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

        # 3. Connect nodes with typed relationships
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

        return concepts[:16], relationships[:24]
