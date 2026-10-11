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
  Globe,
  Paperclip,
  X,
  FileText,
  FileCode,
  File,
  Sparkles,
  Zap,
  Search,
  AlertCircle
} from 'lucide-react';

export interface AttachedFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  formattedSize: string;
  type: string;
  error?: string;
}

interface ChatComposerProps {
  onSendMessage: (
    message: string,
    mode?: string,
    lang?: string,
    attachedFiles?: File[],
    researchMode?: boolean
  ) => void;
  isSending: boolean;
  isListening: boolean;
  onToggleListening: () => void;
  activeLanguage: string;
  onChangeLanguage: (lang: string) => void;
  onOpenDocuments?: () => void;
  liveTranscript?: string;
}

const SUPPORTED_EXTS = ['.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.c', '.h', '.cpp', '.hpp', '.py', '.java'];

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isSending,
  isListening,
  onToggleListening,
  activeLanguage,
  onChangeLanguage,
  onOpenDocuments,
  liveTranscript,
}) => {
  const [text, setText] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('explain');
  const [isResearchMode, setIsResearchMode] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<AttachedFileItem[]>([]);
  const [showTools, setShowTools] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const teachingStyles = [
    { id: 'explain', label: 'Explain' },
    { id: 'socratic', label: 'Socratic' },
    { id: 'simplify', label: 'Simplify' },
    { id: 'quiz', label: 'Quiz' },
    { id: 'visual', label: 'Visual' },
  ];

  const tools = [
    ...(onOpenDocuments ? [{ id: 'open_doc', label: 'Open Documents Library', icon: BookOpen, prompt: '', isDocAction: true }] : []),
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />;
    if (['c', 'h', 'cpp', 'hpp', 'py', 'java', 'js', 'ts'].includes(ext || '')) {
      return <FileCode className="w-3.5 h-3.5 text-blue-500 shrink-0" />;
    }
    return <File className="w-3.5 h-3.5 text-slate-500 shrink-0" />;
  };

  const processSelectedFiles = (fileList: FileList | File[]) => {
    setFileError(null);
    const newItems: AttachedFileItem[] = [];
    const filesArray = Array.from(fileList);

    for (const file of filesArray) {
      const ext = '.' + (file.name.split('.').pop()?.toLowerCase() || '');
      if (!SUPPORTED_EXTS.includes(ext)) {
        setFileError(`Unsupported format: ${file.name}. Supported: PDF, DOCX, TXT, MD, CSV, Code.`);
        continue;
      }
      if (file.size > 100 * 1024 * 1024) {
        setFileError(`File too large: ${file.name} exceeds 100MB limit.`);
        continue;
      }
      // Avoid duplicate attachments
      if (attachedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        continue;
      }
      newItems.push({
        id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        name: file.name,
        size: file.size,
        formattedSize: formatFileSize(file.size),
        type: file.type || ext,
      });
    }

    if (newItems.length > 0) {
      setAttachedFiles((prev) => [...prev, ...newItems]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processSelectedFiles(e.target.files);
      // Reset input value so re-selecting same file triggers onChange
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachedFiles((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFiles(e.dataTransfer.files);
    }
  };

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
    const trimmed = text.trim();
    if ((!trimmed && attachedFiles.length === 0) || isSending) return;

    const messageText = trimmed || (attachedFiles.length > 0 ? (isResearchMode ? `Research the contents of this document in depth.` : `Summarise this document and explain its key concepts.`) : '');
    const filesToSend = attachedFiles.map((a) => a.file);

    onSendMessage(
      messageText,
      isResearchMode ? 'deep_research' : selectedStyle,
      activeLanguage,
      filesToSend,
      isResearchMode
    );

    setText('');
    setAttachedFiles([]);
    setShowTools(false);
    setFileError(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleSelectTool = (tool: any) => {
    setShowTools(false);
    if (tool.isDocAction && onOpenDocuments) {
      onOpenDocuments();
      return;
    }
    onSendMessage(tool.prompt, tool.id, activeLanguage, [], isResearchMode);
  };

  return (
    <div
      className="relative w-full max-w-3xl mx-auto px-4 pb-4 pt-1 select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Native File Input: Paperclip directly opens this */}
      <input
        ref={fileInputRef}
        id="chat-file-input"
        data-testid="chat-file-input"
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.md,.csv,.c,.h,.cpp,.hpp,.py,.java"
        onChange={handleFileInputChange}
        className="hidden"
      />

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
      <div
        className={`rounded-3xl bg-white border shadow-sm transition-all duration-200 p-3 ${
          isDragOver
            ? 'border-indigo-500 bg-indigo-50/30 ring-2 ring-indigo-200 shadow-md'
            : isResearchMode
            ? 'border-indigo-200/90 focus-within:border-indigo-400 focus-within:shadow-md'
            : 'border-slate-200 focus-within:border-slate-400 focus-within:shadow-md'
        }`}
      >
        {/* Live speech interim transcript banner */}
        {isListening && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200/70 text-rose-800 text-xs flex items-center gap-2 animate-pulse">
            <Mic className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span className="font-medium">Listening...</span>
            <span className="text-rose-700 italic truncate">
              {liveTranscript || 'Speak your question...'}
            </span>
          </div>
        )}

        {/* Attachment Error Notice */}
        {fileError && (
          <div className="mb-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{fileError}</span>
            </div>
            <button
              onClick={() => setFileError(null)}
              className="text-amber-500 hover:text-amber-800 p-0.5 rounded cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Attachment Preview Chips */}
        {attachedFiles.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2.5 pb-2 border-b border-slate-100">
            {attachedFiles.map((item) => (
              <div
                key={item.id}
                className="group flex items-center space-x-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 shadow-2xs hover:border-slate-300 transition-colors"
              >
                {getFileIcon(item.name)}
                <div className="flex flex-col min-w-0 max-w-[180px]">
                  <span className="font-medium truncate text-slate-900">{item.name}</span>
                  <span className="text-[10px] text-slate-400">{item.formattedSize}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(item.id)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 hover:border-slate-400 text-slate-500 hover:text-slate-800 text-xs flex items-center gap-1 transition-colors cursor-pointer"
              title="Attach another document"
            >
              <Plus className="w-3 h-3" />
              <span>Add more</span>
            </button>
          </div>
        )}

        {/* Text Input Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedFiles.length > 0
              ? `Ask a question about ${attachedFiles.length === 1 ? attachedFiles[0].name : `${attachedFiles.length} attached documents`}...`
              : isResearchMode
              ? 'Enter an academic or technical research topic for comprehensive investigation...'
              : 'Ask Professor Nova anything...'
          }
          rows={1}
          disabled={isSending}
          className="w-full resize-none bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm px-2 pt-1 pb-2 max-h-36 leading-relaxed"
        />

        {/* Action Row */}
        <div className="flex items-center justify-between pt-1 border-t border-slate-100 gap-2">
          {/* Left tools & mode selector */}
          <div className="flex items-center space-x-1 overflow-x-auto py-0.5 scrollbar-none min-w-0">
            {/* Tool button (+) */}
            <button
              type="button"
              onClick={() => setShowTools(!showTools)}
              className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Add action or tool"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Inline Attachment Paperclip Button: Native File Picker */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${
                attachedFiles.length > 0
                  ? 'bg-indigo-50 text-indigo-700 font-medium'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title="Attach PDF, Word, Code, or Text Document to current chat"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Audio Speech Mic Button */}
            <button
              type="button"
              onClick={onToggleListening}
              className={`p-1.5 rounded-xl transition-all cursor-pointer flex items-center justify-center shrink-0 ${
                isListening
                  ? 'bg-rose-500 text-white shadow-xs shadow-rose-500/40 animate-pulse'
                  : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Speak to Professor Nova'}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <span className="w-px h-3.5 bg-slate-200 mx-1 shrink-0" />

            {/* Quick Answer vs Deep Research Segmented Mode Toggle */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl shrink-0 text-xs font-medium">
              <button
                type="button"
                onClick={() => setIsResearchMode(false)}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  !isResearchMode
                    ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Fast, conversational responses"
              >
                <Zap className="w-3 h-3 text-amber-500" />
                <span>Quick</span>
              </button>
              <button
                type="button"
                onClick={() => setIsResearchMode(true)}
                className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                  isResearchMode
                    ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Deep academic research with verified sources and comparative notes"
              >
                <Search className="w-3 h-3" />
                <span>Deep Research</span>
              </button>
            </div>

            {/* Teaching Style Pills (shown when in normal Quick mode) */}
            {!isResearchMode && (
              <>
                <span className="w-px h-3.5 bg-slate-200 mx-1 shrink-0 hidden sm:inline" />
                <div className="hidden sm:flex items-center space-x-1">
                  {teachingStyles.map((style) => (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setSelectedStyle(style.id)}
                      className={`px-2 py-0.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        selectedStyle === style.id
                          ? 'bg-slate-900 text-white font-medium'
                          : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {style.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Right Language & Send Button */}
          <div className="flex items-center space-x-1.5 shrink-0 pl-1">
            <button
              type="button"
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="px-2 py-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Change teaching language"
            >
              <Globe className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden xs:inline">
                {languages.find((l) => l.code === activeLanguage)?.label.split(' ')[0] || 'English'}
              </span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            <button
              type="button"
              onClick={handleSend}
              disabled={(!text.trim() && attachedFiles.length === 0) || isSending}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                (text.trim() || attachedFiles.length > 0) && !isSending
                  ? isResearchMode
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    : 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              title={isResearchMode ? 'Start Deep Research' : 'Send message'}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
