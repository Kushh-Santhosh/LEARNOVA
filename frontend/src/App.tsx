import React, { useState, useEffect } from 'react';
import {
  DocumentMeta,
  ConceptNode,
  RelationshipEdge,
  LearnerProfile,
  LearnerAnalytics,
} from './types';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { OnboardingModal } from './components/OnboardingModal';
import { LandingScreen } from './screens/LandingScreen';
import { ClassroomWorkspace } from './screens/ClassroomWorkspace';
import { KnowledgeGraphScreen } from './screens/KnowledgeGraphScreen';
import { DocumentHubScreen } from './screens/DocumentHubScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('classroom');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [activeDocId, setActiveDocId] = useState<string>('doc_networks_osi_101');
  const [concepts, setConcepts] = useState<ConceptNode[]>([]);
  const [relationships, setRelationships] = useState<RelationshipEdge[]>([]);
  const [activeConcept, setActiveConcept] = useState<ConceptNode | null>(null);

  const [activeLanguage, setActiveLanguage] = useState<string>('en');
  const [profile, setProfile] = useState<LearnerProfile>({
    name: 'Alex Mercer',
    education_level: 'Undergraduate',
    learning_level: 'Beginner',
    preferred_style: 'Examples & Visuals',
    language: 'en',
  });
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);

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
        if (prog.learner_profile.language) {
          setActiveLanguage(prog.learner_profile.language);
        }
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
    if (newProfile.language) {
      setActiveLanguage(newProfile.language);
    }
    await api.updateProfile(newProfile);
    loadAnalytics();
  };

  const activeDoc = documents.find((d) => d.id === activeDocId) || documents[0] || null;

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden">
      {/* Calm Left Sidebar Shell */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        profile={profile}
        onOpenProfile={() => setIsOnboardingOpen(true)}
        activeCourseName={activeDoc?.title || 'Computer Networks & Protocols'}
      />

      {/* Preferences Modal */}
      <OnboardingModal
        initialProfile={profile}
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Main Workspace Router */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {activeTab === 'landing' && (
          <div className="flex-1 overflow-y-auto">
            <LandingScreen
              onStartLearning={() => setActiveTab('classroom')}
              onExploreGraph={() => setActiveTab('knowledge_graph')}
              onUploadDoc={() => setActiveTab('documents')}
            />
          </div>
        )}

        {activeTab === 'classroom' && (
          <ClassroomWorkspace
            activeDoc={activeDoc}
            concepts={concepts}
            activeConcept={activeConcept}
            onSelectConcept={(concept) => setActiveConcept(concept)}
            activeLanguage={activeLanguage}
            onChangeLanguage={(lang) => {
              setActiveLanguage(lang);
              setProfile((p) => ({ ...p, language: lang }));
            }}
          />
        )}

        {activeTab === 'knowledge_graph' && (
          <div className="flex-1 overflow-y-auto">
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
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="flex-1 overflow-y-auto">
            <DocumentHubScreen
              documents={documents}
              activeDocId={activeDocId}
              onSelectDocument={handleSelectDocument}
              onUploadFile={handleUploadFile}
              onEnterClassroom={() => setActiveTab('classroom')}
            />
          </div>
        )}

        {(activeTab === 'analytics' || activeTab === 'revision') && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsScreen
              analytics={analytics}
              onEnterClassroom={() => setActiveTab('classroom')}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
