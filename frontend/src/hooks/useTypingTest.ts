import { useState, useEffect, useRef, useCallback } from 'react';
import { getRandomText } from '../data/sampleTexts';

interface UseTypingTestOptions {
  onCharCompleted?: (correct: boolean, char: string) => void;
  onWordCompleted?: (
    word: string,
    wordIndex: number,
    totalWords: number
  ) => void;
}

interface TypingTestState {
  text: string;
  inputValue: string;
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
  onCompositionStart: () => void;
  onCompositionEnd: (e: React.CompositionEvent) => void;
}

export function useTypingTest(
  options?: UseTypingTestOptions
): TypingTestState & TypingTestActions {
  const [text, setText] = useState<string>(getRandomText);
  const [inputValue, setInputValue] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [wpm, setWpm] = useState<number>(0);

  const startTimeRef = useRef<number | null>(null);
  const typedLengthRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputValueRef = useRef('');
  const composingRef = useRef(false);
  const composingStartIdxRef = useRef(-1);
  const onCharCompletedRef = useRef(options?.onCharCompleted);
  const onWordCompletedRef = useRef(options?.onWordCompleted);

  useEffect(() => {
    onCharCompletedRef.current = options?.onCharCompleted;
  }, [options?.onCharCompleted]);

  useEffect(() => {
    onWordCompletedRef.current = options?.onWordCompleted;
  }, [options?.onWordCompleted]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // 타이핑 중 100ms마다 실시간 WPM 갱신
  useEffect(() => {
    if (!isRunning || isFinished) return;

    intervalRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsedMin = (Date.now() - startTimeRef.current) / 1000 / 60;
      if (elapsedMin > 0) {
        setWpm(Math.round(typedLengthRef.current / elapsedMin));
      }
    }, 100);

    return () => clearTimer();
  }, [isRunning, isFinished, clearTimer]);

  const handleInput = useCallback(
    (val: string) => {
      if (isFinished) return;

      if (!isRunning && val.length > 0) {
        startTimeRef.current = Date.now();
        setIsRunning(true);
      }

      const prev = inputValueRef.current;
      if (val.length > prev.length && !composingRef.current) {
        const idx = val.length - 1;
        const correct = text[idx] === val[idx];
        onCharCompletedRef.current?.(correct, val[idx]);
      }

      // 단어 경계 감지: composingRef와 독립적으로 스페이스 기반 감지
      // (한글 IME에서 onChange가 compositionEnd보다 먼저 발생할 수 있음)
      if (val.length > prev.length) {
        const idx = val.length - 1;
        if (val[idx] === ' ' && text[idx] === ' ') {
          const spacesBefore = text.slice(0, idx).split(' ').length - 1;
          const targetWords = text.split(' ');
          const word = targetWords[spacesBefore];
          const korean = word.replace(/[^가-힣]/g, '');
          if (korean)
            onWordCompletedRef.current?.(
              korean,
              spacesBefore,
              targetWords.length
            );
        }
      }

      typedLengthRef.current = val.length;
      inputValueRef.current = val;
      setInputValue(val);

      if (val.length >= text.length) {
        // 마지막 단어 완료
        const targetWords = text.split(' ');
        const lastWordIndex = targetWords.length - 1;
        const lastWord = targetWords[lastWordIndex];
        const korean = lastWord.replace(/[^가-힣]/g, '');
        if (korean)
          onWordCompletedRef.current?.(
            korean,
            lastWordIndex,
            targetWords.length
          );
        clearTimer();
        if (startTimeRef.current) {
          const elapsedMin = (Date.now() - startTimeRef.current) / 1000 / 60;
          if (elapsedMin > 0) {
            setWpm(Math.round(val.length / elapsedMin));
          }
        }
        setIsRunning(false);
        setIsFinished(true);
      }
    },
    [isFinished, isRunning, text, clearTimer]
  );

  const restart = useCallback(() => {
    clearTimer();
    setText(getRandomText());
    setInputValue('');
    setIsRunning(false);
    setIsFinished(false);
    setWpm(0);
    startTimeRef.current = null;
    typedLengthRef.current = 0;
    inputValueRef.current = '';
  }, [clearTimer]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
  }, []);

  const onCompositionStart = useCallback(() => {
    composingRef.current = true;
    composingStartIdxRef.current = inputValueRef.current.length;
  }, []);

  const onCompositionEnd = useCallback(
    (e: React.CompositionEvent) => {
      composingRef.current = false;
      const data = e.data;
      if (!data || data.length === 0) return;

      const completedChar = data[data.length - 1];
      const idx = composingStartIdxRef.current;

      if (idx >= 0 && idx < text.length) {
        const correct = text[idx] === completedChar;
        onCharCompletedRef.current?.(correct, completedChar);
      }
    },
    [text]
  );

  const errorCount = inputValue.split('').reduce((count, char, i) => {
    return count + (text[i] !== char ? 1 : 0);
  }, 0);

  const totalTyped = inputValue.length;

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
    isRunning,
    isFinished,
    wpm,
    accuracy,
    errorCount,
    totalTyped,
    handleInput,
    restart,
    handlePaste,
    onCompositionStart,
    onCompositionEnd,
  };
}
