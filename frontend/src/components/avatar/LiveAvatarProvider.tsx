import React, { useRef, useEffect } from 'react';
import { Volume2, VolumeX, RefreshCw, Maximize2, Minimize2, Video } from 'lucide-react';
import { AvatarProviderProps } from './ProfessorNova';

export const LiveAvatarProvider: React.FC<AvatarProviderProps & { streamUrl?: string }> = ({
  state,
  spokenText = '',
  isMuted = false,
  onToggleMute,
  onReplay,
  onInterrupt,
  onSpeechEnd,
  isFocusMode = false,
  onToggleFocusMode,
  streamUrl,
  className = '',
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.src = streamUrl;
      videoRef.current.play().catch(() => {});
    }
  }, [streamUrl]);

  const stateMeta = {
    idle: { label: 'Live Stream Ready', color: 'bg-emerald-500' },
    listening: { label: 'Live Listening', color: 'bg-teal-400 animate-pulse' },
    thinking: { label: 'Reasoning (WebRTC)', color: 'bg-indigo-400 animate-spin' },
    speaking: { label: 'Live Streaming', color: 'bg-cyan-400 animate-pulse' },
    interrupted: { label: 'Interrupted', color: 'bg-amber-400' },
    connecting: { label: 'Connecting WebRTC...', color: 'bg-blue-400 animate-pulse' },
    error: { label: 'Stream Disconnected', color: 'bg-rose-500' },
  }[state];

  return (
    <div
      className={`relative flex flex-col items-center justify-between rounded-2xl bg-slate-950 text-slate-100 p-4 border border-slate-800/80 shadow-lg select-none transition-all duration-300 ${
        isFocusMode ? 'w-full max-w-xl mx-auto py-8' : 'w-full'
      } ${className}`}
    >
      {/* Top Header */}
      <div className="w-full flex items-center justify-between mb-3 px-1 text-xs">
        <div className="flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${stateMeta.color}`} />
          <div className="flex flex-col">
            <span className="font-semibold tracking-wide text-[11px] text-slate-200">
              Professor Nova (Live Avatar)
            </span>
            <span className="text-[9px] text-slate-400 uppercase tracking-wider font-mono">
              {stateMeta.label}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-1 text-slate-400">
          {onReplay && (
            <button onClick={onReplay} className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
          {onToggleMute && (
            <button onClick={onToggleMute} className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800">
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          )}
          {onToggleFocusMode && (
            <button onClick={onToggleFocusMode} className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800">
              {isFocusMode ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Video Container (Ready for WebRTC MediaStream) */}
      <div
        className={`relative flex items-center justify-center rounded-xl overflow-hidden bg-slate-900 border border-slate-800 transition-all ${
          isFocusMode ? 'w-full aspect-video my-4' : 'w-48 h-36 my-1'
        }`}
      >
        {streamUrl ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center p-4 text-center text-slate-500">
            <Video className="w-8 h-8 text-slate-600 mb-2 animate-pulse" />
            <span className="text-[11px] font-medium text-slate-400">LiveAvatar Cloud Pipeline</span>
            <span className="text-[9px] text-slate-500 mt-0.5">Awaiting WebRTC session token</span>
          </div>
        )}
      </div>

      {/* Captions */}
      {spokenText && (
        <div className="w-full mt-2 pt-2 border-t border-slate-800/80 px-2">
          <p className="text-[11px] text-slate-300 italic font-serif leading-relaxed line-clamp-3 text-center">
            "{spokenText}"
          </p>
        </div>
      )}

      {state === 'speaking' && onInterrupt && (
        <button
          onClick={onInterrupt}
          className="mt-2 text-[10px] text-slate-400 hover:text-white px-2 py-0.5 rounded-full bg-slate-800/60"
        >
          Click to interrupt
        </button>
      )}
    </div>
  );
};
