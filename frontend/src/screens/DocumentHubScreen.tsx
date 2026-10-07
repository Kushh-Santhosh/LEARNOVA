import React, { useState, useRef } from 'react';
import { DocumentMeta } from '../types';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  ArrowRight,
  Loader2,
  Search,
  BookOpen,
  Plus
} from 'lucide-react';

interface DocumentHubScreenProps {
  documents: DocumentMeta[];
  activeDocId: string | null;
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stages = [
    'Reading your document',
    'Understanding sections & taxonomy',
    'Finding concepts & formulating definitions',
    'Connecting ideas into knowledge graph',
    'Preparing your adaptive lesson',
    'Ready',
  ];

  const handleFileProcess = async (file: File) => {
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.md', '.markdown'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError('Please select a valid PDF, Word (DOCX), Markdown, or TXT file.');
      return;
    }

    setUploadError(null);
    setIsProcessing(true);

    for (let i = 0; i < stages.length - 1; i++) {
      setProcessingStage(stages[i]);
      await new Promise((r) => setTimeout(r, 400));
    }

    try {
      await onUploadFile(file);
      setProcessingStage(stages[stages.length - 1]);
      setTimeout(() => {
        setIsProcessing(false);
        setProcessingStage('');
      }, 600);
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

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 max-w-4xl mx-auto px-6 py-10 w-full animate-fadeIn select-none">
      {/* Header */}
      <div className="mb-8">
        <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
          Library
        </span>
        <h1 className="text-3xl font-light text-slate-900 tracking-tight mt-0.5">
          Study Materials
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-normal">
          Upload any syllabus, lecture slides, or reading notes. Professor Nova structures them into an adaptive curriculum.
        </p>
      </div>

      {/* Processing Banner */}
      {isProcessing && (
        <div className="mb-8 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm animate-fadeIn">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-4 h-4 text-slate-900 animate-spin" />
            <div className="flex-1">
              <h4 className="text-xs font-semibold text-slate-900">{processingStage}...</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Building concepts, dependencies, and citations</p>
            </div>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-slate-900 h-1 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      )}

      {/* Clean Drag & Drop Area */}
      <div
        data-guide-id="btn-upload-dropzone"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`mb-8 p-8 rounded-3xl border border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center ${
          isDragging
            ? 'border-slate-900 bg-slate-100'
            : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50/50'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
          className="hidden"
          accept=".pdf,.docx,.doc,.txt,.md,.markdown"
        />
        <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 mb-3">
          <UploadCloud className="w-5 h-5" />
        </div>
        <div className="text-sm font-medium text-slate-900">
          Drop your study document here, or <span className="text-blue-600 font-semibold underline underline-offset-2">browse</span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Supports PDF, Word (DOCX), Markdown, and TXT with scalable indexing
        </p>
      </div>

      {uploadError && (
        <div className="mb-6 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {uploadError}
        </div>
      )}

      {/* Search Bar & Document List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Available Documents ({filteredDocs.length})
          </h3>

          <div className="relative w-48 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs outline-none focus:border-slate-400"
            />
          </div>
        </div>

        <div className="space-y-2.5">
          {filteredDocs.map((doc, idx) => {
            const isSelected = doc.id === activeDocId;
            return (
              <div
                key={doc.id}
                data-guide-id={idx === 0 ? 'btn-study-document' : undefined}
                onClick={() => {
                  onSelectDocument(doc.id);
                  onEnterClassroom();
                }}
                className={`p-4 rounded-2xl bg-white border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'border-slate-900 shadow-2xs'
                    : 'border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center space-x-3.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-slate-900 group-hover:text-white text-slate-600 flex items-center justify-center transition-colors shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {doc.title}
                      </h4>
                      {doc.is_demo ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200/80 font-medium">
                          Demo Course
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 font-medium">
                          User Material
                        </span>
                      )}
                      {isSelected && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-medium">
                          Active Course
                        </span>
                      )}
                    </div>
                    {/* Quiet metadata */}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {doc.file_type.toUpperCase()} • {doc.concept_count || doc.sections?.length || 10} concepts mapped • {doc.language ? `Lang: ${doc.language.toUpperCase()}` : 'Grounded source'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-xs text-slate-400 group-hover:text-slate-900 font-medium transition-colors hidden sm:inline">
                    Open in Lesson
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-900 transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
