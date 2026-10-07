export interface DocumentMeta {
  id: string;
  title: string;
  filename: string;
  file_type: string;
  sections?: Array<{ id: string; title: string; page: number }>;
  chunk_count: number;
  concept_count: number;
  page_count?: number;
  language?: string;
  is_demo?: boolean;
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

export interface LearningArtifact {
  id: string;
  type: 'comparison_table' | 'flowchart' | 'process_diagram' | 'timeline' | 'concept_map' | 'notes';
  title: string;
  data: any;
  source?: {
    page: number;
    section: string;
  };
  saved?: boolean;
  timestamp?: string;
}

export interface MisconceptionDiagnosis {
  classification: string;
  concept: string;
  misconception: string | null;
  root_cause?: string | null;
  prerequisite_gap?: string | null;
  severity: 'low' | 'medium' | 'high' | 'none';
  evidence: string | null;
  counterexample?: string | null;
  remediation_strategy: string | null;
  verification_check?: string | null;
  needs_remediation: boolean;
}

export interface TeacherResponse {
  intent?: string;
  spoken_text?: string;
  teacher_text: string;
  teaching_mode: 'explain' | 'simplify' | 'example' | 'analogy' | 'visual' | 'deep_dive' | 'socratic' | 'exam' | 'remediate';
  active_concept: string;
  misconception_detected: MisconceptionDiagnosis | null;
  visual_element: VisualPayload | null;
  citations: Citation[];
  follow_up_prompt?: string;
  language?: string;
  avatar_turn?: AvatarTurn;
}

export type RhubarbVisemeShape = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'X';

export interface VisemeEvent {
  at_ms: number;
  duration_ms: number;
  shape: RhubarbVisemeShape;
  intensity?: number;
}

export type AvatarExpression =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'explaining'
  | 'encouraging'
  | 'celebrating'
  | 'remediating'
  | 'questioning';

export interface ExpressionEvent {
  at_ms: number;
  duration_ms: number;
  expression: AvatarExpression;
  intensity?: number;
}

export interface AvatarCostEstimate {
  active_speaking_minutes: number;
  tts_cost_inr: number;
  render_cost_inr: number;
  llm_cost_inr: number;
  total_turn_cost_inr: number;
  cost_per_minute_inr: number;
  target_met: boolean;
  target_cap_inr: number;
  mode: string;
}

export interface AvatarTurn {
  text: string;
  audio?: string | null;
  duration_ms: number;
  viseme_timeline: VisemeEvent[];
  expression_timeline: ExpressionEvent[];
  start_latency_ms: number;
  time_to_audio_ms: number;
  time_to_first_avatar_frame_ms: number;
  total_processing_ms: number;
  render_mode: 'mode_a_local' | 'mode_b_hq' | 'mode_c_text' | string;
  provider: string;
  cost_estimate: AvatarCostEstimate;
}

export interface BenchmarkCaseResult {
  case_id: string;
  category: string;
  type: string;
  word_count: number;
  duration_ms: number;
  time_to_audio_ms: number;
  time_to_first_avatar_frame_ms: number;
  total_processing_ms: number;
  viseme_event_count: number;
  expression_event_count: number;
  lip_sync_score: number;
  expression_score: number;
  responsiveness: string;
  cost_per_minute_inr: number;
  target_met: boolean;
  error?: string;
}

export interface BenchmarkReport {
  total_cases: number;
  successful_cases: number;
  failure_count: number;
  metrics: {
    cost_per_minute_inr: number;
    target_cap_inr: number;
    target_achieved: boolean;
    time_to_audio_ms: number;
    time_to_first_avatar_frame_ms: number;
    total_processing_ms: number;
    lip_sync_score: number;
    expression_score: number;
    responsiveness: string;
    consistency: string;
  };
  comparison: {
    baseline: {
      name: string;
      rendering_location: string;
      cost_per_minute_inr: number;
      time_to_first_frame_ms: number;
      lip_sync_method: string;
      lip_sync_score: number;
      server_gpu_dependency: boolean;
      scalability_barrier: string;
      target_met: boolean;
    };
    optimized: {
      name: string;
      rendering_location: string;
      cost_per_minute_inr: number;
      time_to_first_frame_ms: number;
      lip_sync_method: string;
      lip_sync_score: number;
      server_gpu_dependency: boolean;
      scalability_barrier: string;
      target_met: boolean;
    };
    cost_reduction_percent: number;
    latency_reduction_percent: number;
  };
  cases: BenchmarkCaseResult[];
}

export interface EvaluationDimensionResult {
  dimension: string;
  score: number;
  reason: string;
  evidence: string;
  confidence: number;
}

export interface EvaluationPayload {
  evaluation: {
    overall_score: number;
    dimension_scores: Record<string, number>;
    detailed_dimensions: Record<string, EvaluationDimensionResult>;
    grade: string;
  };
  consistency: {
    iterations_run: number;
    mean: number;
    median: number;
    standard_deviation: number;
    range: [number, number];
    stability_grade: string;
    dimension_consistency: Record<string, { mean: number; std_dev: number }>;
    run_scores: number[];
  };
}


export interface QuizItem {
  id: string;
  type: 'mcq' | 'true_false' | 'short_answer' | 'scenario';
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
  recent_evidence?: Array<{ timestamp: string; concept: string; delta: any; reason: string; type: string }>;
}

export type ScreenContextMode = 'dom' | 'browser_screen' | 'desktop';

export type GuideStateMachineState =
  | 'IDLE'
  | 'LISTENING'
  | 'CAPTURING'
  | 'ANALYZING'
  | 'PLANNING'
  | 'POINTING'
  | 'WAITING_FOR_USER'
  | 'VERIFYING'
  | 'NEXT_STEP'
  | 'COMPLETED'
  | 'PAUSED'
  | 'ERROR';

export interface ScreenTargetElement {
  id: string;
  guide_id?: string;
  label: string;
  type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface ScreenRecommendedAction {
  action: 'click' | 'look' | 'input';
  instruction: string;
  what: string;
  why: string;
  next: string;
}

export interface ScreenGuidanceResponse {
  status: string;
  mode: ScreenContextMode;
  workflow: string;
  step_number: number;
  total_steps: number;
  is_last_step: boolean;
  application: string;
  screen_description: string;
  target_element: ScreenTargetElement;
  recommended_action: ScreenRecommendedAction;
  spoken_text: string;
  course_connection: {
    active_document_id: string | null;
    has_connection: boolean;
    explanation: string | null;
  };
  vision_fallback_active?: boolean;
}

export interface ScreenVerifyResponse {
  status: 'STEP_COMPLETED' | 'COMPLETED' | 'NEEDS_CONFIRMATION' | 'ERROR';
  verified: boolean;
  current_step?: number;
  next_step?: number | null;
  message: string;
}

export interface ScreenCapabilities {
  status: string;
  supported_modes: Array<{
    id: ScreenContextMode;
    name: string;
    status: string;
    is_default?: boolean;
    requires_permission?: boolean;
    requires_native_companion?: boolean;
  }>;
  privacy: {
    transient_in_memory_only: boolean;
    zero_disk_logging: boolean;
    permission_gated: boolean;
  };
  vision_provider: {
    type: string;
    is_configured: boolean;
    cost_tier: string;
  };
}

