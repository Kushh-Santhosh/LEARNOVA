import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  ArrowUp,
  Plus,
  HelpCircle,
  Award,
  Layers,
  Compass,
  BookOpen,
  ChevronDown,
  Globe
} from 'lucide-react';

interface ChatComposerProps {
  onSendMessage: (message: string, mode?: string, lang?: string) => void;
  isSending: boolean;
  isListening: boolean;
  onToggleListening: () => void;
  activeLanguage: string;
  onChangeLanguage: (lang: string) => void;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isSending,
  isListening,
  onToggleListening,
  activeLanguage,
  onChangeLanguage,
}) => {
  const [text, setText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('explain');
  const [showTools, setShowTools] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const teachingStyles = [
    { id: 'explain', label: 'Explain' },
    { id: 'socratic', label: 'Socratic' },
    { id: 'simplify', label: 'Simplify' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'visual', label: 'Visual' },
  ];

  const tools = [
    { id: 'quiz', label: 'Comprehension Quiz', icon: HelpCircle, prompt: 'Quiz me on this concept to test my understanding.' },
    { id: 'teach_back', label: 'Teach-Back Challenge', icon: Award, prompt: 'Challenge me to teach this concept back to you.' },
    { id: 'visual', label: 'Generate Visual Diagram', icon: Layers, prompt: 'Create a visual diagram or flowchart comparing the key mechanisms.' },
    { id: 'simplify', label: 'Explain Simply (No Jargon)', icon: BookOpen, prompt: 'Explain this in the simplest possible terms with a real-life analogy.' },
    { id: 'socratic', label: 'Socratic Guidance', icon: Compass, prompt: 'Ask me a guiding Socratic question instead of telling me the answer.' },
  ];

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
  ];

  // Auto-resize textarea smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSendMessage(text, selectedStyle, activeLanguage);
    setText('');
    setShowTools(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectTool = (tool: typeof tools[0]) => {
    setShowTools(false);
    onSendMessage(tool.prompt, tool.id, activeLanguage);
  };

  return (
    <div className="relative w-full max-w-3xl mx-auto px-4 pb-4 pt-1 select-none">
      {/* Tool popover menu */}
      {showTools && (
        <div className="absolute bottom-full mb-3 left-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-fadeIn text-xs">
          <div className="px-2.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Teaching Tools
          </div>
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTool(t)}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-left hover:bg-slate-50 transition-colors cursor-pointer group"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-medium text-slate-800 text-xs">{t.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Language dropdown popover */}
      {showLangMenu && (
        <div className="absolute bottom-full mb-3 right-4 w-44 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-fadeIn text-xs">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChangeLanguage(l.code);
                setShowLangMenu(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-xl transition-colors cursor-pointer flex items-center justify-between ${
                activeLanguage === l.code ? 'bg-slate-100 font-semibold text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{l.label}</span>
              {activeLanguage === l.code && <span className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-sm focus-within:border-slate-400 focus-within:shadow-md transition-all duration-200 p-3">
        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Professor Nova anything..."
          rows={1}
          disabled={isSending}
          className="w-full resize-none bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm px-2 pt-1 pb-2 max-h-36 leading-relaxed"
        />

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
          {/* Left tools & mode selector */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-none">
            {/* Tool button */}
            <button
              onClick={() => setShowTools(!showTools)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              title="Add action or tool"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Audio Speech Mic Button */}
            <button
              onClick={onToggleListening}
              className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isListening
                  ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/40 animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Speak to Professor Nova'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <span className="w-px h-3.5 bg-slate-200 mx-1" />

            {/* Teaching Style Pills */}
            <div className="flex items-center space-x-1">
              {teachingStyles.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setSelectedStyle(style.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs transition-colors cursor-pointer ${
                    selectedStyle === style.id
                      ? 'bg-slate-900 text-white font-medium'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Language & Send Button */}
          <div className="flex items-center space-x-1.5 shrink-0 pl-2">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Change teaching language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span>{languages.find((l) => l.code === activeLanguage)?.label.split(' ')[0] || 'English'}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <button
              onClick={handleSend}
              disabled={!text.trim() || isSending}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                text.trim() && !isSending
                  ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title="Send message"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
