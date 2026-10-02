import React from 'react';
import { ProfessorNovaProps } from './AvatarTypes';
import { LocalAvatarProvider } from './LocalAvatarProvider';
import { LiveAvatarProvider } from './LiveAvatarProvider';

export const ProfessorNova: React.FC<ProfessorNovaProps> = ({
  provider = 'auto',
  liveStreamUrl,
  ...props
}) => {
  // If provider is explicitly 'live' or auto with an active liveStreamUrl, use LiveAvatarProvider
  const useLive = provider === 'live' || (provider === 'auto' && Boolean(liveStreamUrl));

  if (useLive) {
    return <LiveAvatarProvider streamUrl={liveStreamUrl} {...props} />;
  }

  // Default: Premium Local Avatar Provider (Zero cloud keys required, high visual fidelity)
  return <LocalAvatarProvider {...props} />;
};

export * from './AvatarTypes';
export { LocalAvatarProvider } from './LocalAvatarProvider';
export { LiveAvatarProvider } from './LiveAvatarProvider';
