import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ScreenContextMode,
  ScreenGuidanceResponse,
  ScreenCapabilities
} from '../../types';
import { api } from '../../api';
import {
  webPageProvider,
  browserScreenProvider,
  CapturedDOMElement
} from '../../services/screenCapture';
import { voiceSynthesis } from '../../services/voiceSynthesis';
import { MarkdownRenderer } from '../MarkdownRenderer';
import {
  Sparkles,
  Compass,
  X,
  ChevronRight,
  Shield,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Trash2,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Square,
  BookOpen,
  MessageSquare,
  Compass as GuideIcon,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Lightbulb,
  ArrowRight,
  GraduationCap
} from 'lucide-react';

interface FloatingNovaCompanionProps {
  activeTab: string;
  activeDocId?: string;
  activeDocTitle?: string;
  activeConceptName?: string;
  onStartWorkflow: (guidance: ScreenGuidanceResponse) => void;
  isGuidingActive: boolean;
  activeWorkflowName?: string;
  onStopGuiding: () => void;
}

interface CompanionMessage {
  id: string;
  sender: 'user' | 'teacher';
  text: string;
  timestamp: string;
  citations?: Array<{ source?: string; page?: number; section?: string; excerpt?: string }>;
  isError?: boolean;
  isGrounded?: boolean;
}

type CompanionState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'guiding' | 'attention';

const STORAGE_KEY = 'learnova_floating_companion_messages';

export const FloatingNovaCompanion: React.FC<FloatingNovaCompanionProps> = ({
  activeTab,
  activeDocId,
  activeDocTitle,
  activeConceptName,
  onStartWorkflow,
  isGuidingActive,
  activeWorkflowName,
  onStopGuiding,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'guide' | 'learn'>('chat');

  // --- Chat State ---
  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg_initial',
        sender: 'teacher',
        text: "Hello! I am Professor Nova, your persistent learning companion. Ask me anything about what you are studying, or use Guide Me and Learn to explore your curriculum.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- Guide Me State ---
  const [screenMode, setScreenMode] = useState<ScreenContextMode>('dom');
  const [guideQuery, setGuideQuery] = useState('');
  const [isGuideLoading, setIsGuideLoading] = useState(false);
  const [guideErrorNotice, setGuideErrorNotice] = useState<string | null>(null);
  const [isViewingSharedScreen, setIsViewingSharedScreen] = useState(false);
  const [isGuidePaused, setIsGuidePaused] = useState(false);

  // --- Learn Tab State ---
  const [isLearnLoading, setIsLearnLoading] = useState(false);
  const [pageExplanation, setPageExplanation] = useState<string | null>(null);
  const [learnFollowUps, setLearnFollowUps] = useState<string[]>([]);
  const [learnError, setLearnError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Compute Companion Dynamic State (Section 3: Idle, Listening, Thinking, Speaking, Guiding, Attention)
  const companionState: CompanionState = useMemo(() => {
    if (isListening) return 'listening';
    if (isGenerating || isGuideLoading || isLearnLoading) return 'thinking';
    if (isSpeaking) return 'speaking';
    if (isGuidingActive) return 'guiding';
    if (chatError || guideErrorNotice || learnError) return 'attention';
    return 'idle';
  }, [isListening, isGenerating, isGuideLoading, isLearnLoading, isSpeaking, isGuidingActive, chatError, guideErrorNotice, learnError]);

  // Persist messages to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Shortcut Cmd+Shift+N / Ctrl+Shift+N & Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputText(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  // Helper for TTS playback state
  const speakIfAllowed = (text: string) => {
    if (isMuted || !text) return;
    setIsSpeaking(true);
    voiceSynthesis.speak(text, {
      lang: 'en',
      onEnd: () => setIsSpeaking(false),
      onError: () => setIsSpeaking(false),
    });
  };

  // Human-readable active page label
  const activePageLabel = useMemo(() => {
    switch (activeTab) {
      case 'documents': return 'Document Hub';
      case 'classroom': return 'Classroom & Whiteboard';
      case 'knowledge': return 'Knowledge Graph';
      case 'progress': return 'Mastery Ledger & Progress';
      default: return 'Curriculum Workspace';
    }
  }, [activeTab]);

  // --- Handlers: Chat ---
  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query || isGenerating) return;

    setInputText('');
    setChatError(null);
    setLastFailedMessage(null);
    setIsGenerating(true);

    const userMsg: CompanionMessage = {
      id: `msg_u_${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const docId = activeDocId || 'general_learning';
      const concept = activeDocId ? (activeConceptName || activeDocTitle || '') : '';

      const response = await api.teach({
        document_id: docId,
        message: query,
        active_concept: concept,
        mode: 'explain',
        language: 'en'
      });

      if (controller.signal.aborted) return;

      const replyText = response.teacher_text || response.spoken_text ||
        "I have processed your inquiry. Let me know if you would like to explore this concept further.";

      const isDocGrounded = Boolean(activeDocId && response.citations && response.citations.length > 0);

      const teacherMsg: CompanionMessage = {
        id: `msg_t_${Date.now()}`,
        sender: 'teacher',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: response.citations,
        isGrounded: isDocGrounded
      };

      setMessages((prev) => [...prev, teacherMsg]);
      speakIfAllowed(response.spoken_text || replyText);
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      const errorMsg = err.message || 'Unable to connect to Nova teacher brain.';
      setChatError(errorMsg);
      setLastFailedMessage(query);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg_err_${Date.now()}`,
          sender: 'teacher',
          text: `⚠️ ${errorMsg} Please check your connection or retry.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg_reset',
        sender: 'teacher',
        text: "Conversation reset. I am ready for your next question or learning goal.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isGrounded: false
      }
    ]);
    setShowClearConfirm(false);
  };

  // --- Handlers: Guide Me ---
  const handleLaunchGuideQuery = async (queryText: string) => {
    if (!queryText.trim() || isGuideLoading) return;

    setIsGuideLoading(true);
    setGuideErrorNotice(null);

    try {
      let imageBase64: string | undefined = undefined;
      let domElements: CapturedDOMElement[] = [];

      if (screenMode === 'browser_screen') {
        setIsViewingSharedScreen(true);
        const capture = await browserScreenProvider.captureContext(activeTab);
        setIsViewingSharedScreen(false);
        if (capture.error) {
          setGuideErrorNotice(capture.error);
          setIsGuideLoading(false);
          return;
        }
        imageBase64 = capture.screenshot_base64;
        domElements = capture.dom_elements;
      } else {
        const capture = await webPageProvider.captureContext(activeTab);
        domElements = capture.dom_elements;
      }

      const res = await api.analyzeScreen({
        goal: queryText,
        mode: screenMode,
        current_route: activeTab,
        dom_elements: domElements,
        screenshot_base64: imageBase64,
        active_document_id: activeDocId,
      });

      if (res && (res.status?.toLowerCase() === 'success' || !!res.target_element)) {
        onStartWorkflow(res);
        setIsOpen(false);
        setGuideQuery('');
      } else {
        setGuideErrorNotice(res?.recommended_action?.what || 'I could not find a visible control matching that goal.');
      }
    } catch (err: any) {
      setGuideErrorNotice(err.message || 'Guidance analysis could not complete.');
    } finally {
      setIsGuideLoading(false);
    }
  };

  // --- Handlers: Learn Mode ---
  const handleExplainCurrentPage = async () => {
    setIsLearnLoading(true);
    setLearnError(null);

    try {
      const capture = await webPageProvider.captureContext(activeTab);
      const visibleLabels = capture.dom_elements
        .filter((el) => el.label && el.label.length > 2)
        .slice(0, 10)
        .map((el) => el.label)
        .join('; ');

      const prompt = `Explain the educational concepts on the ${activePageLabel} screen (${activeTab}). Visible screen controls: ${visibleLabels}. Explain what the student should focus on here and give 2 clear examples.`;

      const response = await api.teach({
        document_id: activeDocId || 'general_learning',
        message: prompt,
        active_concept: activeConceptName || activeDocTitle || activePageLabel,
        mode: 'explain',
        language: 'en'
      });

      const explanation = response.teacher_text || response.spoken_text ||
        `On the ${activePageLabel}, you can explore structured concepts, review evidentiary progress, and master your syllabus.`;

      setPageExplanation(explanation);
      setLearnFollowUps([
        `How does ${activeConceptName || 'this topic'} connect to real-world applications?`,
        `What are the prerequisite concepts for ${activePageLabel}?`,
        `Can you test my understanding with a quick comprehension question?`
      ]);

      speakIfAllowed(response.spoken_text || explanation);
    } catch (err: any) {
      setLearnError(err.message || 'Could not synthesize page concepts.');
    } finally {
      setIsLearnLoading(false);
    }
  };

  // Current page suggested guidance quick items
  const currentScreenTours = useMemo(() => {
    switch (activeTab) {
      case 'documents':
        return [
          { label: 'Where to upload a study PDF', query: 'Show me where to upload a document' },
          { label: 'Explore loaded curriculum files', query: 'Point to existing uploaded documents' },
        ];
      case 'classroom':
        return [
          { label: 'Where to start adaptive lesson', query: 'Show me where to interact with Professor Nova' },
          { label: 'How to take a comprehension quiz', query: 'Point to the quiz generator button' },
          { label: 'How to challenge Feynman teach-back', query: 'Point to the teach-back Feynman challenge' },
        ];
      case 'knowledge':
        return [
          { label: 'Where to inspect prerequisite nodes', query: 'Show me how to explore knowledge graph nodes' },
        ];
      case 'progress':
        return [
          { label: 'How to read mastery ledger', query: 'Point to evidentiary mastery score' },
        ];
      default:
        return [
          { label: 'Navigate back to classroom', query: 'Show me the Learn tab navigation' },
        ];
    }
  }, [activeTab]);

  return (
    <>
      {/* ─────────────────────────────────────────────────────────────
          1. LAUNCHER: Small, Fixed Bottom-Right Robot Companion
          ───────────────────────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center space-x-2 select-none">
        {/* Guiding Active Mini-Status Pill */}
        {isGuidingActive && (
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-indigo-200 shadow-lg flex items-center gap-2 text-xs text-indigo-900 animate-pulse">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            <span className="font-semibold text-[11px] truncate max-w-[130px]">
              {activeWorkflowName || 'Guiding Screen'}
            </span>
            <button
              onClick={onStopGuiding}
              className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
              title="Stop guidance"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Small Floating Robot Launcher */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={`Professor Nova AI Companion (${companionState}) — Shortcut Cmd+Shift+N`}
          className={`relative group p-1 rounded-full transition-all duration-300 shadow-xl cursor-pointer flex items-center justify-center motion-reduce:transition-none ${
            isOpen
              ? 'bg-indigo-600 ring-4 ring-indigo-200 text-white scale-105'
              : companionState === 'guiding'
              ? 'bg-indigo-600 ring-4 ring-indigo-300/70 text-white'
              : companionState === 'listening'
              ? 'bg-emerald-600 ring-4 ring-emerald-300/70 text-white'
              : companionState === 'thinking'
              ? 'bg-amber-600 ring-4 ring-amber-300/70 text-white'
              : companionState === 'speaking'
              ? 'bg-indigo-500 ring-4 ring-indigo-200 text-white'
              : companionState === 'attention'
              ? 'bg-rose-500 ring-4 ring-rose-200 text-white'
              : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:scale-105'
          }`}
          title={`Professor Nova • ${companionState.toUpperCase()} (Cmd+Shift+N)`}
        >
          {/* Avatar Icon */}
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-slate-900 border border-white/20">
            <img
              src="/professor_nova.png"
              alt="Professor Nova"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Dynamic State Ring & Dot Indicator */}
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            {companionState === 'listening' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
              </>
            )}
            {companionState === 'thinking' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500 border-2 border-white" />
              </>
            )}
            {companionState === 'speaking' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-white" />
              </>
            )}
            {companionState === 'guiding' && (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-600 border-2 border-white" />
              </>
            )}
            {companionState === 'attention' && (
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white" />
            )}
            {companionState === 'idle' && (
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-white" />
            )}
          </span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. COMPANION PANEL: Polished, Responsive AI Companion Panel
          ───────────────────────────────────────────────────────────── */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Professor Nova AI Companion"
          className="fixed bottom-20 right-5 z-40 w-[420px] max-w-[calc(100vw-2.5rem)] h-[580px] max-h-[calc(100vh-6.5rem)] bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-2xl rounded-3xl flex flex-col text-slate-800 transition-all select-none animate-fadeIn overflow-hidden"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs shrink-0 bg-slate-900">
                <img
                  src="/professor_nova.png"
                  alt="Professor Nova"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>Professor Nova</span>
                  <span className={`text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full border ${
                    companionState === 'guiding'
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : companionState === 'listening'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : companionState === 'thinking'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200'
                  }`}>
                    {companionState.toUpperCase()}
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-normal truncate">
                  {activeDocTitle ? `Grounded: ${activeDocTitle}` : `Page: ${activePageLabel}`}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title={isMuted ? 'Unmute speech output' : 'Mute speech output'}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close companion (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sub-Tab Navigation Switcher (CHAT / GUIDE ME / LEARN) */}
          <div className="px-3 pt-2.5 shrink-0 bg-slate-50/40">
            <div className="flex items-center p-1 bg-slate-100/90 rounded-xl text-xs font-medium">
              <button
                onClick={() => setActiveSubTab('chat')}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'chat'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setActiveSubTab('guide')}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'guide'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <GuideIcon className="w-3.5 h-3.5" />
                <span>Guide Me</span>
              </button>
              <button
                onClick={() => setActiveSubTab('learn')}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'learn'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Learn</span>
              </button>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────
              TAB 1: CHAT
              ───────────────────────────────────────────────────────── */}
          {activeSubTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              {/* Context Bar */}
              <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] bg-slate-50/50">
                <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-[280px]">
                  {activeDocTitle ? (
                    <span className="inline-flex items-center gap-1 font-medium text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded-md border border-indigo-100 truncate">
                      <BookOpen className="w-3 h-3 shrink-0" />
                      <span className="truncate">{activeDocTitle}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                      <span>🌐</span>
                      <span>{activePageLabel}</span>
                    </span>
                  )}
                </div>

                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-md transition-colors cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Message Feed */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : m.isError
                          ? 'bg-rose-50 text-rose-900 border border-rose-200 rounded-bl-xs'
                          : 'bg-slate-100 text-slate-900 rounded-bl-xs'
                      }`}
                    >
                      <div className="text-xs leading-relaxed">
                        <MarkdownRenderer content={m.text} />
                      </div>

                      {/* Verifiable Citations */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] space-y-1">
                          <span className="font-semibold text-indigo-700 block">Verified Document Evidence:</span>
                          {m.citations.map((c, i) => (
                            <div key={i} className="bg-white/80 p-1.5 rounded-md border border-slate-200 text-slate-700">
                              <span className="font-medium text-slate-900">
                                {c.section || c.source} {c.page ? `(Page ${c.page})` : ''}
                              </span>
                              {c.excerpt && <p className="text-slate-500 italic mt-0.5 line-clamp-2">"{c.excerpt}"</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 px-1 mt-0.5">{m.timestamp}</span>
                  </div>
                ))}

                {/* Thinking / In-Flight Indicator */}
                {isGenerating && (
                  <div className="flex items-center space-x-2 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100 w-fit">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Professor Nova is thinking...</span>
                    <button
                      onClick={handleStopGeneration}
                      className="ml-2 text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Square className="w-2.5 h-2.5" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}

                {/* Retry prompt on error */}
                {chatError && !isGenerating && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <span>Message generation failed.</span>
                    <button
                      onClick={handleRetry}
                      className="flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded-lg text-[11px] font-medium hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
                <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-2xl p-1.5 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all">
                  <button
                    onClick={toggleListening}
                    className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                      isListening ? 'bg-rose-600 text-white animate-pulse' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                    title={isListening ? 'Stop recording voice' : 'Voice input (Web Speech)'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendMessage();
                    }}
                    placeholder={
                      isListening
                        ? 'Listening to your voice...'
                        : activeDocTitle
                        ? `Ask about ${activeDocTitle.slice(0, 24)}...`
                        : 'Ask Professor Nova any concept...'
                    }
                    disabled={isGenerating}
                    className="flex-1 text-xs bg-transparent border-none outline-none text-slate-800 placeholder-slate-400 px-1"
                  />

                  {isGenerating ? (
                    <button
                      onClick={handleStopGeneration}
                      className="p-1.5 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors cursor-pointer"
                      title="Stop response"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSendMessage()}
                      disabled={!inputText.trim()}
                      className="p-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors cursor-pointer"
                      title="Send message"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              TAB 2: GUIDE ME
              ───────────────────────────────────────────────────────── */}
          {activeSubTab === 'guide' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-xs">
              {/* Educational Screen Awareness Banner */}
              <div className="bg-indigo-50/70 p-3 rounded-2xl border border-indigo-100 space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-indigo-900 text-xs">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Visual Interaction Guide</span>
                </div>
                <p className="text-[11px] text-indigo-950/80 leading-relaxed">
                  Nova highlights exact buttons and controls on <strong>{activePageLabel}</strong> to guide your learning without taking over your actions.
                </p>
              </div>

              {/* Mode Toggle (DOM vs Screen Share) */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setScreenMode('dom')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    screenMode === 'dom' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  DOM Guidance (Active)
                </button>
                <button
                  onClick={() => setScreenMode('browser_screen')}
                  className={`flex-1 py-1 px-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    screenMode === 'browser_screen' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  Screen Share Mode
                </button>
              </div>

              {isViewingSharedScreen && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-medium">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                    Screen Sharing Active
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setIsGuidePaused(!isGuidePaused)}
                      className="px-2 py-0.5 bg-white border border-amber-200 rounded text-[11px] hover:bg-amber-100 cursor-pointer"
                    >
                      {isGuidePaused ? 'Resume' : 'Pause'}
                    </button>
                    <button
                      onClick={() => setIsViewingSharedScreen(false)}
                      className="px-2 py-0.5 bg-rose-600 text-white rounded text-[11px] hover:bg-rose-700 cursor-pointer"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              )}

              {/* Custom Guidance Search Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Ask Where To Go
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={guideQuery}
                    onChange={(e) => setGuideQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleLaunchGuideQuery(guideQuery);
                    }}
                    placeholder="e.g. Show me where to upload..."
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleLaunchGuideQuery(guideQuery)}
                    disabled={!guideQuery.trim() || isGuideLoading}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {isGuideLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Spotlight'}
                  </button>
                </div>
              </div>

              {guideErrorNotice && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{guideErrorNotice}</span>
                </div>
              )}

              {/* Quick Visual Tours For Current Screen */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1 block">
                  Recommended On This Page
                </span>
                <div className="space-y-1">
                  {currentScreenTours.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLaunchGuideQuery(item.query)}
                      disabled={isGuideLoading}
                      className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-between group transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Compass className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 shrink-0 transition-colors" />
                        <span className="truncate">{item.label}</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────
              TAB 3: LEARN (Pedagogical Understanding & Grounding)
              ───────────────────────────────────────────────────────── */}
          {activeSubTab === 'learn' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 min-h-0 text-xs">
              {/* Concept Synthesis Card */}
              <div className="p-3.5 bg-gradient-to-br from-indigo-50/90 to-purple-50/70 border border-indigo-100/80 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-indigo-950 text-xs">
                    <GraduationCap className="w-4 h-4 text-indigo-600" />
                    <span>Current Screen Concepts</span>
                  </div>
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                    {activePageLabel}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Nova observes the concepts active on your screen and explains them in simple, pedagogical terms.
                </p>

                <button
                  onClick={handleExplainCurrentPage}
                  disabled={isLearnLoading}
                  className="w-full py-2 px-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
                >
                  {isLearnLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Synthesizing Screen Concepts...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Explain This Page Concepts</span>
                    </>
                  )}
                </button>
              </div>

              {learnError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl">
                  {learnError}
                </div>
              )}

              {/* Page Explanation Result */}
              {pageExplanation && (
                <div className="p-3.5 bg-white border border-slate-200 rounded-2xl space-y-2.5 shadow-2xs animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                      <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                      <span>Conceptual Breakdown</span>
                    </span>
                    <span className="text-[9px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      Simple Language
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {pageExplanation}
                  </p>

                  {/* Follow-Up Comprehension Prompts */}
                  {learnFollowUps.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                        Test Your Understanding:
                      </span>
                      {learnFollowUps.map((q, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setActiveSubTab('chat');
                            handleSendMessage(q);
                          }}
                          className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200/80 hover:border-indigo-200 text-[11px] text-slate-700 hover:text-indigo-900 flex items-center justify-between group transition-colors cursor-pointer"
                        >
                          <span className="truncate pr-2">{q}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400 group-hover:text-indigo-600 shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Active Curriculum Connection Card */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-1.5">
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Active Document Grounding
                </span>
                {activeDocTitle ? (
                  <div className="text-xs text-slate-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-medium text-indigo-700">
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{activeDocTitle}</span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Questions asked in Chat return verifiable citations from this curriculum material.
                    </p>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500 space-y-1">
                    <p>No document selected. Learning is currently anchored to general computer science and platform navigation.</p>
                    <button
                      onClick={() => handleLaunchGuideQuery('Show me where to upload a document')}
                      className="text-xs font-semibold text-indigo-600 hover:underline inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Upload study document</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center space-y-3 z-50">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Reset conversation?</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                  This resets the floating companion message history on this session.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          )}

          {/* Footer Shortcut Hint */}
          <div className="p-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 bg-slate-50/70 shrink-0">
            <span>Toggle companion</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-600 font-mono text-[9px] border border-slate-200">
              Cmd+Shift+N
            </kbd>
          </div>
        </div>
      )}
    </>
  );
};
