import React from 'react';
import {
  Sparkles,
  Plus,
  BookOpen,
  Network,
  BarChart3,
  Calendar,
  Settings,
  ChevronLeft,
  ChevronRight,
  FolderClosed,
  Languages,
  UserCheck
} from 'lucide-react';
import { LearnerProfile } from '../types';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  profile: LearnerProfile;
  onOpenProfile: () => void;
  activeCourseName: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  profile,
  onOpenProfile,
  activeCourseName,
}) => {
  const navItems = [
    { id: 'classroom', label: 'Current Lesson', icon: BookOpen },
    { id: 'knowledge_graph', label: 'Knowledge Graph', icon: Network },
    { id: 'documents', label: 'Study Documents', icon: FolderClosed },
    { id: 'analytics', label: 'Mastery & Progress', icon: BarChart3 },
    { id: 'revision', label: 'Revision Plan', icon: Calendar },
  ];

  return (
    <aside
      className={`bg-slate-900 text-slate-300 flex flex-col justify-between transition-all duration-300 border-r border-slate-800 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Top Brand & New Lesson */}
      <div>
        {/* Brand Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-800/80">
          {!collapsed ? (
            <div
              onClick={() => setActiveTab('landing')}
              className="flex items-center space-x-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs group-hover:scale-105 transition-transform">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-white tracking-tight">LEARNOVA</span>
                <span className="block text-[10px] text-slate-400 font-medium tracking-wide">
                  Adaptive AI Classroom
                </span>
              </div>
            </div>
          ) : (
            <div
              onClick={() => setActiveTab('landing')}
              className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
            </div>
          )}

          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* New Lesson CTA */}
        <div className="p-3">
          <button
            onClick={() => setActiveTab('classroom')}
            className={`w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-all shadow-xs ${
              collapsed ? 'px-0' : ''
            }`}
            title="Start New Lesson"
          >
            <Plus className="w-4 h-4" />
            {!collapsed && <span>New Lesson</span>}
          </button>
        </div>

        {/* Active Project / Course Pill */}
        {!collapsed && (
          <div className="px-4 py-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1">
              Active Course
            </span>
            <div className="p-2.5 rounded-xl bg-slate-800/70 border border-slate-700/60 text-xs">
              <div className="font-bold text-slate-200 truncate">{activeCourseName}</div>
              <div className="text-[10px] text-blue-400 mt-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                <span>Live Curriculum</span>
              </div>
            </div>
          </div>
        )}

        {/* Main Navigation Links */}
        <nav className="px-2 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-slate-800 text-white border-l-3 border-blue-500'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile & Settings */}
      <div className="p-3 border-t border-slate-800">
        <button
          onClick={onOpenProfile}
          className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left hover:bg-slate-800/80 transition-colors ${
            collapsed ? 'justify-center p-1' : ''
          }`}
          title="Learner Preferences & Language"
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
            {profile.name ? profile.name[0].toUpperCase() : 'A'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-white truncate flex items-center justify-between">
                <span>{profile.name}</span>
                <Settings className="w-3 h-3 text-slate-400" />
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {profile.learning_level} • {profile.language?.toUpperCase() || 'EN'}
              </div>
            </div>
          )}
        </button>
      </div>
    </aside>
  );
};
