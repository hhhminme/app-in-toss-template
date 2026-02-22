import { TTS_CONFIG, getTTSServerUrl } from './ttsConfig';
import type { ToneName } from '../utils/toneMapping';

export async function checkTTSServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(getTTSServerUrl(), {
      method: 'HEAD',
      signal: controller.signal,
    });
    clearTimeout(timer);
    // 서버가 응답하면 (404 포함) 연결 성공으로 판단
    return res.status < 500;
  } catch {
    return false;
  }
}

export async function fetchTTSAudio(
  text: string,
  tone?: ToneName
): Promise<ArrayBuffer> {
  let url = `${getTTSServerUrl()}/api/tts/${encodeURIComponent(text)}`;
  if (tone) {
    url += `?tone=${encodeURIComponent(tone)}`;
  }

  const attempt = async (): Promise<ArrayBuffer> => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`TTS API ${res.status}`);
    return res.arrayBuffer();
  };

  try {
    return await attempt();
  } catch (err) {
    console.warn('[TTS] 첫 요청 실패, 재시도:', err);
    await new Promise(r => setTimeout(r, TTS_CONFIG.retryDelay));
    return attempt();
  }
}
