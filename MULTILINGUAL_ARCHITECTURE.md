# LEARNOVA — Multilingual Architecture & Cross-Lingual RAG

## 1. Architectural Philosophy
Education must transcend linguistic barriers. In technical and higher education across India and globally, textbooks and reference materials are predominantly published in English, whereas students think, reason, and grasp complex intuition in their mother tongues (Kannada, Hindi, Telugu, Tamil, Marathi, Bengali, etc.).

LEARNOVA resolves this fundamental tension via **Cross-Lingual Retrieval-Augmented Generation (RAG)** combined with **Natural Code-Switching**.

---

## 2. Core Cross-Lingual RAG Pipeline

```
Learner Query (e.g. Kannada / Hindi)
        │
        ▼
┌───────────────────────────────────────────────┐
│ 1. Language Identification & Query Alignment  │
│    - Detect Script (Unicode Range / FastText) │
│    - Tokenize non-Latin and Latin words       │
│    - Semantic Concept Expansion (Indic → EN)  │
└───────────────────────┬───────────────────────┘
                        │ Aligned Query + English Concept Vectors
                        ▼
┌───────────────────────────────────────────────┐
│ 2. Hybrid Lexical & Subword Retrieval         │
│    - Sublinear TF-IDF + BM25 Vector Matching  │
│    - Stopword & Preposition Damping           │
│    - Strict Grounding Threshold Filtering     │
└───────────────────────┬───────────────────────┘
                        │ Grounded English Chunks (Preserving Page/Section)
                        ▼
┌───────────────────────────────────────────────┐
│ 3. Teacher Brain Pedagogical Reasoning        │
│    - Deduce Pedagogical Intent & Strategy     │
│    - Construct Spoken Avatar Script (1-3 sent)│
│    - Construct Structured Markdown Notes      │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
┌───────────────────────────────────────────────┐
│ 4. Multilingual Rendering & Code-Switching    │
│    - Render in Target Language (KN/HI/TE/TA)  │
│    - Preserve Technical English Terminology   │
│    - Retain Verbatim English Source Citations │
└───────────────────────┬───────────────────────┘
                        │
                        ▼
Learner Workspace & Spoken Voice Output
```

---

## 3. Preservation of Technical Terminology (Code-Switching)
Literal machine translation often destroys academic comprehension:
- *Literal Machine Translation (Unnatural):* "ಟ್ರಾನ್ಸ್‌ಮಿಷನ್ ನಿಯಂತ್ರಣ ಪ್ರೋಟೋಕಾಲ್ ಸಂಪರ್ಕ ಆಧಾರಿತವಾಗಿದೆ..."
- *LEARNOVA Natural Code-Switching (Optimal):* "TCP ಕನೆಕ್ಷನ್-ಓರಿಯೆಂಟೆಡ್ (Connection-Oriented) ಪ್ರೋಟೋಕಾಲ್ ಆಗಿದ್ದು, 3-Way Handshake ಮೂಲಕ ವಿಶ್ವಾಸಾರ್ಹ ಡೇಟಾ ಡೆಲಿವರಿ ಒದಗಿಸುತ್ತದೆ."

LEARNOVA protects established computer science, biological, and mathematical terms by tagging them during prompt synthesis and translation post-processing.

---

## 4. Source Citation Faithfulness Across Languages
When a learner asks in Kannada:
> *"ಟಿಸಿಪಿ ಮತ್ತು ಯುಡಿಪಿ ವ್ಯತ್ಯಾಸವೇನು?"*

Professor Nova answers in fluent Kannada, but the **Source Citation** strictly retains the verbatim text from the uploaded English PDF:
- **Document:** `computer_networks_osi.txt`
- **Page:** `4`
- **Section:** `The Transport Layer: TCP vs UDP`
- **Excerpt:** *"The Transport Layer (Layer 4) is responsible for true end-to-end process-to-process communication between host applications. Its two preeminent protocols are TCP..."*

This prevents hallucinated translations in academic references.

---

## 5. Technology Stack & Provider Fallback Matrix

| Layer | Primary Cloud Provider | High-Performance Local / Edge | Fallback Default |
|---|---|---|---|
| **Language Identification** | FastText / LangDetect | Regex Unicode Script Ranges | Script-based detector |
| **Speech-to-Text (STT)** | LiveKit Agents Cloud | **AI4Bharat IndicConformer** / Faster-Whisper | Browser Web Speech API |
| **Translation** | Cloud LLM (Gemini/OpenAI) | **AI4Bharat IndicTrans2** | Rule-assisted bilingual templates |
| **Text-to-Speech (TTS)** | ElevenLabs / Cartesia | **AI4Bharat Indic-TTS** | Browser SpeechSynthesis API |

### **Integration with AI4Bharat Models:**
1. **IndicConformer:** End-to-end Conformer-based ASR trained across 22 scheduled Indian languages, specifically resilient to accented Indian English and regional vernaculars.
2. **IndicTrans2:** State-of-the-art open-source transformer model for Indian languages, enabling privacy-preserving on-premise execution.
3. **Indic-TTS:** High-quality expressive neural speech synthesis for regional accents and proper noun pronunciation.

---

## 6. Language Detection & Verification Matrix

The test suite validates cross-lingual retrieval across 5 target languages:
- **English (`en`):** Primary curriculum reference language.
- **Kannada (`kn`):** Tested in `test_learnova_suite_v2.py` (Test 13, 15).
- **Hindi (`hi`):** Tested in `test_learnova_suite_v2.py` (Test 14, 16).
- **Telugu (`te`):** Supported with Telugu script tokenizer and concept lexicon.
- **Tamil (`ta`):** Supported with Tamil script tokenizer and concept lexicon.
