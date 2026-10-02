import React, { useState } from 'react';
import { LearningArtifact, Citation } from '../types';
import {
  Layers,
  Table,
  GitMerge,
  Clock,
  Bookmark,
  Maximize2,
  Minimize2,
  BookmarkCheck,
  HelpCircle,
  Sparkles,
  ArrowRight,
  FileText,
  Copy,
  Check
} from 'lucide-react';

interface ArtifactPanelProps {
  artifact: LearningArtifact | null;
  activeCitation: Citation | null;
  onClose: () => void;
  onAskAboutArtifact?: (question: string) => void;
  onQuizMeOnArtifact?: (topic: string) => void;
}

export const ArtifactPanel: React.FC<ArtifactPanelProps> = ({
  artifact,
  activeCitation,
  onClose,
  onAskAboutArtifact,
  onQuizMeOnArtifact,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!artifact && !activeCitation) {
    return null;
  }

  const handleCopy = () => {
    if (artifact) {
      navigator.clipboard.writeText(JSON.stringify(artifact.data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const renderContent = () => {
    if (activeCitation) {
      return (
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 text-xs">
          <div className="flex items-center space-x-2 text-blue-900 font-bold mb-2">
            <Bookmark className="w-4 h-4 text-blue-600" />
            <span>Document Provenance Inspector</span>
          </div>
          <div className="space-y-2">
            <div className="text-slate-500 font-medium">
              Source: <span className="text-slate-800">{activeCitation.source}</span> (Page {activeCitation.page})
            </div>
            <div className="text-slate-500 font-medium">
              Section: <span className="text-slate-800">{activeCitation.section}</span>
            </div>
            <div className="mt-3 p-3 bg-white rounded-xl border border-slate-200 text-slate-700 italic leading-relaxed">
              "{activeCitation.excerpt}"
            </div>
            <div className="mt-3 text-[11px] text-slate-500">
              💡 <em>Professor Nova strictly cites this passage to verify factual accuracy and prevent hallucinations.</em>
            </div>
          </div>
        </div>
      );
    }

    if (!artifact) return null;

    switch (artifact.type) {
      case 'comparison_table': {
        const { headers, rows } = artifact.data;
        return (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80">
                  {headers?.map((h: string, i: number) => (
                    <th key={i} className="py-2.5 px-3.5 font-bold text-slate-800">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {rows?.map((row: string[], idx: number) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    {row.map((cell: string, cellIdx: number) => (
                      <td
                        key={cellIdx}
                        className={`py-2.5 px-3.5 ${
                          cellIdx === 0 ? 'font-semibold text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }

      case 'flowchart': {
        const { nodes, connections } = artifact.data;
        return (
          <div className="py-4 flex flex-col items-center space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {nodes?.map((node: any, i: number) => (
                <React.Fragment key={node.id}>
                  <div
                    className="px-4 py-3 rounded-xl border border-slate-200 shadow-2xs text-center max-w-[210px]"
                    style={{ backgroundColor: node.color || '#f1f5f9' }}
                  >
                    <p className="text-xs font-bold text-slate-800">{node.label}</p>
                  </div>
                  {i < (nodes.length - 1) && (
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                      {connections?.[i]?.label && (
                        <span className="text-[10px] text-slate-500 mt-0.5 text-center max-w-[90px] truncate">
                          {connections[i].label}
                        </span>
                      )}
                    </div>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        );
      }

      case 'timeline': {
        const { events } = artifact.data;
        return (
          <div className="space-y-2.5">
            {events?.map((ev: any, idx: number) => (
              <div key={idx} className="flex items-start space-x-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {ev.step || idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{ev.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                      {ev.sender}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-1 leading-relaxed">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'process_diagram': {
        const { steps } = artifact.data;
        return (
          <div className="grid grid-cols-1 gap-2.5">
            {steps?.map((step: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Step {step.step || idx + 1}</span>
                <h5 className="font-bold text-xs text-slate-900 mt-0.5">{step.title}</h5>
                <p className="text-xs text-slate-600 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        );
      }

      case 'concept_map': {
        const { central, branches } = artifact.data;
        return (
          <div className="flex flex-col items-center space-y-3">
            <div className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs">
              {central}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full">
              {branches?.map((b: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-bold text-slate-900">{b.title}</div>
                  <p className="text-slate-600 mt-1">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-3 text-xs bg-slate-50 rounded-xl text-slate-700 font-mono">
            {JSON.stringify(artifact.data, null, 2)}
          </div>
        );
    }
  };

  return (
    <aside
      className={`border-l border-slate-200 bg-white flex flex-col transition-all duration-300 z-20 shadow-xs ${
        isExpanded ? 'fixed inset-y-0 right-0 w-full sm:w-[680px] shadow-2xl z-50' : 'w-full lg:w-[420px]'
      }`}
    >
      {/* Header */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Learning Artifact
            </span>
            <h4 className="text-xs font-bold text-slate-900 truncate max-w-[220px]">
              {artifact?.title || activeCitation?.section || 'Study Workspace'}
            </h4>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {artifact && (
            <>
              <button
                onClick={() => setIsSaved(!isSaved)}
                className={`p-1.5 rounded-lg transition-colors ${
                  isSaved ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                }`}
                title="Save to Course Notes"
              >
                <BookmarkCheck className="w-4 h-4" />
              </button>
              <button
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Copy artifact data"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors hidden sm:block"
            title={isExpanded ? 'Collapse' : 'Expand width'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close panel"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Artifact Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {renderContent()}

        {/* Source Citation Badge */}
        {artifact?.source && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="flex items-center gap-1.5 font-medium">
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Grounded in Section: {artifact.source.section}</span>
            </span>
            <span className="font-bold text-slate-700">Page {artifact.source.page}</span>
          </div>
        )}
      </div>

      {/* Bottom Actions on this Artifact */}
      {artifact && (
        <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex flex-wrap gap-2 text-xs">
          {onAskAboutArtifact && (
            <button
              onClick={() => onAskAboutArtifact(`Can you explain why the distinction in ${artifact.title} matters?`)}
              className="flex-1 py-1.5 px-2.5 bg-white hover:bg-blue-50 hover:text-blue-700 border border-slate-200 rounded-xl font-medium text-slate-700 flex items-center justify-center gap-1 transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Explain this artifact</span>
            </button>
          )}
          {onQuizMeOnArtifact && (
            <button
              onClick={() => onQuizMeOnArtifact(artifact.title)}
              className="py-1.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium flex items-center justify-center gap-1 transition-colors shadow-2xs"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Quiz me on this</span>
            </button>
          )}
        </div>
      )}
    </aside>
  );
};
