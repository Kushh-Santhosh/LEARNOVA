import React, { useState } from 'react';
import { LearnerProfile } from '../types';
import { UserCheck, Sparkles, Check } from 'lucide-react';

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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(profile);
    onClose();
  };

  const teachingStyles = [
    'Simple explanations',
    'Examples & Visuals',
    'Step-by-step',
    'Deep Dive & Rigorous',
    'Exam focused',
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-fadeIn">
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600">
              Personalized Learning Profile
            </span>
            <h3 className="text-base font-bold text-slate-900">Configure AI Teacher</h3>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Name */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Your Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-hidden"
              required
            />
          </div>

          {/* Education Level */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Education Level</label>
            <select
              value={profile.education_level}
              onChange={(e) => setProfile({ ...profile, education_level: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-blue-500 outline-hidden bg-white"
            >
              <option value="High School">High School</option>
              <option value="Undergraduate">Undergraduate / College</option>
              <option value="Graduate / Professional">Graduate / Professional</option>
              <option value="Self-Learner">Self-Directed Learner</option>
            </select>
          </div>

          {/* Current Level in Subject */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Familiarity Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  type="button"
                  key={lvl}
                  onClick={() => setProfile({ ...profile, learning_level: lvl })}
                  className={`py-2 px-2 rounded-xl border font-semibold text-center transition-all ${
                    profile.learning_level === lvl
                      ? 'border-blue-600 bg-blue-50 text-blue-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Preferred Style */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Preferred Explanation Style</label>
            <div className="space-y-1.5">
              {teachingStyles.map((style) => (
                <button
                  type="button"
                  key={style}
                  onClick={() => setProfile({ ...profile, preferred_style: style })}
                  className={`w-full text-left py-2 px-3 rounded-xl border font-medium flex items-center justify-between transition-all ${
                    profile.preferred_style === style
                      ? 'border-blue-600 bg-blue-50 text-blue-900'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <span>{style}</span>
                  {profile.preferred_style === style && <Check className="w-4 h-4 text-blue-600" />}
                </button>
              ))}
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors"
            >
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
