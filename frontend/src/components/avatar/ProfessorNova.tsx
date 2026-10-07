import React from 'react';
import { LocalAvatarProvider } from './LocalAvatarProvider';
import { LiveAvatarProvider } from './LiveAvatarProvider';
import { AvatarTurn } from '../../types';

export type AvatarState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'interrupted' | 'connecting' | 'error';

export interface AvatarProviderProps {
  state: AvatarState;
  spokenText?: string;
  avatarTurn?: AvatarTurn | null;
  mode?: 'mode_a_local' | 'mode_b_hq' | 'mode_c_text';
  onModeChange?: (mode: 'mode_a_local' | 'mode_b_hq' | 'mode_c_text') => void;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onReplay?: () => void;
  onInterrupt?: () => void;
  onSpeechEnd?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  onOpenBenchmark?: () => void;
  className?: string;
}

export interface ProfessorNovaProps extends AvatarProviderProps {
  provider?: 'auto' | 'local' | 'live';
  liveStreamUrl?: string;
}

export const ProfessorNova: React.FC<ProfessorNovaProps> = ({
  provider = 'auto',
  liveStreamUrl,
  mode = 'mode_a_local',
  ...props
}) => {
  const useLive = mode === 'mode_b_hq' || provider === 'live' || (provider === 'auto' && Boolean(liveStreamUrl));
  if (useLive && liveStreamUrl) {
    return <LiveAvatarProvider streamUrl={liveStreamUrl} mode={mode} {...props} />;
  }
  return <LocalAvatarProvider mode={mode} {...props} />;
};

export { LocalAvatarProvider } from './LocalAvatarProvider';
export { LiveAvatarProvider } from './LiveAvatarProvider';
