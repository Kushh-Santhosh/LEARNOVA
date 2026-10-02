import React, { useState, useEffect } from 'react';
import {
  DocumentMeta,
  ConceptNode,
  RelationshipEdge,
  LearnerProfile,
  LearnerAnalytics,
} from './types';
import { api } from './api';
import { Navbar } from './components/Navbar';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingScreen } from './screens/LandingScreen';
import { ClassroomScreen } from './screens/ClassroomScreen';
import { KnowledgeGraphScreen } from './screens/KnowledgeGraphScreen';
import { DocumentHubScreen } from './screens/DocumentHubScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('classroom');
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('doc_networks_osi_101');
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [relationships, setRelationships] = useState<RelationshipEdge[]>([]);
  const [activeConcept, setActiveConcept] = useState<ConceptNode | null>(null);

  const [profile, setProfile] = useState<LearnerProfile>({
    name: 'Alex Mercer',
    education_level: 'Undergraduate',
    learning_level: 'Beginner',
    preferred_style: 'Examples & Visuals',
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);

  // Initial Load: Documents & Knowledge Graph & Analytics
  useEffect(() => {
    loadDocuments();
    loadGraph(activeDocId);
    loadAnalytics();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0 && !activeDocId) {
        setActiveDocId(docs[0].id);
      }
    } catch (e) {
      console.error('Failed to load documents', e);
    }
  };

  const loadGraph = async (docId: string) => {
    try {
      const graph = await api.getKnowledgeGraph(docId);
      setConcepts(graph.concepts || []);
      setRelationships(graph.relationships || []);
      if (graph.concepts && graph.concepts.length > 0) {
        setActiveConcept(graph.concepts[0]);
      }
    } catch (e) {
      console.error('Failed to load graph', e);
    }
  };

  const loadAnalytics = async () => {
    try {
      const prog = await api.getLearnerProgress();
      setAnalytics(prog);
      if (prog.learner_profile) {
        setProfile(prog.learner_profile);
      }
    } catch (e) {
      console.error('Failed to load analytics', e);
    }
  };

  const handleSelectDocument = (docId: string) => {
    setActiveDocId(docId);
    loadGraph(docId);
  };

  const handleUploadFile = async (file: File) => {
    const res = await api.uploadDocument(file);
    await loadDocuments();
    handleSelectDocument(res.document.id);
  };

  const handleSaveProfile = async (newProfile: LearnerProfile) => {
    setProfile(newProfile);
    await api.updateProfile(newProfile);
    loadAnalytics();
  };

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      {/* Navigation Header */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profile={profile}
        onOpenProfile={() => setIsOnboardingOpen(true)}
      />

      {/* Onboarding Preferences Modal */}
      <OnboardingModal
        initialProfile={profile}
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Screen Router */}
      <main className="flex-1 flex flex-col">
        {activeTab === 'landing' && (
          <LandingScreen
            onStartLearning={() => setActiveTab('classroom')}
            onExploreGraph={() => setActiveTab('knowledge_graph')}
            onUploadDoc={() => setActiveTab('documents')}
          />
        )}

        {activeTab === 'classroom' && (
          <ClassroomScreen
            activeDoc={activeDoc}
            concepts={concepts}
            activeConcept={activeConcept}
            onSelectConcept={(concept) => setActiveConcept(concept)}
            onExploreGraph={() => setActiveTab('knowledge_graph')}
          />
        )}

        {activeTab === 'knowledge_graph' && (
          <KnowledgeGraphScreen
            document={activeDoc}
            concepts={concepts}
            relationships={relationships}
            activeConceptId={activeConcept?.id || 'c_transport_layer'}
            onSelectConcept={(concept) => setActiveConcept(concept)}
            onTeachConcept={(concept) => {
              setActiveConcept(concept);
              setActiveTab('classroom');
            }}
            onQuizConcept={(concept) => {
              setActiveConcept(concept);
              setActiveTab('classroom');
            }}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentHubScreen
            documents={documents}
            activeDocId={activeDocId}
            onSelectDocument={handleSelectDocument}
            onUploadFile={handleUploadFile}
            onEnterClassroom={() => setActiveTab('classroom')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsScreen
            analytics={analytics}
            onEnterClassroom={() => setActiveTab('classroom')}
          />
        )}
      </main>
    </div>
  );
}

export default App;
