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
import { ProfessorNova } from '../components/avatar/ProfessorNova';
import { AvatarState } from '../components/avatar/AvatarTypes';
import { ArtifactPanel } from '../components/ArtifactPanel';
import { ChatComposer } from '../components/ChatComposer';
import { QuizModal } from '../components/QuizModal';
import { TeachBackModal } from '../components/TeachBackModal';
import { api } from '../api';
import {
  AlertTriangle,
  Lightbulb,
  Bookmark,
  HelpCircle,
  Award,
  Layers,
  Sparkles,
  Maximize2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

interface ClassroomWorkspaceProps {
  activeDoc: DocumentMeta | null;
  concepts: ConceptNode[];
  activeConcept: ConceptNode | null;
  onSelectConcept: (concept: ConceptNode) => void;
  activeLanguage: string;
  onChangeLanguage: (lang: string) => void;
  onOpenMobileNav?: () => void;
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
  onOpenMobileNav,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isFocusTeacher, setIsFocusTeacher] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Contextual Artifact / Source state
  const [activeArtifact, setActiveArtifact] = useState<LearningArtifact | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Modals state
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [isTeachBackOpen, setIsTeachBackOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Initial welcome message
  useEffect(() => {
    if (messages.length === 0) {
      const initialText =
        "Welcome. I'm Professor Nova, your adaptive AI teacher for Computer Networks.\n\n" +
        "We'll explore Layer 4: The Transport Layer together—comparing TCP and UDP, examining connection reliability, and breaking down real-world tradeoffs.\n\n" +
        "Before we dive in: in your own words, what role does the Transport Layer play when two applications communicate across the Internet?";
      const initialSpoken = "Welcome. I am Professor Nova. Before we dive into TCP and UDP, what do you already know about the Transport Layer?";

      setMessages([
        {
          id: 'msg_welcome',
          sender: 'teacher',
          text: initialText,
          spoken_text: initialSpoken,
          timestamp: 'Just now',
        },
      ]);
      setSpokenText(initialSpoken);
      playSpeech(initialSpoken);
    }
  }, []);

  // Web Speech API Voice Engine with natural fallback
  const playSpeech = (text: string) => {
    if (!text || isMuted || typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`>]/g, '').trim();
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(
      (v) => (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')) && v.lang.startsWith('en')
    );
    if (preferred) utterance.voice = preferred;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setAvatarState('speaking');
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setAvatarState('idle');
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setAvatarState('idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  const handleInterrupt = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setAvatarState('interrupted');
    setTimeout(() => setAvatarState('idle'), 800);
  };

  // Web Speech API for voice speech-to-text
  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      setAvatarState('idle');
      return;
    }

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech Recognition is not supported by your browser. Please type your message.');
      return;
    }

    // Interrupt any active teacher speech
    handleInterrupt();

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = activeLanguage === 'kn' ? 'kn-IN' : activeLanguage === 'hi' ? 'hi-IN' : 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setAvatarState('listening');
    };
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      setAvatarState('thinking');
      handleSendMessage(transcript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setAvatarState('idle');
    };
    recognition.onend = () => {
      setIsListening(false);
      if (!isSending) setAvatarState('idle');
    };

    recognition.start();
  };

  const handleSendMessage = async (text: string, mode?: string, lang?: string) => {
    if (!text.trim() || isSending) return;

    // Natural interruption if teacher was speaking
    handleInterrupt();

    const studentMsg: ChatMessage = {
      id: `msg_${Date.now()}_student`,
      sender: 'student',
      text: text,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, studentMsg]);
    setIsSending(true);
    setAvatarState('thinking');

    try {
      const res: TeacherResponse = await api.teach({
        document_id: activeDoc?.id || 'doc_networks_osi_101',
        message: text,
        active_concept: activeConcept?.name || 'Transport Layer (L4)',
        mode: mode || 'explain',
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

      // Human-like concise spoken line (not reciting the whole essay)
      const spoken = res.spoken_text || res.teacher_text.split('\n')[0].replace(/[*#]/g, '');

      const teacherMsg: ChatMessage = {
        id: `msg_${Date.now()}_teacher`,
        sender: 'teacher',
        text: res.teacher_text,
        spoken_text: spoken,
        mode: res.teaching_mode,
        misconception: res.misconception_detected,
        artifact: artifact,
        citations: res.citations,
        timestamp: 'Just now',
      };

      setMessages((prev) => [...prev, teacherMsg]);
      setSpokenText(spoken);
      playSpeech(spoken);
    } catch (err) {
      console.error(err);
      setAvatarState('error');
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
    <div className="flex-1 flex flex-col h-full bg-[#fafaf9] overflow-hidden relative">
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

      {/* Top Header: Calm breadcrumb & context */}
      <header className="h-14 px-4 sm:px-8 border-b border-slate-200/80 bg-white/80 backdrop-blur-xs flex items-center justify-between shrink-0 select-none z-10">
        <div className="flex items-center space-x-2 text-xs text-slate-500 min-w-0">
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              className="lg:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-lg mr-1 cursor-pointer"
              title="Open Navigation"
            >
              <Menu className="w-4 h-4" />
            </button>
          )}
          <span className="hidden sm:inline hover:text-slate-800 transition-colors">Courses</span>
          <ChevronRight className="hidden sm:inline w-3 h-3 text-slate-300" />
          <span className="font-medium text-slate-800 truncate">
            {activeDoc?.title || 'Computer Networks'}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
          <span className="text-slate-900 font-semibold truncate">
            {activeConcept?.name || 'Transport Layer'}
          </span>
        </div>

        {/* Header Tools */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => openQuizForConcept()}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Test understanding with a diagnostic quiz"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Quiz</span>
          </button>
          <button
            onClick={() => setIsTeachBackOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Explain the concept back in your own words"
          >
            <Award className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Teach-Back</span>
          </button>
          <button
            onClick={() => setIsFocusTeacher(!isFocusTeacher)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
              isFocusTeacher
                ? 'bg-slate-950 border-slate-950 text-white'
                : 'border-slate-200 hover:border-slate-300 text-slate-700'
            }`}
            title="Toggle Live Teacher Focus Mode"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Focus Teacher</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body: Conversation + Contextual Right Panel */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Central Conversation Column */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Messages Stream (Claude-style Calm Whitespace & Light Hierarchy) */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-10 py-8 space-y-7 max-w-3xl w-full mx-auto">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === 'student' ? 'items-end' : 'items-start'
                }`}
              >
                {/* Misconception Diagnostic Alert Banner */}
                {msg.misconception && msg.misconception.needs_remediation && (
                  <div className="w-full mb-4 p-4 rounded-2xl bg-amber-50/90 border border-amber-200 text-amber-950 text-xs shadow-2xs animate-fadeIn">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-semibold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600" />
                        <span>Insight: Conceptual Misconception Diagnosed</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-200/70 text-amber-900 font-medium">
                        Targeted Remediation
                      </span>
                    </div>

                    <p className="text-amber-900 leading-relaxed font-normal">
                      {msg.misconception.misconception}
                    </p>

                    {msg.misconception.counterexample && (
                      <div className="mt-2.5 p-2.5 bg-white/90 rounded-xl border border-amber-200/80 text-[11px] text-amber-950">
                        <strong>Counterexample:</strong> {msg.misconception.counterexample}
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-amber-800 flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>{msg.misconception.remediation_strategy}</span>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                {msg.sender === 'teacher' ? (
                  /* Professor Nova Message: Calm, minimal, conversation-first */
                  <div className="w-full flex items-start space-x-3.5">
                    {/* Small Nova Identity indicator */}
                    <div className="w-7 h-7 rounded-xl bg-slate-950 text-cyan-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Name & Spoken audio pill */}
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="text-xs font-semibold text-slate-900">Professor Nova</span>
                        <span className="text-[10px] text-slate-400 font-normal">AI Teacher</span>
                      </div>

                      {/* Conversational Text */}
                      <div className="text-sm text-slate-800 font-normal leading-relaxed whitespace-pre-line">
                        {msg.text}
                      </div>

                      {/* Citations Pill Bar (Quiet metadata) */}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="mt-3.5 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mr-1">
                            Sources:
                          </span>
                          {msg.citations.map((cite, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setActiveCitation(cite);
                                setActiveArtifact(null);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-mono text-[10px] flex items-center gap-1 transition-colors border border-slate-200 cursor-pointer shadow-2xs"
                              title="Inspect source passage in drawer"
                            >
                              <Bookmark className="w-3 h-3 text-slate-400" />
                              <span>p. {cite.page} • {cite.section}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Visual Artifact Action (Opens workspace side-panel) */}
                      {msg.artifact && (
                        <div className="mt-3">
                          <button
                            onClick={() => {
                              setActiveArtifact(msg.artifact || null);
                              setActiveCitation(null);
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs cursor-pointer"
                          >
                            <Layers className="w-3.5 h-3.5 text-cyan-300" />
                            <span>View {msg.artifact.title} in Workspace</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Student Message: Clean, restrained, right-aligned */
                  <div className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 bg-slate-200/80 text-slate-900 text-sm font-normal leading-relaxed">
                    {msg.text}
                  </div>
                )}
              </div>
            ))}

            {/* Subtle Thinking Activity Indicator */}
            {isSending && (
              <div className="flex items-center space-x-2.5 text-xs text-slate-400 py-2">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping" />
                <span>Professor Nova is reasoning...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Composer */}
          <ChatComposer
            onSendMessage={handleSendMessage}
            isSending={isSending}
            isListening={isListening}
            onToggleListening={toggleListening}
            activeLanguage={activeLanguage}
            onChangeLanguage={onChangeLanguage}
          />
        </div>

        {/* Contextual Right Workspace Panel */}
        {/* Case A: Artifact or Citation is active */}
        {(activeArtifact || activeCitation) ? (
          <div className="w-full sm:w-[480px] lg:w-[440px] xl:w-[480px] bg-white border-l border-slate-200 shadow-sm flex flex-col shrink-0 h-full z-20 animate-fadeIn">
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
          </div>
        ) : (
          /* Case B: Professor Nova Digital Teacher Stage (Compact & Calm by default, or Expandable Focus Mode) */
          <div
            className={`hidden lg:flex flex-col border-l border-slate-200/80 bg-white p-5 transition-all duration-300 ${
              isFocusTeacher ? 'w-96' : 'w-72'
            }`}
          >
            {/* The Futuristic AI Teacher */}
            <ProfessorNova
              provider="auto"
              state={avatarState}
              spokenText={spokenText}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onReplay={() => {
                if (spokenText) playSpeech(spokenText);
              }}
              onInterrupt={handleInterrupt}
              isFocusMode={isFocusTeacher}
              onToggleFocusMode={() => setIsFocusTeacher(!isFocusTeacher)}
            />

            {/* Quiet Lesson Guide */}
            <div className="mt-5 pt-5 border-t border-slate-100 flex-1 overflow-y-auto">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-2 px-1">
                Lesson Topics
              </span>
              <div className="space-y-1">
                {concepts.slice(0, 5).map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      onSelectConcept(c);
                      handleSendMessage(`Let's study ${c.name}.`);
                    }}
                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      activeConcept?.id === c.id
                        ? 'bg-slate-100 text-slate-900 font-semibold'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate max-w-[150px]">{c.name}</span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {Math.round(c.mastery_score * 100)}%
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
