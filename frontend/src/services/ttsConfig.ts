export const TTS_CONFIG = {
  /** 동시 API 요청 제한 */
  maxConcurrent: 2,
  /** API 재시도 딜레이(ms) */
  retryDelay: 500,
  /** 메모리 캐시 최대 항목 수 (LRU) */
  maxMemoryEntries: 100,
} as const;

export function getTTSServerUrl(): string {
  return import.meta.env.VITE_TTS_SERVER_URL ?? 'http://localhost:3000';
}
