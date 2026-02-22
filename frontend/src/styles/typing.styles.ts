import styled from '@emotion/styled';
import { css } from '@emotion/react';
import {
  wpmBounce,
  floatUp,
  charCorrect,
  charIncorrect,
  comboPulse,
  glowPulse,
} from './animations';

export const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: #f9fafb;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
`;

export const Container = styled.div`
  width: 100%;
  max-width: 640px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const Header = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const Title = styled.h1`
  font-size: 22px;
  font-weight: 700;
  color: #191f28;
  margin: 0;
`;

export const Subtitle = styled.p`
  font-size: 15px;
  color: #8b95a1;
  margin: 0;
`;

export const TextBox = styled.div`
  padding: 0 4px;
  font-size: 18px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  font-family: 'Courier New', Courier, monospace;
  user-select: none;
`;

export type CharStatus = 'pending' | 'correct' | 'incorrect' | 'cursor';

export const CharSpan = styled.span<{
  status: CharStatus;
  animate?: 'correct' | 'incorrect' | null;
}>`
  color: ${({ status }) => {
    switch (status) {
      case 'correct':
        return '#3182F6';
      case 'incorrect':
        return '#F45452';
      case 'cursor':
        return '#8B95A1';
      default:
        return '#8B95A1';
    }
  }};
  background-color: ${({ status }) =>
    status === 'incorrect' ? '#FFF0F0' : 'transparent'};
  border-bottom: 2px solid
    ${({ status }) => (status === 'cursor' ? '#3182F6' : 'transparent')};
  display: inline-block;
  ${({ animate }) =>
    animate === 'correct' &&
    css`
      animation: ${charCorrect} 150ms ease-out;
    `}
  ${({ animate }) =>
    animate === 'incorrect' &&
    css`
      animation: ${charIncorrect} 200ms ease-out;
    `}
`;

export const TimerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  position: relative;
`;

export const TimerNumber = styled.span<{ tierColor: string; glow?: boolean }>`
  font-size: 32px;
  font-weight: 700;
  color: ${({ tierColor }) => tierColor};
  transition: color 0.3s ease;
  font-variant-numeric: tabular-nums;
  ${({ glow, tierColor }) =>
    glow &&
    css`
      color: ${tierColor};
      animation: ${glowPulse} 2s ease-in-out infinite;
    `}
`;

export const TimerBounceWrap = styled.span`
  display: inline-block;
  animation: ${wpmBounce} 300ms ease-out;
`;

export const TimerEmoji = styled.span`
  font-size: 24px;
  margin-right: 4px;
`;

export const ResultCard = styled.div`
  background-color: #ffffff;
  border: 1px solid #e5e8eb;
  border-radius: 16px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
`;

export const ResultGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
`;

export const ResultItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 16px;
  background-color: #f9fafb;
  border-radius: 12px;
`;

export const ResultValue = styled.span`
  font-size: 36px;
  font-weight: 700;
  color: #3182f6;
  font-variant-numeric: tabular-nums;
`;

export const StatsDivider = styled.div`
  border-top: 1px solid #e5e8eb;
  padding-top: 16px;
  display: flex;
  flex-direction: column;
`;

export const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
`;

export const ComboContainer = styled.div<{ visible: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 28px;
  opacity: ${({ visible }) => (visible ? 1 : 0)};
  transition: opacity 0.2s ease;
`;

export const ComboEmoji = styled.span`
  font-size: 20px;
  display: inline-block;
  animation: ${comboPulse} 800ms ease-in-out infinite;
`;

export const ComboCount = styled.span`
  font-size: 16px;
  font-weight: 700;
  color: #ff8800;
`;

export const ParticleSpan = styled.span<{ color: string }>`
  position: absolute;
  top: -4px;
  right: -24px;
  font-size: 14px;
  font-weight: 700;
  color: ${({ color }) => color};
  pointer-events: none;
  animation: ${floatUp} 600ms ease-out forwards;
`;

export const ResultTierSection = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
`;

export const ResultTierEmoji = styled.span`
  font-size: 48px;
`;

export const ResultTierLabel = styled.span<{ color: string }>`
  font-size: 14px;
  font-weight: 600;
  color: ${({ color }) => color};
`;
