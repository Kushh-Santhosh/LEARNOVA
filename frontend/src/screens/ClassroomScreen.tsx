import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentMeta,
  ConceptNode,
  TeacherResponse,
  VisualPayload,
  Citation,
  MisconceptionDiagnosis,
  QuizItem,
  QuizEvaluation,
  TeachBackEvaluation,
} from '../types';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { VisualWhiteboard } from '../components/VisualWhiteboard';
import { SourceCitationPanel } from '../components/SourceCitationPanel';
import { QuizModal } from '../components/QuizModal';
import { TeachBackModal } from '../components/TeachBackModal';
import { api } from '../api';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  HelpCircle,
  Award,
  AlertTriangle,
  Lightbulb,
  BookOpen,
  ArrowRight,
  Layers,
  RotateCcw,
} from 'lucide-react';

interface ClassroomScreenProps {
  activeDoc: DocumentMeta | null;
  concepts: ConceptNode[];
  activeConcept: ConceptNode | null;
  onSelectConcept: (concept: ConceptNode) => void;
  onExploreGraph: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'teacher' | 'student';
  text: string;
  mode?: string;
  misconception?: MisconceptionDiagnosis | null;
  timestamp: string;
}

export const ClassroomScreen: React.FC<ClassroomScreenProps> = ({
  activeDoc,
  concepts,
  activeConcept,
  onSelectConcept,
  onExploreGraph,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentVisual, setCurrentVisual] = useState<VisualPayload | null>(null);
  const [currentCitations, setCurrentCitations] = useState<Citation[]>([]);
  const [activeMode, setActiveMode] = useState<string>('explain');
  const [textToSpeak, setTextToSpeak] = useState<string>('');

  // Modals state
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [isTeachBackOpen, setIsTeachBackOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial welcome message from teacher
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText =
        "Welcome to your adaptive classroom! I am Professor Nova. I have analyzed your study material on Computer Networks & Protocols. What concept would you like to explore today? We can dive straight into the Transport Layer (TCP vs UDP), or you can ask any question.";
      setMessages([
        {
          id: 'msg_welcome',
          sender: 'teacher',
          text: welcomeText,
          mode: 'explain',
          timestamp: 'Just now',
        },
      ]);
      setTextToSpeak(welcomeText);
    }
  }, []);

  // Web Speech API for voice speech-to-text
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInputText(transcript);
      setIsListening(false);
      handleSendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSendMessage = async (customMessage?: string, forcedMode?: string) => {
    const text = (customMessage || inputText).trim();
    if (!text || isSending) return;

    const studentMsg: ChatMessage = {
      id: `msg_${Date.now()}_student`,
      sender: 'student',
      text: text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, studentMsg]);
    setInputText('');
    setIsSending(true);

    try {
      const res: TeacherResponse = await api.teach({
        document_id: activeDoc?.id || 'doc_networks_osi_101',
        message: text,
        active_concept: activeConcept?.name || 'Transport Layer (L4)',
        mode: forcedMode || activeMode,
      });

      const teacherMsg: ChatMessage = {
        id: `msg_${Date.now()}_teacher`,
        sender: 'teacher',
        text: res.teacher_text,
        mode: res.teaching_mode,
        misconception: res.misconception_detected,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, teacherMsg]);
      setActiveMode(res.teaching_mode);
      if (res.visual_element) {
        setCurrentVisual(res.visual_element);
      }
      if (res.citations) {
        setCurrentCitations(res.citations);
      }

      // Read aloud via animated avatar
      setTextToSpeak(res.teacher_text);
      setIsSpeaking(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const triggerQuickAction = (actionText: string, mode: string) => {
    handleSendMessage(actionText, mode);
  };

  const openQuizForActiveConcept = async () => {
    try {
      const quiz = await api.generateQuiz(
        activeDoc?.id || 'doc_networks_osi_101',
        activeConcept?.name || 'Transport Layer'
      );
      setActiveQuiz(quiz);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEvaluateQuiz = async (quizId: string, concept: string, answer: string): Promise<QuizEvaluation> => {
    return await api.evaluateQuiz(quizId, concept, answer);
  };

  const handleEvaluateTeachBack = async (
    docId: string,
    conceptId: string,
    explanation: string
  ): Promise<TeachBackEvaluation> => {
    return await api.evaluateTeachBack(docId, conceptId, explanation);
  };

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 w-full flex flex-col h-[calc(100vh-4rem)]">
      {/* Modals */}
      {activeQuiz && (
        <QuizModal
          quiz={activeQuiz}
          onClose={() => setActiveQuiz(null)}
          onEvaluate={handleEvaluateQuiz}
        />
      )}

      {isTeachBackOpen && (
        <TeachBackModal
          conceptId={activeConcept?.id || 'c_transport_layer'}
          conceptName={activeConcept?.name || 'Transport Layer (L4)'}
          onClose={() => setIsTeachBackOpen(false)}
          onEvaluate={handleEvaluateTeachBack}
        />
      )}

      {/* Classroom Desktop Grid: Left (Concepts & Sources) | Center (Teaching & Visuals) | Right (Avatar) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 overflow-hidden">
        {/* LEFT COLUMN: Curriculum Concepts & Source Grounding (3 cols) */}
        <div className="lg:col-span-3 flex flex-col space-y-3 overflow-y-auto pr-1">
          {/* Active Curriculum Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
                Current Lesson
              </span>
              <button
                onClick={onExploreGraph}
                className="text-[10px] text-blue-600 hover:underline font-semibold flex items-center gap-0.5"
              >
                <span>Full Graph</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
            <h3 className="text-xs font-bold text-slate-900 leading-snug">
              {activeDoc?.title || 'Computer Networks & OSI Model'}
            </h3>

            {/* Concept list */}
            <div className="mt-3 space-y-1.5">
              {concepts.map((concept) => {
                const isActive = activeConcept?.id === concept.id;
                return (
                  <button
                    key={concept.id}
                    onClick={() => {
                      onSelectConcept(concept);
                      handleSendMessage(`Let's focus on ${concept.name}. Explain its core concepts.`);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-between ${
                      isActive
                        ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{concept.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {Math.round(concept.mastery_score * 100)}%
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grounded Source Citations */}
          <SourceCitationPanel citations={currentCitations} />
        </div>

        {/* CENTER COLUMN: Classroom Stream & Visual Whiteboard (6 cols) */}
        <div className="lg:col-span-6 flex flex-col h-full bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          {/* Visual Whiteboard Stage */}
          <div className="p-3 border-b border-slate-100 bg-slate-50/40">
            <VisualWhiteboard visual={currentVisual} />
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Misconception Alert Banner (Crucial Signature Feature!) */}
                {msg.misconception && msg.misconception.needs_remediation && (
                  <div className="w-full max-w-lg mb-2 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs animate-fadeIn">
                    <div className="flex items-center gap-1.5 font-bold mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Misconception Detected: {msg.misconception.concept}</span>
                    </div>
                    <p className="text-amber-800 leading-relaxed">
                      <strong>Issue:</strong> {msg.misconception.misconception}
                    </p>
                    <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] text-amber-700 flex items-center gap-1">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                      <span><strong>Remediation Strategy:</strong> {msg.misconception.remediation_strategy}</span>
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    msg.sender === 'student'
                      ? 'bg-blue-600 text-white rounded-br-xs shadow-2xs'
                      : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>
                </div>
                <span className="text-[9px] text-slate-400 mt-1 px-1">{msg.timestamp}</span>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center space-x-2 text-xs text-slate-400 italic">
                <Sparkles className="w-3.5 h-3.5 text-blue-500 animate-spin" />
                <span>Professor Nova is analyzing curriculum & preparing response...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Chips */}
          <div className="px-4 py-2 border-t border-slate-100 flex items-center space-x-1.5 overflow-x-auto text-[11px]">
            <button
              onClick={() => triggerQuickAction('Explain simpler with no jargon', 'simplify')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 whitespace-nowrap transition-colors"
            >
              💡 Explain simpler
            </button>
            <button
              onClick={() => triggerQuickAction('Give me a real-world example', 'example')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 whitespace-nowrap transition-colors"
            >
              🌍 Real-world example
            </button>
            <button
              onClick={() => triggerQuickAction('Give me an analogy', 'analogy')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 whitespace-nowrap transition-colors"
            >
              📦 Analogy
            </button>
            <button
              onClick={() => triggerQuickAction('Show this visually with a diagram', 'visual')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 whitespace-nowrap transition-colors"
            >
              📊 Show visually
            </button>
            <button
              onClick={() => triggerQuickAction('Let us do a technical deep dive', 'deep_dive')}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 whitespace-nowrap transition-colors"
            >
              🔬 Deep dive
            </button>
          </div>

          {/* Input & Microphone Bar */}
          <div className="p-3 border-t border-slate-100 bg-white flex items-center space-x-2">
            <button
              type="button"
              onClick={toggleListening}
              className={`p-2.5 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-md'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isListening ? 'Stop Listening' : 'Speak to AI Teacher'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask a question or explain what you think..."
              className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
            />

            <button
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || isSending}
              className="p-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: AI Avatar Teacher & Assessment Triggers (3 cols) */}
        <div className="lg:col-span-3 flex flex-col space-y-3 overflow-y-auto">
          {/* Avatar Component */}
          <AvatarTeacher
            textToSpeak={textToSpeak}
            isSpeaking={isSpeaking}
            isListening={isListening}
            mode={activeMode}
            onSpeechEnd={() => setIsSpeaking(false)}
            onReplay={() => {
              if (textToSpeak) setIsSpeaking(true);
            }}
          />

          {/* Assessment Triggers */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-2.5">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Verifiable Mastery Actions</span>
            </h4>

            {/* Teach-Back Trigger */}
            <button
              onClick={() => setIsTeachBackOpen(true)}
              className="w-full py-2.5 px-3 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <span>Teach-Back Challenge</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-purple-500" />
            </button>

            {/* Grounded Quiz Trigger */}
            <button
              onClick={openQuizForActiveConcept}
              className="w-full py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold flex items-center justify-between transition-colors"
            >
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>Take Grounded Quiz</span>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
            </button>

            {/* Deliberate Misconception Demonstration Pill */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                Demo Trigger:
              </span>
              <button
                onClick={() =>
                  handleSendMessage('UDP is reliable because it is faster')
                }
                className="w-full py-1.5 px-2 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-medium text-left border border-amber-200 transition-colors"
              >
                ⚠️ Trigger: "UDP is reliable because it is faster"
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
