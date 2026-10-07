import React, { useState, useEffect } from 'react';
import { X, Volume2, Bot, Sliders, Check, Play, RefreshCw, AlertCircle } from 'lucide-react';
import { voiceSynthesis, VoiceSettings } from '../../services/voiceSynthesis';

interface VoiceSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [settings, setSettings] = useState<VoiceSettings>(voiceSynthesis.getSettings());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [activeVoiceInfo, setActiveVoiceInfo] = useState<{
    voice: SpeechSynthesisVoice | null;
    name: string;
    isGenuineMale: boolean;
    isFallback: boolean;
  }>(voiceSynthesis.resolveVoiceInfo());

  useEffect(() => {
    const unsub = voiceSynthesis.subscribe((newSettings) => {
      setSettings(newSettings);
      setActiveVoiceInfo(voiceSynthesis.resolveVoiceInfo());
    });

    const loadVoices = async () => {
      const v = await voiceSynthesis.getVoicesAsync();
      setAvailableVoices(v);
      setActiveVoiceInfo(voiceSynthesis.resolveVoiceInfo());
    };

    if (isOpen) {
      loadVoices();
    }

    return unsub;
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUpdate = (updates: Partial<VoiceSettings>) => {
    voiceSynthesis.updateSettings(updates);
    const updated = voiceSynthesis.getSettings();
    setSettings(updated);
    setActiveVoiceInfo(voiceSynthesis.resolveVoiceInfo());
  };

  const handleTestVoice = () => {
    setIsPlayingPreview(true);
    voiceSynthesis.speak(
      "Greetings, I am Professor Nova. I am ready to turn information into understanding with you.",
      {
        onEnd: () => setIsPlayingPreview(false),
        onError: () => setIsPlayingPreview(false),
      }
    );
  };

  const handleRefreshVoices = () => {
    const v = voiceSynthesis.refreshVoices();
    setAvailableVoices(v);
    setActiveVoiceInfo(voiceSynthesis.resolveVoiceInfo());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Professor Nova Voice Persona</h3>
              <p className="text-[11px] text-slate-500">
                Calibrated digital teacher voice with local browser synthesis
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-6">
          {/* Active Voice Summary Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Active Resolved Voice
              </span>
              <button
                onClick={handleRefreshVoices}
                className="text-[11px] text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer font-medium"
                title="Rescan browser voice list"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{availableVoices.length} voices loaded</span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 truncate">
                {activeVoiceInfo.name}
              </span>
              {activeVoiceInfo.isGenuineMale ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold shrink-0">
                  Male / Deep Verified
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-medium shrink-0">
                  Neutral / Closest Match
                </span>
              )}
            </div>
            {!activeVoiceInfo.isGenuineMale && settings.voiceMode === 'male_deep' && (
              <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                Your browser exposes limited voice descriptors. You can choose a specific voice below via Custom mode.
              </p>
            )}
          </div>

          {/* Voice Mode Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Voice Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'male_deep', label: 'Male / Deep', desc: 'Heuristic deep tone' },
                { id: 'auto', label: 'Auto', desc: 'Best match' },
                { id: 'neutral', label: 'Neutral', desc: 'Standard cadence' },
                { id: 'custom', label: 'Custom', desc: 'User specified' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleUpdate({ voiceMode: opt.id as any })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.voiceMode === opt.id
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                    {settings.voiceMode === opt.id && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-0.5 block leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Voice Picker (Visible if Custom mode selected, or for manual override) */}
          {(settings.voiceMode === 'custom' || availableVoices.length > 0) && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Explicit Browser Voice Selection
              </label>
              <select
                value={settings.selectedVoiceURI || (activeVoiceInfo.voice?.voiceURI || activeVoiceInfo.voice?.name || '')}
                onChange={(e) => {
                  handleUpdate({
                    voiceMode: 'custom',
                    selectedVoiceURI: e.target.value,
                  });
                }}
                className="w-full text-xs bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-hidden focus:ring-1 focus:ring-blue-600"
              >
                <option value="">-- Choose specific voice ({availableVoices.length} available) --</option>
                {availableVoices.map((v, i) => (
                  <option key={`${v.name}_${v.lang}_${i}`} value={v.voiceURI || v.name}>
                    {v.name} ({v.lang}) {v.default ? '★ Default' : ''}
                  </option>
                ))}
              </select>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Directly selects any voice exposed by your operating system and browser.
              </span>
            </div>
          )}

          {/* Delivery Style */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Style Persona
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'robotic', label: 'Subtle Robotic', desc: 'Calm digital teacher resonance (Default)' },
                { id: 'natural', label: 'Natural', desc: 'Standard conversational pitch' },
              ].map((styleOpt) => (
                <button
                  key={styleOpt.id}
                  onClick={() => handleUpdate({ style: styleOpt.id as any })}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    settings.style === styleOpt.id
                      ? 'border-blue-600 bg-blue-50/70 ring-1 ring-blue-600/30'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{styleOpt.label}</span>
                    {settings.style === styleOpt.id && (
                      <Check className="w-3.5 h-3.5 text-blue-600" />
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block leading-tight">
                    {styleOpt.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Pitch & Speed Sliders */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* Pitch Tuning */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Pitch Resonance</label>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {settings.pitch || 0.88}
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.3"
                step="0.02"
                value={settings.pitch || 0.88}
                onChange={(e) => handleUpdate({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0.6 (Deep)</span>
                <span className="text-blue-600 font-medium">0.88 (Subtle Robotic)</span>
                <span>1.3 (Higher)</span>
              </div>
            </div>

            {/* Speed Tuning */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">Speech Rate</label>
                <span className="text-xs font-mono font-semibold text-slate-600">
                  {settings.speed || 0.95}x
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="1.3"
                step="0.05"
                value={settings.speed || 0.95}
                onChange={(e) => handleUpdate({ speed: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                <span>0.75x (Calm)</span>
                <span className="text-blue-600 font-medium">0.95x (Articulate)</span>
                <span>1.3x (Fast)</span>
              </div>
            </div>
          </div>

          {/* Test Voice Button */}
          <div className="pt-2">
            <button
              onClick={handleTestVoice}
              disabled={isPlayingPreview}
              className={`w-full py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 font-semibold text-xs transition-all shadow-xs cursor-pointer ${
                isPlayingPreview
                  ? 'bg-blue-600 text-white animate-pulse'
                  : 'bg-slate-900 hover:bg-slate-800 text-white'
              }`}
            >
              <Volume2 className="w-4 h-4" />
              <span>{isPlayingPreview ? 'Speaking Test Audio...' : 'Test Voice Audio'}</span>
            </button>
            <p className="text-[11px] text-slate-400 text-center mt-2">
              Speaks sample sentence using the selected voice, pitch ({settings.pitch}), and pacing ({settings.speed}x).
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
