import React from 'react';
import {
  Sparkles,
  Plus,
  Home,
  BookOpen,
  Network,
  FolderClosed,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  X
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
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  profile,
  onOpenProfile,
  activeCourseName,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  // Calm, minimal navigation items matching required information architecture
  const navItems = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'classroom', label: 'Learn', icon: BookOpen },
    { id: 'knowledge_graph', label: 'Knowledge', icon: Network },
    { id: 'documents', label: 'Documents', icon: FolderClosed },
    { id: 'progress', label: 'Progress', icon: BarChart3 },
  ];

  const handleNavClick = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Drawer Overlay Backdrop */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Shell */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 bg-white text-slate-700 flex flex-col justify-between border-r border-slate-200/90 transition-all duration-200 select-none ${
          // Mobile state
          isMobileOpen ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop collapsed state
          collapsed ? 'lg:w-16' : 'lg:w-56'
        }`}
      >
        <div>
          {/* Brand Header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-slate-100">
            {!collapsed ? (
              <div
                onClick={() => handleNavClick('home')}
                className="flex items-center space-x-2.5 cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-xl bg-slate-950 text-white flex items-center justify-center font-bold text-xs group-hover:bg-blue-600 transition-colors">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                </div>
                <div className="flex flex-col">
                  <span className="font-semibold text-xs tracking-tight text-slate-900">
                    LEARNOVA
                  </span>
                  <span className="text-[9px] text-slate-400 font-normal">
                    AI Classroom
                  </span>
                </div>
              </div>
            ) : (
              <div
                onClick={() => handleNavClick('home')}
                className="w-7 h-7 rounded-xl bg-slate-950 text-white flex items-center justify-center mx-auto cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
              </div>
            )}

            {/* Desktop collapse / Mobile close */}
            <div className="flex items-center">
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCollapsed(!collapsed)}
                className="hidden lg:block p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Lesson Button */}
          <div className="p-3">
            <button
              onClick={() => handleNavClick('classroom')}
              className={`w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer ${
                collapsed ? 'px-0' : ''
              }`}
              title="New Lesson"
            >
              <Plus className="w-3.5 h-3.5" />
              {!collapsed && <span>New Lesson</span>}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="px-2 py-1 space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-slate-950' : 'text-slate-400'
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile & Learning Preferences */}
        <div className="p-2 border-t border-slate-100">
          <button
            onClick={() => {
              onOpenProfile();
              if (onCloseMobile) onCloseMobile();
            }}
            className={`w-full flex items-center space-x-2.5 p-2 rounded-xl text-left hover:bg-slate-100 transition-colors cursor-pointer ${
              collapsed ? 'justify-center p-1' : ''
            }`}
            title="Learning Preferences"
          >
            <div className="w-7 h-7 rounded-full bg-slate-900 text-white font-medium flex items-center justify-center text-[11px] shrink-0">
              {profile.name ? profile.name[0].toUpperCase() : 'A'}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-900 truncate flex items-center justify-between">
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
    </>
  );
};
