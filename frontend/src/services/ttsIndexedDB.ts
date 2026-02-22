const DB_NAME = 'tts-audio-cache';
const STORE_NAME = 'syllables';
const DB_VERSION = 2;

const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7일
const MAX_CACHE_BYTES = 50 * 1024 * 1024; // 50MB

interface CacheEntry {
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

function isCacheEntry(value: unknown): value is CacheEntry {
  return (
    value !== null &&
    typeof value === 'object' &&
    'data' in value &&
    'timestamp' in value &&
    'size' in value
  );
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME);
        store.createIndex('timestamp', 'timestamp', { unique: false });
      } else {
        const tx = req.transaction;
        if (tx) {
          const store = tx.objectStore(STORE_NAME);
          if (!store.indexNames.contains('timestamp')) {
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openDB().catch(err => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}

/** v1 raw ArrayBuffer → v2 CacheEntry 변환 */
function resolveEntry(raw: unknown): ArrayBuffer | null {
  if (isCacheEntry(raw)) return raw.data;
  if (raw instanceof ArrayBuffer) return raw;
  return null;
}

export async function getCachedAudio(
  char: string
): Promise<ArrayBuffer | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(char);
      req.onsuccess = () => {
        const data = resolveEntry(req.result);
        if (data) {
          // LRU touch: 타임스탬프 갱신 (fire-and-forget)
          touchEntry(char, data).catch(() => {});
        }
        resolve(data);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[TTS] IndexedDB 읽기 실패:', err);
    return null;
  }
}

async function touchEntry(char: string, data: ArrayBuffer): Promise<void> {
  const db = await getDB();
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    size: data.byteLength,
  };
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.put(entry, char);
}

export async function setCachedAudio(
  char: string,
  data: ArrayBuffer
): Promise<void> {
  try {
    const db = await getDB();
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      size: data.byteLength,
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(entry, char);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[TTS] IndexedDB 쓰기 실패:', err);
  }
}

export async function getCachedAudioBatch(
  chars: string[]
): Promise<Map<string, ArrayBuffer>> {
  const result = new Map<string, ArrayBuffer>();
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      let completed = 0;
      if (chars.length === 0) {
        resolve(result);
        return;
      }
      for (const char of chars) {
        const req = store.get(char);
        req.onsuccess = () => {
          const data = resolveEntry(req.result);
          if (data) result.set(char, data);
          if (++completed === chars.length) resolve(result);
        };
        req.onerror = () => {
          if (++completed === chars.length) resolve(result);
        };
      }
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('[TTS] IndexedDB 배치 조회 실패:', err);
    return result;
  }
}

export async function evictStaleCache(): Promise<void> {
  try {
    const db = await getDB();
    const cutoff = Date.now() - MAX_CACHE_AGE_MS;

    // 1단계: 7일 초과 항목 삭제
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const range = IDBKeyRange.upperBound(cutoff);
      const cursorReq = index.openCursor(range);
      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    // v1 마이그레이션: timestamp 없는 레거시 항목도 정리
    await evictLegacyEntries(db);

    // 2단계: 용량 제한 — 50MB 초과 시 오래된 순 삭제
    await evictBySize(db);
  } catch (err) {
    console.warn('[TTS] IndexedDB 캐시 정리 실패:', err);
  }
}

async function evictLegacyEntries(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        if (!isCacheEntry(cursor.value)) {
          cursor.delete();
        }
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function evictBySize(db: IDBDatabase): Promise<void> {
  // 타임스탬프 오름차순으로 모든 엔트리의 키와 사이즈 수집
  const entries: Array<{ key: IDBValidKey; size: number }> = [];
  let totalSize = 0;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const cursorReq = index.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const entry = cursor.value as CacheEntry;
        const size = entry.size ?? 0;
        entries.push({ key: cursor.primaryKey, size });
        totalSize += size;
        cursor.continue();
      }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  if (totalSize <= MAX_CACHE_BYTES) return;

  // 오래된 순(배열 앞쪽)부터 삭제
  const keysToDelete: IDBValidKey[] = [];
  for (const entry of entries) {
    if (totalSize <= MAX_CACHE_BYTES) break;
    keysToDelete.push(entry.key);
    totalSize -= entry.size;
  }

  if (keysToDelete.length === 0) return;

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const key of keysToDelete) {
      store.delete(key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
