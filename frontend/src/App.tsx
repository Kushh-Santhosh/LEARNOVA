import React, { useState, useEffect } from 'react';
import {
  DocumentMeta,
  ConceptNode,
  RelationshipEdge,
  LearnerProfile,
  LearnerAnalytics,
  ScreenGuidanceResponse,
  ScreenVerifyResponse,
} from './types';
import { api } from './api';
import { Sidebar } from './components/Sidebar';
import { OnboardingModal } from './components/OnboardingModal';
import { DeveloperDiagnosticsModal } from './components/diagnostics/DeveloperDiagnosticsModal';
import { AvatarBenchmarkModal } from './components/diagnostics/AvatarBenchmarkModal';
import { FloatingNovaCompanion } from './components/guide/FloatingNovaCompanion';
import { NovaGuideOverlay } from './components/guide/NovaGuideOverlay';
import { HomeScreen } from './screens/HomeScreen';
import { ClassroomWorkspace } from './screens/ClassroomWorkspace';
import { DocumentHubScreen } from './screens/DocumentHubScreen';
import { AnalyticsScreen } from './screens/AnalyticsScreen';
import { KnowledgeGraphView } from './components/KnowledgeGraphView';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [isBenchmarkOpen, setIsBenchmarkOpen] = useState<boolean>(false);


  const [documents, setDocuments] = useState<DocumentMeta[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
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
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [analytics, setAnalytics] = useState<LearnerAnalytics | null>(null);

  // Screen-Aware Professor Nova Guidance State
  const [activeGuidance, setActiveGuidance] = useState<ScreenGuidanceResponse | null>(null);

  const handleStartWorkflow = (guidance: ScreenGuidanceResponse) => {
    setActiveGuidance(guidance);
    // Smooth navigation if the target element points to a different tab
    if (guidance.target_element?.guide_id === 'nav-documents' || guidance.target_element?.guide_id === 'btn-upload-dropzone') {
      setActiveTab('documents');
    } else if (guidance.target_element?.guide_id === 'nav-knowledge') {
      setActiveTab('knowledge_graph');
    } else if (guidance.target_element?.guide_id === 'nav-progress') {
      setActiveTab('progress');
    } else if (guidance.target_element?.guide_id === 'nav-classroom' || guidance.target_element?.guide_id?.startsWith('btn-classroom')) {
      setActiveTab('classroom');
    }
  };

  const handleStopGuiding = () => {
    setActiveGuidance(null);
  };

  const handleVerifyStep = async (): Promise<ScreenVerifyResponse | null> => {
    if (!activeGuidance) return null;

    try {
      const res = await api.verifyScreenStep({
        workflow: activeGuidance.workflow,
        step_number: activeGuidance.step_number,
        current_route: activeTab,
      });

      if (res.status === 'STEP_COMPLETED' && res.next_step) {
        const nextGuidance = await api.analyzeScreen({
          goal: activeGuidance.workflow,
          mode: activeGuidance.mode,
          current_route: activeTab,
          step_index: res.next_step,
          active_document_id: activeDocId,
        });

        setTimeout(() => {
          if (nextGuidance && nextGuidance.target_element) {
            setActiveGuidance(nextGuidance);
            if (nextGuidance.target_element.guide_id === 'nav-documents' || nextGuidance.target_element.guide_id === 'btn-upload-dropzone') {
              setActiveTab('documents');
            } else if (nextGuidance.target_element.guide_id === 'nav-classroom' || nextGuidance.target_element.guide_id?.startsWith('btn-classroom')) {
              setActiveTab('classroom');
            } else if (nextGuidance.target_element.guide_id === 'nav-knowledge') {
              setActiveTab('knowledge_graph');
            } else if (nextGuidance.target_element.guide_id === 'nav-progress') {
              setActiveTab('progress');
            }
          }
        }, 700);
      } else if (res.status === 'COMPLETED') {
        setTimeout(() => {
          setActiveGuidance(null);
        }, 1200);
      }
      return res;
    } catch (e) {
      console.error('Verify step failed', e);
      return null;
    }
  };

  useEffect(() => {
    loadDocuments();
    loadAnalytics();
  }, []);

  // Auto-advance guide state when learner performs expected navigation action
  useEffect(() => {
    if (!activeGuidance) return;
    if (activeGuidance.workflow === 'upload_document' && activeGuidance.step_number === 1 && activeTab === 'documents') {
      api.analyzeScreen({
        goal: activeGuidance.workflow,
        mode: activeGuidance.mode,
        current_route: 'documents',
        step_index: 2,
        active_document_id: activeDocId,
      }).then((next) => {
        if (next && next.target_element) {
          setActiveGuidance(next);
        }
      });
    } else if (activeGuidance.workflow === 'explore_knowledge_graph' && activeGuidance.step_number === 1 && activeTab === 'knowledge_graph') {
      api.analyzeScreen({
        goal: activeGuidance.workflow,
        mode: activeGuidance.mode,
        current_route: 'knowledge_graph',
        step_index: 2,
        active_document_id: activeDocId,
      }).then((next) => {
        if (next && next.target_element) {
          setActiveGuidance(next);
        }
      });
    }
  }, [activeTab]);

  const loadDocuments = async () => {
    try {
      const docs = await api.getDocuments();
      setDocuments(docs);
      if (docs.length > 0) {
        const firstId = docs[0].id;
        setActiveDocId(firstId);
        loadGraph(firstId);
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

  const activeDoc = documents.find((d) => d.id === activeDocId) || null;

  return (
    <div className="min-h-screen bg-[#fafaf9] flex font-sans text-slate-900 overflow-hidden">
      {/* Calm, Minimal Sidebar with Mobile Drawer Support */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        profile={profile}
        onOpenProfile={() => setIsPreferencesOpen(true)}
        onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        onOpenBenchmark={() => setIsBenchmarkOpen(true)}
        activeCourseName={activeDoc?.title || 'No course selected'}
        isMobileOpen={isMobileNavOpen}
        onCloseMobile={() => setIsMobileNavOpen(false)}
        onNewLesson={() => {
          setActiveDocId(null);
          setActiveConcept(null);
          setActiveTab('classroom');
        }}
      />

      {/* Learning Preferences Modal */}
      <OnboardingModal
        initialProfile={profile}
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onSave={handleSaveProfile}
      />

      {/* Developer Diagnostics Panel & Zero-Dollar Cost Guard */}
      <DeveloperDiagnosticsModal
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
      />

      {/* Avatar Quality & Cost Benchmark Modal */}
      <AvatarBenchmarkModal
        isOpen={isBenchmarkOpen}
        onClose={() => setIsBenchmarkOpen(false)}
      />

      {/* Main Workspace Router */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Tab 1: Calm Home Screen */}
        {activeTab === 'home' && (
          <div className="flex-1 overflow-y-auto">
            <HomeScreen
              profile={profile}
              activeDoc={activeDoc}
              documents={documents}
              concepts={concepts}
              analytics={analytics}
              onContinueLesson={() => setActiveTab('classroom')}
              onOpenCourse={(docId) => {
                handleSelectDocument(docId);
                setActiveTab('classroom');
              }}
              onOpenDocuments={() => setActiveTab('documents')}
              onOpenProgress={() => setActiveTab('progress')}
            />
          </div>
        )}

        {/* Tab 2: Learn (Classroom Workspace) */}
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
            onOpenMobileNav={() => setIsMobileNavOpen(true)}
            onOpenBenchmark={() => setIsBenchmarkOpen(true)}
          />
        )}


        {/* Tab 3: Documents Hub */}
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

        {/* Tab 4: Knowledge Graph */}
        {activeTab === 'knowledge_graph' && (
          <div className="flex-1 overflow-y-auto">
            <div className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
              <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">Curriculum Knowledge Architecture</span>
                  <h2 className="text-2xl font-bold text-slate-900 mt-0.5">{activeDoc?.title || 'Knowledge Graph'}</h2>
                  <p className="text-xs text-slate-500 mt-1">Visual map of extracted concepts and their dependencies. Click any node to inspect definitions.</p>
                </div>
                <div className="flex items-center space-x-3 bg-white p-2.5 px-4 rounded-2xl border border-slate-200 shadow-2xs text-xs">
                  <div className="text-center"><span className="block font-bold text-blue-600 text-sm">{concepts.length}</span><span className="text-[10px] text-slate-400">Concepts</span></div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center"><span className="block font-bold text-slate-800 text-sm">{concepts.filter(c => c.category.includes('Topic') || c.category.includes('Model')).length || 3}</span><span className="text-[10px] text-slate-400">Major Topics</span></div>
                  <div className="h-6 w-px bg-slate-200" />
                  <div className="text-center"><span className="block font-bold text-slate-800 text-sm">{relationships.length}</span><span className="text-[10px] text-slate-400">Relationships</span></div>
                </div>
              </div>
              <KnowledgeGraphView
                concepts={concepts}
                relationships={relationships}
                activeConceptId={activeConcept?.id || 'c_transport_layer'}
                onSelectConcept={setActiveConcept}
                onTeachConcept={(concept) => { setActiveConcept(concept); setActiveTab('classroom'); }}
                onQuizConcept={(concept) => { setActiveConcept(concept); setActiveTab('classroom'); }}
              />
            </div>
          </div>
        )}

        {/* Tab 5: Consolidated Progress & Revision */}
        {(activeTab === 'progress' || activeTab === 'analytics' || activeTab === 'revision') && (
          <div className="flex-1 overflow-y-auto">
            <AnalyticsScreen
              analytics={analytics}
              onEnterClassroom={() => setActiveTab('classroom')}
            />
          </div>
        )}
      </main>

      {/* Floating Nova Screen Companion */}
      <FloatingNovaCompanion
        activeTab={activeTab}
        activeDocId={activeDocId ?? ''}
        activeConceptName={activeConcept?.name}
        onStartWorkflow={handleStartWorkflow}
        isGuidingActive={!!activeGuidance}
        activeWorkflowName={activeGuidance?.workflow}
        onStopGuiding={handleStopGuiding}
      />

      {/* Screen Guide Highlight Overlay */}
      {activeGuidance && (
        <NovaGuideOverlay
          workflowName={activeGuidance.workflow.replace(/_/g, ' ').toUpperCase()}
          stepNumber={activeGuidance.step_number}
          totalSteps={activeGuidance.total_steps}
          targetElement={activeGuidance.target_element}
          recommendedAction={activeGuidance.recommended_action}
          spokenText={activeGuidance.spoken_text}
          onVerifyStep={handleVerifyStep}
          onDismiss={handleStopGuiding}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      )}
    </div>
  );
}

export default App;
