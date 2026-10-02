import React from 'react';
import { Sparkles, Compass, Network, FileText, BarChart3, UserCheck, Settings } from 'lucide-react';
import { LearnerProfile } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  profile: LearnerProfile;
  onOpenProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  profile,
  onOpenProfile,
}) => {
  const navItems = [
    { id: 'classroom', label: 'AI Classroom', icon: Compass },
    { id: 'knowledge_graph', label: 'Knowledge Graph', icon: Network },
    { id: 'documents', label: 'Document Hub', icon: FileText },
    { id: 'analytics', label: 'Mastery Analytics', icon: BarChart3 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div
          onClick={() => setActiveTab('landing')}
          className="flex items-center space-x-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-105">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                LEARNOVA
              </span>
              <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-blue-50 text-blue-700 tracking-wider">
                ADAPTIVE CLASSROOM
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-medium">
              Turn Information Into Understanding
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/70'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Learner Profile Badge */}
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenProfile}
            className="flex items-center space-x-2 p-1.5 pr-3 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left"
            title="Adjust Learner Profile"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-bold">
              {profile.name ? profile.name[0].toUpperCase() : 'A'}
            </div>
            <div className="hidden sm:block">
              <div className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                <span>{profile.name}</span>
                <Settings className="w-3 h-3 text-slate-400" />
              </div>
              <span className="text-[10px] text-blue-600 font-medium">
                {profile.learning_level} • {profile.preferred_style}
              </span>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};
