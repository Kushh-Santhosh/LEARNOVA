import React from 'react';
import {
  Sparkles,
  ArrowRight,
  BookOpen,
  Network,
  Cpu,
  Brain,
  Award,
  BarChart,
  ShieldCheck,
  CheckCircle2,
  Play
} from 'lucide-react';

interface LandingScreenProps {
  onStartLearning: () => void;
  onExploreGraph: () => void;
  onUploadDoc: () => void;
}

export const LandingScreen: React.FC<LandingScreenProps> = ({
  onStartLearning,
  onExploreGraph,
  onUploadDoc,
}) => {
  return (
    <div className="flex-1 flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-16 md:py-24 border-b border-slate-200/60 bg-gradient-to-b from-white via-blue-50/20 to-slate-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-semibold mb-6 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>Introducing LEARNOVA • The Adaptive AI Classroom</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-950 tracking-tight leading-tight">
            Turn Information Into <span className="text-blue-600">Understanding</span>.
          </h1>

          {/* Subheading */}
          <p className="mt-5 text-base md:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Upload your learning material and meet an AI teacher that understands it, teaches it,
            diagnoses your misunderstandings, adapts its explanations, and guides you to real mastery.
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onStartLearning}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Enter AI Classroom</span>
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </button>
            <button
              onClick={onUploadDoc}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-800 font-semibold text-sm border border-slate-200 shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-500" />
              <span>Upload Study Material</span>
            </button>
            <button
              onClick={onExploreGraph}
              className="w-full sm:w-auto px-5 py-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-sm border border-slate-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Network className="w-4 h-4 text-blue-600" />
              <span>Explore Knowledge Graph</span>
            </button>
          </div>

          {/* Grounding guarantee */}
          <div className="mt-8 flex items-center justify-center space-x-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Strictly Source Grounded (Zero Fake RAG)
            </span>
            <span className="flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-blue-600" />
              Misconception Diagnostic Engine
            </span>
            <span className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-purple-600" />
              Feynman Teach-Back Evaluator
            </span>
          </div>
        </div>
      </section>

      {/* The Adaptive Learning Loop */}
      <section className="py-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600">
            The Pedagogical Difference
          </span>
          <h2 className="text-2xl md:text-3xl font-bold text-slate-900 mt-1">
            Not Just A Chatbot. An Adaptive Learning Cycle.
          </h2>
          <p className="text-xs md:text-sm text-slate-600 mt-2">
            Generic chatbots merely answer isolated questions. LEARNOVA guides you through an end-to-end cognitive loop.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm mb-3">
              1
            </div>
            <h3 className="font-bold text-sm text-slate-900">Understand & Graph</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Extracts sections, hierarchies, definitions, and builds a relational knowledge graph with page citations.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-sm mb-3">
              2
            </div>
            <h3 className="font-bold text-sm text-slate-900">Adaptive Teaching</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Explains conversationally with voice, shifts strategies into analogies, examples, and visual whiteboard flowcharts.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-sm mb-3">
              3
            </div>
            <h3 className="font-bold text-sm text-slate-900">Misconception Engine</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Detects why you got an answer wrong, separates confusing terms, and remediates with tailored visual comparisons.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-shadow">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm mb-3">
              4
            </div>
            <h3 className="font-bold text-sm text-slate-900">Teach-Back Mastery</h3>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              Asks you to teach concepts back in your own words, grades coverage & accuracy, and logs true concept mastery.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="py-12 bg-slate-100/50 border-t border-slate-200/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <Brain className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Interactive Knowledge Graph</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Inspect concept dependencies (`depends_on`, `part_of`, `example_of`) with clickable nodes and live mastery tracking.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <Cpu className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Dynamic Visual Whiteboard</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                The teacher requests flowcharts, comparison matrices, and timelines to solidify abstract theories instantly.
              </p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200">
              <BarChart className="w-6 h-6 text-blue-600 mb-3" />
              <h4 className="font-bold text-sm text-slate-900">Real Learning Analytics</h4>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Transparent mastery indicators: Mastered, Improving, and Needs Review, backed by an automated 3-day revision plan.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Banner */}
      <footer className="py-8 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-800">LEARNOVA</span>
            <span>• Turn Information Into Understanding</span>
          </div>
          <div>Adaptive AI Classroom • 2026 Competition Prototype</div>
        </div>
      </footer>
    </div>
  );
};
