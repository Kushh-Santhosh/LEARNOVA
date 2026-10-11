import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Volume2, VolumeX, RefreshCw, Maximize2, Minimize2, Cpu, Activity, BarChart2 } from 'lucide-react';
import { AvatarProviderProps } from './ProfessorNova';
import { RhubarbVisemeShape, AvatarExpression, VisemeEvent, ExpressionEvent } from '../../types';

// Deterministic client-side phonetic fallback when offline or before backend responds
const FALLBACK_PHONEME_MAP: Record<string, RhubarbVisemeShape> = {
  m: 'A', b: 'A', p: 'A',
  s: 'B', z: 'B', t: 'B', d: 'B', n: 'B', k: 'B', g: 'B', j: 'B', y: 'B',
  e: 'C', a: 'C', i: 'C',
  o: 'E',
  u: 'F', w: 'F',
  f: 'G', v: 'G',
  l: 'H', r: 'H'
};

function generateClientVisemes(text: string): VisemeEvent[] {
  if (!text.trim()) return [{ at_ms: 0, duration_ms: 500, shape: 'X', intensity: 0 }];
  const words = text.toLowerCase().replace(/[^a-z0-9\s.,!?]/g, '').split(/\s+/);
  const events: VisemeEvent[] = [{ at_ms: 0, duration_ms: 60, shape: 'A', intensity: 0.2 }];
  let currentMs = 60;

  for (const word of words) {
    if (!word) continue;
    const wordDur = Math.max(160, Math.min(420, word.length * 60));
    const chars = word.replace(/[^a-z]/g, '').split('');
    const slot = Math.max(50, Math.floor(wordDur / Math.max(1, chars.length)));

    for (const c of chars) {
      const shape = FALLBACK_PHONEME_MAP[c] || 'B';
      events.push({
        at_ms: currentMs,
        duration_ms: slot,
        shape,
        intensity: shape === 'D' || shape === 'C' ? 0.95 : 0.8
      });
      currentMs += slot;
    }
    // Inter-word micro rest
    events.push({ at_ms: currentMs, duration_ms: 40, shape: 'B', intensity: 0.3 });
    currentMs += 40;
  }

  events.push({ at_ms: currentMs, duration_ms: 300, shape: 'X', intensity: 0 });
  return events;
}

export const LocalAvatarProvider: React.FC<AvatarProviderProps> = ({
  state,
  spokenText = '',
  avatarTurn,
  mode = 'mode_a_local',
  onModeChange,
  isMuted = false,
  onToggleMute,
  onReplay,
  onInterrupt,
  onSpeechEnd,
  isFocusMode = false,
  onToggleFocusMode,
  onOpenBenchmark,
  className = '',
}) => {
  const [isBlinking, setIsBlinking] = useState(false);
  const [currentViseme, setCurrentViseme] = useState<RhubarbVisemeShape>('X');
  const [currentExpression, setCurrentExpression] = useState<AvatarExpression>('idle');
  const [showCostDetails, setShowCostDetails] = useState(false);

  const startTimeRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Active viseme timeline: from backend avatarTurn if available, or deterministic client phonetic sequence
  const activeTimeline = useMemo<VisemeEvent[]>(() => {
    if (avatarTurn?.viseme_timeline && avatarTurn.viseme_timeline.length > 0) {
      return avatarTurn.viseme_timeline;
    }
    if (spokenText) {
      return generateClientVisemes(spokenText);
    }
    return [{ at_ms: 0, duration_ms: 600, shape: 'X', intensity: 0 }];
  }, [avatarTurn, spokenText]);

  // Expression timeline
  const activeExpressions = useMemo<ExpressionEvent[]>(() => {
    if (avatarTurn?.expression_timeline && avatarTurn.expression_timeline.length > 0) {
      return avatarTurn.expression_timeline;
    }
    const defExpr: AvatarExpression =
      state === 'thinking' ? 'thinking' :
      state === 'listening' ? 'listening' :
      state === 'speaking' ? 'explaining' : 'idle';
    return [{ at_ms: 0, duration_ms: 10000, expression: defExpr, intensity: 0.9 }];
  }, [avatarTurn, state]);

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

  // Timed Speech-to-Mouth Animation Loop (Purely driven by performance.now() and viseme timeline)
  useEffect(() => {
    if (state !== 'speaking' || mode === 'mode_c_text') {
      setCurrentViseme('X');
      setCurrentExpression(state === 'listening' ? 'listening' : state === 'thinking' ? 'thinking' : 'idle');
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      startTimeRef.current = null;
      return;
    }

    startTimeRef.current = performance.now();

    const loop = (now: number) => {
      if (!startTimeRef.current) return;
      const elapsedMs = now - startTimeRef.current;

      // Find active viseme in timeline
      const activeVis = activeTimeline.find(
        (ev) => elapsedMs >= ev.at_ms && elapsedMs < ev.at_ms + ev.duration_ms
      );
      if (activeVis) {
        setCurrentViseme(activeVis.shape);
      } else {
        const lastEv = activeTimeline[activeTimeline.length - 1];
        if (lastEv && elapsedMs >= lastEv.at_ms + lastEv.duration_ms) {
          setCurrentViseme('X');
          if (onSpeechEnd) onSpeechEnd();
          return;
        }
      }

      // Find active expression
      const activeExp = activeExpressions.find(
        (ev) => elapsedMs >= ev.at_ms && elapsedMs < ev.at_ms + ev.duration_ms
      );
      if (activeExp) {
        setCurrentExpression(activeExp.expression);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [state, activeTimeline, activeExpressions, mode, onSpeechEnd]);

  // Expression Head Tilt and Posture
  const headTransform = useMemo(() => {
    switch (currentExpression) {
      case 'thinking':
        return 'translateY(-2px) rotate(-1.2deg)';
      case 'listening':
        return 'translateY(-1px) rotate(1.0deg)';
      case 'questioning':
        return 'translateY(-1.5px) rotate(1.8deg)';
      case 'celebrating':
        return 'translateY(-3px) scale(1.02)';
      case 'encouraging':
        return 'translateY(-0.5px) rotate(-0.5deg)';
      case 'remediating':
        return 'translateY(0.5px) rotate(0.4deg)';
      case 'explaining':
        return 'translateY(-1px)';
      default:
        return undefined;
    }
  }, [currentExpression]);

  // Expression Eyebrows rendering (SVG paths dynamic to emotion)
  const eyebrowSvg = useMemo(() => {
    switch (currentExpression) {
      case 'questioning':
        // Asymmetric: left eyebrow raised high, right neutral
        return (
          <>
            <path d="M 4 10 Q 12 2 20 6" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 40 7 Q 48 6 56 8" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case 'thinking':
        // Furrowed, tilted upwards
        return (
          <>
            <path d="M 4 8 Q 12 6 20 9" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 40 9 Q 48 4 56 8" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case 'celebrating':
      case 'encouraging':
        // Lifted cheerful arches
        return (
          <>
            <path d="M 4 9 Q 12 4 20 7" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
            <path d="M 40 7 Q 48 4 56 9" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case 'remediating':
        // Soft empathetic gentle slope
        return (
          <>
            <path d="M 4 7 Q 12 8 20 10" stroke="#15deee" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M 40 10 Q 48 8 56 7" stroke="#15deee" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        );
      default:
        // Explaining / Idle neutral arch
        return (
          <>
            <path d="M 4 8 Q 12 5 20 8" stroke="#15deee" strokeWidth="2.2" fill="none" strokeLinecap="round" />
            <path d="M 40 8 Q 48 5 56 8" stroke="#15deee" strokeWidth="2.2" fill="none" strokeLinecap="round" />
          </>
        );
    }
  }, [currentExpression]);

  // Rhubarb 2D Viseme SVG Shape rendering (Shapes A through H, X)
  const renderMouthShape = () => {
    switch (currentViseme) {
      case 'A':
        // Closed lips: M, B, P
        return (
          <line x1="6" y1="10" x2="34" y2="10" stroke="#15deee" strokeWidth="4.2" strokeLinecap="round" />
        );
      case 'B':
        // Teeth together, slight opening: K, S, T, D, N, Z
        return (
          <>
            <rect x="8" y="7" width="24" height="6.5" rx="3" fill="#1b2433" stroke="#15deee" strokeWidth="2.6" />
            <line x1="9" y1="10" x2="31" y2="10" stroke="#15deee" strokeWidth="1.5" strokeOpacity="0.85" />
          </>
        );
      case 'C':
        // Medium open mouth: EH, AE, AH
        return (
          <ellipse cx="20" cy="10" rx="12" ry="7.5" fill="#1b2433" stroke="#15deee" strokeWidth="3" />
        );
      case 'D':
        // Wide open mouth: AA, AY, AW
        return (
          <ellipse cx="20" cy="10" rx="14" ry="9.5" fill="#1b2433" stroke="#15deee" strokeWidth="3.4" />
        );
      case 'E':
        // Slightly rounded: AO, ER, OY
        return (
          <ellipse cx="20" cy="10" rx="10" ry="7.5" fill="#1b2433" stroke="#15deee" strokeWidth="3" />
        );
      case 'F':
        // Puckered / compact O: UW, OW, W, OO
        return (
          <ellipse cx="20" cy="10" rx="6.5" ry="6.5" fill="#1b2433" stroke="#15deee" strokeWidth="3.2" />
        );
      case 'G':
        // Upper teeth on lower lip: F, V
        return (
          <>
            <path d="M 8 7 L 32 7 Q 32 14 20 14 Q 8 14 8 7 Z" fill="#1b2433" stroke="#15deee" strokeWidth="2.8" />
            <line x1="9" y1="7.5" x2="31" y2="7.5" stroke="#15deee" strokeWidth="1.8" />
          </>
        );
      case 'H':
        // Wide tongue behind teeth: L, EL
        return (
          <>
            <ellipse cx="20" cy="10" rx="12" ry="7.5" fill="#1b2433" stroke="#15deee" strokeWidth="3" />
            <path d="M 14 12 Q 20 8 26 12" stroke="#15deee" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </>
        );
      case 'X':
      default:
        // Resting warm smile curve
        return (
          <path d="M 6 8 Q 20 16 34 8" fill="none" stroke="#15deee" strokeWidth="3.8" strokeLinecap="round" />
        );
    }
  };

  const stateInfo = {
    idle: { label: 'Ready to Teach', dotColor: 'bg-emerald-500' },
    listening: { label: 'Listening...', dotColor: 'bg-amber-500 animate-pulse' },
    thinking: { label: 'Thinking...', dotColor: 'bg-indigo-500 animate-pulse' },
    speaking: { label: 'Speaking', dotColor: 'bg-teal-500 animate-pulse' },
    interrupted: { label: 'Interrupted', dotColor: 'bg-orange-500' },
    connecting: { label: 'Connecting...', dotColor: 'bg-blue-400 animate-pulse' },
    error: { label: 'Offline', dotColor: 'bg-rose-500' },
  }[state] || { label: 'Ready to Teach', dotColor: 'bg-emerald-500' };

  return (
    <div
      className={`relative flex flex-col rounded-3xl bg-white text-slate-800 p-4 sm:p-5 border border-slate-200/90 shadow-xs select-none transition-all duration-300 w-full overflow-hidden ${
        isFocusMode ? 'max-w-md mx-auto py-6' : ''
      } ${className}`}
    >
      {/* Top Header: Identity & State Status */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center space-x-2.5 min-w-0">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-slate-900 text-sm tracking-tight truncate">
                Professor Nova
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                AI Tutor
              </span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-2 h-2 rounded-full shrink-0 ${stateInfo.dotColor}`} />
              <span className="text-xs text-slate-500 font-medium truncate">
                {stateInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center space-x-1 text-slate-400 shrink-0">
          {onOpenBenchmark && (
            <button
              onClick={onOpenBenchmark}
              title="View Avatar & Voice Telemetry Benchmarks"
              aria-label="Open telemetry benchmark dashboard"
              className="p-1.5 rounded-lg hover:text-indigo-700 hover:bg-indigo-50 transition-colors cursor-pointer"
            >
              <BarChart2 className="w-4 h-4" />
            </button>
          )}
          {onReplay && (
            <button
              onClick={onReplay}
              disabled={!spokenText}
              title={spokenText ? "Replay explanation" : "No speech to replay"}
              aria-label="Replay explanation"
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                spokenText ? 'hover:text-slate-900 hover:bg-slate-100 text-slate-600' : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          {onToggleMute && (
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Professor Nova' : 'Mute Professor Nova'}
              aria-label={isMuted ? 'Unmute voice' : 'Mute voice'}
              className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-500" /> : <Volume2 className="w-4 h-4 text-slate-600" />}
            </button>
          )}
          {onToggleFocusMode && (
            <button
              onClick={onToggleFocusMode}
              title={isFocusMode ? 'Exit focus mode' : 'Expand focus mode'}
              aria-label={isFocusMode ? 'Exit focus mode' : 'Expand focus mode'}
              className="p-1.5 rounded-lg hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isFocusMode ? <Minimize2 className="w-4 h-4 text-indigo-600" /> : <Maximize2 className="w-4 h-4 text-slate-600" />}
            </button>
          )}
        </div>
      </div>

      {/* Authoritative Reference Avatar Character Stage */}
      <div className="w-full flex items-center justify-center my-3">
        <div
          className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-slate-100/90 via-slate-50 to-indigo-50/40 border border-slate-200/70 p-3 shadow-inner overflow-hidden transition-all duration-300 ${
            isFocusMode ? 'w-56 h-56' : 'w-44 h-44'
          }`}
        >
          {/* Character Stage with Contextual Head Animation */}
          <div
            className="relative w-full h-full flex items-center justify-center pointer-events-none select-none transition-transform duration-200 motion-reduce:transition-none"
            style={{
              transform: headTransform,
              animation:
                state === 'idle'
                  ? 'nova-idle-breath 4.2s ease-in-out infinite'
                  : undefined,
            }}
          >
            {/* Authoritative Uploaded Reference Image: Full unclipped character */}
            <img
              src="/professor_nova.png"
              alt="Professor Nova"
              className="w-full h-full object-contain pointer-events-none select-none drop-shadow-md"
            />

            {/* Expressive Eyebrow Overlay on Visor */}
            <div
              className="absolute pointer-events-none"
              style={{
                width: '35.5%',
                height: '5.5%',
                left: '32.2%',
                top: '36.2%',
              }}
            >
              <svg viewBox="0 0 60 14" className="w-full h-full overflow-visible">
                {eyebrowSvg}
              </svg>
            </div>

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

            {/* Authoritative Rhubarb 2D Viseme Mouth Renderer */}
            {!isBlinking && (
              <div
                className="absolute pointer-events-none transition-transform duration-75"
                style={{
                  width: '7.6%',
                  height: '4.2%',
                  left: '45.8%',
                  top: '53.8%',
                }}
              >
                <svg viewBox="0 0 40 20" className="w-full h-full overflow-visible">
                  {renderMouthShape()}
                </svg>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Spoken Captions Card */}
      <div className="w-full rounded-2xl bg-slate-50/90 border border-slate-200/80 p-3 shadow-2xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Captions
          </span>
          {state === 'speaking' && onInterrupt && (
            <button
              onClick={onInterrupt}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Stop speaking
            </button>
          )}
        </div>
        {spokenText ? (
          <p className="text-xs text-slate-700 leading-relaxed max-h-20 overflow-y-auto font-normal">
            "{spokenText}"
          </p>
        ) : (
          <p className="text-xs text-slate-400 italic text-center py-1">
            Captions will appear here when Professor Nova speaks.
          </p>
        )}
      </div>

      {/* Voice & Avatar Mode Segmented Control */}
      {onModeChange && (
        <div className="w-full mt-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5 px-0.5">
            Voice Mode
          </div>
          <div className="w-full grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs font-medium">
            <button
              onClick={() => onModeChange('mode_a_local')}
              title="Fast client-side speech synthesis with 2D mouth animations (Zero added latency, ₹0/min)"
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer truncate ${
                mode === 'mode_a_local'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Local Nova
            </button>
            <button
              onClick={() => onModeChange('mode_b_hq')}
              title="Live cloud video stream via LiveKit/HeyGen (Requires active WebRTC token)"
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer truncate ${
                mode === 'mode_b_hq'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Cloud Video
            </button>
            <button
              onClick={() => onModeChange('mode_c_text')}
              title="Silent reading mode without voice synthesis or mouth movement"
              className={`py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer truncate ${
                mode === 'mode_c_text'
                  ? 'bg-white text-slate-900 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Text Only
            </button>
          </div>
          {mode === 'mode_b_hq' && (
            <div className="mt-1 text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1 border border-amber-200 text-center">
              Cloud video awaiting WebRTC session • Local avatar active as preview
            </div>
          )}
        </div>
      )}

      {/* Engineering Telemetry Cards */}
      <div className="w-full mt-3 pt-2.5 border-t border-slate-100">
        <div className="flex items-center justify-between mb-1.5 px-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            Telemetry & Metrics
          </span>
          {onOpenBenchmark && (
            <button
              onClick={onOpenBenchmark}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
            >
              Benchmarks →
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {/* Card 1: Pipeline Mode */}
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="text-[10px] text-slate-400 font-medium">Render Engine</div>
            <div className="font-semibold text-slate-800 truncate">
              {mode === 'mode_a_local' ? 'Local Canvas' : mode === 'mode_b_hq' ? 'Cloud WebRTC' : 'Text Only'}
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              Viseme {currentViseme}
            </div>
          </div>

          {/* Card 2: Latency */}
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200/60">
            <div className="text-[10px] text-slate-400 font-medium">Avatar Latency</div>
            <div className="font-semibold text-slate-800">
              {avatarTurn?.backend_avatar_plan_latency_ms != null && avatarTurn.backend_avatar_plan_latency_ms > 0
                ? `${avatarTurn.backend_avatar_plan_latency_ms} ms`
                : 'Not measured'}
            </div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              {avatarTurn?.client_telemetry?.client_render_latency_ms
                ? `${avatarTurn.client_telemetry.client_render_latency_ms}ms render`
                : 'Client phonetics'}
            </div>
          </div>

          {/* Card 3: Avatar Cost */}
          <div className="col-span-2 p-2 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Avatar Render Cost</div>
              <div className="font-semibold text-slate-800">
                {mode === 'mode_b_hq' ? '₹12.98 / min' : '₹0.00 / min (Local)'}
              </div>
            </div>
            <div>
              {mode === 'mode_b_hq' ? (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-rose-50 text-rose-700 border border-rose-200">
                  Over Budget (&gt; ₹10)
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  ≤ ₹10 Budget Met
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-1.5 text-[9px] text-slate-400 text-center">
          *Avatar render cost only. LLM API inference accounted separately.
        </div>
      </div>
    </div>
  );
};
