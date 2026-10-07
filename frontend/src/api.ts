import {
  DocumentMeta,
  KnowledgeGraphData,
  TeacherResponse,
  QuizItem,
  QuizEvaluation,
  TeachBackEvaluation,
  LearnerAnalytics,
  LearnerProfile,
  ScreenCapabilities,
  ScreenContextMode,
  ScreenGuidanceResponse,
  ScreenVerifyResponse,
  AvatarTurn,
  BenchmarkReport,
  EvaluationPayload
} from './types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  async getAvatarSession() {
    const res = await fetch(`${API_BASE}/avatar/session`);
    return res.json();
  },

  async getVoiceCapabilities() {
    const res = await fetch(`${API_BASE}/voice/capabilities`);
    return res.json();
  },

  async getDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(`${API_BASE}/documents`);
    return res.json();
  },

  async uploadDocument(file: File): Promise<{ message: string; document: DocumentMeta }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/documents/upload`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  async getKnowledgeGraph(docId: string): Promise<KnowledgeGraphData> {
    const res = await fetch(`${API_BASE}/documents/${docId}/knowledge-graph`);
    return res.json();
  },

  async getConceptDetails(docId: string, conceptId: string) {
    const res = await fetch(`${API_BASE}/documents/${docId}/concepts/${conceptId}`);
    return res.json();
  },

  async teach(payload: {
    document_id: string;
    message: string;
    active_concept?: string;
    mode?: string;
    language?: string;
  }): Promise<TeacherResponse> {
    const res = await fetch(`${API_BASE}/teach`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Teacher response error');
    return res.json();
  },

  async generateQuiz(docId: string, concept?: string): Promise<QuizItem> {
    const res = await fetch(`${API_BASE}/quiz/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: docId, concept }),
    });
    return res.json();
  },

  async evaluateQuiz(quizId: string, concept: string, studentAnswer: string): Promise<QuizEvaluation> {
    const res = await fetch(`${API_BASE}/quiz/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quiz_id: quizId, concept, student_answer: studentAnswer }),
    });
    return res.json();
  },

  async evaluateTeachBack(docId: string, conceptId: string, explanation: string, conceptName?: string): Promise<TeachBackEvaluation> {
    const res = await fetch(`${API_BASE}/teach-back/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: docId,
        concept_id: conceptId,
        concept_name: conceptName || '',
        student_explanation: explanation
      }),
    });
    return res.json();
  },

  async resolveMisconception(conceptName: string) {
    const res = await fetch(`${API_BASE}/learner/misconceptions/resolve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concept_name: conceptName }),
    });
    return res.json();
  },

  async getLearnerProgress(): Promise<LearnerAnalytics> {
    const res = await fetch(`${API_BASE}/learner/progress`);
    return res.json();
  },

  async updateProfile(profile: LearnerProfile) {
    const res = await fetch(`${API_BASE}/learner/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });
    return res.json();
  },

  async searchWorkspace(query: string) {
    const res = await fetch(`${API_BASE}/search?q=${encodeURIComponent(query)}`);
    return res.json();
  },

  async getScreenCapabilities(): Promise<ScreenCapabilities> {
    const res = await fetch(`${API_BASE}/screen/capabilities`);
    return res.json();
  },

  async analyzeScreen(payload: {
    goal: string;
    mode?: ScreenContextMode;
    current_route?: string;
    dom_elements?: any[];
    screenshot_base64?: string;
    step_index?: number;
    active_document_id?: string | null;
  }): Promise<ScreenGuidanceResponse> {
    const res = await fetch(`${API_BASE}/screen/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async verifyScreenStep(payload: {
    workflow: string;
    step_number: number;
    current_route: string;
    user_action?: string;
    dom_evidence?: any;
  }): Promise<ScreenVerifyResponse> {
    const res = await fetch(`${API_BASE}/screen/verify-step`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.json();
  },

  async getLearningPath(payload: {
    goal: string;
    learner_level?: string;
    time_available?: string;
    preferred_language?: string;
    learning_style?: string;
  }) {
    const res = await fetch(`${API_BASE}/learn/path`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Learning path request failed');
    return res.json();
  },

  async getResearchResources(payload: { goal: string; max_resources?: number }) {
    const res = await fetch(`${API_BASE}/learn/research`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Research request failed');
    return res.json();
  },

  async speakAvatar(payload: {
    text: string;
    emotion?: string;
    mode?: string;
    speech_rate_wpm?: number;
    language?: string;
  }): Promise<AvatarTurn> {
    const res = await fetch(`${API_BASE}/avatar/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Avatar speak error');
    return res.json();
  },

  async getAvatarBenchmark(mode?: string): Promise<BenchmarkReport> {
    const res = await fetch(`${API_BASE}/avatar/benchmark${mode ? `?mode=${mode}` : ''}`);
    if (!res.ok) throw new Error('Avatar benchmark failed');
    return res.json();
  },

  async evaluateResponse(payload: {
    query: string;
    response: string;
    context?: string;
    learner_level?: string;
    iterations?: number;
  }): Promise<EvaluationPayload> {
    const res = await fetch(`${API_BASE}/avatar/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Response evaluation failed');
    return res.json();
  },
};

