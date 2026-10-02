export interface DocumentMeta {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  sections?: Array<{ id: string; title: string; page: number }>;
  chunk_count: number;
  concept_count: number;
}

export interface ConceptNode {
  id: string;
  name: string;
  category: string;
  summary: string;
  page_number: number;
  mastery_score: number;
  status: 'mastered' | 'improving' | 'needs_review' | 'unseen';
}

export interface RelationshipEdge {
  source: string;
  target: string;
  type: 'depends_on' | 'part_of' | 'example_of';
  description?: string;
}

export interface KnowledgeGraphData {
  concepts: ConceptNode[];
  relationships: RelationshipEdge[];
}

export interface Citation {
  source: string;
  page: number;
  section: string;
  excerpt: string;
}

export interface VisualPayload {
  type: 'comparison_table' | 'flowchart' | 'process_diagram' | 'timeline' | 'concept_map';
  title: string;
  data: any;
  source?: {
    page: number;
    section: string;
  };
}

export interface MisconceptionDiagnosis {
  classification: string;
  concept: string;
  misconception: string | null;
  severity: 'low' | 'medium' | 'high' | 'none';
  evidence: string | null;
  remediation_strategy: string | null;
  needs_remediation: boolean;
}

export interface TeacherResponse {
  teacher_text: string;
  teaching_mode: 'explain' | 'simplify' | 'example' | 'analogy' | 'visual' | 'deep_dive' | 'socratic' | 'remediate';
  active_concept: string;
  misconception_detected: MisconceptionDiagnosis | null;
  visual_element: VisualPayload | null;
  citations: Citation[];
  follow_up_prompt?: string;
}

export interface QuizItem {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer';
  concept: string;
  question: string;
  options: string[];
  correct_answer?: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  source?: { page: number; section: string };
}

export interface QuizEvaluation {
  is_correct: boolean;
  score: number;
  correct_answer: string;
  explanation: string;
  concept?: string;
  source?: { page: number; section: string };
  mastery_delta: number;
}

export interface TeachBackEvaluation {
  concept_id: string;
  concept_name: string;
  understanding_score: number;
  accuracy_score: number;
  covered_concepts: string[];
  missing_concepts: string[];
  detected_misconceptions: string[];
  recommendation: string;
  is_mastered: boolean;
}

export interface LearnerProfile {
  name: string;
  education_level: string;
  learning_level: string;
  preferred_style: string;
  language?: string;
}

export interface LearnerAnalytics {
  learner_profile: LearnerProfile;
  overall_mastery_pct: number;
  concepts_mastered: number;
  concepts_improving: number;
  concepts_needs_review: number;
  mastered_list: Array<{ id: string; name: string; score: number }>;
  improving_list: Array<{ id: string; name: string; score: number }>;
  needs_review_list: Array<{ id: string; name: string; score: number }>;
  quiz_stats: {
    total_taken: number;
    correct_count: number;
    accuracy_pct: number;
  };
  misconception_count: number;
  recent_activity: Array<{ time: string; action: string; type: string }>;
  revision_plan: Array<{ timeframe: string; task: string; priority: string }>;
}
