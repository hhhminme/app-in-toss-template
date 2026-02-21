import { TimerWrapper, TimerNumber } from '../styles/typing.styles';

interface TimerDisplayProps {
  timeLeft: number;
  isRunning: boolean;
}

export function TimerDisplay({ timeLeft, isRunning }: TimerDisplayProps) {
  const isWarning = timeLeft <= 10;

  return (
    <TimerWrapper>
      <TimerNumber warning={isWarning}>
        {String(timeLeft).padStart(2, '0')}
      </TimerNumber>
      <span
        style={{
          fontSize: '14px',
          color: '#8B95A1',
          fontWeight: 500,
        }}
      >
        {isRunning ? '초 남음' : timeLeft === 60 ? '입력하면 시작' : '초 남음'}
      </span>
    </TimerWrapper>
  );
}
