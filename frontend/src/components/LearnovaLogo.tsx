import React from 'react';

interface LearnovaLogoProps {
  variant?: 'mark' | 'wordmark' | 'lockup';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  theme?: 'brand' | 'dark' | 'light' | 'monochrome';
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const LearnovaLogo: React.FC<LearnovaLogoProps> = ({
  variant = 'lockup',
  size = 'md',
  theme = 'brand',
  showTagline = false,
  className = '',
  onClick,
}) => {
  // Dimensions map
  const markSizeMap = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  const textClassMap = {
    sm: 'text-sm tracking-tight',
    md: 'text-base tracking-tight',
    lg: 'text-lg tracking-tight',
    xl: 'text-2xl tracking-normal',
  };

  // Color schemes
  const isLight = theme === 'light';
  const isMono = theme === 'monochrome';

  const markGradientId = `learnova-grad-${theme}`;
  const strokeColor = isLight ? '#FFFFFF' : isMono ? '#0F172A' : '#2563EB';
  const nucleusColor = isLight ? '#38BDF8' : '#0EA5E9';
  const wordmarkPrimary = isLight ? 'text-white' : 'text-slate-900';
  const wordmarkAccent = isLight ? 'text-cyan-300' : isMono ? 'text-slate-700' : 'text-blue-600';
  const taglineColor = isLight ? 'text-slate-300' : 'text-slate-500';

  const renderMark = (customClass?: string) => (
    <svg
      viewBox="0 0 128 128"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${customClass || markSizeMap[size]} shrink-0 transition-transform`}
      aria-label="LEARNOVA Logo Symbol"
    >
      <defs>
        <linearGradient id={markGradientId} x1="24" y1="24" x2="108" y2="108" gradientUnits="userSpaceOnUse">
          {isLight ? (
            <>
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </>
          ) : isMono ? (
            <>
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="100%" stopColor="#1E293B" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#2563EB" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </>
          )}
        </linearGradient>
      </defs>

      {/* Abstract 'L' Base Column (Foundational Knowledge) */}
      <rect x="28" y="22" width="16" height="58" rx="8" fill={`url(#${markGradientId})`} />

      {/* Ascending Knowledge Orbit (Dynamic Understanding) */}
      <path
        d="M 36 72 C 36 92 48 102 70 102 C 90 102 104 88 104 68 C 104 50 90 38 72 38"
        stroke={`url(#${markGradientId})`}
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Focal Nova Node */}
      <circle cx="72" cy="38" r="9" fill={nucleusColor} />
      <circle cx="72" cy="38" r="4.5" fill="#FFFFFF" />
    </svg>
  );

  if (variant === 'mark') {
    return (
      <div onClick={onClick} className={`inline-flex items-center justify-center ${className}`}>
        {renderMark()}
      </div>
    );
  }

  if (variant === 'wordmark') {
    return (
      <div onClick={onClick} className={`inline-flex flex-col ${className}`}>
        <span className={`font-extrabold ${textClassMap[size]} ${wordmarkPrimary}`}>
          LEARN<span className={wordmarkAccent}>NOVA</span>
        </span>
        {showTagline && (
          <span className={`text-[9px] font-semibold uppercase tracking-wider ${taglineColor}`}>
            Turn Information Into Understanding
          </span>
        )}
      </div>
    );
  }

  // Lockup variant
  return (
    <div
      onClick={onClick}
      className={`inline-flex items-center space-x-2.5 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {renderMark()}
      <div className="flex flex-col leading-none">
        <div className="flex items-center space-x-1.5">
          <span className={`font-extrabold ${textClassMap[size]} ${wordmarkPrimary}`}>
            LEARN<span className={wordmarkAccent}>NOVA</span>
          </span>
          <span className="hidden sm:inline-block px-1.5 py-0.5 text-[8.5px] font-bold rounded-sm bg-blue-50 text-blue-700 tracking-wider uppercase">
            Adaptive AI
          </span>
        </div>
        <span className={`text-[9px] font-medium tracking-tight mt-0.5 ${taglineColor}`}>
          {showTagline ? 'Turn Information Into Understanding' : 'Adaptive AI Classroom'}
        </span>
      </div>
    </div>
  );
};
