import React from 'react';
import { VisualPayload } from '../types';
import { Layers, ArrowRight, Table, Clock, GitMerge, FileText } from 'lucide-react';

interface VisualWhiteboardProps {
  visual: VisualPayload | null;
}

export const VisualWhiteboard: React.FC<VisualWhiteboardProps> = ({ visual }) => {
  if (!visual) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-8 text-center text-slate-400 flex flex-col items-center justify-center min-h-[260px]">
        <Layers className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
        <p className="text-sm font-medium">Interactive Whiteboard Ready</p>
        <p className="text-xs text-slate-400 mt-1 max-w-xs">
          Ask for a diagram, comparison, or analogy to see concepts visualized here.
        </p>
      </div>
    );
  }

  const renderContent = () => {
    switch (visual.type) {
      case 'comparison_table': {
        const { headers, rows } = visual.data;
        return (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70">
                  {headers?.map((h: string, i: number) => (
                    <th key={i} className="py-2.5 px-3 font-semibold text-slate-700">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows?.map((row: string[], idx: number) => (
                  <tr key={idx} className="hover:bg-blue-50/40 transition-colors">
                    {row.map((cell: string, cellIdx: number) => (
                      <td
                        key={cellIdx}
                        className={`py-2.5 px-3 ${
                          cellIdx === 0 ? 'font-medium text-slate-800' : 'text-slate-600'
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
        const { nodes, connections } = visual.data;
        return (
          <div className="py-2 flex flex-col items-center space-y-3">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {nodes?.map((node: any, i: number) => (
                <React.Fragment key={node.id}>
                  <div
                    className="px-4 py-3 rounded-xl border border-slate-200 shadow-xs text-center max-w-[200px]"
                    style={{ backgroundColor: node.color || '#f1f5f9' }}
                  >
                    <p className="text-xs font-semibold text-slate-800">{node.label}</p>
                  </div>
                  {i < (nodes.length - 1) && (
                    <div className="flex flex-col items-center">
                      <ArrowRight className="w-4 h-4 text-blue-500" />
                      {connections?.[i]?.label && (
                        <span className="text-[10px] text-slate-500 mt-0.5 max-w-[100px] text-center truncate">
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
        const { events } = visual.data;
        return (
          <div className="space-y-2.5 my-1">
            {events?.map((ev: any, idx: number) => (
              <div key={idx} className="flex items-start space-x-3 text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-100">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {ev.step || idx + 1}
                </span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{ev.label}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                      {ev.sender}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{ev.desc}</p>
                </div>
              </div>
            ))}
          </div>
        );
      }

      case 'process_diagram': {
        const { steps } = visual.data;
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-1">
            {steps?.map((step: any, idx: number) => (
              <div key={idx} className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Step {step.step || idx + 1}</span>
                <h5 className="font-semibold text-xs text-slate-800 mt-1">{step.title}</h5>
                <p className="text-xs text-slate-600 mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        );
      }

      case 'concept_map': {
        const { central, branches } = visual.data;
        return (
          <div className="p-2 flex flex-col items-center space-y-3">
            <div className="px-5 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-xs shadow-sm">
              {central}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full">
              {branches?.map((b: any, idx: number) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div className="font-bold text-slate-800">{b.title}</div>
                  <p className="text-slate-600 mt-1">{b.description}</p>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-4 text-xs text-slate-600 bg-slate-50 rounded-xl">
            {JSON.stringify(visual.data)}
          </div>
        );
    }
  };

  const getIcon = () => {
    switch (visual.type) {
      case 'comparison_table': return <Table className="w-4 h-4 text-blue-600" />;
      case 'flowchart': return <GitMerge className="w-4 h-4 text-blue-600" />;
      case 'timeline': return <Clock className="w-4 h-4 text-blue-600" />;
      default: return <Layers className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-blue-100 shadow-sm p-4 transition-all animate-fadeIn">
      {/* Visual Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            {getIcon()}
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">{visual.title}</h4>
            <span className="text-[10px] text-slate-400 capitalize">{visual.type.replace('_', ' ')} visual representation</span>
          </div>
        </div>

        {visual.source && (
          <div className="flex items-center space-x-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Page {visual.source.page}</span>
          </div>
        )}
      </div>

      {/* Visual Content Body */}
      {renderContent()}
    </div>
  );
};
