import { SafeAreaInsets } from '@apps-in-toss/web-framework';
import { useState, useEffect } from 'react';

interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

const DEFAULT_INSETS: Insets = { top: 0, bottom: 0, left: 0, right: 0 };

export function useSafeArea(): Insets {
  const [insets, setInsets] = useState<Insets>(() => {
    try {
      return SafeAreaInsets.get();
    } catch {
      return DEFAULT_INSETS;
    }
  });

  useEffect(() => {
    try {
      const cleanup = SafeAreaInsets.subscribe({
        onEvent: newInsets => setInsets(newInsets),
      });
      return cleanup;
    } catch {
      return undefined;
    }
  }, []);

  return insets;
}
