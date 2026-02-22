import { useCallback, useEffect, useRef, useState } from 'react';
import { useSoundEngine } from './useSoundEngine';
import { TTSAudioCache } from '../services/ttsAudioCache';
import { checkTTSServerHealth } from '../services/ttsApiClient';
import { evictStaleCache } from '../services/ttsIndexedDB';
import type { ToneName } from '../utils/toneMapping';

export interface PreloadProgress {
  loaded: number;
  total: number;
}

export function useTTSSoundEngine() {
  const sound = useSoundEngine();
  const { isSoundEnabled, getCtx, toggleSound } = sound;
  const [ttsServerConnected, setTTSServerConnected] = useState<boolean | null>(
    null
  );
  const [isPreloading, setIsPreloading] = useState(false);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress>({
    loaded: 0,
    total: 0,
  });

  useEffect(() => {
    checkTTSServerHealth().then(setTTSServerConnected);
    evictStaleCache().catch(() => {});
  }, []);

  const cacheRef = useRef<TTSAudioCache | null>(null);

  const getCache = useCallback(() => {
    if (!cacheRef.current) {
      const ctx = getCtx();
      cacheRef.current = new TTSAudioCache(ctx);
    }
    return cacheRef.current;
  }, [getCtx]);

  const playWord = useCallback(
    async (word: string, tone?: ToneName) => {
      if (!isSoundEnabled || !word) return;

      const cache = getCache();
      const buffer =
        cache.get(word, tone) ?? (await cache.getOrFetch(word, tone));
      if (!buffer) return;

      try {
        const ctx = getCtx();
        if (ctx.state === 'suspended') await ctx.resume();
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = 0.8;
        source.connect(gain).connect(ctx.destination);
        source.start();
      } catch (err) {
        console.warn('[TTS] 오디오 재생 실패:', err);
      }
    },
    [isSoundEnabled, getCtx, getCache]
  );

  const preloadText = useCallback(
    async (text: string): Promise<void> => {
      const words = text
        .split(/\s+/)
        .map(w => w.replace(/[^가-힣]/g, ''))
        .filter(Boolean);
      if (words.length === 0) return;
      const uniqueWords = [...new Set(words)];
      const cache = getCache();

      setIsPreloading(true);
      setPreloadProgress({ loaded: 0, total: uniqueWords.length });

      const POLL_INTERVAL = 100;
      const pollId = setInterval(() => {
        const progress = cache.getPreloadProgress();
        setPreloadProgress(() => {
          // total은 uncached 기준이므로, loaded가 진행되면 전체 대비 환산
          const idbLoaded = uniqueWords.length - progress.total;
          return {
            loaded: idbLoaded + progress.loaded,
            total: uniqueWords.length,
          };
        });
      }, POLL_INTERVAL);

      const DEFAULT_TONE: ToneName = 'excited';
      const wordsWithTone = uniqueWords.map(w => ({
        word: w,
        tone: DEFAULT_TONE,
      }));

      try {
        await cache.preloadChars(wordsWithTone);
      } finally {
        clearInterval(pollId);
        setPreloadProgress({
          loaded: uniqueWords.length,
          total: uniqueWords.length,
        });
        setIsPreloading(false);
      }
    },
    [getCache]
  );

  return {
    isSoundEnabled,
    toggleSound,
    playWord,
    preloadText,
    ttsServerConnected,
    isPreloading,
    preloadProgress,
  };
}
