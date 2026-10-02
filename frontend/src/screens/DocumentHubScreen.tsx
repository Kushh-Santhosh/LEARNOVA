import React, { useState, useRef } from 'react';
import { DocumentMeta } from '../types';
import { UploadCloud, FileText, CheckCircle2, ArrowRight, Loader2, Sparkles, BookOpen } from 'lucide-react';

interface DocumentHubScreenProps {
  documents: DocumentMeta[];
  activeDocId: string;
  onSelectDocument: (docId: string) => void;
  onUploadFile: (file: File) => Promise<void>;
  onEnterClassroom: () => void;
}

export const DocumentHubScreen: React.FC<DocumentHubScreenProps> = ({
  documents,
  activeDocId,
  onSelectDocument,
  onUploadFile,
  onEnterClassroom,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stages = [
    'Reading Document & Parsing Pages...',
    'Extracting Structural Hierarchy & Headings...',
    'Mining Key Concepts & Formulating Definitions...',
    'Constructing Relational Knowledge Graph...',
    'Grounding RAG Chunks with Page Citations...',
    'AI Classroom Teacher Ready!'
  ];

  const handleFileProcess = async (file: File) => {
    // Basic file validation
    const validExtensions = ['.pdf', '.txt', '.md', '.markdown'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Please select a valid PDF, Markdown, or TXT file.');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    // Realistic progressive stage updates while uploading & extracting
    for (let i = 0; i < stages.length - 1; i++) {
      setProcessingStage(stages[i]);
      await new Promise((r) => setTimeout(r, 450));
    }

    try {
      await onUploadFile(file);
      setProcessingStage(stages[stages.length - 1]);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStage('');
      }, 700);
    } catch (err: any) {
      setUploadError('Failed to process document. Please try again.');
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      <div className="mb-6">
        <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
          Document Intelligence Hub
        </span>
        <h2 className="text-2xl font-bold text-slate-900 mt-0.5">Study Materials & Sources</h2>
        <p className="text-xs text-slate-500 mt-1">
          Upload any PDF or notes. LEARNOVA will extract structure, map dependencies, and prepare the AI teacher.
        </p>
      </div>

      {/* Processing Status Banner */}
      {isProcessing && (
        <div className="mb-6 p-5 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 animate-fadeIn">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <div className="flex-1">
              <h4 className="text-xs font-bold text-blue-900">Understanding your material...</h4>
              <p className="text-xs text-blue-700 mt-0.5 font-medium">{processingStage}</p>
            </div>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-blue-200 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-600 h-1.5 rounded-full animate-pulse w-4/5 transition-all duration-300" />
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs">
          {uploadError}
        </div>
      )}

      {/* Upload Drag & Drop Area */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
          isDragging
            ? 'border-blue-500 bg-blue-50/50'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.txt,.md"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />

        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center mb-3 shadow-2xs">
          <UploadCloud className="w-7 h-7" />
        </div>

        <h3 className="text-sm font-bold text-slate-800">
          Drop your PDF or notes here, or <span className="text-blue-600 underline">browse files</span>
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Supports PDF, Markdown, and TXT (Max 25MB)
        </p>
      </div>

      {/* Available Documents List */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          <span>Curriculum Documents ({documents.length})</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {documents.map((doc) => {
            const isSelected = activeDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDocument(doc.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer bg-white ${
                  isSelected
                    ? 'border-blue-600 ring-2 ring-blue-100 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="p-2 bg-slate-100 rounded-xl text-slate-700">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 leading-tight">
                        {doc.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                        {doc.filename} • {doc.file_type.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="p-1 text-blue-600">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center space-x-3">
                    <span>{doc.concept_count} Concepts</span>
                    <span>•</span>
                    <span>{doc.chunk_count} Citations</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectDocument(doc.id);
                      onEnterClassroom();
                    }}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <span>Open in Classroom</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
