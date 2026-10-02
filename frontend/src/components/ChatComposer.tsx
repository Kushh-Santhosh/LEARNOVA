import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  Command,
  Languages,
  BookOpen,
  HelpCircle,
  Award,
  Layers
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
  const [activeMode, setActiveMode] = useState('explain');
  const [showCommands, setShowCommands] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const commandItems = [
    { cmd: '/quiz', label: 'Generate a comprehension quiz', mode: 'quiz_me', icon: HelpCircle },
    { cmd: '/teachback', label: 'Challenge me to teach it back', mode: 'teach_back', icon: Award },
    { cmd: '/visual', label: 'Create a visual diagram or flowchart', mode: 'visual', icon: Layers },
    { cmd: '/simplify', label: 'Explain simpler without jargon', mode: 'simplify', icon: BookOpen },
    { cmd: '/socratic', label: 'Guide me with a Socratic question', mode: 'socratic', icon: Sparkles },
  ];

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'kn', label: 'ಕನ್ನಡ (Kannada)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
    { code: 'te', label: 'తెలుగు (Telugu)' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
  ];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (!text.trim() || isSending) return;
    onSendMessage(text, activeMode, activeLanguage);
    setText('');
    setShowCommands(false);
  };

  const selectCommand = (cmd: typeof commandItems[0]) => {
    setShowCommands(false);
    onSendMessage(`Let's execute ${cmd.cmd}`, cmd.mode, activeLanguage);
  };

  return (
    <div className="relative w-full max-w-4xl mx-auto p-3">
      {/* Command Menu Popover */}
      {showCommands && (
        <div className="absolute bottom-full mb-2 left-4 w-72 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 z-40 animate-fadeIn text-xs">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
            Pedagogical Commands
          </div>
          {commandItems.map((c) => {
            const Icon = c.icon;
            return (
              <button
                key={c.cmd}
                onClick={() => selectCommand(c)}
                className="w-full flex items-center space-x-2.5 p-2 rounded-xl text-left hover:bg-blue-50 hover:text-blue-900 transition-colors"
              >
                <Icon className="w-4 h-4 text-blue-600 shrink-0" />
                <div>
                  <div className="font-bold text-slate-800">{c.cmd}</div>
                  <div className="text-[10px] text-slate-500">{c.label}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Language Selector Dropdown */}
      {showLangMenu && (
        <div className="absolute bottom-full mb-2 left-28 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 p-1.5 z-40 animate-fadeIn text-xs">
          <div className="px-2 py-1 text-[10px] uppercase font-bold text-slate-400">
            Teaching Language
          </div>
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => {
                onChangeLanguage(l.code);
                setShowLangMenu(false);
              }}
              className={`w-full text-left px-2.5 py-1.5 rounded-lg transition-colors flex items-center justify-between ${
                activeLanguage === l.code ? 'bg-blue-50 text-blue-900 font-bold' : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span>{l.label}</span>
              {activeLanguage === l.code && <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />}
            </button>
          ))}
        </div>
      )}

      {/* Main Composer Box */}
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 transition-all p-2 flex flex-col">
        {/* Input Row */}
        <div className="flex items-center space-x-2 px-2">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (e.target.value.startsWith('/')) {
                setShowCommands(true);
              } else {
                setShowCommands(false);
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isListening
                ? 'Listening to your voice...'
                : 'Ask Professor Nova anything about this lesson... (type / for commands)'
            }
            className="flex-1 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-hidden bg-transparent"
          />

          <button
            type="button"
            onClick={onToggleListening}
            className={`p-2 rounded-xl transition-all shrink-0 ${
              isListening
                ? 'bg-red-500 text-white animate-pulse shadow-xs'
                : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
            }`}
            title={isListening ? 'Stop Recording' : 'Speak to Professor Nova'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handleSend}
            disabled={!text.trim() || isSending}
            className="p-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-30 text-white shrink-0 shadow-2xs transition-colors"
            title="Send Message"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        {/* Toolbar Row: Mode Selector + Language Pill + Quick Shortcut Pill */}
        <div className="flex items-center justify-between pt-2 px-2 mt-1 border-t border-slate-100 text-[11px] text-slate-500">
          <div className="flex items-center space-x-1.5">
            {/* Mode selection buttons */}
            {['explain', 'simplify', 'socratic', 'exam'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMode(m)}
                className={`px-2 py-0.5 rounded-lg capitalize font-medium transition-colors ${
                  activeMode === m
                    ? 'bg-slate-900 text-white font-semibold'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            {/* Language Switcher Pill */}
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold"
              title="Change teaching language"
            >
              <Languages className="w-3 h-3 text-blue-600" />
              <span>{activeLanguage.toUpperCase()}</span>
            </button>

            {/* Quick Slash Menu Toggle */}
            <button
              type="button"
              onClick={() => setShowCommands(!showCommands)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-700"
              title="Commands Menu"
            >
              <Command className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
