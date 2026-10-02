"""
LEARNOVA Grounded Retrieval Engine
Handles chunk indexing, vector representation, and cosine-similarity retrieval.
Guarantees source grounding: every retrieved fact retains page number, section, and exact quote.
"""

import math
import re
from typing import List, Dict, Any

class GroundedRetriever:
    def __init__(self):
        # Maps doc_id -> list of chunks
        self.doc_chunks: Dict[str, List[Dict[str, Any]]] = {}
        # Maps doc_id -> term frequencies
        self.doc_vocab: Dict[str, Dict[str, float]] = {}

    def index_document(self, doc_id: str, chunks: List[Dict[str, Any]]):
        """Indexes chunks for grounded retrieval."""
        self.doc_chunks[doc_id] = chunks
        
        # Build IDF dictionary for the document
        vocab_counts: Dict[str, int] = {}
        for chunk in chunks:
            tokens = set(self._tokenize(chunk["content"]))
            for t in tokens:
                vocab_counts[t] = vocab_counts.get(t, 0) + 1
                
        n_chunks = max(1, len(chunks))
        self.doc_vocab[doc_id] = {
            t: math.log(1 + (n_chunks / count))
            for t, count in vocab_counts.items()
        }

    def retrieve(self, doc_id: str, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves top_k chunks matching query with cosine similarity scores.
        Returns empty list if doc_id not found.
        """
        chunks = self.doc_chunks.get(doc_id, [])
        if not chunks:
            return []

        idf = self.doc_vocab.get(doc_id, {})
        query_vec = self._vectorize(query, idf)

        scored_chunks = []
        for chunk in chunks:
            chunk_vec = self._vectorize(chunk["content"], idf)
            sim = self._cosine_sim(query_vec, chunk_vec)
            if sim > 0.05:
                item = dict(chunk)
                item["relevance_score"] = round(sim, 3)
                scored_chunks.append(item)

        scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_chunks[:top_k]

    def _tokenize(self, text: str) -> List[str]:
        """Simple clean tokenization."""
        return [w.lower() for w in re.findall(r"\b[A-Za-z0-9_-]{2,}\b", text)]

    def _vectorize(self, text: str, idf: Dict[str, float]) -> Dict[str, float]:
        """Computes TF-IDF vector."""
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        
        vec = {}
        for t, count in tf.items():
            vec[t] = (count / len(tokens)) * idf.get(t, 1.0)
        return vec

    def _cosine_sim(self, v1: Dict[str, float], v2: Dict[str, float]) -> float:
        """Calculates cosine similarity between two sparse vector dicts."""
        common_keys = set(v1.keys()).intersection(set(v2.keys()))
        if not common_keys:
            return 0.0
            
        dot_product = sum(v1[k] * v2[k] for k in common_keys)
        mag1 = math.sqrt(sum(val * val for val in v1.values()))
        mag2 = math.sqrt(sum(val * val for val in v2.values()))
        
        if mag1 == 0 or mag2 == 0:
            return 0.0
        return dot_product / (mag1 * mag2)

# Global singleton retriever instance
retriever = GroundedRetriever()
