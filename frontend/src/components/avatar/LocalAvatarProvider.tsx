import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { AvatarProviderProps } from './AvatarTypes';

export const LocalAvatarProvider: React.FC<AvatarProviderProps> = ({
  state,
  spokenText = '',
  isMuted = false,
  onToggleMute,
  onReplay,
  onInterrupt,
  onSpeechEnd,
  isFocusMode = false,
  onToggleFocusMode,
  className = '',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [waveformHeights, setWaveformHeights] = useState<number[]>([3, 5, 7, 10, 8, 5, 3]);

  // Periodic natural blinking (every 3.2 - 4.5 seconds for ~120ms)
  useEffect(() => {
    let timeoutId: any;
    let isMounted = true;

    const scheduleNextBlink = () => {
      const delay = 3200 + Math.random() * 1400;
      timeoutId = setTimeout(() => {
        if (!isMounted) return;
        setIsBlinking(true);
        setTimeout(() => {
          if (!isMounted) return;
          setIsBlinking(false);
          scheduleNextBlink();
        }, 120);
      }, delay);
    };

    scheduleNextBlink();
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Voice-reactive mini waveform when speaking or listening
  useEffect(() => {
    let animId: number;
    if (state === 'speaking') {
      let t = 0;
      const loop = () => {
        t += 0.2;
        setWaveformHeights([
          Math.sin(t * 1.5) * 6 + 10,
          Math.cos(t * 1.8) * 8 + 12,
          Math.sin(t * 2.2) * 10 + 14,
          Math.cos(t * 2.5) * 12 + 16,
          Math.sin(t * 1.9) * 10 + 13,
          Math.cos(t * 1.6) * 8 + 11,
          Math.sin(t * 1.3) * 6 + 9,
        ]);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    } else if (state === 'listening') {
      let t = 0;
      const loop = () => {
        t += 0.12;
        setWaveformHeights([
          Math.sin(t * 1.1) * 3 + 5,
          Math.cos(t * 1.3) * 5 + 7,
          Math.sin(t * 1.6) * 6 + 8,
          Math.cos(t * 1.8) * 7 + 9,
          Math.sin(t * 1.4) * 6 + 8,
          Math.cos(t * 1.2) * 5 + 6,
          Math.sin(t * 1.0) * 3 + 4,
        ]);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    } else {
      setWaveformHeights([3, 4, 5, 6, 5, 4, 3]);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [state]);

  const stateInfo = {
    idle: { label: 'Ready to Teach', dotColor: 'bg-emerald-500' },
    listening: { label: 'Listening...', dotColor: 'bg-cyan-500 animate-pulse' },
    thinking: { label: 'Thinking...', dotColor: 'bg-blue-500 animate-pulse' },
    speaking: { label: 'Speaking', dotColor: 'bg-teal-500 animate-pulse' },
    interrupted: { label: 'Listening', dotColor: 'bg-amber-500' },
    connecting: { label: 'Connecting...', dotColor: 'bg-blue-400 animate-pulse' },
    error: { label: 'Offline', dotColor: 'bg-rose-500' },
  }[state] || { label: 'Ready to Teach', dotColor: 'bg-emerald-500' };

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-3xl bg-white text-slate-800 p-4 border border-slate-200/90 shadow-xs select-none transition-all duration-300 ${
        isFocusMode ? 'w-full max-w-md mx-auto py-6' : 'w-full'
      } ${className}`}
    >
      {/* Top Header: Identity & State Status */}
      <div className="w-full flex items-center justify-between mb-2 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${stateInfo.dotColor}`} />
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 text-xs">
              Professor Nova
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {stateInfo.label}
            </span>
          </div>
        </div>

        {/* Header Controls */}
        <div className="flex items-center space-x-1 text-slate-400">
          {onReplay && (
            <button
              onClick={onReplay}
              title="Replay explanation"
              className="p-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="p-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              title={isFocusMode ? 'Exit focus mode' : 'Expand focus mode'}
              className="p-1.5 rounded-lg hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Authoritative Reference Avatar Character Stage */}
      <div
        className={`relative flex items-center justify-center transition-all duration-300 ${
          isFocusMode ? 'w-56 h-56 my-3' : 'w-40 h-40 my-1'
        }`}
      >
        {/* Exact Character Container with Subtle Natural Life Animation */}
        <div
          className="relative w-full h-full flex items-center justify-center pointer-events-none select-none"
          style={{
            transform:
              state === 'thinking'
                ? 'translateY(-2px) rotate(-0.8deg)'
                : state === 'listening'
                ? 'translateY(-1px) rotate(0.6deg)'
                : state === 'interrupted'
                ? 'translateY(-1px)'
                : undefined,
            animation:
              state === 'speaking'
                ? 'nova-speaking-sway 1.8s ease-in-out infinite'
                : state === 'idle'
                ? 'nova-idle-breath 4.2s ease-in-out infinite'
                : state === 'listening'
                ? 'nova-listening 3.2s ease-in-out infinite'
                : undefined,
          }}
        >
          {/* Authoritative Uploaded Reference Image: Full unclipped badge */}
          <img
            src="/professor_nova.png"
            alt="Professor Nova"
            className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
          />

          {/* Natural Eye Blinking Overlay (Screen color #242f42 matched to face display) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-75 ${
              isBlinking ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Left Eye Eyelid Cover */}
            <div
              className="absolute rounded-full bg-[#242f42]"
              style={{
                width: '7.0%',
                height: '10.8%',
                left: '32.5%',
                top: '40.8%',
              }}
            />
            {/* Right Eye Eyelid Cover */}
            <div
              className="absolute rounded-full bg-[#242f42]"
              style={{
                width: '7.0%',
                height: '10.8%',
                left: '59.2%',
                top: '40.8%',
              }}
            />
          </div>

          {/* Subtle Speaking Mouth Modulation (Active only when speaking) */}
          {state === 'speaking' && !isBlinking && (
            <div
              className="absolute pointer-events-none animate-pulse"
              style={{
                width: '7.2%',
                height: '3.6%',
                left: '45.8%',
                top: '54.0%',
              }}
            >
              <svg viewBox="0 0 40 20" className="w-full h-full overflow-visible">
                <path
                  d="M 2 4 Q 20 18 38 4"
                  fill="none"
                  stroke="#15deee"
                  strokeWidth="5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Restrained Voice Waveform (Active during speaking & listening) */}
      <div className="w-full flex items-center justify-center gap-1 h-5 mt-2 mb-1 px-4">
        {waveformHeights.map((h, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-100 ${
              state === 'speaking'
                ? 'bg-teal-500'
                : state === 'listening'
                ? 'bg-cyan-500'
                : 'bg-slate-200'
            }`}
            style={{ height: `${Math.max(3, Math.min(20, h))}px` }}
          />
        ))}
      </div>

      {/* Spoken Captions Bar */}
      {spokenText && (
        <div className="w-full mt-2 pt-2 border-t border-slate-100 px-2 text-center">
          <p className="text-[11px] text-slate-600 italic font-serif leading-relaxed line-clamp-3">
            "{spokenText}"
          </p>
        </div>
      )}

      {/* Interruption Action Button (Immediate feedback) */}
      {state === 'speaking' && onInterrupt && (
        <button
          onClick={onInterrupt}
          className="mt-2 text-[10px] text-slate-500 hover:text-slate-800 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Click to interrupt
        </button>
      )}
    </div>
  );
};
