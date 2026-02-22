import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'typing-sound-enabled';

function getStoredSoundEnabled(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  } catch {
    return true;
  }
}

export function useSoundEngine() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [isSoundEnabled, setIsSoundEnabled] = useState(getStoredSoundEnabled);

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    return ctxRef.current;
  }, []);

  const toggleSound = useCallback(() => {
    setIsSoundEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }, []);

  return { isSoundEnabled, toggleSound, getCtx };
}
