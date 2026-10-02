import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Mic, Sparkles, RefreshCw } from 'lucide-react';

interface AvatarTeacherProps {
  textToSpeak?: string;
  isSpeaking: boolean;
  isListening: boolean;
  mode: string;
  onSpeechEnd?: () => void;
  onReplay?: () => void;
}

export const AvatarTeacher: React.FC<AvatarTeacherProps> = ({
  textToSpeak,
  isSpeaking,
  isListening,
  mode,
  onSpeechEnd,
  onReplay,
}) => {
  const [mouthOpen, setMouthOpen] = useState(0); // 0 (closed) to 1 (wide)
  const [isBlinking, setIsBlinking] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [statusText, setStatusText] = useState('Ready to Teach');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Blinking loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setIsBlinking(true);
      setTimeout(() => setIsBlinking(false), 180);
    }, 4200);
    return () => clearInterval(blinkInterval);
  }, []);

  // Web Speech API Synthesis and mouth viseme simulation
  useEffect(() => {
    if (!textToSpeak || isMuted || typeof window === 'undefined' || !window.speechSynthesis) {
      setMouthOpen(0);
      return;
    }

    // Cancel any prior speech
    window.speechSynthesis.cancel();

    // Clean markdown symbols for natural speech
    const cleanSpeech = textToSpeak
      .replace(/[*#_`>]/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utteranceRef.current = utterance;
    utterance.rate = 1.02;
    utterance.pitch = 1.05;

    // Pick natural voice if available
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => (v.name.includes('Samantha') || v.name.includes('Google') || v.name.includes('Natural')) && v.lang.startsWith('en')
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    // Mouth animation while speaking
    let animFrame: number;
    let visemePhase = 0;

    utterance.onstart = () => {
      setStatusText('Explaining Concept...');
      const animateMouth = () => {
        visemePhase += 0.25;
        // Natural varied mouth shapes
        const open = Math.abs(Math.sin(visemePhase)) * 0.8 + (Math.random() * 0.2);
        setMouthOpen(open);
        animFrame = requestAnimationFrame(animateMouth);
      };
      animateMouth();
    };

    utterance.onend = () => {
      cancelAnimationFrame(animFrame);
      setMouthOpen(0);
      setStatusText('Awaiting Your Thoughts');
      if (onSpeechEnd) onSpeechEnd();
    };

    utterance.onerror = () => {
      cancelAnimationFrame(animFrame);
      setMouthOpen(0);
      setStatusText('Ready');
    };

    window.speechSynthesis.speak(utterance);

    return () => {
      window.speechSynthesis.cancel();
      cancelAnimationFrame(animFrame);
      setMouthOpen(0);
    };
  }, [textToSpeak, isMuted]);

  // Update status when listening
  useEffect(() => {
    if (isListening) {
      setStatusText('Listening to You...');
    } else if (!isSpeaking) {
      setStatusText('Observing Understanding');
    }
  }, [isListening, isSpeaking]);

  const toggleMute = () => {
    if (!isMuted && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setMouthOpen(0);
    }
    setIsMuted(!isMuted);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col items-center relative overflow-hidden">
      {/* Top Status & Controls */}
      <div className="w-full flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isSpeaking
                ? 'bg-blue-600 animate-pulse'
                : isListening
                ? 'bg-emerald-500 animate-ping'
                : mode === 'remediate'
                ? 'bg-amber-500'
                : 'bg-slate-400'
            }`}
          />
          <span className="text-xs font-semibold text-slate-700 tracking-wide">
            {isSpeaking ? 'TEACHING ALOUD' : isListening ? 'MICROPHONE ACTIVE' : statusText.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          {onReplay && (
            <button
              onClick={onReplay}
              title="Replay explanation"
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Unmute Teacher Voice' : 'Mute Teacher Voice'}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-500" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* SVG Vector Animated Teacher Avatar */}
      <div className="relative w-44 h-44 my-2 flex items-center justify-center">
        {/* Glow halo when speaking or remediating */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 filter blur-xl opacity-40 ${
            isSpeaking
              ? 'bg-blue-400 scale-105'
              : isListening
              ? 'bg-emerald-400 scale-110'
              : mode === 'remediate'
              ? 'bg-amber-300 scale-105'
              : 'bg-slate-200'
          }`}
        />

        <svg
          viewBox="0 0 200 200"
          className="w-full h-full relative z-10 transition-transform duration-300"
        >
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#eff6ff" />
              <stop offset="100%" stopColor="#dbeafe" />
            </linearGradient>
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fed7aa" />
              <stop offset="100%" stopColor="#fdba74" />
            </linearGradient>
            <linearGradient id="suitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>

          {/* Background circle badge */}
          <circle cx="100" cy="100" r="95" fill="url(#bgGrad)" stroke="#bfdbfe" strokeWidth="3" />

          {/* Shoulders / Professional Blazer */}
          <path
            d="M 40 190 C 40 148, 70 140, 100 140 C 130 140, 160 148, 160 190 Z"
            fill="url(#suitGrad)"
          />
          {/* Shirt collar & tie */}
          <polygon points="100,140 85,160 115,160" fill="#ffffff" />
          <polygon points="96,155 104,155 102,185 98,185" fill="#2563eb" />

          {/* Head & Neck */}
          <rect x="90" y="125" width="20" height="22" rx="4" fill="url(#skinGrad)" />
          <ellipse cx="100" cy="95" rx="42" ry="46" fill="url(#skinGrad)" />

          {/* Hair */}
          <path
            d="M 58 85 C 55 55, 80 40, 100 40 C 125 40, 145 55, 142 85 C 135 60, 115 50, 100 50 C 85 50, 68 62, 58 85 Z"
            fill="#334155"
          />

          {/* Eyebrows (tilt slightly up when remediating/encouraging) */}
          <path
            d={mode === 'remediate' ? "M 75 75 Q 85 70 93 74" : "M 75 74 Q 85 71 93 75"}
            stroke="#334155"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d={mode === 'remediate' ? "M 107 74 Q 115 70 125 75" : "M 107 75 Q 115 71 125 74"}
            stroke="#334155"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />

          {/* Eyes (Open or Blinking) */}
          {isBlinking ? (
            <>
              <line x1="77" y1="88" x2="91" y2="88" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
              <line x1="109" y1="88" x2="123" y2="88" stroke="#0f172a" strokeWidth="3" strokeLinecap="round" />
            </>
          ) : (
            <>
              {/* Sclera & Iris */}
              <ellipse cx="84" cy="87" rx="6.5" ry="7.5" fill="#ffffff" />
              <circle cx="85" cy="87" r="4.5" fill="#1e3a8a" />
              <circle cx="86.5" cy="85.5" r="1.5" fill="#ffffff" />

              <ellipse cx="116" cy="87" rx="6.5" ry="7.5" fill="#ffffff" />
              <circle cx="115" cy="87" r="4.5" fill="#1e3a8a" />
              <circle cx="116.5" cy="85.5" r="1.5" fill="#ffffff" />
            </>
          )}

          {/* Nose */}
          <path d="M 100 89 L 98 103 L 104 103" stroke="#ea580c" strokeWidth="1.8" fill="none" strokeLinecap="round" />

          {/* Mouth (Dynamic Viseme Opening) */}
          {mouthOpen > 0.05 ? (
            <path
              d={`M 88 116 Q 100 ${116 + mouthOpen * 16} 112 116 Q 100 ${116 - mouthOpen * 4} 88 116 Z`}
              fill="#991b1b"
              stroke="#7f1d1d"
              strokeWidth="1.5"
            />
          ) : (
            <path d="M 88 116 Q 100 120 112 116" stroke="#c2410c" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          )}

          {/* Teacher Smart Glasses */}
          <rect x="73" y="78" width="22" height="18" rx="5" fill="none" stroke="#2563eb" strokeWidth="2.5" />
          <rect x="105" y="78" width="22" height="18" rx="5" fill="none" stroke="#2563eb" strokeWidth="2.5" />
          <line x1="95" y1="87" x2="105" y2="87" stroke="#2563eb" strokeWidth="2" />
        </svg>
      </div>

      {/* Audio Wave Visualizer Bar */}
      <div className="w-full flex items-center justify-center space-x-1 mt-2 h-6">
        {[0.4, 0.8, 0.3, 0.9, 0.6, 0.2, 0.7, 0.5, 0.85, 0.35].map((scale, i) => (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-150 ${
              isSpeaking
                ? 'bg-blue-600'
                : isListening
                ? 'bg-emerald-500'
                : 'bg-slate-200'
            }`}
            style={{
              height: isSpeaking
                ? `${Math.max(4, Math.random() * 22 * scale)}px`
                : isListening
                ? `${Math.max(4, (i % 2 === 0 ? 16 : 8))}px`
                : '4px',
            }}
          />
        ))}
      </div>

      {/* Teacher Identity Label */}
      <div className="text-center mt-2">
        <h4 className="text-sm font-bold text-slate-800 flex items-center justify-center gap-1.5">
          <span>Professor Nova</span>
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
        </h4>
        <p className="text-xs text-slate-500">Adaptive AI Tutor & Guide</p>
      </div>
    </div>
  );
};
