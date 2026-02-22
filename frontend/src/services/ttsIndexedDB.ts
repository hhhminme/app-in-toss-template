const DB_NAME = 'tts-audio-cache';
const STORE_NAME = 'syllables';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
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

export async function getCachedAudio(
  char: string
): Promise<ArrayBuffer | null> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(char);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[TTS] IndexedDB 읽기 실패:', err);
    return null;
  }
}

export async function setCachedAudio(
  char: string,
  data: ArrayBuffer
): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, char);
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
          if (req.result) result.set(char, req.result);
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
