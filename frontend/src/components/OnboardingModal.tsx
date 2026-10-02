import React, { useState } from 'react';
import { LearnerProfile } from '../types';
import { Settings, Volume2, Globe, Sliders, X, Check } from 'lucide-react';

interface OnboardingModalProps {
  initialProfile: LearnerProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: LearnerProfile) => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  initialProfile,
  isOpen,
  onClose,
  onSave,
}) => {
  const [profile, setProfile] = useState<LearnerProfile>(initialProfile);
  const [activeSection, setActiveSection] = useState<'profile' | 'style' | 'language' | 'audio'>('profile');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  const teachingStyles = [
    { id: 'Examples & Visuals', label: 'Examples & Visuals', desc: 'Flowcharts, diagrams, and concrete real-world models' },
    { id: 'Socratic Dialogue', label: 'Socratic Guidance', desc: 'Guiding questions that prompt you to think through answers' },
    { id: 'Step-by-step', label: 'Step-by-step Structure', desc: 'Hierarchical, structured progression from simple to complex' },
    { id: 'Deep Dive & Rigorous', label: 'Deep Dive & Rigor', desc: 'Technical RFC details, packet structures, edge cases' },
    { id: 'Exam focused', label: 'Exam & Practice', desc: 'High-yield recall, quiz checks, and common traps' },
  ];

  const languages = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4 select-none animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
          <div>
            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
              Personalized Classroom
            </span>
            <h3 className="text-lg font-semibold text-slate-900 mt-0.5">
              Learning Preferences
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-2xl mb-5 text-xs">
          {[
            { id: 'profile', label: 'About You' },
            { id: 'style', label: 'Teaching Style' },
            { id: 'language', label: 'Language' },
            { id: 'audio', label: 'Voice & Audio' },
          ].map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActiveSection(s.id as any)}
              className={`flex-1 py-1.5 rounded-xl font-medium transition-colors cursor-pointer text-center ${
                activeSection === s.id ? 'bg-white text-slate-900 shadow-2xs font-semibold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Section: About You */}
          {activeSection === 'profile' && (
            <div className="space-y-4">
              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Learner Name</label>
                <input
                  type="text"
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none text-slate-900"
                  required
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Education Track</label>
                <select
                  value={profile.education_level}
                  onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:border-slate-400 outline-none bg-white text-slate-900"
                >
                  <option value="High School">High School</option>
                  <option value="Undergraduate">Undergraduate / College</option>
                  <option value="Graduate / Professional">Graduate / Professional</option>
                  <option value="Self-Learner">Self-Directed Learner</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1.5">Familiarity Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                    <button
                      type="button"
                      key={lvl}
                      onClick={() => setProfile({ ...profile, learning_level: lvl })}
                      className={`py-2 px-3 rounded-xl border text-center font-medium transition-colors cursor-pointer ${
                        profile.learning_level === lvl
                          ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section: Teaching Style */}
          {activeSection === 'style' && (
            <div className="space-y-2">
              {teachingStyles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setProfile({ ...profile, preferred_style: item.id })}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between ${
                    profile.preferred_style === item.id
                      ? 'border-slate-900 bg-slate-50 shadow-2xs'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-900 text-xs">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                  {profile.preferred_style === item.id && (
                    <Check className="w-4 h-4 text-slate-900 shrink-0 mt-0.5" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Section: Language */}
          {activeSection === 'language' && (
            <div className="space-y-2">
              <p className="text-xs text-slate-500 mb-3">
                Professor Nova explains concepts, quizzes, and evaluates teach-backs in your selected language:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {languages.map((l) => (
                  <button
                    type="button"
                    key={l.code}
                    onClick={() => setProfile({ ...profile, language: l.code })}
                    className={`p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-center justify-between ${
                      profile.language === l.code
                        ? 'border-slate-900 bg-slate-900 text-white font-semibold'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="font-medium text-xs block">{l.native}</span>
                      <span className={`text-[10px] ${profile.language === l.code ? 'text-slate-300' : 'text-slate-400'}`}>
                        {l.label}
                      </span>
                    </div>
                    {profile.language === l.code && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section: Audio & Voice */}
          {activeSection === 'audio' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-slate-900">Speech Synthesis Feedback</div>
                    <p className="text-[11px] text-slate-500">Allow Professor Nova to summarize key concepts aloud</p>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-semibold text-[10px]">
                    Enabled
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-slate-600 text-xs">
                  <span>Voice Provider Engine</span>
                  <span className="font-mono text-[11px] text-slate-800">Local Browser Web Speech</span>
                </div>
              </div>

              <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl text-[11px] text-blue-900">
                LiveAvatar & LiveKit real-time voice streaming pipelines will connect automatically when configured.
              </div>
            </div>
          )}

          {/* Action Row */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 text-white font-medium transition-colors shadow-xs cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
