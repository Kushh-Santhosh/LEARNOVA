import React, { useState } from 'react';
import { LearnerAnalytics } from '../types';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Sparkles,
  BookOpen
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
  const [activeTab, setActiveTab] = useState<'overview' | 'revision' | 'mastery'>('overview');

  if (!analytics) {
    return (
      <div className="flex-1 max-w-4xl mx-auto p-12 text-center text-slate-400">
        Loading progress...
      </div>
    );
  }

  const needsReview = analytics.needs_review_list || [];
  const improving = analytics.improving_list || [];
  const mastered = analytics.mastered_list || [];

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full animate-fadeIn select-none">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
            Learner Progress
          </span>
          <h1 className="text-3xl font-light text-slate-900 tracking-tight mt-0.5">
            Your Learning Story
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Grounded cognitive tracking verified through quizzes, teach-back, and diagnostic checks.
          </p>
        </div>

        <button
          onClick={onEnterClassroom}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs shrink-0 self-start sm:self-auto cursor-pointer"
        >
          <span>Continue Lesson</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Tabs / Subsections */}
      <div className="flex items-center space-x-2 border-b border-slate-200/80 mb-8 pb-1">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'revision', label: `Revision Schedule (${analytics.revision_plan?.length || 0})` },
          { id: 'mastery', label: 'Concept Mastery' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Top 3 Focus Columns: What needs attention, What's improving, What you know */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Needs Attention */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold text-slate-900">Needs Attention</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-mono text-[10px] font-semibold">
                  {needsReview.length} concepts
                </span>
              </div>
              {needsReview.length > 0 ? (
                <div className="space-y-2">
                  {needsReview.slice(0, 3).map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate">{c.name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{c.score}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">All current concepts on track.</p>
              )}
            </div>

            {/* Improving */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold text-slate-900">Improving</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-semibold">
                  {improving.length} concepts
                </span>
              </div>
              {improving.length > 0 ? (
                <div className="space-y-2">
                  {improving.slice(0, 3).map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate">{c.name}</span>
                      <span className="font-mono text-slate-400 text-[11px]">{c.score}%</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Ready for intermediate practice.</p>
              )}
            </div>

            {/* What You Know (Mastered) */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs">
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-semibold text-slate-900">Proven Mastery</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono text-[10px] font-semibold">
                  {mastered.length} mastered
                </span>
              </div>
              {mastered.length > 0 ? (
                <div className="space-y-2">
                  {mastered.slice(0, 3).map((c, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-800 truncate">{c.name}</span>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Complete teach-back to verify mastery.</p>
              )}
            </div>
          </div>

          {/* Secondary quiet metrics */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Overall Mastery:</span>
              <span className="font-bold text-slate-900 text-sm">{analytics.overall_mastery_pct}%</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Quiz Accuracy:</span>
              <span className="font-bold text-slate-900 text-sm">{analytics.quiz_stats.accuracy_pct}%</span>
              <span>({analytics.quiz_stats.correct_count} of {analytics.quiz_stats.total_taken})</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">Misconceptions Resolved:</span>
              <span className="font-bold text-emerald-600 text-sm">{analytics.misconception_count}</span>
            </div>
          </div>

          {/* Recent Cognitive Activity */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80">
            <h3 className="text-xs font-semibold text-slate-900 mb-4">
              Recent Learning Activity
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {analytics.recent_activity.map((act, idx) => (
                <div key={idx} className="py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800">{act.action}</div>
                      <div className="text-[10px] text-slate-400">{act.time}</div>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider text-[10px]">
                    {act.type}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab: Revision Schedule */}
      {activeTab === 'revision' && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-100/60 rounded-2xl border border-slate-200 text-xs text-slate-700">
            Spaced repetition recommendations calculated dynamically from your diagnostic checks and quiz error patterns.
          </div>

          <div className="space-y-3">
            {analytics.revision_plan?.map((item, i) => (
              <div
                key={i}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-bold text-slate-900">{item.timeframe}</span>
                    <span
                      className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-semibold ${
                        item.priority === 'High'
                          ? 'bg-rose-50 text-rose-700'
                          : item.priority === 'Medium'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {item.priority} Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    {item.task}
                  </p>
                </div>

                <button
                  onClick={onEnterClassroom}
                  className="px-4 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-medium transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
                >
                  Review Now
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Concept Mastery */}
      {activeTab === 'mastery' && (
        <div className="space-y-6">
          {/* Mastered concepts list */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80">
            <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-3">
              Mastered Concepts ({mastered.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {mastered.map((c, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="font-mono text-emerald-600 font-semibold">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Improving concepts list */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80">
            <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wider mb-3">
              In Progress ({improving.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {improving.map((c, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="font-mono text-blue-600 font-semibold">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Needs Review concepts list */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200/80">
            <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-3">
              Needs Review ({needsReview.length})
            </h3>
            <div className="divide-y divide-slate-100 text-xs">
              {needsReview.map((c, i) => (
                <div key={i} className="py-2.5 flex items-center justify-between">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="font-mono text-amber-600 font-semibold">{c.score}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
