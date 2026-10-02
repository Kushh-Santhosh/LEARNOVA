export type AvatarState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'connecting'
  | 'error';

export interface AvatarProviderProps {
  state: AvatarState;
  spokenText?: string;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onReplay?: () => void;
  onInterrupt?: () => void;
  onSpeechEnd?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
  className?: string;
}

export interface ProfessorNovaProps extends AvatarProviderProps {
  provider?: 'auto' | 'local' | 'live';
  liveStreamUrl?: string;
}
