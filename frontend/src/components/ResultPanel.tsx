import { Button } from '@toss/tds-mobile';
import {
  ResultCard,
  ResultGrid,
  ResultItem,
  ResultValue,
  ResultLabel,
  StatsRow,
  StatLabel,
  StatValue,
} from '../styles/typing.styles';

interface ResultPanelProps {
  wpm: number;
  accuracy: number;
  totalTyped: number;
  errorCount: number;
  onRestart: () => void;
}

export function ResultPanel({
  wpm,
  accuracy,
  totalTyped,
  errorCount,
  onRestart,
}: ResultPanelProps) {
  return (
    <ResultCard>
      <div style={{ textAlign: 'center' }}>
        <p
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: '#191F28',
            margin: 0,
          }}
        >
          결과
        </p>
      </div>

      <ResultGrid>
        <ResultItem>
          <ResultValue>{wpm}</ResultValue>
          <ResultLabel>WPM</ResultLabel>
        </ResultItem>
        <ResultItem>
          <ResultValue>{accuracy}%</ResultValue>
          <ResultLabel>정확도</ResultLabel>
        </ResultItem>
      </ResultGrid>

      <div
        style={{
          borderTop: '1px solid #E5E8EB',
          paddingTop: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '0',
        }}
      >
        <StatsRow>
          <StatLabel>총 입력 글자</StatLabel>
          <StatValue>{totalTyped}자</StatValue>
        </StatsRow>
        <StatsRow>
          <StatLabel>오타 수</StatLabel>
          <StatValue style={{ color: errorCount > 0 ? '#F45452' : '#191F28' }}>
            {errorCount}개
          </StatValue>
        </StatsRow>
      </div>

      <Button
        color="primary"
        variant="fill"
        display="block"
        size="xlarge"
        onClick={onRestart}
      >
        다시하기
      </Button>
    </ResultCard>
  );
}
