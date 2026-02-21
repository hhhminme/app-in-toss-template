import styled from '@emotion/styled';

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
`;

export const TextBox = styled.div`
  background-color: #ffffff;
  border: 1px solid #e5e8eb;
  border-radius: 16px;
  padding: 24px;
  font-size: 18px;
  line-height: 1.8;
  letter-spacing: 0.02em;
  font-family: 'Courier New', Courier, monospace;
  cursor: text;
  user-select: none;
`;

export type CharStatus = 'pending' | 'correct' | 'incorrect' | 'cursor';

export const CharSpan = styled.span<{ status: CharStatus }>`
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
  border-bottom: ${({ status }) =>
    status === 'cursor' ? '2px solid #3182F6' : 'none'};
`;

export const TimerWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

export const TimerNumber = styled.span<{ warning: boolean }>`
  font-size: 32px;
  font-weight: 700;
  color: ${({ warning }) => (warning ? '#F45452' : '#191F28')};
  transition: color 0.3s ease;
  font-variant-numeric: tabular-nums;
`;

export const InputField = styled.input`
  position: absolute;
  left: -9999px;
  opacity: 0;
  width: 0;
  height: 0;
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

export const ResultLabel = styled.span`
  font-size: 13px;
  color: #8b95a1;
  font-weight: 500;
`;

export const StatsRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
`;

export const StatLabel = styled.span`
  font-size: 14px;
  color: #8b95a1;
`;

export const StatValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: #191f28;
`;
