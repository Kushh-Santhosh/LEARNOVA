import React, { useEffect, useState, useCallback } from 'react';
import {
  ScreenTargetElement,
  ScreenRecommendedAction,
  ScreenVerifyResponse
} from '../../types';
import {
  X,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Eye,
  RefreshCw,
  Compass,
  AlertCircle
} from 'lucide-react';

interface NovaGuideOverlayProps {
  workflowName: string;
  stepNumber: number;
  totalSteps: number;
  targetElement: ScreenTargetElement | null;
  recommendedAction: ScreenRecommendedAction | null;
  spokenText?: string;
  onVerifyStep: () => Promise<ScreenVerifyResponse | null>;
  onDismiss: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const NovaGuideOverlay: React.FC<NovaGuideOverlayProps> = ({
  workflowName,
  stepNumber,
  totalSteps,
  targetElement,
  recommendedAction,
  spokenText,
  onVerifyStep,
  onDismiss,
  onNavigateTab,
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  // Recalculate target element position dynamically from DOM if available
  const updatePosition = useCallback(() => {
    if (!targetElement) return;

    let foundRect: DOMRect | null = null;

    // Match by guide_id if present
    if (targetElement.guide_id) {
      const el = document.querySelector(`[data-guide-id="${targetElement.guide_id}"]`);
      if (el) {
        foundRect = el.getBoundingClientRect();
      }
    }

    if (foundRect && foundRect.width > 0 && foundRect.height > 0) {
      setCoords({
        x: foundRect.left,
        y: foundRect.top,
        width: foundRect.width,
        height: foundRect.height,
      });
    } else {
      setCoords({
        x: targetElement.x,
        y: targetElement.y,
        width: targetElement.width,
        height: targetElement.height,
      });
    }
  }, [targetElement]);

  useEffect(() => {
    updatePosition();
    const handleScrollOrResize = () => updatePosition();
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);

    const interval = setInterval(updatePosition, 800);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      clearInterval(interval);
    };
  }, [updatePosition]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss]);

  const handleVerify = async () => {
    setIsVerifying(true);
    setVerifyMessage('Professor Nova is observing your screen...');
    try {
      const res = await onVerifyStep();
      if (res && (res.status === 'STEP_COMPLETED' || res.status === 'COMPLETED')) {
        setIsSuccess(true);
        setVerifyMessage(res.message || 'Step verified successfully!');
      } else if (res) {
        setVerifyMessage(res.message || 'Follow the highlighted element on screen.');
      }
    } catch {
      setVerifyMessage('Could not verify step. You can continue directly.');
    } finally {
      setIsVerifying(false);
    }
  };

  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;

  const targetY = coords ? coords.y : 200;
  const targetX = coords ? coords.x : 300;
  const targetW = coords ? coords.width : 200;
  const targetH = coords ? coords.height : 60;

  const placeAbove = targetY + targetH + 280 > windowHeight && targetY > 280;
  const cardTop = placeAbove
    ? Math.max(20, targetY - 280)
    : Math.min(windowHeight - 290, targetY + targetH + 16);

  const cardLeft = Math.max(
    16,
    Math.min(windowWidth - 410, targetX + targetW / 2 - 195)
  );

  return (
    <div
      role="region"
      aria-label="Professor Nova Visual Guidance"
      className="fixed inset-0 z-50 pointer-events-none transition-all duration-300"
    >
      {/* Subtle dimmed backdrop mask with cutout around target element */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ fillRule: 'evenodd' }}>
        <defs>
          <mask id="guide-cutout-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {coords && (
              <rect
                x={Math.max(0, coords.x - 6)}
                y={Math.max(0, coords.y - 6)}
                width={coords.width + 12}
                height={coords.height + 12}
                rx="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(15, 23, 42, 0.42)"
          mask="url(#guide-cutout-mask)"
          onClick={onDismiss}
        />
      </svg>

      {/* Target Focus Ring & Animated Pointer Beacon */}
      {coords && (
        <div
          style={{
            position: 'absolute',
            left: `${coords.x - 8}px`,
            top: `${coords.y - 8}px`,
            width: `${coords.width + 16}px`,
            height: `${coords.height + 16}px`,
          }}
          className="pointer-events-none transition-all duration-300"
        >
          {/* Animated pulse halo */}
          <div className="absolute inset-0 rounded-2xl border-2 border-indigo-400/90 shadow-[0_0_24px_rgba(99,102,241,0.5)] animate-pulse" />
          <div className="absolute -inset-1 rounded-2xl border border-indigo-300/40 animate-ping opacity-75" />

          {/* Nova Pointing Beacon / Pin */}
          <div
            className={`absolute ${
              placeAbove ? '-bottom-7 left-1/2 -translate-x-1/2' : '-top-7 left-1/2 -translate-x-1/2'
            } flex items-center justify-center`}
          >
            <div className="relative flex items-center justify-center">
              <span className="w-4 h-4 rounded-full bg-indigo-500 shadow-md flex items-center justify-center animate-bounce">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Pedagogical Instruction Card */}
      <div
        style={{
          position: 'absolute',
          top: `${cardTop}px`,
          left: `${cardLeft}px`,
          maxWidth: '390px',
          width: '92vw',
        }}
        className="pointer-events-auto bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl p-4 text-slate-800 transition-all duration-200 select-none animate-fadeIn"
      >
        {/* Header: Nova Avatar + Step Pill + Dismiss */}
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <img
              src="/professor_nova.png"
              alt="Professor Nova"
              className="w-7 h-7 rounded-full object-cover border border-indigo-200 shadow-2xs"
            />
            <div>
              <span className="text-[10px] font-semibold text-indigo-700 tracking-wide uppercase block">
                Professor Nova Guidance
              </span>
              <h4 className="text-xs font-semibold text-slate-900 leading-tight">
                {workflowName}
              </h4>
            </div>
          </div>

          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-semibold border border-indigo-100">
              Step {stepNumber}/{totalSteps}
            </span>
            <button
              onClick={onDismiss}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close guide (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Pedagogical Breakdown: WHAT / WHY / NEXT */}
        {recommendedAction && (
          <div className="space-y-2 text-xs">
            {/* WHAT: What to do */}
            <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100">
              <div className="flex items-center gap-1.5 text-indigo-950 font-semibold mb-0.5">
                <Compass className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                <span>What to do</span>
              </div>
              <p className="text-slate-700 leading-relaxed font-normal">
                {recommendedAction.what || recommendedAction.instruction}
              </p>
            </div>

            {/* WHY: Learning purpose */}
            <div className="px-1 text-slate-600">
              <span className="font-semibold text-slate-700">Why: </span>
              <span className="font-normal">{recommendedAction.why}</span>
            </div>

            {/* Target Hint */}
            {targetElement && (
              <div className="flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50/60 px-2.5 py-1 rounded-lg">
                <ArrowRight className="w-3 h-3 text-indigo-500 shrink-0" />
                <span>Target: {targetElement.label || targetElement.type}</span>
              </div>
            )}
          </div>
        )}

        {/* Verification Status Message */}
        {verifyMessage && (
          <div
            className={`mt-2.5 p-2 rounded-xl text-xs flex items-center gap-2 ${
              isSuccess
                ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}
          >
            {isSuccess ? (
              <CheckCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <span className="text-[11px] leading-tight">{verifyMessage}</span>
          </div>
        )}

        {/* Footer Actions: I did this / Verify & Dismiss */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
          <button
            onClick={onDismiss}
            className="text-[11px] text-slate-500 hover:text-slate-800 font-medium px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            Stop Guide
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleVerify}
              disabled={isVerifying}
              className="text-xs font-medium px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin text-white" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <Eye className="w-3 h-3" />
                  <span>I did this / Verify</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
