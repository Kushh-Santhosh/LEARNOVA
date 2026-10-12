import React, { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Printer,
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
  FileText,
  Copy,
  Check
} from 'lucide-react';

// Initialize PDF.js worker
if (typeof window !== 'undefined' && pdfjsLib.GlobalWorkerOptions) {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  } catch {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
}

export interface PdfReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  pdfSource: string | File | Blob;
  initialPage?: number;
  onAskNova?: (prompt: string) => void;
}

export const PdfReaderModal: React.FC<PdfReaderModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  pdfSource,
  initialPage = 1,
  onAskNova,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [scale, setScale] = useState<number>(1.2);
  const [fitWidth, setFitWidth] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Search state
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIdx, setCurrentSearchIdx] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Copy text state
  const [copied, setCopied] = useState<boolean>(false);
  const [pageText, setPageText] = useState<string>('');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<any>(null);

  // Load PDF Document
  useEffect(() => {
    if (!isOpen || !pdfSource) return;

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        let loadingTask: any;

        if (typeof pdfSource === 'string') {
          loadingTask = pdfjsLib.getDocument({
            url: pdfSource,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        } else {
          const arrayBuffer = await pdfSource.arrayBuffer();
          loadingTask = pdfjsLib.getDocument({
            data: arrayBuffer,
            cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
            cMapPacked: true,
          });
        }

        const pdf = await loadingTask.promise;
        if (!isSubscribed) return;

        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setCurrentPage(Math.min(Math.max(1, initialPage), pdf.numPages));
        setLoading(false);
      } catch (err: any) {
        if (!isSubscribed) return;
        console.error('Error loading PDF via Mozilla PDF.js:', err);
        setError(err?.message || 'Failed to open PDF. Ensure file exists and is a valid PDF format.');
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isSubscribed = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [isOpen, pdfSource, initialPage]);

  // Render Page on Canvas
  const renderPage = useCallback(async (pageNum: number, currentScale: number) => {
    if (!pdfDocRef.current || !canvasRef.current || !containerRef.current) return;

    try {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      const page = await pdfDocRef.current.getPage(pageNum);

      // Extract raw text for Nova prompt and text selection
      try {
        const textContent = await page.getTextContent();
        const extracted = textContent.items
          .map((item: any) => item.str || '')
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
        setPageText(extracted);
      } catch {
        setPageText('');
      }

      let activeScale = currentScale;
      if (fitWidth && containerRef.current) {
        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        activeScale = Math.max(0.5, containerWidth / unscaledViewport.width);
      }

      const viewport = page.getViewport({ scale: activeScale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      if (!context) return;

      const outputScale = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * outputScale);
      canvas.height = Math.floor(viewport.height * outputScale);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

      const renderContext = {
        canvasContext: context,
        transform,
        viewport,
      };

      const renderTask = page.render(renderContext as any);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    }
  }, [fitWidth]);

  useEffect(() => {
    if (!loading && numPages > 0) {
      renderPage(currentPage, scale);
    }
  }, [currentPage, scale, loading, numPages, renderPage]);

  // Handle Search in PDF
  const handleSearch = async () => {
    if (!pdfDocRef.current || !searchTerm.trim()) return;

    setIsSearching(true);
    const matches: number[] = [];
    const term = searchTerm.toLowerCase();

    for (let i = 1; i <= pdfDocRef.current.numPages; i++) {
      try {
        const page = await pdfDocRef.current.getPage(i);
        const textContent = await page.getTextContent();
        const fullPageText = textContent.items.map((item: any) => item.str || '').join(' ').toLowerCase();
        if (fullPageText.includes(term)) {
          matches.push(i);
        }
      } catch {
        // continue
      }
    }

    setSearchResults(matches);
    setIsSearching(false);
    if (matches.length > 0) {
      setCurrentSearchIdx(0);
      setCurrentPage(matches[0]);
    } else {
      setCurrentSearchIdx(-1);
    }
  };

  const handleNextSearchMatch = () => {
    if (searchResults.length === 0) return;
    const nextIdx = (currentSearchIdx + 1) % searchResults.length;
    setCurrentSearchIdx(nextIdx);
    setCurrentPage(searchResults[nextIdx]);
  };

  const handlePrevSearchMatch = () => {
    if (searchResults.length === 0) return;
    const prevIdx = (currentSearchIdx - 1 + searchResults.length) % searchResults.length;
    setCurrentSearchIdx(prevIdx);
    setCurrentPage(searchResults[prevIdx]);
  };

  const handleCopyPageText = () => {
    if (!pageText) return;
    navigator.clipboard.writeText(pageText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (typeof pdfSource === 'string') {
      const link = document.createElement('a');
      link.href = pdfSource;
      link.download = `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      link.target = '_blank';
      link.click();
    } else if (pdfSource instanceof Blob) {
      const url = URL.createObjectURL(pdfSource);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${documentTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleQuickAsk = (actionType: 'explain_page' | 'rates' | 'summarize' | 'notes') => {
    if (!onAskNova) return;

    let prompt = '';
    if (actionType === 'explain_page') {
      prompt = `Explain page ${currentPage} of ${documentTitle}. Focus on key points, mechanisms, or rates present on this page.`;
      if (pageText) {
        prompt += `\n\nPage text excerpt:\n"${pageText.slice(0, 600)}"`;
      }
    } else if (actionType === 'rates') {
      prompt = `Explain this document and extract all rates, fees, amounts, and charges present in it. Format as a structured markdown table with Item, Description, Amount, and Page columns.`;
    } else if (actionType === 'summarize') {
      prompt = `Summarise this document and explain its core structure and concepts.`;
    } else if (actionType === 'notes') {
      prompt = `Generate structured study notes and high-yield review takeaways for this document.`;
    }

    onAskNova(prompt);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-2 sm:p-4">
      <div className="relative flex flex-col w-full max-w-6xl h-[92vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header & Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-slate-900/95 border-b border-slate-800 gap-2 shrink-0">
          {/* Document Title & Badge */}
          <div className="flex items-center gap-2.5 min-w-0 max-w-[280px] sm:max-w-md">
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-100 truncate" title={documentTitle}>
                {documentTitle}
              </h3>
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <span>Mozilla PDF.js Engine</span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Free & In-App</span>
              </p>
            </div>
          </div>

          {/* Navigation & Zoom Controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Page Navigation */}
            <div className="flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1 || loading}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-slate-200 whitespace-nowrap">
                {numPages > 0 ? `${currentPage} / ${numPages}` : '- / -'}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
                disabled={currentPage >= numPages || loading}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center bg-slate-800/80 rounded-lg p-0.5 border border-slate-700">
              <button
                onClick={() => {
                  setFitWidth(false);
                  setScale((s) => Math.max(0.6, Math.round((s - 0.2) * 10) / 10));
                }}
                disabled={loading}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="px-2 text-xs font-mono text-slate-300">
                {fitWidth ? 'Fit' : `${Math.round(scale * 100)}%`}
              </span>
              <button
                onClick={() => {
                  setFitWidth(false);
                  setScale((s) => Math.min(2.5, Math.round((s + 0.2) * 10) / 10));
                }}
                disabled={loading}
                className="p-1.5 rounded hover:bg-slate-700 text-slate-300 transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={() => setFitWidth(!fitWidth)}
                className={`p-1.5 rounded transition-colors ${
                  fitWidth ? 'bg-indigo-600 text-white' : 'hover:bg-slate-700 text-slate-300'
                }`}
                title="Fit to Width"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* In-Document Search */}
            <div className="hidden md:flex items-center bg-slate-800/80 rounded-lg px-2 py-1 border border-slate-700 text-xs">
              <Search className="w-3.5 h-3.5 text-slate-400 mr-1.5 shrink-0" />
              <input
                type="text"
                placeholder="Find in PDF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-24 lg:w-32 bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none"
              />
              {searchResults.length > 0 && (
                <span className="text-[10px] font-mono text-indigo-400 ml-1">
                  {currentSearchIdx + 1}/{searchResults.length}
                </span>
              )}
              {searchTerm && (
                <div className="flex items-center gap-0.5 ml-1">
                  <button
                    onClick={handlePrevSearchMatch}
                    className="p-0.5 hover:text-white text-slate-400"
                    title="Previous match"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <button
                    onClick={handleNextSearchMatch}
                    className="p-0.5 hover:text-white text-slate-400"
                    title="Next match"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions: Copy Text, Download, Print, Close */}
            <div className="flex items-center gap-1">
              {pageText && (
                <button
                  onClick={handleCopyPageText}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                  title="Copy Page Text"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={handleDownload}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Download PDF"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                className="hidden sm:inline-flex p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                title="Print PDF"
              >
                <Printer className="w-4 h-4" />
              </button>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white border border-slate-700 transition-colors ml-1"
                title="Close PDF Reader"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Quick Ask Professor Nova Action Ribbon */}
        {onAskNova && (
          <div className="flex items-center gap-2 px-4 py-2 bg-indigo-950/40 border-b border-indigo-900/30 overflow-x-auto scrollbar-none shrink-0">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Ask Professor Nova:
            </span>
            <button
              onClick={() => handleQuickAsk('rates')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 whitespace-nowrap transition-colors"
            >
              💰 Extract Rates & Amounts
            </button>
            <button
              onClick={() => handleQuickAsk('explain_page')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 whitespace-nowrap transition-colors"
            >
              📄 Explain Page {currentPage}
            </button>
            <button
              onClick={() => handleQuickAsk('summarize')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 whitespace-nowrap transition-colors"
            >
              ⚡ Summarise Document
            </button>
            <button
              onClick={() => handleQuickAsk('notes')}
              className="px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-900/60 hover:bg-indigo-800/80 text-indigo-200 border border-indigo-700/50 whitespace-nowrap transition-colors"
            >
              📚 Study Notes
            </button>
          </div>
        )}

        {/* PDF Canvas Viewport Area */}
        <div
          ref={containerRef}
          className="flex-1 overflow-auto bg-slate-950/90 p-4 flex items-center justify-center relative scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
        >
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-sm font-medium">Rendering PDF via Mozilla PDF.js...</p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center max-w-md p-6 bg-rose-950/30 border border-rose-800/50 rounded-xl text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <h4 className="text-sm font-semibold text-rose-300 mb-1">Failed to Render PDF</h4>
              <p className="text-xs text-rose-200/80 mb-4">{error}</p>
              <button
                onClick={handleDownload}
                className="px-4 py-2 text-xs font-medium bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Download PDF File Directly
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            className={`shadow-2xl rounded-sm transition-opacity duration-200 max-w-full ${
              loading || error ? 'opacity-0 absolute pointer-events-none' : 'opacity-100'
            }`}
          />
        </div>

        {/* Footer info bar */}
        <div className="flex items-center justify-between px-4 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 shrink-0">
          <div>
            <span>Viewing: </span>
            <span className="text-slate-200 font-mono">
              Page {currentPage} of {numPages || 1}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span>Mozilla PDF.js (Free & Open Source)</span>
            <span>•</span>
            <button
              onClick={onClose}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Return to Chat
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
