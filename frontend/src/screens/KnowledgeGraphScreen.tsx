import React from 'react';
import { ConceptNode, RelationshipEdge, DocumentMeta } from '../types';
import { KnowledgeGraphView } from '../components/KnowledgeGraphView';
import { Network, Sparkles, BookOpen, Layers } from 'lucide-react';

interface KnowledgeGraphScreenProps {
  document: DocumentMeta | null;
  concepts: ConceptNode[];
  relationships: RelationshipEdge[];
  activeConceptId: string;
  onSelectConcept: (concept: ConceptNode) => void;
  onTeachConcept: (concept: ConceptNode) => void;
  onQuizConcept: (concept: ConceptNode) => void;
}

export const KnowledgeGraphScreen: React.FC<KnowledgeGraphScreenProps> = ({
  document,
  concepts,
  relationships,
  activeConceptId,
  onSelectConcept,
  onTeachConcept,
  onQuizConcept,
}) => {
  const majorTopicsCount = concepts.filter((c) => c.category.includes('Topic') || c.category.includes('Model')).length;

  return (
    <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
      {/* Title & Material Summary Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
            Curriculum Knowledge Architecture
          </span>
          <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
            {document?.title || 'Computer Networks & OSI Model'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Visual map of extracted concepts and their dependencies. Click any node to inspect definitions.
          </p>
        </div>

        {/* Counts summary banner */}
        <div className="flex items-center space-x-3 bg-white p-2.5 px-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
          <div className="text-center">
            <span className="block font-bold text-blue-600 text-sm">{concepts.length}</span>
            <span className="text-[10px] text-slate-400">Concepts</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <span className="block font-bold text-slate-800 text-sm">{majorTopicsCount || 3}</span>
            <span className="text-[10px] text-slate-400">Major Topics</span>
          </div>
          <div className="h-6 w-px bg-slate-200" />
          <div className="text-center">
            <span className="block font-bold text-slate-800 text-sm">{relationships.length}</span>
            <span className="text-[10px] text-slate-400">Relationships</span>
          </div>
        </div>
      </div>

      {/* Main Graph Component */}
      <KnowledgeGraphView
        concepts={concepts}
        relationships={relationships}
        activeConceptId={activeConceptId}
        onSelectConcept={onSelectConcept}
        onTeachConcept={onTeachConcept}
        onQuizConcept={onQuizConcept}
      />
    </div>
  );
};
