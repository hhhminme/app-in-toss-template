import { useState, useCallback, useRef } from 'react';

interface ComboState {
  combo: number;
  maxCombo: number;
  comboTier: number;
}

interface ComboActions {
  registerCorrect: () => void;
  registerIncorrect: () => void;
  reset: () => void;
}

function getComboTier(combo: number): number {
  if (combo >= 30) return 4;
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}

export function useComboTracker(): ComboState & ComboActions {
  const comboRef = useRef(0);
  const maxComboRef = useRef(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const registerCorrect = useCallback(() => {
    comboRef.current += 1;
    if (comboRef.current > maxComboRef.current) {
      maxComboRef.current = comboRef.current;
      setMaxCombo(maxComboRef.current);
    }
    setCombo(comboRef.current);
  }, []);

  const registerIncorrect = useCallback(() => {
    comboRef.current = 0;
    setCombo(0);
  }, []);

  const reset = useCallback(() => {
    comboRef.current = 0;
    maxComboRef.current = 0;
    setCombo(0);
    setMaxCombo(0);
  }, []);

  const comboTier = getComboTier(combo);

  return {
    combo,
    maxCombo,
    comboTier,
    registerCorrect,
    registerIncorrect,
    reset,
  };
}
