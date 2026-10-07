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
import { AvatarState } from '../components/avatar/ProfessorNova';
import { ArtifactPanel } from '../components/ArtifactPanel';
import { ChatComposer } from '../components/ChatComposer';
import { QuizModal } from '../components/QuizModal';
import { TeachBackModal } from '../components/TeachBackModal';
import { VoiceSettingsModal } from '../components/voice/VoiceSettingsModal';
import { voiceSynthesis } from '../services/voiceSynthesis';
import { api } from '../api';
import {
  AlertTriangle,
  Lightbulb,
  Bookmark,
  HelpCircle,
  Award,
  Layers,
  User,
  Sliders,
  Maximize2,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

import { AvatarTurn } from '../types';

interface ClassroomWorkspaceProps {
  activeDoc: DocumentMeta | null;
  concepts: ConceptNode[];
  activeConcept: ConceptNode | null;
  onSelectConcept: (concept: ConceptNode) => void;
  activeLanguage: string;
  onChangeLanguage: (lang: string) => void;
  onOpenMobileNav?: () => void;
  onOpenBenchmark?: () => void;
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
  onOpenBenchmark,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState<string>('');
  const [avatarState, setAvatarState] = useState<AvatarState>('idle');
  const [isFocusTeacher, setIsFocusTeacher] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [activeAvatarTurn, setActiveAvatarTurn] = useState<AvatarTurn | null>(null);
  const [avatarMode, setAvatarMode] = useState<'mode_a_local' | 'mode_b_hq' | 'mode_c_text'>('mode_a_local');


  // Contextual Artifact / Source state
  const [activeArtifact, setActiveArtifact] = useState<LearningArtifact | null>(null);
  const [activeCitation, setActiveCitation] = useState<Citation | null>(null);

  // Modals state
  const [activeQuiz, setActiveQuiz] = useState<QuizItem | null>(null);
  const [isTeachBackOpen, setIsTeachBackOpen] = useState(false);
  const [isVoiceSettingsOpen, setIsVoiceSettingsOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Track active document ID to reset or initialize course messages dynamically
  const activeDocIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (activeDocIdRef.current !== (activeDoc?.id ?? 'none')) {
      activeDocIdRef.current = activeDoc?.id ?? 'none';

      let initialText = '';
      let initialSpoken = '';

      if (!activeDoc) {
        // General learning mode — no document required
        initialText =
          "Hi! I'm **Professor Nova**, your adaptive AI teacher.\n\n" +
          "You haven't uploaded a document yet — that's perfectly fine! You can:\n" +
          "• Type any topic: **\"I want to learn Python\"**, **\"Teach me C++\"**, **\"Explain machine learning\"**\n" +
          "• Ask for a **learning roadmap** for any subject\n" +
          "• **Upload a document** from the Documents tab and I'll teach it to you\n\n" +
          "What would you like to learn today?";
        initialSpoken = "Hi, I'm Professor Nova. What would you like to learn today? Just tell me the subject.";
      } else if ((activeDoc as any).is_demo) {
        const targetTopic = activeConcept?.name || (concepts.length > 0 ? concepts[0].name : activeDoc.title);
        initialText =
          `Welcome to the **${activeDoc.title}**.\n\n` +
          `I'm Professor Nova, your adaptive AI teacher. Today we'll focus on **${targetTopic}**, grounded in the demo curriculum.\n\n` +
          `Before we dive in: what do you already know about **${targetTopic}**?`;
        initialSpoken = `Welcome. I'm Professor Nova. Before we dive in, what do you already know about ${targetTopic}?`;
      } else {
        const targetTopic = activeConcept?.name || (concepts.length > 0 ? concepts[0].name : activeDoc.title);
        initialText =
          `Welcome. I'm Professor Nova, your adaptive AI teacher for **${activeDoc.title}**.\n\n` +
          `I have structured your uploaded material into our active curriculum. Today we will focus on **${targetTopic}**, grounded strictly in your document.\n\n` +
          `To begin: in your own words, what is your current understanding of **${targetTopic}**?`;
        initialSpoken = `Welcome. I'm Professor Nova, your teacher for ${activeDoc.title}. What do you already know about ${targetTopic}?`;
      }

      setMessages([
        {
          id: `msg_welcome_${activeDoc?.id ?? 'general'}`,
          sender: 'teacher',
          text: initialText,
          spoken_text: initialSpoken,
          timestamp: 'Just now',
        },
      ]);
      setSpokenText(initialSpoken);
      playSpeech(initialSpoken);
    }
  }, [activeDoc?.id, activeConcept?.name, concepts]);

  // Professor Nova Voice Engine with dynamic deep male heuristics & subtle robotic calibration
  const playSpeech = (text: string) => {
    if (!text || isMuted) return;

    voiceSynthesis.speak(text, {
      lang: activeLanguage,
      onStart: () => {
        setIsSpeaking(true);
        setAvatarState('speaking');
      },
      onEnd: () => {
        setIsSpeaking(false);
        setAvatarState('idle');
      },
      onError: () => {
        setIsSpeaking(false);
        setAvatarState('idle');
      },
    });
  };

  const handleInterrupt = () => {
    voiceSynthesis.stop();
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
        // Use 'general_learning' when no document is loaded so the backend
        // knows to answer from general knowledge, not a specific doc.
        document_id: activeDoc?.id || 'general_learning',
        message: text,
        active_concept: activeConcept?.name || (concepts.length > 0 ? concepts[0].name : activeDoc?.title) || '',
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

      if (res.avatar_turn) {
        setActiveAvatarTurn(res.avatar_turn);
      }

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

      if (avatarMode === 'mode_c_text') {
        setAvatarState('idle');
      } else {
        playSpeech(spoken);
      }

    } catch (err) {
      console.error(err);
      setAvatarState('error');
    } finally {
      setIsSending(false);
    }
  };

  const openQuizForConcept = async (conceptName?: string) => {
    if (!activeDoc) return;
    try {
      const quiz = await api.generateQuiz(
        activeDoc.id,
        conceptName || activeConcept?.name || (concepts.length > 0 ? concepts[0].name : 'Core Concept')
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

      <VoiceSettingsModal
        isOpen={isVoiceSettingsOpen}
        onClose={() => setIsVoiceSettingsOpen(false)}
      />

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
            {activeDoc?.title || 'Active Course'}
          </span>
          <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
          <span className="text-slate-900 font-semibold truncate">
            {activeConcept?.name || (concepts.length > 0 ? concepts[0].name : 'Course Overview')}
          </span>
        </div>

        {/* Header Tools */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => openQuizForConcept()}
            data-guide-id="btn-classroom-quiz"
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Test understanding with a diagnostic quiz"
          >
            <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Quiz</span>
          </button>
          <button
            onClick={() => setIsTeachBackOpen(true)}
            data-guide-id="btn-classroom-teachback"
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-950 font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Explain the concept back in your own words"
          >
            <Award className="w-3.5 h-3.5 text-slate-500" />
            <span className="hidden sm:inline">Teach-Back</span>
          </button>
          <button
            onClick={() => setIsVoiceSettingsOpen(true)}
            data-guide-id="btn-classroom-voice"
            className="px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer bg-white"
            title="Configure Professor Nova Voice Persona & Subtle Robotic Style"
          >
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden md:inline">Voice</span>
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
            <User className="w-3.5 h-3.5" />
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
                    <img
                      src="/professor_nova.png"
                      alt="Professor Nova"
                      className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5 border border-slate-200/80 shadow-2xs ring-1 ring-slate-100"
                    />

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
              <div className="flex items-center space-x-2.5 text-xs text-slate-500 py-2">
                <img
                  src="/professor_nova.png"
                  alt="Professor Nova"
                  className="w-4 h-4 rounded-full object-cover animate-pulse border border-slate-200"
                />
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-ping" />
                <span>Professor Nova is reasoning...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Composer */}
          <div data-guide-id="classroom-chat-composer" className="w-full">
            <ChatComposer
              onSendMessage={handleSendMessage}
              isSending={isSending}
              isListening={isListening}
              onToggleListening={toggleListening}
              activeLanguage={activeLanguage}
              onChangeLanguage={onChangeLanguage}
            />
          </div>
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
          /* Case B: Professor Nova Adaptive Teacher Stage (Compact & Calm by default, or Expandable Focus Mode) */
          <div
            className={`hidden lg:flex flex-col border-l border-slate-200/80 bg-white p-5 transition-all duration-300 ${
              isFocusTeacher ? 'w-96' : 'w-72'
            }`}
          >
            {/* Professor Nova Adaptive Teacher */}
            <ProfessorNova
              provider="auto"
              state={avatarState}
              spokenText={spokenText}
              avatarTurn={activeAvatarTurn}
              mode={avatarMode}
              onModeChange={setAvatarMode}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onReplay={() => {
                if (spokenText) playSpeech(spokenText);
              }}
              onInterrupt={handleInterrupt}
              isFocusMode={isFocusTeacher}
              onToggleFocusMode={() => setIsFocusTeacher(!isFocusTeacher)}
              onOpenBenchmark={onOpenBenchmark}
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

      {/* Mobile Focus Teacher Modal */}
      {isFocusTeacher && (
        <div className="lg:hidden fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-sm w-full shadow-2xl relative animate-fadeIn">
            <button
              onClick={() => setIsFocusTeacher(false)}
              className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 cursor-pointer"
              title="Close focus view"
            >
              <X className="w-4 h-4" />
            </button>
            <ProfessorNova
              provider="auto"
              state={avatarState}
              spokenText={spokenText}
              avatarTurn={activeAvatarTurn}
              mode={avatarMode}
              onModeChange={setAvatarMode}
              isMuted={isMuted}
              onToggleMute={() => setIsMuted(!isMuted)}
              onReplay={() => {
                if (spokenText) playSpeech(spokenText);
              }}
              onInterrupt={handleInterrupt}
              isFocusMode={true}
              onToggleFocusMode={() => setIsFocusTeacher(false)}
              onOpenBenchmark={onOpenBenchmark}
            />
          </div>
        </div>
      )}
    </div>
  );
};
