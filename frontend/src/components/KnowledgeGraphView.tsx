import React, { useState } from 'react';
import { ConceptNode, RelationshipEdge } from '../types';
import { Network, Sparkles, BookOpen, HelpCircle, CheckCircle2, Bookmark, ArrowRight, Check } from 'lucide-react';

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

  const width = 760;
  const height = 440;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = 160;

  const nodePositions = concepts.reduce((acc, c, idx) => {
    if (idx === 0) {
      acc[c.id] = { x: centerX, y: centerY - 15 };
    } else {
      const angle = ((idx - 1) / Math.max(1, concepts.length - 1)) * 2 * Math.PI - Math.PI / 2;
      acc[c.id] = {
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * (radius * 0.76),
      };
    }
    return acc;
  }, {} as Record<string, { x: number; y: number }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'mastered':
        return { fill: '#f0fdf4', stroke: '#22c55e', text: '#15803d', badge: 'bg-emerald-50 text-emerald-700' };
      case 'improving':
        return { fill: '#f8fafc', stroke: '#0284c7', text: '#0369a1', badge: 'bg-sky-50 text-sky-700' };
      case 'needs_review':
        return { fill: '#fffbeb', stroke: '#f59e0b', text: '#b45309', badge: 'bg-amber-50 text-amber-700' };
      default:
        return { fill: '#f8fafc', stroke: '#94a3b8', text: '#475569', badge: 'bg-slate-100 text-slate-700' };
    }
  };

  const handleNodeClick = (concept: ConceptNode) => {
    setSelectedConcept(concept);
    onSelectConcept(concept);
  };

  // Find prerequisites and related concepts
  const relatedEdges = relationships.filter(
    (r) => r.source === selectedConcept?.id || r.target === selectedConcept?.id
  );
  const relatedConceptNames = relatedEdges.map((r) => {
    const otherId = r.source === selectedConcept?.id ? r.target : r.source;
    return concepts.find((c) => c.id === otherId)?.name || otherId;
  });

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col lg:flex-row select-none">
      {/* SVG Canvas Area */}
      <div className="flex-1 relative bg-slate-50/40 p-4 min-h-[460px] flex items-center justify-center overflow-auto">
        <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-white/95 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-slate-200 text-xs font-medium text-slate-700 shadow-2xs">
          <Network className="w-3.5 h-3.5 text-slate-900" />
          <span>Knowledge Graph</span>
        </div>

        <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-[760px] h-[420px]">
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#cbd5e1" />
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
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
          </defs>

          {/* Relationship Edges */}
          {relationships.map((rel, i) => {
            const p1 = nodePositions[rel.source];
            const p2 = nodePositions[rel.target];
            if (!p1 || !p2) return null;

            const isRelated =
              selectedConcept &&
              (rel.source === selectedConcept.id || rel.target === selectedConcept.id);

            return (
              <g key={i}>
                <line
                  x1={p1.x}
                  y1={p1.y}
                  x2={p2.x}
                  y2={p2.y}
                  stroke={isRelated ? '#0284c7' : '#e2e8f0'}
                  strokeWidth={isRelated ? 2 : 1.2}
                  strokeDasharray={rel.type === 'part_of' ? '3 3' : undefined}
                  markerEnd={
                    rel.type === 'depends_on' ? 'url(#arrow-depends_on)' : 'url(#arrow-part_of)'
                  }
                  className="transition-colors duration-200"
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
                {/* Focus Ring */}
                {isSelected && (
                  <circle r="34" fill="#0284c7" opacity="0.12" className="animate-pulse" />
                )}

                <circle
                  r={isSelected ? 26 : 22}
                  fill={colors.fill}
                  stroke={isSelected ? '#0f172a' : colors.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                  className="transition-all duration-200 group-hover:scale-105 shadow-xs"
                />

                {/* Score percentage inside circle */}
                <text
                  textAnchor="middle"
                  dy="4"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="monospace"
                  fill={colors.text}
                >
                  {Math.round(concept.mastery_score * 100)}%
                </text>

                {/* Clean Readable Concept Name Below Node */}
                <text
                  textAnchor="middle"
                  dy="38"
                  fontSize="11"
                  fontWeight={isSelected ? '600' : '500'}
                  fill={isSelected ? '#0f172a' : '#475569'}
                  className="select-none transition-colors"
                >
                  {concept.name.length > 22 ? `${concept.name.slice(0, 20)}...` : concept.name}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Legend */}
        <div className="absolute bottom-3 left-4 flex flex-wrap gap-3 text-[11px] text-slate-500 bg-white/90 px-3 py-1.5 rounded-xl border border-slate-200">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Mastered</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500" /> Improving</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-500" /> Needs Review</span>
        </div>
      </div>

      {/* Right Concept Detail Inspector */}
      <div className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 p-6 bg-white flex flex-col justify-between">
        {selectedConcept ? (
          <div>
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-semibold tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {selectedConcept.category}
                </span>
                <h3 className="text-base font-semibold text-slate-900 mt-2">
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

            {/* Simple Explanation */}
            <p className="text-xs text-slate-600 mt-3 leading-relaxed font-normal">
              {selectedConcept.summary}
            </p>

            {/* Why It Matters */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                Why it matters
              </span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Fundamental building block for reliable network communications and socket programming.
              </p>
            </div>

            {/* Related concepts */}
            {relatedConceptNames.length > 0 && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-1">
                  Connected Concepts
                </span>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  {relatedConceptNames.map((name, i) => (
                    <span key={i} className="px-2 py-0.5 bg-slate-100 rounded-lg text-[10px] text-slate-700">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source & Mastery */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>Source: Page {selectedConcept.page_number || 1}</span>
              <span className="font-mono font-semibold text-slate-800">
                {Math.round(selectedConcept.mastery_score * 100)}% Mastery
              </span>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-400">Select a concept on the graph to inspect details.</div>
        )}

        {/* Action Buttons */}
        {selectedConcept && (
          <div className="mt-6 pt-4 border-t border-slate-100 space-y-2">
            <button
              onClick={() => onTeachConcept && onTeachConcept(selectedConcept)}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              <span>Teach Me This Concept</span>
            </button>
            <button
              onClick={() => onQuizConcept && onQuizConcept(selectedConcept)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-500" />
              <span>Quiz Me On This</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
