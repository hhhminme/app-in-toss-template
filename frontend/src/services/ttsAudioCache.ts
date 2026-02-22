import {
  getCachedAudio,
  getCachedAudioBatch,
  setCachedAudio,
} from './ttsIndexedDB';
import { fetchTTSAudio } from './ttsApiClient';
import { TTS_CONFIG } from './ttsConfig';
import type { ToneName } from '../utils/toneMapping';

export class TTSAudioCache {
  private static readonly MAX_ENTRIES = 100;

  private memory = new Map<string, AudioBuffer>();
  private pending = new Map<string, Promise<AudioBuffer | null>>();
  private ctx: AudioContext;

  private preloadTotal = 0;
  private preloadLoaded = 0;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  private cacheKey(word: string, tone?: ToneName): string {
    return tone ? `${word}:${tone}` : word;
  }

  /** LRU 삽입 — 최대 항목 초과 시 가장 오래된 항목 제거 */
  private setMemory(key: string, buf: AudioBuffer): void {
    this.memory.delete(key);
    this.memory.set(key, buf);
    if (this.memory.size > TTSAudioCache.MAX_ENTRIES) {
      const oldest = this.memory.keys().next().value;
      if (oldest !== undefined) this.memory.delete(oldest);
    }
  }

  /** 동기 — 메모리 캐시만 확인 (LRU 승격) */
  get(word: string, tone?: ToneName): AudioBuffer | null {
    const key = this.cacheKey(word, tone);
    const buf = this.memory.get(key);
    if (!buf) return null;
    // LRU 승격: 삭제 후 재삽입으로 최신 위치로 이동
    this.memory.delete(key);
    this.memory.set(key, buf);
    return buf;
  }

  /** 비동기 — 메모리 → IDB → API 순서 */
  async getOrFetch(word: string, tone?: ToneName): Promise<AudioBuffer | null> {
    const key = this.cacheKey(word, tone);
    const mem = this.memory.get(key);
    if (mem) return mem;

    // 동일 글자 중복 요청 방지
    const existing = this.pending.get(key);
    if (existing) return existing;

    const promise = this.fetchAndCache(word, tone);
    this.pending.set(key, promise);
    try {
      return await promise;
    } finally {
      this.pending.delete(key);
    }
  }

  /** 병렬 사전 로딩 (동시 maxConcurrent개 제한) */
  async preloadChars(
    items: Array<{ word: string; tone?: ToneName }>
  ): Promise<void> {
    // 톤 포함 캐시 키 생성
    const keys = items.map(({ word, tone }) => this.cacheKey(word, tone));

    // IDB에서 이미 캐싱된 것 배치 조회 (톤 포함 키)
    const idbCached = await getCachedAudioBatch(keys);
    for (const [key, buf] of idbCached) {
      if (!this.memory.has(key)) {
        try {
          const audioBuf = await this.ctx.decodeAudioData(buf.slice(0));
          this.setMemory(key, audioBuf);
        } catch (err) {
          console.warn('[TTS] IDB 오디오 디코딩 실패:', err);
        }
      }
    }

    // 아직 메모리에 없는 항목만 API 호출
    const uncachedItems = items.filter(
      ({ word, tone }) => !this.memory.has(this.cacheKey(word, tone))
    );
    this.preloadTotal = uncachedItems.length;
    this.preloadLoaded = 0;

    if (uncachedItems.length === 0) return;

    const max = TTS_CONFIG.maxConcurrent;
    let idx = 0;

    const next = async (): Promise<void> => {
      while (idx < uncachedItems.length) {
        const { word, tone } = uncachedItems[idx++];
        await this.getOrFetch(word, tone);
        this.preloadLoaded++;
      }
    };

    const workers = Array.from(
      { length: Math.min(max, uncachedItems.length) },
      () => next()
    );
    await Promise.allSettled(workers);
  }

  getPreloadProgress(): { loaded: number; total: number } {
    return { loaded: this.preloadLoaded, total: this.preloadTotal };
  }

  private async fetchAndCache(
    word: string,
    tone?: ToneName
  ): Promise<AudioBuffer | null> {
    const key = this.cacheKey(word, tone);

    // IDB 확인
    try {
      const idbData = await getCachedAudio(key);
      if (idbData) {
        const audioBuf = await this.ctx.decodeAudioData(idbData.slice(0));
        this.setMemory(key, audioBuf);
        return audioBuf;
      }
    } catch (err) {
      console.warn('[TTS] IDB 캐시 조회 실패, API로 진행:', err);
    }

    // API 호출
    try {
      const raw = await fetchTTSAudio(word, tone);
      // IDB에 저장 (fire-and-forget)
      setCachedAudio(key, raw.slice(0));
      const audioBuf = await this.ctx.decodeAudioData(raw);
      this.setMemory(key, audioBuf);
      return audioBuf;
    } catch (err) {
      console.warn('[TTS] API 호출 또는 디코딩 실패:', err);
      return null;
    }
  }
}
