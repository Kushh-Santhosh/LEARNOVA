import {
  DocumentMeta,
  KnowledgeGraphData,
  TeacherResponse,
  QuizItem,
  QuizEvaluation,
  TeachBackEvaluation,
  LearnerAnalytics,
  LearnerProfile
} from './types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
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

  async evaluateTeachBack(docId: string, conceptId: string, explanation: string): Promise<TeachBackEvaluation> {
    const res = await fetch(`${API_BASE}/teach-back/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ document_id: docId, concept_id: conceptId, student_explanation: explanation }),
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
};
