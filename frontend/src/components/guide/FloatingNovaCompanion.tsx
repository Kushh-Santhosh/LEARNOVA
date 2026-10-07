import React, { useState, useEffect, useRef } from 'react';
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
import {
  Sparkles,
  ScreenShare,
  Compass,
  X,
  ChevronRight,
  Shield,
  HelpCircle,
  Play,
  Monitor,
  Search,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface FloatingNovaCompanionProps {
  activeTab: string;
  activeDocId?: string;
  activeConceptName?: string;
  onStartWorkflow: (guidance: ScreenGuidanceResponse) => void;
  isGuidingActive: boolean;
  activeWorkflowName?: string;
  onStopGuiding: () => void;
}

export const FloatingNovaCompanion: React.FC<FloatingNovaCompanionProps> = ({
  activeTab,
  activeDocId,
  activeConceptName,
  onStartWorkflow,
  isGuidingActive,
  activeWorkflowName,
  onStopGuiding,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<ScreenContextMode>('dom');
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ScreenCapabilities | null>(null);
  const [screenPreview, setScreenPreview] = useState<string | null>(null);
  const [isViewingSharedScreen, setIsViewingSharedScreen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // Load capabilities once on mount
  useEffect(() => {
    api.getScreenCapabilities()
      .then((caps) => setCapabilities(caps))
      .catch(() => {});
  }, []);

  // Browser-level keyboard shortcut: Cmd+Shift+N / Ctrl+Shift+N (active only when browser is focused)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const quickGuides = [
    { label: 'How do I upload a document?', query: 'How do I upload a study document?' },
    { label: 'Where is my knowledge graph?', query: 'Show me my knowledge graph' },
    { label: 'Start a quiz', query: 'Start a quiz on this topic' },
    { label: 'How does teach-back work?', query: 'How do I do teach-back?' },
    { label: 'Review my learning progress', query: 'Show me my progress and analytics' },
    { label: 'Explain what I am looking at', query: 'Explain what is on this screen' },
  ];

  const handleLaunchQuery = async (queryText: string) => {
    if (!queryText.trim() || isLoading) return;

    setIsLoading(true);
    setErrorNotice(null);

    try {
      let imageBase64: string | undefined = undefined;
      let domElements: CapturedDOMElement[] = [];

      if (mode === 'browser_screen') {
        setIsViewingSharedScreen(true);
        const capture = await browserScreenProvider.captureContext(activeTab);
        setIsViewingSharedScreen(false);
        if (capture.error) {
          setErrorNotice(capture.error);
          setIsLoading(false);
          return;
        }
        imageBase64 = capture.screenshot_base64;
        domElements = capture.dom_elements;
      } else {
        // Mode A: DOM & Accessibility snapshot
        const capture = await webPageProvider.captureContext(activeTab);
        domElements = capture.dom_elements;
      }

      const res = await api.analyzeScreen({
        goal: queryText,
        mode: mode,
        current_route: activeTab,
        dom_elements: domElements,
        screenshot_base64: imageBase64,
        active_document_id: activeDocId,
      });

      if (res && (res.status?.toLowerCase() === 'success' || !!res.target_element)) {
        onStartWorkflow(res);
        setIsOpen(false);
        setQuery('');
      } else {
        setErrorNotice(res.recommended_action?.what || 'I could not find an element for that request. Try choosing one of the guides below.');
      }
    } catch (err: any) {
      setErrorNotice(err.message || 'Failed to analyze screen. Please check server status.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Badge (Bottom Right) */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2 select-none">
        {/* Visible status: Nova is viewing your shared screen */}
        {isViewingSharedScreen && (
          <div className="bg-amber-950/95 text-white backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs flex items-center gap-2 border border-amber-500/50 shadow-lg animate-pulse">
            <ScreenShare className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Nova is viewing your shared screen</span>
          </div>
        )}

        {/* Guiding indicator pill if active */}
        {isGuidingActive && (
          <div className="bg-indigo-950/90 text-white backdrop-blur-md px-3 py-1.5 rounded-full text-xs flex items-center gap-2 border border-indigo-500/40 shadow-lg animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
            <span className="font-medium truncate max-w-[140px]">{activeWorkflowName || 'Guiding'}</span>
            <button
              onClick={onStopGuiding}
              className="hover:text-rose-300 transition-colors ml-1 cursor-pointer"
              title="Stop guidance"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <button
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label="Open Professor Nova Screen Companion (Cmd+Shift+N)"
          className={`relative group p-1.5 rounded-full transition-all duration-300 shadow-xl cursor-pointer flex items-center justify-center ${
            isOpen
              ? 'bg-indigo-600 ring-4 ring-indigo-200 text-white scale-105'
              : isGuidingActive
              ? 'bg-indigo-600 ring-4 ring-indigo-300/60 text-white'
              : 'bg-white hover:bg-slate-50 border border-slate-200/90 text-slate-800 hover:scale-105'
          }`}
          title="Professor Nova Screen Companion (Cmd+Shift+N)"
        >
          <div className="relative w-11 h-11 rounded-full overflow-hidden flex items-center justify-center bg-slate-900">
            <img
              src="/professor_nova.png"
              alt="Professor Nova Companion"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Active status pulse pip */}
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
          aria-label="Professor Nova Screen Guide"
          className="fixed bottom-20 right-5 z-40 w-96 max-w-[calc(100vw-2.5rem)] bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-2xl rounded-3xl p-5 text-slate-800 transition-all select-none animate-fadeIn"
        >
          {/* Top Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 shadow-2xs">
                <img
                  src="/professor_nova.png"
                  alt="Professor Nova"
                  className="w-full h-full object-cover"
                />
              </div>
              <div>
                <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                  <span>Professor Nova</span>
                  <span className="text-[10px] font-mono font-medium px-1.5 py-0.2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                    Screen Aware
                  </span>
                </h3>
                <p className="text-[11px] text-slate-500 font-normal">
                  Visual pointing & step-by-step guidance
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Context Mode Selector */}
          <div className="mt-3.5 flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl text-xs font-medium">
            <button
              onClick={() => setMode('dom')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'dom'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>LEARNOVA App</span>
            </button>
            <button
              onClick={() => setMode('browser_screen')}
              className={`flex-1 py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                mode === 'browser_screen'
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <ScreenShare className="w-3.5 h-3.5" />
              <span>Screen Share</span>
            </button>
          </div>

          {/* Privacy Notice Banner */}
          <div className="mt-2.5 px-2.5 py-1.5 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Transient in-memory processing only. Never stored on disk.</span>
          </div>

          {/* Error Notice */}
          {errorNotice && (
            <div className="mt-2.5 p-2.5 bg-amber-50 border border-amber-200 text-amber-900 text-xs rounded-xl flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1 text-[11px] leading-relaxed">{errorNotice}</div>
            </div>
          )}

          {/* Screen Share Mode Notice */}
          {mode === 'browser_screen' && (
            <div className="mt-3 p-3 bg-indigo-50/70 border border-indigo-100 rounded-2xl text-xs text-indigo-950 space-y-1.5">
              <div className="font-semibold flex items-center gap-1.5">
                <ScreenShare className="w-3.5 h-3.5 text-indigo-600" />
                <span>External Browser Tab or Window</span>
              </div>
              <p className="text-[11px] text-indigo-900/80 font-normal leading-relaxed">
                Clicking guide will prompt your browser for permission to share a tab or window. Nova will capture one frame transiently to point to items.
              </p>
            </div>
          )}

          {/* Guided Query Input Box */}
          <div className="mt-3 relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleLaunchQuery(query);
              }}
              placeholder="What would you like me to show you?"
              className="w-full pl-3 pr-9 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:outline-none transition-all placeholder:text-slate-400"
            />
            <button
              onClick={() => handleLaunchQuery(query)}
              disabled={!query.trim() || isLoading}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
              title="Start Guidance"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Guided Tasks */}
          <div className="mt-3.5 space-y-1.5">
            <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block px-1">
              Recommended Guides
            </span>
            <div className="space-y-1">
              {quickGuides.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleLaunchQuery(item.query)}
                  disabled={isLoading}
                  className="w-full text-left px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-100 flex items-center justify-between group transition-colors cursor-pointer"
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

          {/* Footer with Shortcut hint */}
          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
            <span>Browser shortcut (tab focused)</span>
            <kbd className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-mono text-[9px] border border-slate-200">
              Cmd+Shift+N
            </kbd>
          </div>
        </div>
      )}
    </>
  );
};
