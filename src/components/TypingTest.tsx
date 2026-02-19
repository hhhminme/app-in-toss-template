import { useRef } from 'react';
import { useTypingTest } from '../hooks/useTypingTest';
import { TextDisplay } from './TextDisplay';
import { TimerDisplay } from './TimerDisplay';
import { ResultPanel } from './ResultPanel';
import {
  PageWrapper,
  Container,
  Header,
  InputField,
} from '../styles/typing.styles';

export function TypingTest() {
  const inputRef = useRef<HTMLInputElement>(null);
  const {
    text,
    inputValue,
    timeLeft,
    isRunning,
    isFinished,
    wpm,
    accuracy,
    errorCount,
    totalTyped,
    handleInput,
    restart,
    handlePaste,
  } = useTypingTest();

  const focusInput = () => {
    inputRef.current?.focus();
  };

  const handleRestart = () => {
    restart();
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  };

  return (
    <PageWrapper>
      <Container>
        <Header>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#191F28',
              margin: 0,
              marginBottom: '4px',
            }}
          >
            타자 속도 측정기
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#8B95A1',
              margin: 0,
            }}
          >
            60초 동안 영어 타이핑 속도를 측정합니다
          </p>
        </Header>

        <TimerDisplay timeLeft={timeLeft} isRunning={isRunning} />

        {!isFinished ? (
          <>
            <TextDisplay
              text={text}
              inputValue={inputValue}
              onClick={focusInput}
            />
            <InputField
              ref={inputRef}
              value={inputValue}
              onChange={e => handleInput(e.target.value)}
              onPaste={handlePaste}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              aria-label="타이핑 입력창"
            />
            <p
              style={{
                textAlign: 'center',
                fontSize: '13px',
                color: '#B0B8C1',
                margin: 0,
              }}
            >
              텍스트 영역을 클릭하거나 바로 타이핑을 시작하세요
            </p>
          </>
        ) : (
          <ResultPanel
            wpm={wpm}
            accuracy={accuracy}
            totalTyped={totalTyped}
            errorCount={errorCount}
            onRestart={handleRestart}
          />
        )}
      </Container>
    </PageWrapper>
  );
}
