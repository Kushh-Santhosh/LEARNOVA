import React from 'react';
import { LearnerAnalytics } from '../types';
import {
  BarChart3,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  HelpCircle,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface AnalyticsScreenProps {
  analytics: LearnerAnalytics | null;
  onSelectConceptToReview?: (conceptName: string) => void;
  onEnterClassroom: () => void;
}

export const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({
  analytics,
  onSelectConceptToReview,
  onEnterClassroom,
}) => {
  if (!analytics) {
    return (
      <div className="flex-1 max-w-5xl mx-auto p-8 text-center text-slate-400">
        Loading analytics...
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
            Cognitive Growth & Mastery
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            Learner Progress: {analytics.learner_profile.name}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Grounded metrics calculated from your real quizzes, teach-back sessions, and comprehension checks.
          </p>
        </div>

        <button
          onClick={onEnterClassroom}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
        >
          <span>Return to Classroom</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Overall Mastery</span>
            <Sparkles className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {analytics.overall_mastery_pct}%
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className="bg-blue-600 h-1.5 rounded-full"
              style={{ width: `${analytics.overall_mastery_pct}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Mastered Concepts</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600">
            {analytics.concepts_mastered}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Proven in teach-back</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Quiz Accuracy</span>
            <HelpCircle className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {analytics.quiz_stats.accuracy_pct}%
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {analytics.quiz_stats.correct_count} of {analytics.quiz_stats.total_taken} questions
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Misconceptions Fixed</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-600">
            {analytics.misconception_count}
          </div>
          <span className="text-[10px] text-slate-400 mt-1 block">Remediated by teacher</span>
        </div>
      </div>

      {/* Main Grid: Concept Breakdown | Revision Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Concept Mastery Breakdown (7 cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-blue-600" />
            <span>Mastery by Concept</span>
          </h3>

          <div className="space-y-4">
            {/* Needs Review */}
            <div>
              <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-2">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                NEEDS REVIEW ({analytics.needs_review_list.length})
              </span>
              <div className="space-y-2">
                {analytics.needs_review_list.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-amber-200/60 text-amber-900 font-mono font-bold text-[10px]">
                      {c.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Improving */}
            <div>
              <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1 mb-2">
                <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                IMPROVING ({analytics.improving_list.length})
              </span>
              <div className="space-y-2">
                {analytics.improving_list.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-100 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800">{c.name}</span>
                    <span className="px-2 py-0.5 rounded-md bg-blue-200/60 text-blue-900 font-mono font-bold text-[10px]">
                      {c.score}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mastered */}
            <div>
              <span className="text-[11px] font-bold text-emerald-800 flex items-center gap-1 mb-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                MASTERED ({analytics.mastered_list.length})
              </span>
              <div className="space-y-2">
                {analytics.mastered_list.length > 0 ? (
                  analytics.mastered_list.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between text-xs"
                    >
                      <span className="font-semibold text-slate-800">{c.name}</span>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-200/60 text-emerald-900 font-mono font-bold text-[10px]">
                        {c.score}%
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    Complete teach-back challenges to promote concepts to Mastered.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Revision Plan (5 cols) */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Personalized Revision Plan</span>
            </h3>

            <div className="space-y-3">
              {analytics.revision_plan.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-blue-700">{item.timeframe}</span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded-sm ${
                        item.priority === 'High'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-slate-700 leading-snug">{item.task}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              <span>Recent Activity History</span>
            </h3>
            <div className="space-y-2 text-xs">
              {analytics.recent_activity.map((act, i) => (
                <div key={i} className="flex items-center justify-between text-slate-600 py-1 border-b border-slate-100 last:border-b-0">
                  <span className="truncate max-w-[210px]">{act.action}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">{act.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
