import { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomText } from '../data/sampleTexts';

interface TypingTestState {
  text: string;
  inputValue: string;
  timeLeft: number;
  isRunning: boolean;
  isFinished: boolean;
  wpm: number;
  accuracy: number;
  errorCount: number;
  totalTyped: number;
}

interface TypingTestActions {
  handleInput: (val: string) => void;
  restart: () => void;
  handlePaste: (e: React.ClipboardEvent) => void;
}

export function useTypingTest(): TypingTestState & TypingTestActions {
  const [text, setText] = useState<string>(getRandomText);
  const [inputValue, setInputValue] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    if (intervalRef.current !== null) return;
    intervalRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          setIsRunning(false);
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const handleInput = useCallback(
    (val: string) => {
      if (isFinished) return;

      if (!isRunning && val.length > 0) {
        setIsRunning(true);
        startTimer();
      }

      setInputValue(val);

      // 텍스트 완료 시 종료
      if (val.length >= text.length) {
        clearTimer();
        setIsRunning(false);
        setIsFinished(true);
      }
    },
    [isFinished, isRunning, text.length, startTimer, clearTimer]
  );

  const restart = useCallback(() => {
    clearTimer();
    setText(getRandomText());
    setInputValue('');
    setTimeLeft(60);
    setIsRunning(false);
    setIsFinished(false);
  }, [clearTimer]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
  }, []);

  // 정확도 및 WPM 계산
  const errorCount = inputValue.split('').reduce((count, char, i) => {
    return count + (text[i] !== char ? 1 : 0);
  }, 0);

  const totalTyped = inputValue.length;

  const elapsedMinutes = (60 - timeLeft) / 60;
  const wpm =
    elapsedMinutes > 0 ? Math.round(totalTyped / 5 / elapsedMinutes) : 0;

  const accuracy =
    totalTyped > 0
      ? Math.round(((totalTyped - errorCount) / totalTyped) * 100)
      : 100;

  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, [clearTimer]);

  return {
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
  };
}
