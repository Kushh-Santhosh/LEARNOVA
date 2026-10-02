import React from 'react';
import { Citation } from '../types';
import { Bookmark, FileText, CheckCircle } from 'lucide-react';

interface SourceCitationPanelProps {
  citations: Citation[];
}

export const SourceCitationPanel: React.FC<SourceCitationPanelProps> = ({ citations }) => {
  if (!citations || citations.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Bookmark className="w-3.5 h-3.5 text-blue-600" />
          <span>Grounded Source Evidence</span>
        </h4>
        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
          <CheckCircle className="w-3 h-3 text-emerald-600" />
          Verified Citations
        </span>
      </div>

      <div className="space-y-2.5">
        {citations.map((cite, idx) => (
          <div
            key={idx}
            className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-100 text-xs transition-colors hover:bg-blue-50/30"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
              <span className="truncate max-w-[170px]">{cite.section}</span>
              <span className="px-1.5 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-[10px]">
                Page {cite.page}
              </span>
            </div>
            <p className="text-slate-500 text-[11px] mt-1 italic leading-relaxed">
              "{cite.excerpt}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
