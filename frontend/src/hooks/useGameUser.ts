import { getUserKeyForGame } from '@apps-in-toss/web-framework';
import { useState, useEffect, useCallback } from 'react';

interface GameRecord {
  bestWpm: number;
  totalGames: number;
  lastPlayedAt: string;
}

interface UseGameUserReturn {
  userKey: string | null;
  record: GameRecord | null;
  saveRecord: (wpm: number) => void;
}

function getStorageKey(hash: string): string {
  return `game_record_${hash}`;
}

export function useGameUser(): UseGameUserReturn {
  const [userKey, setUserKey] = useState<string | null>(null);
  const [record, setRecord] = useState<GameRecord | null>(null);

  useEffect(() => {
    async function init() {
      try {
        const result = await getUserKeyForGame();

        if (!result) {
          return;
        }

        if (typeof result === 'object' && result.type === 'HASH') {
          setUserKey(result.hash);
          const saved = localStorage.getItem(getStorageKey(result.hash));
          if (saved) {
            setRecord(JSON.parse(saved) as GameRecord);
          }
        }
      } catch {
        // 샌드박스 환경 등에서 실패할 수 있음
      }
    }

    init();
  }, []);

  const saveRecord = useCallback(
    (wpm: number) => {
      if (!userKey) return;

      const current = record ?? { bestWpm: 0, totalGames: 0, lastPlayedAt: '' };
      const updated: GameRecord = {
        bestWpm: Math.max(current.bestWpm, wpm),
        totalGames: current.totalGames + 1,
        lastPlayedAt: new Date().toISOString(),
      };

      setRecord(updated);
      localStorage.setItem(getStorageKey(userKey), JSON.stringify(updated));
    },
    [userKey, record]
  );

  return { userKey, record, saveRecord };
}
