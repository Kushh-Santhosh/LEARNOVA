import React, { useState } from 'react';
import { ConceptNode, RelationshipEdge } from '../types';
import { Network, Sparkles, BookOpen, HelpCircle, CheckCircle2, AlertCircle, ArrowUpRight } from 'lucide-react';

interface KnowledgeGraphViewProps {
  concepts: ConceptNode[];
  relationships: RelationshipEdge[];
  activeConceptId?: string;
  onSelectConcept: (concept: ConceptNode) => void;
  onTeachConcept?: (concept: ConceptNode) => void;
  onQuizConcept?: (concept: ConceptNode) => void;
}

export const KnowledgeGraphView: React.FC<KnowledgeGraphViewProps> = ({
  concepts,
  relationships,
  activeConceptId,
  onSelectConcept,
  onTeachConcept,
  onQuizConcept,
}) => {
  const [selectedConcept, setSelectedConcept] = useState<ConceptNode | null>(
    concepts.find((c) => c.id === activeConceptId) || concepts[0] || null
  );

  // Simple clean circular/hierarchical positioning for nodes
  const width = 760;
  const height = 440;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 170;

  const nodePositions = concepts.reduce((acc, c, idx) => {
    // If first concept, place at center; others arranged radially
    if (idx === 0) {
      acc[c.id] = { x: centerX, y: centerY - 20 };
    } else {
      const angle = ((idx - 1) / Math.max(1, concepts.length - 1)) * 2 * Math.PI - Math.PI / 2;
      acc[c.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.78),
      };
    }
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered': return { fill: '#ecfdf5', stroke: '#10b981', text: '#065f46', badge: 'bg-emerald-100 text-emerald-800' };
      case 'improving': return { fill: '#eff6ff', stroke: '#2563eb', text: '#1e40af', badge: 'bg-blue-100 text-blue-800' };
      case 'needs_review': return { fill: '#fffbeb', stroke: '#f59e0b', text: '#92400e', badge: 'bg-amber-100 text-amber-800' };
      default: return { fill: '#f8fafc', stroke: '#94a3b8', text: '#475569', badge: 'bg-slate-100 text-slate-700' };
    }
  };

  const handleNodeClick = (concept: ConceptNode) => {
    setSelectedConcept(concept);
    onSelectConcept(concept);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row">
      {/* SVG Canvas Area */}
      <div className="flex-1 relative bg-slate-50/50 p-4 min-h-[440px] flex items-center justify-center overflow-auto">
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded-full border border-slate-200 text-xs font-semibold text-slate-700">
          <Network className="w-3.5 h-3.5 text-blue-600" />
          <span>Interactive Concept Knowledge Graph</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[760px] h-[400px]">
          <defs>
            <marker
              id="arrow-part_of"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
            <marker
              id="arrow-depends_on"
              viewBox="0 0 10 10"
              refX="22"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#2563eb" />
            </marker>
          </defs>

          {/* Edges */}
          {relationships.map((rel, i) => {
            const p1 = nodePositions[rel.source];
            const p2 = nodePositions[rel.target];
            if (!p1 || !p2) return null;

            const isSelectedEdge =
              selectedConcept && (rel.source === selectedConcept.id || rel.target === selectedConcept.id);

            return (
              <g key={i}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isSelectedEdge ? '#2563eb' : '#cbd5e1'}
                  strokeWidth={isSelectedEdge ? 2.5 : 1.2}
                  strokeDasharray={rel.type === 'depends_on' ? '4 3' : 'none'}
                  markerEnd={`url(#arrow-${rel.type})`}
                  className="transition-all duration-300"
                />
              </g>
            );
          })}

          {/* Concept Nodes */}
          {concepts.map((concept) => {
            const pos = nodePositions[concept.id];
            if (!pos) return null;
            const colors = getStatusColor(concept.status);
            const isSelected = selectedConcept?.id === concept.id;

            return (
              <g
                key={concept.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleNodeClick(concept)}
                className="cursor-pointer group"
              >
                {/* Outer focus halo */}
                {isSelected && (
                  <circle r="36" fill="#2563eb" opacity="0.15" className="animate-pulse" />
                )}

                <circle
                  r={isSelected ? 28 : 24}
                  fill={colors.fill}
                  stroke={isSelected ? '#2563eb' : colors.stroke}
                  strokeWidth={isSelected ? 3 : 1.8}
                  className="transition-all duration-200 group-hover:scale-110 filter drop-shadow-xs"
                />

                {/* Node icon or glyph */}
                <text
                  textAnchor="middle"
                  dy="-4"
                  fontSize="10"
                  fontWeight="bold"
                  fill={colors.text}
                >
                  {concept.category.slice(0, 3).toUpperCase()}
                </text>
                <text
                  textAnchor="middle"
                  dy="9"
                  fontSize="8"
                  fontWeight="600"
                  fill="#64748b"
                >
                  {Math.round(concept.mastery_score * 100)}%
                </text>

                {/* Node Label Below */}
                <text
                  textAnchor="middle"
                  dy="42"
                  fontSize="11"
                  fontWeight="600"
                  fill={isSelected ? '#0f172a' : '#334155'}
                  className="select-none transition-colors"
                >
                  {concept.name.length > 20 ? `${concept.name.slice(0, 18)}...` : concept.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-2 text-[10px] text-slate-500 bg-white/90 p-2 rounded-lg border border-slate-200">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Mastered</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" /> Improving</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Needs Review</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Unseen</span>
        </div>
      </div>

      {/* Concept Detail Inspector Drawer */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 p-5 bg-white flex flex-col justify-between">
        {selectedConcept ? (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {selectedConcept.category}
                </span>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {selectedConcept.name}
                </h3>
              </div>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                  getStatusColor(selectedConcept.status).badge
                }`}
              >
                {selectedConcept.status.replace('_', ' ')}
              </span>
            </div>

            <p className="text-xs text-slate-600 mt-3 leading-relaxed">
              {selectedConcept.summary}
            </p>

            <div className="mt-4 pt-3 border-t border-slate-100 space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Curriculum Source:</span>
                <span className="font-medium text-slate-700">Page {selectedConcept.page_number}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Calculated Mastery:</span>
                <span className="font-bold text-blue-600">
                  {Math.round(selectedConcept.mastery_score * 100)}%
                </span>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-5 space-y-2">
              {onTeachConcept && (
                <button
                  onClick={() => onTeachConcept(selectedConcept)}
                  className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Teach Me This Concept
                </button>
              )}
              {onQuizConcept && (
                <button
                  onClick={() => onQuizConcept(selectedConcept)}
                  className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Quiz Me on This
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-slate-400 py-12">
            <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-xs">Click any concept node to inspect definitions & relationships.</p>
          </div>
        )}
      </div>
    </div>
  );
};
