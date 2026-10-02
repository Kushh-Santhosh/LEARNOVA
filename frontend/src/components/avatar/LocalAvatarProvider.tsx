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
  const [waveformHeights, setWaveformHeights] = useState<number[]>([4, 6, 8, 12, 10, 6, 4]);

  // Periodic natural blinking
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 140);
    }, 3800);
    return () => clearInterval(blinkInterval);
  }, []);

  // Voice-reactive mini waveform when speaking or listening
  useEffect(() => {
    let animId: number;
    if (state === 'speaking') {
      let t = 0;
      const loop = () => {
        t += 0.2;
        setWaveformHeights([
          Math.sin(t * 1.5) * 8 + 12,
          Math.cos(t * 1.8) * 10 + 14,
          Math.sin(t * 2.2) * 12 + 16,
          Math.cos(t * 2.5) * 14 + 18,
          Math.sin(t * 1.9) * 12 + 15,
          Math.cos(t * 1.6) * 10 + 13,
          Math.sin(t * 1.3) * 8 + 11,
        ]);
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    } else if (state === 'listening') {
      let t = 0;
      const loop = () => {
        t += 0.12;
        setWaveformHeights([
          Math.sin(t * 1.1) * 4 + 6,
          Math.cos(t * 1.3) * 6 + 8,
          Math.sin(t * 1.6) * 8 + 10,
          Math.cos(t * 1.8) * 9 + 11,
          Math.sin(t * 1.4) * 8 + 9,
          Math.cos(t * 1.2) * 6 + 7,
          Math.sin(t * 1.0) * 4 + 5,
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
  }[state];

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-3xl bg-white text-slate-800 p-4 border border-slate-200/90 shadow-xs select-none transition-all duration-300 ${
        isFocusMode ? 'w-full max-w-md mx-auto py-6' : 'w-full'
      } ${className}`}
    >
      {/* Top Header: Identity & Status */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
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
          isFocusMode ? 'w-48 h-48 my-3' : 'w-36 h-36 my-1'
        }`}
      >
        {/* Rounded Avatar Shell with exact uploaded character */}
        <div
          className={`relative w-full h-full rounded-full overflow-hidden border-2 border-slate-100 shadow-sm transition-transform duration-300 ${
            state === 'speaking'
              ? 'animate-pulse scale-[1.02]'
              : state === 'listening'
              ? 'scale-[1.01]'
              : 'hover:scale-[1.01]'
          }`}
          style={{
            animation: state === 'speaking' ? 'avatar-nod 1.6s ease-in-out infinite' : 'avatar-breath 4s ease-in-out infinite',
          }}
        >
          {/* Exact User Uploaded Reference Image */}
          <img
            src="/professor_nova.png"
            alt="Professor Nova"
            className="w-full h-full object-cover scale-[1.38] pointer-events-none select-none"
            style={{ objectPosition: 'center 46%' }}
          />

          {/* Natural Eye Blinking Overlay (Dark Screen Cover perfectly aligned over eyes) */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-75 ${
              isBlinking ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {/* Left Eye Blink Cover (matches dark screen color #222738) */}
            <div
              className="absolute rounded-full bg-[#222738]"
              style={{
                width: '6.5%',
                height: '8.5%',
                left: '38.5%',
                top: '44.8%',
              }}
            />
            {/* Right Eye Blink Cover */}
            <div
              className="absolute rounded-full bg-[#222738]"
              style={{
                width: '6.5%',
                height: '8.5%',
                left: '55%',
                top: '44.8%',
              }}
            />
          </div>

          {/* Thinking State Eye Focus (Subtle soft reflection) */}
          {state === 'thinking' && (
            <div className="absolute inset-0 pointer-events-none bg-blue-500/5 transition-opacity" />
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

      {/* Interruption Action */}
      {state === 'speaking' && onInterrupt && (
        <button
          onClick={onInterrupt}
          className="mt-2 text-[10px] text-slate-400 hover:text-slate-700 px-2.5 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
        >
          Click to interrupt
        </button>
      )}
    </div>
  );
};
