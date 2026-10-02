import React, { useState } from 'react';
import { QuizItem, QuizEvaluation } from '../types';
import { HelpCircle, CheckCircle, XCircle, ArrowRight, BookOpen } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizModalProps {
  quiz: QuizItem | null;
  onClose: () => void;
  onEvaluate: (quizId: string, concept: string, answer: string) => Promise<QuizEvaluation>;
}

export const QuizModal: React.FC<QuizModalProps> = ({ quiz, onClose, onEvaluate }) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [evaluation, setEvaluation] = useState<QuizEvaluation | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!quiz) return null;

  const handleSubmit = async () => {
    if (!selectedAnswer) return;
    setIsSubmitting(true);
    try {
      const result = await onEvaluate(quiz.id, quiz.concept, selectedAnswer);
      setEvaluation(result);
      if (result.is_correct) {
        confetti({
          particleCount: 60,
          spread: 70,
          origin: { y: 0.6 },
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <HelpCircle className="w-5 h-5" />
            </span>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                Grounded Comprehension Quiz
              </span>
              <h3 className="text-base font-bold text-slate-900">{quiz.concept}</h3>
            </div>
          </div>

          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold capitalize">
            {quiz.difficulty}
          </span>
        </div>

        {/* Question Text */}
        <p className="text-sm font-medium text-slate-800 leading-relaxed mb-5">
          {quiz.question}
        </p>

        {/* Options */}
        <div className="space-y-2.5 mb-5">
          {quiz.options.map((opt, i) => {
            const isSelected = selectedAnswer === opt;
            let optStyle = 'border-slate-200 hover:border-blue-400 bg-white';
            if (isSelected) {
              optStyle = 'border-blue-600 bg-blue-50 text-blue-900 font-semibold';
            }
            if (evaluation) {
              if (opt.toLowerCase() === evaluation.correct_answer.toLowerCase()) {
                optStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold';
              } else if (isSelected && !evaluation.is_correct) {
                optStyle = 'border-red-500 bg-red-50 text-red-900';
              }
            }

            return (
              <button
                key={i}
                disabled={!!evaluation || isSubmitting}
                onClick={() => setSelectedAnswer(opt)}
                className={`w-full text-left p-3.5 rounded-2xl border text-xs transition-all flex items-center justify-between ${optStyle}`}
              >
                <span>{opt}</span>
                {evaluation && opt.toLowerCase() === evaluation.correct_answer.toLowerCase() && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 ml-2" />
                )}
                {evaluation && isSelected && !evaluation.is_correct && (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 ml-2" />
                )}
              </button>
            );
          })}
        </div>

        {/* Evaluation Feedback */}
        {evaluation && (
          <div
            className={`p-4 rounded-2xl mb-4 text-xs ${
              evaluation.is_correct ? 'bg-emerald-50 text-emerald-900 border border-emerald-200' : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            <div className="font-bold flex items-center gap-1.5 mb-1">
              {evaluation.is_correct ? (
                <>
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Excellent! Correct understanding. (+20% Mastery)</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-amber-600" />
                  <span>Not quite. Let's inspect the evidence.</span>
                </>
              )}
            </div>
            <p className="mt-1 leading-relaxed text-slate-700">{evaluation.explanation}</p>
            {evaluation.source && (
              <div className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-400" />
                <span>Grounded in Section: {evaluation.source.section} (Page {evaluation.source.page})</span>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2">
          {!evaluation ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                disabled={!selectedAnswer || isSubmitting}
                onClick={handleSubmit}
                className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              >
                {isSubmitting ? 'Evaluating...' : 'Submit Answer'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-xs transition-colors"
            >
              Continue to Classroom
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
