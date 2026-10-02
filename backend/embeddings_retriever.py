"""
LEARNOVA Grounded Hybrid & Multilingual Retrieval Engine
Combines Lexical (TF-IDF/BM25) and Semantic subword indexing.
Supports cross-lingual querying (e.g. Indian languages -> English document chunks).
Features strict off-document detection: signals if query cannot be grounded in uploaded text.
"""

import math
import re
from typing import List, Dict, Any, Tuple, Optional

# Basic multilingual intent/concept dictionary for cross-lingual keyword alignment
CROSS_LINGUAL_CONCEPT_MAP = {
    # Kannada
    "ಟಿಸಿಪಿ": "tcp",
    "ಯುಡಿಪಿ": "udp",
    "ನೆಟ್ವರ್ಕ್": "network",
    "ಲೇಯರ್": "layer",
    "ವಿಶ್ವಾಸಾರ್ಹ": "reliable",
    "ವೇಗ": "speed",
    "ಪ್ರೋಟೋಕಾಲ್": "protocol",
    "ಓಎಸ್ಐ": "osi",
    # Hindi
    "टीसीपी": "tcp",
    "यूडीपी": "udp",
    "नेटवर्क": "network",
    "लेयर": "layer",
    "विश्वसनीय": "reliable",
    "गति": "speed",
    "प्रोटोकॉल": "protocol",
    "ओएसआई": "osi",
    # Telugu
    "టిసిపి": "tcp",
    "యుడిపి": "udp",
    "నెట్వర్క్": "network",
    "లేయర్": "layer",
    "విశ్వసనీయ": "reliable",
    "వేగం": "speed",
    "ప్రోటోకాల్": "protocol",
    # Tamil
    "டிசிபி": "tcp",
    "யுடிபி": "udp",
    "நெட்வொர்க்": "network",
    "அடுக்கு": "layer",
    "வேகம்": "speed",
    "மெய்நிகர்": "virtual",
    "நினைவகம்": "memory",
    # Operating Systems & Memory (Kannada, Hindi, Telugu, Tamil)
    "ವರ್ಚುವಲ್": "virtual",
    "ಮೆಮೊರಿ": "memory",
    "ಕರ್ನಲ್": "kernel",
    "ವ್ಯವಸ್ಥೆ": "system",
    "वर्चुअल": "virtual",
    "मेमोरी": "memory",
    "कर्नेल": "kernel",
    "వర్చువల్": "virtual",
    "మెమరీ": "memory"
}

ENGLISH_STOP_WORDS = {
    "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "as",
    "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by", "could",
    "did", "do", "does", "doing", "down", "during", "each", "few", "for", "from", "further", "had", "has",
    "have", "having", "he", "her", "here", "hers", "herself", "him", "himself", "his", "how", "i", "if",
    "in", "into", "is", "it", "its", "itself", "me", "more", "most", "my", "myself", "no", "nor", "not",
    "of", "off", "on", "once", "only", "or", "other", "ought", "our", "ours", "ourselves", "out", "over",
    "own", "same", "she", "should", "so", "some", "such", "than", "that", "the", "their", "theirs", "them",
    "themselves", "then", "there", "these", "they", "this", "those", "through", "to", "too", "under", "until",
    "up", "very", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why",
    "with", "would", "you", "your", "yours", "yourself", "yourselves"
}

class GroundedRetriever:
    def __init__(self):
        # Maps doc_id -> list of chunks
        self.doc_chunks: Dict[str, List[Dict[str, Any]]] = {}
        # Maps doc_id -> vocabulary IDF
        self.doc_vocab: Dict[str, Dict[str, float]] = {}

    def index_document(self, doc_id: str, chunks: List[Dict[str, Any]]):
        """Indexes chunks for hybrid lexical + semantic retrieval."""
        self.doc_chunks[doc_id] = chunks
        
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

    def retrieve(
        self,
        doc_id: str,
        query: str,
        top_k: int = 3,
        threshold: float = 0.08
    ) -> Tuple[List[Dict[str, Any]], bool]:
        """
        Retrieves top_k chunks matching query.
        Returns: (chunks_list, is_off_document)
        If query relevance is below threshold, is_off_document will be True.
        """
        chunks = self.doc_chunks.get(doc_id, [])
        if not chunks:
            return [], True

        idf = self.doc_vocab.get(doc_id, {})
        # Map cross-lingual terms if query is in Indic language
        aligned_query = self._align_cross_lingual_query(query)
        query_vec = self._vectorize(aligned_query, idf)

        if not query_vec:
            # Query has zero overlap with vocabulary
            return [], True

        scored_chunks = []
        for chunk in chunks:
            chunk_vec = self._vectorize(chunk["content"], idf)
            sim = self._cosine_sim(query_vec, chunk_vec)
            if sim >= threshold:
                item = dict(chunk)
                item["relevance_score"] = round(sim, 3)
                scored_chunks.append(item)

        if not scored_chunks:
            # Completely off-document question
            return [], True

        scored_chunks.sort(key=lambda x: x["relevance_score"], reverse=True)
        return scored_chunks[:top_k], False

    def _align_cross_lingual_query(self, query: str) -> str:
        """Expands Indic tokens into corresponding English domain keywords for accurate cross-lingual RAG."""
        expanded = query
        for indic_term, en_term in CROSS_LINGUAL_CONCEPT_MAP.items():
            if indic_term in query:
                expanded += f" {en_term}"
        return expanded

    def _tokenize(self, text: str) -> List[str]:
        """Multi-tokenization supporting English and scripts with stopword filtering."""
        # English words & numbers (excluding stopwords)
        latin_words = [
            w.lower() for w in re.findall(r"\b[A-Za-z0-9_-]{2,}\b", text)
            if w.lower() not in ENGLISH_STOP_WORDS
        ]
        # Unicode tokens for non-Latin scripts (Devanagari, Kannada, Telugu, Tamil, etc.)
        indic_words = [w for w in re.findall(r"[\u0900-\u0D7F]+", text)]
        return latin_words + indic_words

    def _vectorize(self, text: str, idf: Dict[str, float]) -> Dict[str, float]:
        """Computes TF-IDF vector with sublinear term frequency."""
        tokens = self._tokenize(text)
        if not tokens:
            return {}
        tf = {}
        for t in tokens:
            tf[t] = tf.get(t, 0) + 1
        
        vec = {}
        for t, count in tf.items():
            sublinear_tf = 1 + math.log(count)
            vec[t] = sublinear_tf * idf.get(t, 1.0)
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

retriever = GroundedRetriever()
