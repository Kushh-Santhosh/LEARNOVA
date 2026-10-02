# Third-Party Notices & Architectural Acknowledgments

LEARNOVA incorporates architectural insights and patterns from open-source educational systems, and utilizes select open-source libraries. All code in LEARNOVA is an original implementation designed specifically for the LEARNOVA Adaptive AI Classroom, adhering strictly to intellectual property rights and open-source licenses.

---

### 1. Ponytail
- **Repository**: https://github.com/DietrichGebert/ponytail
- **Author**: Dietrich Gebert
- **License**: MIT License
- **Usage**: Engineering methodology, minimal code ladder, and agent review/audit tools.

```text
MIT License

Copyright (c) Dietrich Gebert

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.
```

---

### 2. Architectural References & Pedagogical Inspiration

The following projects served as conceptual and architectural reference points during design:

1. **ai-avatar-tutor** (`MohanadMahran/ai-avatar-tutor`):
   - *Inspiration*: Document ingestion, RAG citation grounding, voice interaction flow, and avatar presentation layer decoupling.
   - *LEARNOVA Distinction*: LEARNOVA introduces full bidirectional adaptive teaching, misconception diagnosis engine, interactive knowledge graph, teach-back assessment, and visual whiteboard generation.

2. **Vidhya-AI** (`Krishnapriyakarumuri/Vidhya-AI`):
   - *Inspiration*: Misconception detection, tutor orchestration, and adaptive remediation.
   - *LEARNOVA Distinction*: Explicit pedagogical state machine, multi-modal concept visualizer, and grounded page-level source citations.

3. **Cognilearn-AI** (`GaurangJagtap/Cognilearn-AI`):
   - *Inspiration*: Modular FastAPI structure, concept maps, learner profile, and quiz generation.
   - *LEARNOVA Distinction*: Knowledge graph generation with typed relationships (`depends_on`, `part_of`, `example_of`) coupled with pgvector/cosine retrieval.

4. **AI_Tutor** (`098765d/AI_Tutor`):
   - *Inspiration*: Knowledge graph-augmented RAG (KG-RAG).
   - *LEARNOVA Distinction*: Pure relational/JSON graph representations operable without dedicated graph databases.

5. **avatar-speech-rag** (`cedricvidal/avatar-speech-rag`):
   - *Inspiration*: Source/citation display, speech streaming, and fallback mechanisms.
   - *LEARNOVA Distinction*: Zero-crash graceful fallback ensuring rich browser-native Web Speech STT/TTS and SVG viseme animation when external paid APIs are absent.

6. **ai-tutor** (`martius-lab/ai-tutor`):
   - *Inspiration*: "Learning by teaching" (teach-back) pedagogical concept.
   - *Notice*: No AGPL code has been copied or incorporated into LEARNOVA. Only the conceptual pedagogical principle of student teach-back evaluation is utilized.

---

### 3. Open Source Libraries Utilized
- **Backend**: FastAPI, Uvicorn, Pydantic, PyMuPDF (`fitz`), NumPy, Python-Multipart.
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, Lucide React, Canvas/SVG Viseme Audio Sync.
