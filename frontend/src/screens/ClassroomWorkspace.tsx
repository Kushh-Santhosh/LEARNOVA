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
import { MarkdownRenderer } from '../components/MarkdownRenderer';
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
  X,
  BookOpen,
  FileText,
  RefreshCw,
  Square,
  Download,
  Printer,
  Search
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
  onOpenDocuments?: () => void;
}

interface ChatMessageAttachment {
  name: string;
  size: number;
  formattedSize: string;
  type?: string;
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
  isError?: boolean;
  retryText?: string;
  attachments?: ChatMessageAttachment[];
  isDeepResearch?: boolean;
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
  onOpenDocuments,
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
  const [liveTranscript, setLiveTranscript] = useState<string>('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const attachedDocIdsRef = useRef<string[]>([]);

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
        // General conversational AI tutor mode — clean initial greeting
        initialText =
          "Hey! I'm **Professor Nova**, your adaptive AI tutor.\n\n" +
          "What can I help you with today? You can ask any conceptual question, request code examples, or upload study notes to explore!";
        initialSpoken = "Hey! I'm Professor Nova. What can I help you with today?";
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
      // NOTE: Do not autoplay audio on initial page load; speech starts only on user interaction.
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
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang =
      activeLanguage === 'kn'
        ? 'kn-IN'
        : activeLanguage === 'hi'
        ? 'hi-IN'
        : activeLanguage === 'te'
        ? 'te-IN'
        : activeLanguage === 'ta'
        ? 'ta-IN'
        : 'en-US';

    let finalTranscript = '';

    recognition.onstart = () => {
      setIsListening(true);
      setLiveTranscript('');
      setAvatarState('listening');
    };
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setLiveTranscript(interim || finalTranscript);
    };
    recognition.onerror = () => {
      setIsListening(false);
      setLiveTranscript('');
      setAvatarState('idle');
    };
    recognition.onend = () => {
      setIsListening(false);
      const textToSubmit = finalTranscript.trim() || liveTranscript.trim();
      setLiveTranscript('');
      if (textToSubmit) {
        setAvatarState('thinking');
        handleSendMessage(textToSubmit);
      } else if (!isSending) {
        setAvatarState('idle');
      }
    };

    recognition.start();
  };

  const handleExportMarkdown = (title: string, content: string) => {
    const safeTitle = (title || 'deep_research').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${safeTitle}.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSending(false);
    setAvatarState('idle');
  };

  const handleSendMessage = async (
    text: string,
    mode?: string,
    lang?: string,
    attachedFiles?: File[],
    researchMode?: boolean
  ) => {
    if (!text.trim() && (!attachedFiles || attachedFiles.length === 0)) return;
    if (isSending) return;

    // Natural interruption if teacher was speaking
    handleInterrupt();

    // Abort any prior in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const currentController = new AbortController();
    abortControllerRef.current = currentController;

    const attachmentPreviews = (attachedFiles || []).map((f) => ({
      name: f.name,
      size: f.size,
      formattedSize:
        f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(1)} KB`
          : `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      type: f.type,
    }));

    const studentMsg: ChatMessage = {
      id: `msg_${Date.now()}_student`,
      sender: 'student',
      text: text,
      timestamp: 'Just now',
      attachments: attachmentPreviews.length > 0 ? attachmentPreviews : undefined,
    };

    setMessages((prev) => [...prev, studentMsg]);
    setIsSending(true);
    setAvatarState('thinking');

    const requestStarted = performance.now();

    try {
      // If inline files are attached, upload and register them
      if (attachedFiles && attachedFiles.length > 0) {
        for (const file of attachedFiles) {
          try {
            const uploadRes = await api.uploadDocument(file);
            if (
              uploadRes?.document?.id &&
              !attachedDocIdsRef.current.includes(uploadRes.document.id)
            ) {
              attachedDocIdsRef.current.push(uploadRes.document.id);
            }
          } catch (uploadErr) {
            console.error('Error uploading inline document', uploadErr);
          }
        }
      }

      const effectiveDocId =
        activeDoc?.id || (attachedDocIdsRef.current[0] || 'general_learning');

      const res: TeacherResponse = await api.teach(
        {
          document_id: effectiveDocId,
          message: text,
          active_concept: activeDoc
            ? activeConcept?.name || (concepts.length > 0 ? concepts[0].name : activeDoc.title)
            : activeConcept?.name || '',
          mode: mode || (researchMode ? 'deep_research' : 'explain'),
          language: lang || activeLanguage,
          attached_doc_ids:
            attachedDocIdsRef.current.length > 0 ? attachedDocIdsRef.current : undefined,
          research_mode: Boolean(researchMode || mode === 'deep_research'),
        },
        currentController.signal
      );

      const responseReceived = performance.now();

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
        const planLatency = res.avatar_turn.backend_avatar_plan_latency_ms || 0;
        const netLatency = Math.max(1.0, Math.round((responseReceived - requestStarted - planLatency) * 10) / 10);
        const renderStart = performance.now();

        requestAnimationFrame(() => {
          const firstFrame = performance.now();
          const renderLatency = Math.max(0.5, Math.round((firstFrame - renderStart) * 10) / 10);
          const telemetry = {
            request_started_ms: Math.round(requestStarted),
            avatar_response_received_ms: Math.round(responseReceived),
            avatar_render_started_ms: Math.round(renderStart),
            first_animation_frame_ms: Math.round(firstFrame),
            speech_started_ms: Math.round(firstFrame + 80),
            backend_plan_latency_ms: planLatency,
            network_latency_ms: netLatency,
            client_render_latency_ms: renderLatency,
            time_to_first_visual_frame_ms: Math.round(firstFrame - requestStarted),
            time_to_audio_start_ms: Math.round(firstFrame - requestStarted + 80),
            end_to_end_start_latency_ms: Math.round(firstFrame - requestStarted + 80),
          };
          setActiveAvatarTurn({
            ...res.avatar_turn!,
            client_telemetry: telemetry,
          });
        });
      }

      const isDeepReport =
        res.is_deep_research ||
        res.teaching_mode === 'deep_research' ||
        researchMode ||
        res.teacher_text.startsWith('# Deep Research');

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
        isDeepResearch: isDeepReport,
      };

      setMessages((prev) => [...prev, teacherMsg]);
      setSpokenText(spoken);

      if (avatarMode === 'mode_c_text') {
        setAvatarState('idle');
      } else {
        playSpeech(spoken);
      }

    } catch (err: any) {
      if (err?.name === 'AbortError') {
        console.info('Generation cancelled by user');
        setAvatarState('idle');
      } else {
        console.error('Teacher response failure', err);
        const errorTeacherMsg: ChatMessage = {
          id: `msg_${Date.now()}_error`,
          sender: 'teacher',
          text: "I encountered an issue connecting to the AI tutor service. Please check your network connection or try again.",
          timestamp: 'Just now',
          isError: true,
          retryText: text,
        };
        setMessages((prev) => [...prev, errorTeacherMsg]);
        setAvatarState('error');
        setTimeout(() => setAvatarState('idle'), 2500);
      }
    } finally {
      setIsSending(false);
      abortControllerRef.current = null;
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

                      {/* Deep Research Header & Export Bar */}
                      {msg.isDeepResearch && (
                        <div className="mb-3 p-2.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/70 text-indigo-950 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-fadeIn">
                          <div className="flex items-center gap-1.5 font-semibold text-indigo-900">
                            <Search className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Deep Academic Research Report</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExportMarkdown('Deep_Research_Notes', msg.text)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100/50 text-[11px] font-medium text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Download Markdown Study Guide"
                            >
                              <Download className="w-3 h-3" />
                              <span>Export .md</span>
                            </button>
                            <button
                              type="button"
                              onClick={handlePrintPdf}
                              className="px-2.5 py-1 rounded-lg bg-white border border-indigo-200 hover:bg-indigo-100/50 text-[11px] font-medium text-indigo-800 flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="Print or Save as PDF"
                            >
                              <Printer className="w-3 h-3" />
                              <span>Print / PDF</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Conversational Text rendered with safe Markdown */}
                      <div className="text-sm text-slate-800 font-normal leading-relaxed">
                        <MarkdownRenderer content={msg.text} />
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

                      {/* Inline Error Retry Action */}
                      {msg.isError && msg.retryText && (
                        <div className="mt-3">
                          <button
                            onClick={() => handleSendMessage(msg.retryText!)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-2xs cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5 text-indigo-300" />
                            <span>Retry Question</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Student Message: Clean, restrained, right-aligned */
                  <div className="max-w-[85%] sm:max-w-[75%] flex flex-col items-end gap-1.5">
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {msg.attachments.map((att, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700 shadow-2xs"
                          >
                            <FileText className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span className="font-medium truncate max-w-[150px]">{att.name}</span>
                            <span className="text-[10px] text-slate-400">({att.formattedSize})</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="rounded-2xl px-4 py-3 bg-slate-200/80 text-slate-900 text-sm font-normal leading-relaxed">
                      {msg.text}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Subtle Thinking Activity Indicator with Stop action */}
            {isSending && (
              <div className="flex items-center justify-between py-2 px-3.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs max-w-sm">
                <div className="flex items-center space-x-2.5 text-xs text-slate-600">
                  <img
                    src="/professor_nova.png"
                    alt="Professor Nova"
                    className="w-5 h-5 rounded-full object-cover animate-pulse border border-slate-200 shrink-0"
                  />
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                  <span className="font-medium">Professor Nova is reasoning...</span>
                </div>
                <button
                  onClick={handleStopGenerating}
                  className="ml-3 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Stop generating response"
                >
                  <Square className="w-3 h-3 fill-current text-slate-400" />
                  <span>Stop</span>
                </button>
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
              onOpenDocuments={onOpenDocuments}
              liveTranscript={liveTranscript}
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
          /* Case B: Professor Nova Adaptive Teacher Stage (Responsive 320-360px default, or Expandable Focus Mode) */
          <div
            className={`hidden lg:flex flex-col border-l border-slate-200/80 bg-slate-50/50 p-4 sm:p-5 transition-all duration-300 shrink-0 h-full overflow-y-auto overflow-x-hidden ${
              isFocusTeacher ? 'w-[440px] xl:w-[480px]' : 'w-[340px] xl:w-[360px]'
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

            {/* Lesson Topics OR Learning Space Empty State */}
            {activeDoc && concepts.length > 0 ? (
              <div className="mt-4 pt-4 border-t border-slate-200/70 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                    Lesson Topics ({concepts.length})
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                    {activeDoc.title}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {concepts.slice(0, 7).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => {
                        onSelectConcept(c);
                        handleSendMessage(`Let's study ${c.name}.`);
                      }}
                      className={`w-full text-left p-2.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer border ${
                        activeConcept?.id === c.id
                          ? 'bg-white border-slate-300 text-slate-900 font-semibold shadow-2xs'
                          : 'bg-white/70 hover:bg-white border-slate-200/60 text-slate-700'
                      }`}
                    >
                      <span className="truncate max-w-[190px]">{c.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 shrink-0">
                        {Math.round(c.mastery_score * 100)}%
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-slate-200/70 flex-1">
                <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">Your Learning Space</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ask anything freely, explore code examples, or upload study documents to generate a structured curriculum.
                  </p>
                  {onOpenDocuments && (
                    <button
                      onClick={onOpenDocuments}
                      className="mt-3 w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Open Documents Library</span>
                    </button>
                  )}
                </div>
              </div>
            )}
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
