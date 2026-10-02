import React from 'react';
import { ProfessorNova } from './avatar/ProfessorNova';
import { AvatarState } from './avatar/AvatarTypes';

interface LegacyAvatarTeacherProps {
  textToSpeak?: string;
  isSpeaking: boolean;
  isListening: boolean;
  mode?: string;
  onSpeechEnd?: () => void;
  onReplay?: () => void;
  onInterrupt?: () => void;
  isFocusMode?: boolean;
  onToggleFocusMode?: () => void;
}

export const AvatarTeacher: React.FC<LegacyAvatarTeacherProps> = ({
  textToSpeak,
  isSpeaking,
  isListening,
  onSpeechEnd,
  onReplay,
  onInterrupt,
  isFocusMode,
  onToggleFocusMode,
}) => {
  let state: AvatarState = 'idle';
  if (isListening) state = 'listening';
  else if (isSpeaking) state = 'speaking';

  return (
    <ProfessorNova
      provider="auto"
      state={state}
      spokenText={textToSpeak}
      onSpeechEnd={onSpeechEnd}
      onReplay={onReplay}
      onInterrupt={onInterrupt}
      isFocusMode={isFocusMode}
      onToggleFocusMode={onToggleFocusMode}
    />
  );
};

export default AvatarTeacher;
