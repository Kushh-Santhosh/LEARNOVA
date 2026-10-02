import React, { useState, useEffect, useRef } from 'react';
import {
  DocumentMeta,
  ConceptNode,
  TeacherResponse,
  Citation,
  LearningArtifact,
  MisconceptionDiagnosis,
  QuizItem,
  QuizEvaluation,
  TeachBackEvaluation,
} from '../types';
import { AvatarTeacher } from '../components/AvatarTeacher';
import { ArtifactPanel } from '../components/ArtifactPanel';
import { ChatComposer } from '../components/ChatComposer';
import { QuizModal } from '../components/QuizModal';
import { TeachBackModal } from '../components/TeachBackModal';
import { api } from '../api';
import {
  AlertTriangle,
  Lightbulb,
  Bookmark,
  Sparkles,
  HelpCircle,
  Award,
  Layers,
  CheckCircle2,
  Volume2,
  VolumeX
} from 'lucide-react';

interface ClassroomWorkspaceProps {
  activeDoc: DocumentMeta | null;
  concepts: ConceptNode[];
  activeConcept: ConceptNode | null;
  onSelectConcept: (concept: ConceptNode) => void;
  activeLanguage: string;
  onChangeLanguage: (lang: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'teacher' | 'student';
  text: string;
  spoken_text?: string;
  mode?: string;
  misconception?: MisconceptionDiagnosis | null;
  artifact?: LearningArtifact | null;
  citations?: Citation[];
  timestamp: string;
}

export const ClassroomWorkspace: React.FC<ClassroomWorkspaceProps> = ({
  activeDoc,
  concepts,
  activeConcept,
  onSelectConcept,
  activeLanguage,
  onChangeLanguage,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [textToSpeak, setTextToSpeak] = useState<string>('');
  const [activeMode, setActiveMode] = useState<string>('explain');

  // Contextual Artifact / Source state
  const [activeArtifact, setActiveArtifact] = useState<LearningArtifact | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Modals state
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [isTeachBackOpen, setIsTeachBackOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialText =
        "Welcome! I am Professor Nova. I have analyzed your study material on Computer Networks & Protocols.\n\n" +
        "Today we can explore Layer 4: The Transport Layer (TCP vs UDP). I'll guide you step by step, create visual flowcharts on your workspace, and verify your understanding through quick checks and teach-back.\n\n" +
        "What would you like to begin with?";
      const initialSpoken = "Welcome to your adaptive classroom. I am Professor Nova. Let's explore the Transport Layer together.";

      setMessages([
        {
          id: 'msg_welcome',
          sender: 'teacher',
          text: initialText,
          spoken_text: initialSpoken,
          timestamp: 'Just now',
        },
      ]);
      setTextToSpeak(initialSpoken);
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
    recognition.lang = activeLanguage === 'kn' ? 'kn-IN' : activeLanguage === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      handleSendMessage(transcript);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);

    recognition.start();
  };

  const handleSendMessage = async (text: string, mode?: string, lang?: string) => {
    if (!text.trim() || isSending) return;

    // Support voice interruption: stop active speech when user speaks
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }

    const studentMsg: ChatMessage = {
      id: `msg_${Date.now()}_student`,
      sender: 'student',
      text: text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, studentMsg]);
    setIsSending(true);

    try {
      const res: TeacherResponse = await api.teach({
        document_id: activeDoc?.id || 'doc_networks_osi_101',
        message: text,
        active_concept: activeConcept?.name || 'Transport Layer (L4)',
        mode: mode || activeMode,
        language: lang || activeLanguage,
      });

      let artifact: LearningArtifact | null = null;
      if (res.visual_element) {
        artifact = {
          id: `art_${Date.now()}`,
          type: res.visual_element.type,
          title: res.visual_element.title,
          data: res.visual_element.data,
          source: res.visual_element.source,
          timestamp: 'Just now',
        };
        setActiveArtifact(artifact);
        setActiveCitation(null);
      }

      const teacherMsg: ChatMessage = {
        id: `msg_${Date.now()}_teacher`,
        sender: 'teacher',
        text: res.teacher_text,
        spoken_text: res.spoken_text || res.teacher_text.slice(0, 160),
        mode: res.teaching_mode,
        misconception: res.misconception_detected,
        artifact: artifact,
        citations: res.citations,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, teacherMsg]);
      setActiveMode(res.teaching_mode);

      // Trigger avatar concise speech
      const speech = res.spoken_text || res.teacher_text.split('\n')[0];
      setTextToSpeak(speech);
      setIsSpeaking(true);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const openQuizForConcept = async (conceptName?: string) => {
    try {
      const quiz = await api.generateQuiz(
        activeDoc?.id || 'doc_networks_osi_101',
        conceptName || activeConcept?.name || 'Transport Layer'
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
    return await api.evaluateTeachBack(docId, conceptId, explanation, activeConcept?.name);
  };

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-50 relative">
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

      {/* Main Conversation Column (Center) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Session Header: Concept & Teacher State */}
        <div className="h-14 px-6 border-b border-slate-200/80 bg-white flex items-center justify-between select-none">
          <div className="flex items-center space-x-3">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <div>
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {activeConcept?.name || 'Transport Layer (L4)'}
              </div>
              <span className="text-[10px] text-slate-500">
                Course: {activeDoc?.title || 'Computer Networks & Protocols'}
              </span>
            </div>
          </div>

          {/* Quick Actions Header Toolbar */}
          <div className="flex items-center space-x-2 text-xs">
            <button
              onClick={() => openQuizForConcept()}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
              <span>Quiz Me</span>
            </button>
            <button
              onClick={() => setIsTeachBackOpen(true)}
              className="px-2.5 py-1 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 font-semibold flex items-center gap-1 transition-colors"
            >
              <Award className="w-3.5 h-3.5 text-purple-600" />
              <span>Teach-Back</span>
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6 max-w-4xl w-full mx-auto">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.sender === 'student' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Misconception Diagnostic Banner */}
              {msg.misconception && msg.misconception.needs_remediation && (
                <div className="w-full max-w-2xl mb-3 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs shadow-2xs animate-fadeIn">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Misconception Diagnosed: {msg.misconception.concept}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/60 text-amber-900 font-bold uppercase tracking-wider">
                      {msg.misconception.severity} Priority
                    </span>
                  </div>

                  <p className="text-amber-900 leading-relaxed font-medium">
                    {msg.misconception.misconception}
                  </p>

                  {msg.misconception.counterexample && (
                    <div className="mt-2.5 p-2.5 bg-white/80 rounded-xl border border-amber-200 text-[11px] text-amber-950">
                      <strong>Counterexample:</strong> {msg.misconception.counterexample}
                    </div>
                  )}

                  <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-1.5 font-semibold">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                    <span><strong>Remediation Strategy:</strong> {msg.misconception.remediation_strategy}</span>
                  </div>
                </div>
              )}

              {/* Message Bubble with Progressive Disclosure */}
              <div
                className={`max-w-[88%] rounded-3xl p-5 text-xs leading-relaxed ${
                  msg.sender === 'student'
                    ? 'bg-blue-600 text-white rounded-br-xs shadow-xs'
                    : 'bg-white text-slate-800 rounded-bl-xs border border-slate-200 shadow-2xs'
                }`}
              >
                {/* Spoken subtitle for Teacher speech */}
                {msg.sender === 'teacher' && msg.spoken_text && (
                  <div className="pb-3 mb-3 border-b border-slate-100 flex items-start justify-between text-blue-900 font-medium">
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                      <span className="italic font-serif">"{msg.spoken_text}"</span>
                    </div>
                  </div>
                )}

                {/* Body Text */}
                <div className="whitespace-pre-line text-slate-800 leading-relaxed">
                  {msg.text}
                </div>

                {/* Grounded Citations Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mr-1">
                      Citations:
                    </span>
                    {msg.citations.map((cite, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setActiveCitation(cite);
                          setActiveArtifact(null);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-700 font-mono text-[10px] flex items-center gap-1 transition-colors border border-slate-200"
                        title="Click to inspect source passage in Artifact Panel"
                      >
                        <Bookmark className="w-3 h-3 text-blue-600" />
                        <span>p. {cite.page} • {cite.section}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action to open generated artifact in right workspace */}
                {msg.artifact && (
                  <div className="mt-3">
                    <button
                      onClick={() => {
                        setActiveArtifact(msg.artifact || null);
                        setActiveCitation(null);
                      }}
                      className="py-1.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-semibold text-[11px] flex items-center gap-1.5 transition-colors border border-blue-200"
                    >
                      <Layers className="w-3.5 h-3.5 text-blue-600" />
                      <span>Open {msg.artifact.title} in Workspace Panel</span>
                    </button>
                  </div>
                )}
              </div>

              <span className="text-[9px] text-slate-400 mt-1 px-2">{msg.timestamp}</span>
            </div>
          ))}

          {isSending && (
            <div className="flex items-center space-x-2 text-xs text-slate-500 italic p-3 bg-white rounded-2xl border border-slate-200 w-fit">
              <Sparkles className="w-4 h-4 text-blue-600 animate-spin" />
              <span>Professor Nova is reasoning over curriculum and structuring explanation...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Modern Composer Bar at Bottom */}
        <ChatComposer
          onSendMessage={handleSendMessage}
          isSending={isSending}
          isListening={isListening}
          onToggleListening={toggleListening}
          activeLanguage={activeLanguage}
          onChangeLanguage={onChangeLanguage}
        />
      </div>

      {/* RIGHT CONTEXTUAL LEARNING WORKSPACE (Claude Artifacts inspired) */}
      {(activeArtifact || activeCitation) ? (
        <ArtifactPanel
          artifact={activeArtifact}
          activeCitation={activeCitation}
          onClose={() => {
            setActiveArtifact(null);
            setActiveCitation(null);
          }}
          onAskAboutArtifact={(q) => handleSendMessage(q)}
          onQuizMeOnArtifact={(topic) => openQuizForConcept(topic)}
        />
      ) : (
        /* Teacher Stage & Avatar Overview when no specific artifact is active */
        <div className="hidden lg:flex flex-col w-80 border-l border-slate-200 bg-white p-4 space-y-4 overflow-y-auto">
          {/* Animated Teacher Avatar */}
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

          {/* Curriculum Guide */}
          <div className="bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200 text-xs">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Curriculum Outline
            </span>
            <div className="space-y-1 mt-2">
              {concepts.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onSelectConcept(c);
                    handleSendMessage(`Let's study ${c.name}.`);
                  }}
                  className={`w-full text-left p-1.5 rounded-lg text-xs flex items-center justify-between transition-colors ${
                    activeConcept?.id === c.id
                      ? 'bg-blue-50 text-blue-900 font-bold'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate max-w-[160px]">{c.name}</span>
                  <span className="text-[10px] text-slate-400">{Math.round(c.mastery_score * 100)}%</span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Demo Pre-set Pill */}
          <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900">
            <span className="text-[10px] uppercase font-bold text-amber-800 block mb-1">
              Competition Demonstration:
            </span>
            <button
              onClick={() => handleSendMessage('UDP is reliable because it is faster')}
              className="w-full text-left p-2 rounded-xl bg-white hover:bg-amber-100 border border-amber-200 text-[11px] font-semibold transition-colors"
            >
              ⚠️ Test Misconception Trigger
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
