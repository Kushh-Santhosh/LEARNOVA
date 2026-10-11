import React, { useState, useEffect, useRef } from 'react';
import {
  ScreenContextMode,
  ScreenGuidanceResponse,
  ScreenCapabilities,
  WebsiteStatusResponse,
  WebsiteChatResponse
} from '../../types';
import { api } from '../../api';
import {
  webPageProvider,
  browserScreenProvider,
  CapturedDOMElement
} from '../../services/screenCapture';
import { voiceSynthesis } from '../../services/voiceSynthesis';
import {
  Sparkles,
  ScreenShare,
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
  Globe,
  BookOpen,
  MessageSquare,
  Monitor,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ExternalLink
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
}

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
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'screen' | 'web'>('chat');

  // --- Chat State (Phase 4) ---
  const [messages, setMessages] = useState<CompanionMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: 'msg_initial',
        sender: 'teacher',
        text: "Hello! I am Professor Nova. Ask me any conceptual question about your learning document, or switch tabs to guide you visually through the platform.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
  const abortControllerRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- Screen Guidance State (Phase 6 & 7) ---
  const [screenMode, setScreenMode] = useState<ScreenContextMode>('dom');
  const [screenQuery, setScreenQuery] = useState('');
  const [isScreenLoading, setIsScreenLoading] = useState(false);
  const [screenErrorNotice, setScreenErrorNotice] = useState<string | null>(null);
  const [isViewingSharedScreen, setIsViewingSharedScreen] = useState(false);
  const [isScreenPaused, setIsScreenPaused] = useState(false);

  // --- Website Knowledge State (Phase 5) ---
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isIngestingWeb, setIsIngestingWeb] = useState(false);
  const [webStatus, setWebStatus] = useState<WebsiteStatusResponse | null>(null);
  const [activeKbId, setActiveKbId] = useState<string | null>(null);
  const [webQuestion, setWebQuestion] = useState('');
  const [webAnswer, setWebAnswer] = useState<WebsiteChatResponse | null>(null);
  const [isQueryingWeb, setIsQueryingWeb] = useState(false);
  const [webError, setWebError] = useState<string | null>(null);

  const panelRef = useRef<HTMLDivElement | null>(null);

  // Save conversation history to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Global browser shortcut Cmd+Shift+N / Ctrl+Shift+N
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

  // Web SpeechRecognition Setup
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (e: any) => {
        const transcript = e.results[0][0].transcript;
        if (transcript) {
          setInputText((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceInput = () => {
    if (!recognitionRef.current) {
      setChatError('Speech recognition is not supported in this browser.');
      return;
    }
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

  // Chat Submission
  const handleSendMessage = async (textToSend?: string) => {
    const msg = (textToSend || inputText).trim();
    if (!msg || isGenerating) return;

    setInputText('');
    setChatError(null);
    setLastFailedMessage(null);

    const userMsg: CompanionMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const res = await api.teach({
        document_id: activeDocId || 'general_learning',
        message: msg,
        active_concept: activeConceptName || activeDocTitle || undefined,
        mode: 'explain'
      });

      const replyText = res.teacher_text || res.spoken_text || "I've analyzed your question and updated your understanding trajectory.";

      const teacherMsg: CompanionMessage = {
        id: `teach_${Date.now()}`,
        sender: 'teacher',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: res.citations
      };

      setMessages((prev) => [...prev, teacherMsg]);

      // Speech Synthesis if not muted
      if (!isMuted && (res.spoken_text || replyText)) {
        voiceSynthesis.speak(res.spoken_text || replyText);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        setMessages((prev) => [
          ...prev,
          {
            id: `sys_${Date.now()}`,
            sender: 'teacher',
            text: 'Response generation was cancelled.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        const errorText = err.message || 'Failed to reach Professor Nova. Check backend connectivity.';
        setChatError(errorText);
        setLastFailedMessage(msg);
      }
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
        text: "Conversation cleared. I am ready for your next study topic or question.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setShowClearConfirm(false);
  };

  // Launch Screen Guidance
  const handleLaunchScreenQuery = async (queryText: string) => {
    if (!queryText.trim() || isScreenLoading) return;

    setIsScreenLoading(true);
    setScreenErrorNotice(null);

    try {
      let imageBase64: string | undefined = undefined;
      let domElements: CapturedDOMElement[] = [];

      if (screenMode === 'browser_screen') {
        setIsViewingSharedScreen(true);
        const capture = await browserScreenProvider.captureContext(activeTab);
        setIsViewingSharedScreen(false);
        if (capture.error) {
          setScreenErrorNotice(capture.error);
          setIsScreenLoading(false);
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
        setScreenQuery('');
      } else {
        setScreenErrorNotice(res.recommended_action?.what || 'I could not find an element for that request.');
      }
    } catch (err: any) {
      setScreenErrorNotice(err.message || 'Screen analysis failed.');
    } finally {
      setIsScreenLoading(false);
    }
  };

  // Website Ingestion (Phase 5)
  const handleStartWebsiteIngestion = async () => {
    if (!websiteUrl.trim() || isIngestingWeb) return;
    setIsIngestingWeb(true);
    setWebError(null);
    try {
      const res = await api.ingestWebsite({ url: websiteUrl, max_pages: 5, max_depth: 2 });
      setActiveKbId(res.kb_id);
      setWebStatus({
        kb_id: res.kb_id,
        base_url: res.base_url,
        status: 'completed',
        pages_crawled: res.pages_crawled,
        chunk_count: res.chunk_count,
        crawled_urls: [],
        errors: res.errors
      });
    } catch (err: any) {
      setWebError(err.message || 'Website crawl error');
    } finally {
      setIsIngestingWeb(false);
    }
  };

  const handleAskWebsite = async () => {
    if (!activeKbId || !webQuestion.trim() || isQueryingWeb) return;
    setIsQueryingWeb(true);
    try {
      const res = await api.chatWebsite({ kb_id: activeKbId, question: webQuestion });
      setWebAnswer(res);
    } catch (err: any) {
      setWebError(err.message || 'Failed to query website knowledge.');
    } finally {
      setIsQueryingWeb(false);
    }
  };

  const quickGuides = [
    { label: 'How do I upload a document?', query: 'How do I upload a study document?' },
    { label: 'Where is my knowledge graph?', query: 'Show me my knowledge graph' },
    { label: 'Start a quiz', query: 'Start a quiz on this topic' },
    { label: 'How does teach-back work?', query: 'How do I do teach-back?' },
    { label: 'Review my learning progress', query: 'Show me my progress and analytics' },
  ];

  return (
    <>
      {/* Floating Action Trigger Badge (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 select-none">
        {/* Status indicator: Nova is viewing your shared screen */}
        {isViewingSharedScreen && (
          <div className="bg-amber-950/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 border border-amber-500/50 shadow-lg animate-pulse">
            <ScreenShare className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Nova is viewing your screen</span>
          </div>
        )}

        {/* Guiding indicator pill if active */}
        {isGuidingActive && (
          <div className="bg-indigo-950/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-indigo-500/40 shadow-lg animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-medium truncate max-w-[130px]">{activeWorkflowName || 'Guiding'}</span>
            <button
              onClick={onStopGuiding}
              className="hover:text-rose-300 transition-colors ml-1 cursor-pointer"
              title="Stop guidance"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Floating Launcher Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Professor Nova AI Companion (Cmd+Shift+N)"
          className={`relative group p-1.5 rounded-full transition-all duration-300 shadow-xl cursor-pointer flex items-center justify-center ${
            isOpen
              ? 'bg-indigo-600 ring-4 ring-indigo-200 text-white scale-105'
              : isGuidingActive
              ? 'bg-indigo-600 ring-4 ring-indigo-300/60 text-white'
              : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:scale-105'
          }`}
          title="Professor Nova AI Companion (Cmd+Shift+N)"
        >
          <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-slate-900">
            <img
              src="/professor_nova.png"
              alt="Professor Nova"
              className="w-full h-full object-cover"
            />
          </div>

          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500 border-2 border-white" />
          </span>
        </button>
      </div>

      {/* Floating Interactive Companion Modal Drawer */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Professor Nova AI Companion"
          className="fixed bottom-20 right-5 z-40 w-[420px] max-w-[calc(100vw-2.5rem)] h-[560px] max-h-[calc(100vh-6.5rem)] bg-white/95 backdrop-blur-2xl border border-slate-200/90 shadow-2xl rounded-3xl flex flex-col text-slate-800 transition-all select-none animate-fadeIn overflow-hidden"
        >
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/70">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs shrink-0">
                <img
                  src="/professor_nova.png"
                  alt="Professor Nova"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="truncate">
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>Professor Nova</span>
                  <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Companion
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-normal truncate">
                  {activeDocTitle ? `Grounded: ${activeDocTitle}` : 'General Adaptive AI Learning'}
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

          {/* Sub-Tab Navigation Switcher */}
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
                onClick={() => setActiveSubTab('screen')}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'screen'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                <span>Screen Guide</span>
              </button>
              <button
                onClick={() => setActiveSubTab('web')}
                className={`flex-1 py-1 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  activeSubTab === 'web'
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Website</span>
              </button>
            </div>
          </div>

          {/* TAB 1: Chat View (Phase 4) */}
          {activeSubTab === 'chat' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Grounding Context Banner */}
              <div className="px-3.5 py-1.5 bg-indigo-50/60 border-b border-indigo-100/60 text-[10px] text-indigo-900 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <BookOpen className="w-3 h-3 text-indigo-600 shrink-0" />
                  <span className="truncate">
                    {activeDocTitle ? `Document: ${activeDocTitle}` : 'General learning (ask any subject)'}
                  </span>
                </div>
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 ml-1 shrink-0 cursor-pointer"
                  title="Clear conversation"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {/* Message History List */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-xs">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-xs leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-indigo-600 text-white rounded-br-xs'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.text}</p>

                      {/* Citations block if present */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="mt-2 pt-1.5 border-t border-slate-200/80 space-y-1 text-[10px] text-slate-600">
                          <span className="font-semibold block text-indigo-700">Verified Sources:</span>
                          {m.citations.map((c, i) => (
                            <div key={i} className="bg-white/80 p-1.5 rounded-lg border border-slate-200/40">
                              <span className="font-medium text-slate-800">{c.source || 'Curriculum'} — Page {c.page || 1}</span>
                              {c.excerpt && <p className="italic text-slate-500 mt-0.5 line-clamp-2">"{c.excerpt}"</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <span className="text-[9px] text-slate-400 px-1 mt-0.5">{m.timestamp}</span>
                  </div>
                ))}

                {isGenerating && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    <span>Professor Nova is thinking...</span>
                    <button
                      onClick={handleStopGeneration}
                      className="ml-auto flex items-center gap-1 text-[10px] text-rose-600 font-medium hover:text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 cursor-pointer"
                    >
                      <Square className="w-2.5 h-2.5 fill-rose-600" />
                      <span>Stop</span>
                    </button>
                  </div>
                )}

                {chatError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Generation failed</span>
                    </div>
                    <p className="text-[11px] text-rose-700">{chatError}</p>
                    {lastFailedMessage && (
                      <button
                        onClick={handleRetry}
                        className="flex items-center gap-1 text-[10px] font-medium text-rose-800 bg-rose-100 hover:bg-rose-200 px-2 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Retry response</span>
                      </button>
                    )}
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input Bar */}
              <div className="p-3 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-1.5"
                >
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`p-2 rounded-xl transition-colors cursor-pointer shrink-0 ${
                      isListening
                        ? 'bg-rose-500 text-white animate-pulse'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                    title={isListening ? 'Stop listening' : 'Speak your question'}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder="Ask Professor Nova anything..."
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
                  />

                  <button
                    type="submit"
                    disabled={!inputText.trim() || isGenerating}
                    className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer shrink-0"
                    title="Send message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: Screen Guide View (Phase 6 & 7) */}
          {activeSubTab === 'screen' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-xs">
              {/* Screen Mode Toggle */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setScreenMode('dom')}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    screenMode === 'dom' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>LEARNOVA DOM</span>
                </button>
                <button
                  onClick={() => setScreenMode('browser_screen')}
                  className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    screenMode === 'browser_screen' ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500'
                  }`}
                >
                  <ScreenShare className="w-3.5 h-3.5" />
                  <span>Screen Share</span>
                </button>
              </div>

              {/* Privacy Notice */}
              <div className="px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
                <span>Zero screenshots stored. Transient memory analysis only.</span>
              </div>

              {screenErrorNotice && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-[11px] leading-relaxed">{screenErrorNotice}</div>
                </div>
              )}

              {/* Guided Query Input */}
              <div className="relative">
                <input
                  type="text"
                  value={screenQuery}
                  onChange={(e) => setScreenQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleLaunchScreenQuery(screenQuery);
                  }}
                  placeholder="Where would you like to go?"
                  className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
                />
                <button
                  onClick={() => handleLaunchScreenQuery(screenQuery)}
                  disabled={!screenQuery.trim() || isScreenLoading}
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
                  title="Start Guidance"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Quick Guides List */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block px-1">
                  Guided Workflows
                </span>
                <div className="space-y-1">
                  {quickGuides.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLaunchScreenQuery(item.query)}
                      disabled={isScreenLoading}
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

          {/* TAB 3: Website Knowledge View (Phase 5) */}
          {activeSubTab === 'web' && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 min-h-0 text-xs">
              <div className="bg-indigo-50/70 p-2.5 rounded-xl border border-indigo-100 text-[11px] text-indigo-900 leading-relaxed">
                <span className="font-semibold block mb-0.5">Aparsoft-Inspired Website Knowledge</span>
                Enter any documentation or website URL. Nova will crawl safe same-origin pages and answer your questions directly from the indexed sources.
              </div>

              {/* URL Input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                  Website URL
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://docs.python.org/3/tutorial/"
                    className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    onClick={handleStartWebsiteIngestion}
                    disabled={!websiteUrl.trim() || isIngestingWeb}
                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 text-xs font-medium transition-colors cursor-pointer shrink-0"
                  >
                    {isIngestingWeb ? 'Crawling...' : 'Index'}
                  </button>
                </div>
              </div>

              {webError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl">
                  {webError}
                </div>
              )}

              {/* Crawl Status Card */}
              {webStatus && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-950 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-emerald-900">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Website Indexed Successfully</span>
                  </div>
                  <p className="text-[11px]">
                    Indexed <strong>{webStatus.pages_crawled}</strong> pages ({webStatus.chunk_count} concept chunks).
                  </p>
                </div>
              )}

              {/* Question Input on Crawled Website */}
              {activeKbId && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-1">
                    Ask About This Website
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={webQuestion}
                      onChange={(e) => setWebQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleAskWebsite();
                      }}
                      placeholder="e.g. How does authentication work?"
                      className="flex-1 px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={handleAskWebsite}
                      disabled={!webQuestion.trim() || isQueryingWeb}
                      className="p-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {webAnswer && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <p className="text-xs text-slate-800 whitespace-pre-wrap leading-relaxed">{webAnswer.answer}</p>
                      {webAnswer.citations && webAnswer.citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[10px]">
                          <span className="font-semibold text-indigo-700 block">Verified Website Sources:</span>
                          {webAnswer.citations.map((c, i) => (
                            <div key={i} className="bg-white p-1.5 rounded-lg border border-slate-200">
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                              >
                                <span>{c.title}</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                              <p className="text-slate-500 mt-0.5 line-clamp-2">{c.excerpt}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Clear Confirmation Modal */}
          {showClearConfirm && (
            <div className="absolute inset-0 bg-white/95 backdrop-blur-md p-5 flex flex-col items-center justify-center text-center space-y-3 z-50">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-900">Clear conversation history?</h4>
                <p className="text-[11px] text-slate-500 mt-1 max-w-[240px]">
                  This will reset your floating companion message history on this device.
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
                  Confirm Clear
                </button>
              </div>
            </div>
          )}

          {/* Footer Shortcut hint */}
          <div className="p-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 bg-slate-50/70 shrink-0">
            <span>Shortcut to toggle</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white text-slate-600 font-mono text-[9px] border border-slate-200">
              Cmd+Shift+N
            </kbd>
          </div>
        </div>
      )}
    </>
  );
};
