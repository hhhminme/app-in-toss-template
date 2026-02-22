import { keyframes, css } from '@emotion/react';

export const wpmBounce = keyframes`
  0% { transform: scale(1); }
  40% { transform: scale(1.15); }
  100% { transform: scale(1); }
`;

export const floatUp = keyframes`
  0% { opacity: 1; transform: translateY(0); }
  100% { opacity: 0; transform: translateY(-40px); }
`;

export const charCorrect = keyframes`
  0% { opacity: 0.5; }
  100% { opacity: 1; }
`;

export const charIncorrect = keyframes`
  0% { transform: translateX(0); }
  25% { transform: translateX(-3px); }
  50% { transform: translateX(3px); }
  75% { transform: translateX(-2px); }
  100% { transform: translateX(0); }
`;

export const comboPulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
`;

export const glowPulse = keyframes`
  0% { text-shadow: 0 0 4px currentColor; }
  50% { text-shadow: 0 0 12px currentColor; }
  100% { text-shadow: 0 0 4px currentColor; }
`;

export const glowStyle = css`
  animation: ${glowPulse} 2s ease-in-out infinite;
`;
