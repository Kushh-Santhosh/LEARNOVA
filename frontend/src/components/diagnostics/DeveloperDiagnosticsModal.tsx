import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Activity, Cpu, Volume2, UserCheck, RefreshCw } from 'lucide-react';
import { api } from '../../api';

interface DeveloperDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeveloperDiagnosticsModal: React.FC<DeveloperDiagnosticsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://127.0.0.1:8000/api/providers/status');
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch provider status', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="w-full max-w-lg bg-slate-900 text-slate-100 rounded-3xl shadow-2xl border border-slate-800 p-6 relative font-mono text-xs">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">System & Provider Diagnostics</h3>
              <p className="text-[11px] text-slate-400">LEARNOVA Architecture & Billing Safety</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={fetchStatus}
              disabled={isLoading}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Refresh status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagnostics Body */}
        <div className="py-4 space-y-4">
          {/* LLM Gateway Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
              <span className="flex items-center gap-1.5 text-blue-400">
                <Cpu className="w-3.5 h-3.5" />
                Primary LLM Gateway
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 text-[10px] font-bold">
                {status?.openrouter?.configured ? 'OPENROUTER ACTIVE' : 'LOCAL ENGINE ACTIVE'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Active Model:</span>
                <span className="text-slate-200 font-semibold truncate block">
                  {status?.openrouter?.active_model || 'Local Teacher Brain'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Cost Tier:</span>
                <span className="text-emerald-400 font-bold block">
                  {status?.openrouter?.cost_tier || 'FREE ($0.00)'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Hard Cost Guard:</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  STRICT FREE-ONLY ($0)
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Fallback Chain:</span>
                <span className="text-slate-300 truncate block">
                  {status?.openrouter?.fallback_status || 'Local Teacher Ready'}
                </span>
              </div>
            </div>
          </div>

          {/* Voice Stack Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
              <span className="flex items-center gap-1.5 text-purple-400">
                <Volume2 className="w-3.5 h-3.5" />
                Professor Nova Voice Stack
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-bold">
                BROWSER SPEECH NATIVE
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px]">Persona:</span>
                <span className="text-slate-200">Male / Deep Digital Teacher</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px]">Acoustic Style:</span>
                <span className="text-slate-200">Subtle Robotic Calibration</span>
              </div>
            </div>
          </div>

          {/* Avatar Provider Section */}
          <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 font-semibold text-[11px]">
              <span className="flex items-center gap-1.5 text-teal-400">
                <UserCheck className="w-3.5 h-3.5" />
                Avatar System
              </span>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 text-[10px] font-bold">
                LOCAL REFERENCE AVATAR
              </span>
            </div>
            <div className="text-[11px] text-slate-300">
              Authoritative visual character with interactive idle, listening, thinking, speaking, and natural blinking states. Zero external cloud avatar dependencies.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-slate-500 text-[10px]">
          <span>LEARNOVA Core v1.2.0 • Zero Cloud Spend Policy</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-sans font-medium transition-colors cursor-pointer"
          >
            Close Diagnostics
          </button>
        </div>
      </div>
    </div>
  );
};
