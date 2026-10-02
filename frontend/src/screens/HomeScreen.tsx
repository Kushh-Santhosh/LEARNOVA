import React from 'react';
import {
  DocumentMeta,
  ConceptNode,
  LearnerProfile,
  LearnerAnalytics,
} from '../types';
import {
  BookOpen,
  ArrowRight,
  FolderClosed,
  Network,
  Clock,
  CheckCircle2,
  Sparkles,
  Layers,
  ChevronRight,
  HelpCircle
} from 'lucide-react';

interface HomeScreenProps {
  profile: LearnerProfile;
  activeDoc: DocumentMeta | null;
  documents: DocumentMeta[];
  concepts: ConceptNode[];
  analytics: LearnerAnalytics | null;
  onContinueLesson: () => void;
  onOpenCourse: (docId: string) => void;
  onOpenDocuments: () => void;
  onOpenProgress: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  profile,
  activeDoc,
  documents,
  concepts,
  analytics,
  onContinueLesson,
  onOpenCourse,
  onOpenDocuments,
  onOpenProgress,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const activeCourse = activeDoc || documents[0];
  const weakConcept = concepts.find((c) => c.mastery_score < 0.3) || concepts[0];

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full animate-fadeIn select-none">
      {/* Calm Greeting Header */}
      <div className="mb-10">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          Learning Workspace
        </span>
        <h1 className="text-3xl sm:text-4xl font-light text-slate-900 tracking-tight mt-1">
          {getGreeting()}, <span className="font-semibold text-slate-950">{profile.name.split(' ')[0]}</span>.
        </h1>
        <p className="text-sm text-slate-500 mt-2 font-normal leading-relaxed">
          Your AI teacher Professor Nova is ready. Continue where you left off or explore new concepts.
        </p>
      </div>

      {/* Primary Action: Continue Learning Card (Calm, Restrained, Premium) */}
      {activeCourse && (
        <div className="mb-10 p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
            <span className="flex items-center gap-1.5 text-blue-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              Active Lesson
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              {profile.learning_level} Track
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
                {activeCourse.title}
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
                Currently studying: <span className="text-slate-800 font-medium">Layer 4: Transport Layer (TCP vs UDP)</span>
              </p>
            </div>

            <button
              onClick={onContinueLesson}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs shrink-0 cursor-pointer"
            >
              <span>Continue lesson</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quiet Progress Bar */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="font-mono text-slate-700 font-semibold">
                {analytics?.overall_mastery_pct || 48}%
              </span>
              <span>course mastered</span>
            </div>
            <span className="text-[11px] text-slate-400">
              Next concept: {weakConcept?.name || 'TCP Reliability'}
            </span>
          </div>
        </div>
      )}

      {/* Two Column Grid: Courses & Recent Materials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        {/* Your Courses */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Your Courses
            </h3>
            <button
              onClick={onOpenDocuments}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              View all
            </button>
          </div>

          <div className="space-y-2.5">
            {documents.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                onClick={() => onOpenCourse(doc.id)}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-300 hover:shadow-2xs transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-blue-50 text-slate-600 group-hover:text-blue-600 flex items-center justify-center transition-colors shrink-0">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {doc.title}
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {doc.file_type.toUpperCase()} • 12 concepts mapped
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-700 transition-colors shrink-0" />
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Learning Summary */}
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Focus & Retention
            </h3>
            <button
              onClick={onOpenProgress}
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Details
            </button>
          </div>

          <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600 shrink-0">
                <HelpCircle className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Recommended Spaced Review</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  TCP reliability and connection handshake are scheduled for today based on your last quiz.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3 pt-3 border-t border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Proven Mastery</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  {analytics?.concepts_mastered || 3} concepts verified through Feynman teach-back explanations.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
