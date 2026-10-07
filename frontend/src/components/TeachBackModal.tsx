import React, { useState } from 'react';
import { TeachBackEvaluation } from '../types';
import { Mic, MicOff, Send, Award, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

interface TeachBackModalProps {
  conceptId: string;
  conceptName: string;
  onClose: () => void;
  onEvaluate: (docId: string, conceptId: string, explanation: string) => Promise<TeachBackEvaluation>;
}

export const TeachBackModal: React.FC<TeachBackModalProps> = ({
  conceptId,
  conceptName,
  onClose,
  onEvaluate,
}) => {
  const [explanation, setExplanation] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evaluation, setEvaluation] = useState<TeachBackEvaluation | null>(null);

  // Web Speech API for voice speech-to-text
  const toggleSpeechRecognition = () => {
    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported in this browser. Please type your explanation below.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setExplanation((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleSubmit = async () => {
    if (!explanation.trim()) return;
    setIsSubmitting(true);
    try {
      const result = await onEvaluate('doc_networks_osi_101', conceptId, explanation);
      setEvaluation(result);
      if (result.is_mastered) {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Demo helper shortcuts
  const loadDemoText = (text: string) => {
    setExplanation(text);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Award className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-purple-600">
                Feynman Teach-Back Challenge
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Teach {conceptName} to Professor Nova
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-sm font-semibold p-1"
          >
            ✕
          </button>
        </div>

        {/* Prompt */}
        <div className="bg-purple-50/70 border border-purple-100 rounded-2xl p-4 mb-4 text-xs text-purple-900">
          <p className="font-semibold flex items-center gap-2 mb-1">
            <img
              src="/professor_nova.png"
              alt="Professor Nova"
              className="w-4 h-4 rounded-full object-cover border border-purple-200"
            />
            Professor Nova's Challenge:
          </p>
          <p className="leading-relaxed text-slate-700">
            "The best way to verify true understanding is to teach it yourself. Explain <strong>{conceptName}</strong> in your own words. 
            How does it work, what problem does it solve, and how does it contrast with other protocols?"
          </p>
        </div>

        {!evaluation ? (
          <>
            {/* Input area */}
            <div className="relative mb-3">
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={5}
                placeholder="Type your explanation or use the microphone to speak aloud..."
                className="w-full p-4 rounded-2xl border border-slate-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-xs text-slate-800 resize-none outline-hidden"
              />
              <button
                type="button"
                onClick={toggleSpeechRecognition}
                className={`absolute bottom-3 right-3 p-2 rounded-xl transition-all ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
                title="Dictate with voice"
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Quick Demo Pre-fills for Competition Demonstrators */}
            <div className="mb-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                Quick Demonstration Prompts:
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    loadDemoText(
                      'The Transport Layer provides true process-to-process communication. TCP is connection-oriented using a 3-way handshake and retransmission for reliability, whereas UDP is connectionless and sends datagrams without guarantees.'
                    )
                  }
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-purple-100 hover:text-purple-800 text-slate-700 rounded-lg transition-colors"
                >
                  ✨ Thorough Explanation (High Mastery)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    loadDemoText(
                      'UDP is much better and reliable because it is faster than TCP for streaming.'
                    )
                  }
                  className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 rounded-lg transition-colors"
                >
                  ⚠️ Misconception Sample ("Speed = Reliable")
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!explanation.trim() || isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Evaluating...' : 'Evaluate My Explanation'}
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        ) : (
          /* Evaluation Results View */
          <div className="space-y-4">
            {/* Score Badges */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-purple-50 border border-purple-100 text-center">
                <span className="text-[10px] uppercase font-bold text-purple-600 tracking-wider">
                  Understanding Depth
                </span>
                <div className="text-3xl font-extrabold text-purple-900 mt-1">
                  {evaluation.understanding_score}%
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 text-center">
                <span className="text-[10px] uppercase font-bold text-blue-600 tracking-wider">
                  Factual Accuracy
                </span>
                <div className="text-3xl font-extrabold text-blue-900 mt-1">
                  {evaluation.accuracy_score}%
                </div>
              </div>
            </div>

            {/* Covered vs Missing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                <span className="font-bold text-emerald-800 flex items-center gap-1 mb-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Concepts Covered:
                </span>
                {evaluation.covered_concepts.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {evaluation.covered_concepts.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-emerald-200/60 text-emerald-800 rounded-md font-mono text-[10px]">
                        {c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic">None mentioned yet.</p>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-700 flex items-center gap-1 mb-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                  Key Elements To Add:
                </span>
                {evaluation.missing_concepts.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {evaluation.missing_concepts.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-md font-mono text-[10px]">
                        {m}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-emerald-700 font-semibold">None! Comprehensive coverage.</p>
                )}
              </div>
            </div>

            {/* Misconceptions detected in teach-back */}
            {evaluation.detected_misconceptions.length > 0 && (
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Misconception Alert in Teach-Back:
                </div>
                {evaluation.detected_misconceptions.map((mis, i) => (
                  <p key={i} className="mt-0.5 text-amber-800">• {mis}</p>
                ))}
              </div>
            )}

            {/* Recommendation */}
            <div className="p-4 bg-white rounded-2xl border border-slate-200 text-xs">
              <div className="flex items-center gap-1.5 mb-1.5">
                <img
                  src="/professor_nova.png"
                  alt="Professor Nova"
                  className="w-3.5 h-3.5 rounded-full object-cover border border-slate-200"
                />
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  Professor Nova's Pedagogical Feedback:
                </span>
              </div>
              <p className="text-slate-800 leading-relaxed font-medium">
                {evaluation.recommendation}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEvaluation(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Try Explaining Again
              </button>
              <button
                onClick={onClose}
                className="px-5 py-2 text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                Apply to Classroom
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
