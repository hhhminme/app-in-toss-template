# TTS 서비스 최적화 보고서

> **작성일**: 2026-02-22
> **분석 대상**: `key-speed` (프론트엔드) + `key-speed-server` (TTS 프록시)
> **분석 범위**: 캐싱 파이프라인, 프리로드/재생 흐름, ElevenLabs 비용, 최적화 제안

---

## 1. 개요

### 1.1 프로젝트 배경

**타자 속도 측정기**는 Apps In Toss 플랫폼에서 동작하는 한글 타이핑 속도 측정 게임입니다. 사용자가 단어를 완성할 때마다 해당 단어의 TTS(Text-to-Speech) 음성을 재생하여 게임의 몰입감을 높이는 기능을 제공합니다.

TTS 음성은 **ElevenLabs API**(`eleven_v3` 모델 + Audio Tags)를 통해 합성되며, 프론트엔드와 서버 양쪽에서 4단계 캐싱 전략을 활용합니다.

### 1.2 분석 목적

1. 현재 TTS 캐싱 파이프라인의 구조적 문제점 식별
2. **프리로드(preload)와 재생(playback) 간 캐시 키 불일치** 버그 분석
3. ElevenLabs 사용 비용 모델링 및 요금제 비교
4. 비용 절감 및 성능 최적화를 위한 개선 방안 제시

### 1.3 분석 범위

| 영역 | 분석 파일 |
|------|----------|
| 캐시 관리 | `frontend/src/services/ttsAudioCache.ts`, `ttsIndexedDB.ts` |
| API 클라이언트 | `frontend/src/services/ttsApiClient.ts`, `ttsConfig.ts` |
| TTS 엔진 | `frontend/src/hooks/useTTSSoundEngine.ts`, `useSoundEngine.ts` |
| 게임 로직 | `frontend/src/components/TypingTest.tsx` |
| 톤 매핑 | `frontend/src/utils/toneMapping.ts` |
| 텍스트 데이터 | `frontend/src/data/sampleTexts.ts` |

---

## 2. 현재 아키텍처 분석

### 2.1 시스템 구성

```
┌─────────────────────────────────────────────────────────────┐
│                        Toss App                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              key-speed (프론트엔드)                      │  │
│  │                                                        │  │
│  │  TypingTest ──► useTTSSoundEngine ──► TTSAudioCache    │  │
│  │       │              │                     │           │  │
│  │  selectTone()   preloadText()         ┌────┴────┐      │  │
│  │  (톤 결정)      (톤 없이!)            │ Memory  │      │  │
│  │       │              │                │  Cache  │      │  │
│  │  playWord()          │                ├─────────┤      │  │
│  │  (톤 포함!)          │                │IndexedDB│      │  │
│  │                      │                └────┬────┘      │  │
│  └──────────────────────┼─────────────────────┼───────────┘  │
│                         │                     │              │
└─────────────────────────┼─────────────────────┼──────────────┘
                          │                     │ HTTP
                          │                     ▼
                          │          ┌──────────────────────┐
                          │          │  key-speed-server    │
                          │          │  (Express + TS)      │
                          │          │                      │
                          │          │  ┌────────────────┐  │
                          │          │  │  File Cache    │  │
                          │          │  │ (cache/*.mp3)  │  │
                          │          │  └───────┬────────┘  │
                          │          └──────────┼───────────┘
                          │                     │ HTTPS
                          │                     ▼
                          │          ┌──────────────────────┐
                          │          │  ElevenLabs API      │
                          │          │  eleven_v3 + Tags    │
                          │          └──────────────────────┘
                          ▼
                    사용자 타이핑
```

### 2.2 4단계 캐싱 파이프라인

음성 데이터는 다음 4단계 캐시를 순차적으로 탐색합니다:

```
요청: "오늘" 발음 재생 (tone: excited)

┌──────────────────────────────────────────────────────────────┐
│ 1단계: Memory Cache (Map<string, AudioBuffer>)               │
│    키: "오늘:excited"                                         │
│    ├── HIT  → 즉시 AudioBuffer 반환 (0ms)                    │
│    └── MISS → 2단계로                                        │
├──────────────────────────────────────────────────────────────┤
│ 2단계: IndexedDB ("tts-audio-cache" DB, "syllables" store)   │
│    키: "오늘:excited"                                         │
│    ├── HIT  → decodeAudioData → Memory 저장 → 반환 (~10ms)   │
│    └── MISS → 3단계로                                        │
├──────────────────────────────────────────────────────────────┤
│ 3단계: TTS 서버 파일 캐시 (cache/*.mp3)                       │
│    키: 원문 텍스트 (현재 서버는 톤 파라미터 무시, 항상 excited) │
│    ├── HIT  → MP3 반환 → IDB 저장 → decode → Memory → 반환   │
│    └── MISS → 4단계로                                        │
├──────────────────────────────────────────────────────────────┤
│ 4단계: ElevenLabs API (eleven_v3 모델)                        │
│    "[excited] 오늘!" → 음성 합성                              │
│    └── MP3 응답 → 서버 파일 저장 → IDB 저장 → decode → Memory │
└──────────────────────────────────────────────────────────────┘
```

> **참고**: 현재 TTS 서버는 톤 쿼리 파라미터를 무시하고 항상 `[excited]` Audio Tag를 적용합니다. 서버 캐시 키는 원문 텍스트만 사용합니다.

### 2.3 캐시 키 구조

캐시 키는 `TTSAudioCache.cacheKey()` 메서드에서 생성됩니다:

```typescript
// frontend/src/services/ttsAudioCache.ts:18-20
private cacheKey(word: string, tone?: ToneName): string {
  return tone ? `${word}:${tone}` : word;
}
```

| 호출 상황 | 인자 | 생성되는 키 |
|----------|------|-----------|
| 프리로드 시 | `cacheKey("오늘")` | `"오늘"` |
| 재생 시 | `cacheKey("오늘", "excited")` | `"오늘:excited"` |

**이 키 차이가 핵심 버그의 원인입니다.** (상세 분석은 3.1절 참조)

---

## 3. 발견된 문제점

### 3.1 🔴 Critical: 프리로드/재생 톤 불일치 (캐시 무효화)

**심각도**: Critical
**영향**: 프리로드된 음성이 재생 시 전혀 사용되지 않아, 매 재생마다 API를 재호출

#### 근본 원인

`preloadText()`와 `playWord()`의 **인터페이스 비대칭**:

```typescript
// useTTSSoundEngine.ts:58 — 톤 정보 없음
preloadText(text: string): Promise<void>

// useTTSSoundEngine.ts:33 — 톤 포함
playWord(word: string, tone?: ToneName): Promise<void>
```

톤은 게임 진행 중 실시간으로 결정되므로(`selectTone()` — combo, wpm, 에러 상태 기반), preload 시점에 어떤 톤이 필요할지 알 수 없습니다. 그러나 현재 구현은 이를 고려하지 않고 **톤 없이 프리로드, 톤 포함하여 재생**하고 있습니다.

#### 실행 흐름 추적

**① 프리로드 단계** — 텍스트 로드 시 (톤 없이 캐싱)

```
TypingTest.tsx:101-105 (useEffect)
  │  text가 변경되면 preloadText(text) 호출
  ▼
useTTSSoundEngine.ts:59-63 (preloadText)
  │  text.split(/\s+/) → 한글만 추출 → 중복 제거
  │  cache.preloadChars(uniqueWords) 호출  ← ⚠️ 톤 없음
  ▼
ttsAudioCache.ts:49 (preloadChars → getCachedAudioBatch)
  │  IDB에서 bare key로 배치 조회 (예: "오늘")
  │  → this.memory.set("오늘", audioBuf)  (line 54)
  ▼
ttsAudioCache.ts:74 (uncached → getOrFetch)
  │  getOrFetch(char) ← tone=undefined
  │  → cacheKey("오늘", undefined) = "오늘"  (line 90)
  │  → API: GET /api/tts/오늘  ← 톤 쿼리 파라미터 없음
  │  → IDB에 "오늘" 키로 저장 (line 108)
  │  → Memory에 "오늘" 키로 저장 (line 110)
```

**② 재생 단계** — 단어 완성 시 (톤 포함 요청)

```
TypingTest.tsx:63-68 (onWordCompleted)
  │  selectTone({combo, wpm, ...}) → 예: "excited"  (toneMapping.ts:31 기본값)
  │  playWord("오늘", "excited")
  ▼
useTTSSoundEngine.ts:38 (playWord)
  │  cache.get("오늘", "excited")
  │  → cacheKey("오늘", "excited") = "오늘:excited"  ← 다른 키!
  │  → Memory에서 "오늘:excited" 검색 → MISS
  ▼
  │  cache.getOrFetch("오늘", "excited")
  │  → IDB에서 "오늘:excited" 검색 → MISS
  │  → API: GET /api/tts/오늘?tone=excited  ← 중복 API 호출!
  │  → Memory와 IDB에 "오늘:excited" 키로 추가 저장
```

#### 결과

```
프리로드 저장:  Memory["오늘"] = AudioBuffer(A)      ← 사용 안 됨
                IDB["오늘"] = ArrayBuffer(A)          ← 사용 안 됨

재생 시 조회:   Memory["오늘:excited"] → undefined    ← MISS
                IDB["오늘:excited"] → undefined        ← MISS
                → API 재호출 (불필요한 비용 + 지연)

결과 저장:      Memory["오늘:excited"] = AudioBuffer(B)  ← 새로 생성
                IDB["오늘:excited"] = ArrayBuffer(B)      ← 중복 저장
```

- **프리로드된 데이터가 100% 낭비**됨
- 매 게임마다 모든 단어에 대해 **API를 2번씩 호출** (프리로드 1회 + 재생 1회)
- 사용자 경험: 프리로드 완료를 기다리지만 (`shouldBlockForPreload`, `TypingTest.tsx:139`), playback 시 **다시 네트워크 지연** 발생
- IndexedDB에 동일 단어의 **톤 없는 버전과 톤 있는 버전이 이중 저장**
- `selectTone`의 기본 반환값이 `'excited'` (`toneMapping.ts:31`) → 대부분의 playback이 `":excited"` 접미사 사용

#### 영향 범위

| 항목 | 현재 상태 | 정상 동작 시 |
|------|----------|------------|
| 프리로드 캐시 적중률 | **0%** | ~90%+ |
| 단어당 API 호출 | **2회** (프리로드+재생) | 최초 1회만 |
| 재생 지연 | 네트워크 왕복 시간 | 즉시 (메모리) |
| ElevenLabs 문자 소모 | **2배 과다** | 정상 |

---

### 3.2 🟠 High: IndexedDB에 TTL/LRU/용량 제한 없음

**파일**: `frontend/src/services/ttsIndexedDB.ts`

IndexedDB 캐시에 어떠한 만료 정책도 구현되어 있지 않습니다:

- **TTL 없음**: 한번 저장된 음성 데이터가 **영구 보존**됨, 만료 메커니즘 전무
- **LRU 없음**: 접근 빈도/시간 추적 없음
- **용량 제한 없음**: 저장 가능한 총 크기에 대한 체크 없음
- **버전 관리 없음**: 서버 측 음성 모델/설정이 변경되어도 클라이언트 캐시는 갱신 안 됨 (stale 상태)

```typescript
// ttsIndexedDB.ts:58 — 무조건 저장, 삭제 로직 없음
const req = store.put(data, char);
```

**현재 톤 불일치 버그로 인한 추가 문제**: 같은 단어에 대해 톤 없는 키(`"오늘"`)와 톤 있는 키(`"오늘:excited"`)가 모두 저장되어 **이중 공간 낭비** 발생

**잠재적 위험**:
- 8개 톤 × N개 단어 = 최대 8N개 항목이 영구 축적
- 각 MP3 약 10-50KB → 1000개 단어 × 8톤 = **80MB-400MB** 잠재적 사용량
- 모바일 기기에서 스토리지 경고 또는 브라우저 자동 정리로 인한 예측 불가능한 캐시 삭제

---

### 3.3 🟠 High: 이중 영구 캐싱 (프론트 IDB + 서버 파일 캐시)

- **프론트엔드**: IndexedDB에 영구 저장 (`ttsIndexedDB.ts:58`)
- **서버**: `cache/*.mp3` 파일 시스템 캐시에 영구 저장 (ARCHITECTURE.md 참고)
- 양쪽 모두 **캐시 무효화 메커니즘 없음**
- HTTP `Cache-Control`/`ETag` 헤더 미사용 → 브라우저 표준 캐싱도 활용되지 않음
- 서버 음성 모델/설정 변경 시 프론트 IDB 캐시가 **stale 상태**로 영구 남음

---

### 3.4 🟡 Medium: 메모리 캐시(Map) 무한 성장

**파일**: `frontend/src/services/ttsAudioCache.ts:7`

```typescript
private memory = new Map<string, AudioBuffer>();
```

- 페이지가 유지되는 동안 메모리 캐시가 **무한히 증가** — `Map.delete()` 호출 없음
- `AudioBuffer`는 디코딩된 PCM 데이터 → 압축 MP3 대비 **10~20배 크기**
  - 예: 1초 오디오 44.1kHz stereo = ~352KB (PCM) vs ~16KB (MP3)
- 톤 불일치로 인해 톤 없는 버전과 톤 있는 버전이 모두 메모리에 축적
- 장시간 플레이 시 저사양 모바일 기기에서 **OOM(Out of Memory) 위험**

**현재 규모**: 샘플 텍스트 1개(7단어)로는 문제가 미미하나, 텍스트 확장 시 심각해질 수 있음

---

### 3.5 🟡 Medium: 동시 요청 제한 (maxConcurrent: 2)과 입력 차단

**파일**: `frontend/src/services/ttsConfig.ts:3`, `ttsAudioCache.ts:68-82`

```typescript
maxConcurrent: 2,
```

- Worker pool 패턴: `Math.min(max, uncached.length)` 워커 생성 (`ttsAudioCache.ts:79`)
- 각 워커가 공유 인덱스 `idx`에서 순차 처리 (`ttsAudioCache.ts:72-76`)
- 7개 단어를 2개씩 순차 처리하면 **최소 4번의 순차 배치** 필요
- 각 ElevenLabs API 호출이 ~500ms-2s → **프리로드 완료까지 2-8초**
- 사용자는 프리로드 완료 전까지 **입력이 차단**됨 (`shouldBlockForPreload`, `TypingTest.tsx:139`)
- `pending` Map으로 동일 키 중복 요청 방지 (`ttsAudioCache.ts:34-35`) — 이 부분은 잘 구현됨

---

### 3.6 🟢 Low: 재시도 로직의 단순함

**파일**: `frontend/src/services/ttsApiClient.ts:32-38`

```typescript
try {
  return await attempt();
} catch (err) {
  console.warn('[TTS] 첫 요청 실패, 재시도:', err);
  await new Promise((r) => setTimeout(r, TTS_CONFIG.retryDelay));  // 500ms
  return attempt();  // 1회만 재시도
}
```

- **지수 백오프(exponential backoff)** 없이 고정 500ms 딜레이 후 1회만 재시도
- ElevenLabs API의 rate limit 에러(429) 발생 시 적절한 대응 부재
- 프리로드 중 연속 실패 시 해당 단어의 음성이 영구적으로 누락

---

### 3.7 🟢 Low: 단일 샘플 텍스트

**파일**: `frontend/src/data/sampleTexts.ts:1-3`

```typescript
export const sampleTexts: string[] = [
  '오늘 하루도 최선을 다해 살아가는 당신을 응원합니다.',
];
```

- 현재 **1개의 텍스트**만 존재 (7개 고유 한글 단어)
- 모든 사용자가 동일한 텍스트로 테스트 → 서버 캐시 효율 극대화 가능 (버그 수정 후)
- 텍스트 확장 시 TTS 비용이 선형적으로 증가

---

## 4. ElevenLabs 비용 분석

### 4.1 요금제 비교표

> ElevenLabs 2026년 2월 기준 요금제

| 플랜 | 월 가격 | 연간 (월 환산) | 월 크레딧 | TTS 시간(약) |
|------|---------|--------------|----------|-------------|
| **Free** | $0 | $0 | 10,000 | ~10분 |
| **Starter** | $5 | $4.17 | 30,000 | ~30분 |
| **Creator** | $22 | $18.33 | 100,000 | ~100분 |
| **Pro** | $99 | $82.50 | 500,000 | ~500분 |
| **Scale** | $330 | $275 | 2,000,000 | ~2,000분 |
| **Business** | $1,320 | $1,100 | 11,000,000 | ~11,000분 |
| **Enterprise** | 커스텀 | 커스텀 | 커스텀 | 커스텀 |

**크레딧 시스템**:
- `eleven_v3` 모델: **1 크레딧 = 1 텍스트 문자** (표준 요율, 추가 비용 없음)
- Turbo v2.5 모델: 0.5 크레딧/문자 (50% 할인)
- 1,000 크레딧 ≈ 1분 TTS 오디오
- 미사용 크레딧은 **최대 2개월분까지 이월** 가능 (구독 유지 시)
- `eleven_v3` 요청당 최대 3,000자

**초과 사용(Overage) 요금**:

| 플랜 | 1,000자당 초과 비용 | 비고 |
|------|-------------------|------|
| Free / Starter | — | **초과 사용 불가** (한도 소진 시 다음 달까지 대기) |
| Creator | $0.30 | |
| Pro | $0.24 | |
| Scale | $0.18 | |
| Business | $0.12 | |

### 4.2 문자 수 계산 규칙

#### Audio Tags 과금 규칙

**핵심: Audio Tags는 문자 수에 포함됩니다.**

ElevenLabs는 API로 전송된 **전체 텍스트 문자열** 기준으로 크레딧을 차감합니다. Audio Tags(`[excited]`, `[sad]` 등)의 대괄호, 태그명, 공백 모두 문자로 카운트됩니다.

#### 프론트엔드 → TTS 서버 요청

프론트엔드의 `ttsApiClient.ts`는 텍스트를 **있는 그대로** 서버에 전달합니다:

```typescript
// ttsApiClient.ts:21-24
let url = `${getTTSServerUrl()}/api/tts/${encodeURIComponent(text)}`;
if (tone) {
  url += `?tone=${encodeURIComponent(tone)}`;
}
```

#### TTS 서버 → ElevenLabs 변환

서버의 `elevenlabs.ts`에서 Audio Tags를 추가합니다. **현재 서버는 톤 쿼리 파라미터를 무시하고 항상 `[excited]`를 사용합니다.**

```
원문: "오늘" (2자)
→ API 전송: "[excited] 오늘!" (13자)
→ 오버헤드: [excited](10자) + 공백(1자) = 태그 11자, + !(1자) = 총 +11자/단어
```

#### 톤별 Audio Tags 오버헤드

| 톤 | Audio Tag | 총 오버헤드 (태그+공백+!) |
|----|-----------|------------------------|
| excited | `[excited]` | +11자 |
| angry | `[angry]` | +9자 |
| whisper | `[whisper]` | +11자 |
| happy | `[happy]` | +9자 |
| sad | `[sad]` | +7자 |
| calm | `[calm]` | +8자 |
| dramatic | `[dramatic]` | +12자 |
| neutral | `[neutral]` | +11자 |
| **평균** | — | **+9.75자** |

> 톤 다양화 시 짧은 태그(sad +7, calm +8) 우선 사용으로 비용 절감 가능

#### 현재 샘플 텍스트 문자 수 분석

```
텍스트: "오늘 하루도 최선을 다해 살아가는 당신을 응원합니다."
```

| 단어 | 한글 글자 수 | API 전송 문자 수 (`[excited] {단어}!`) |
|------|------------|--------------------------------------|
| 오늘 | 2 | 13 |
| 하루도 | 3 | 14 |
| 최선을 | 3 | 14 |
| 다해 | 2 | 13 |
| 살아가는 | 4 | 15 |
| 당신을 | 3 | 14 |
| 응원합니다 | 5 | 16 |
| **합계** | **22** | **99** |
| **평균** | **3.14** | **14.14** |

**Audio Tags 오버헤드로 실제 API 소비 문자 수는 원문의 약 4.5배**

### 4.3 시나리오별 월간 비용 예측

#### 시나리오 정의

| 시나리오 | DAU | 게임/일 | 고유 단어/게임 | 캐시 적중률 |
|---------|-----|--------|-------------|-----------|
| A. 현재 (버그) | 10 | 3 | 7 | **0%** (클라이언트 IDB 캐시 미스) |
| B. 버그 수정 후 | 10 | 3 | 7 | **~90%** |
| C. 성장 (5 텍스트) | 100 | 3 | 35 | **~80%** |
| D. 확장 (20 텍스트) | 1,000 | 5 | 140 | **~70%** |

#### 관점 A: 서버 캐시 미포함 (Worst-case, 서버 재배포마다 캐시 초기화)

| | 현재 (버그) | 수정 후 | 성장 (5텍스트) | 확장 (20텍스트) |
|---|-----------|--------|-------------|---------------|
| **DAU** | 10 | 10 | 100 | 1,000 |
| **게임/일** | 3 | 3 | 3 | 5 |
| **고유 단어/게임** | 7 | 7 | 35 | 140 |
| **캐시 히트율** | 0% | 90% | 80% | 70% |
| **월 TTS 요청** | 6,300 | 6,300 | 315,000 | 21,000,000 |
| **API 호출 (캐시 미스)** | 6,300 | 630 | 63,000 | 6,300,000 |
| **월 소비 문자** | **89,082** | **8,908** | **890,820** | **89,082,000** |

**플랜별 적합성**:

| 시나리오 | Free | Starter | Creator | Pro | Scale | Business |
|---------|------|---------|---------|-----|-------|----------|
| **현재 (89K)** | ❌ | ❌ | ✅ 여유 | ✅ | ✅ | ✅ |
| **수정 후 (9K)** | ✅ 여유 | ✅ | ✅ | ✅ | ✅ | ✅ |
| **성장 (891K)** | ❌ | ❌ | ❌ | ❌ 초과 | ✅ 여유 | ✅ |
| **확장 (89M)** | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ 초과 |

**확장 시나리오 초과 비용**:

| 플랜 | 포함 크레딧 | 초과 문자 | 초과 비용 | 총 월 비용 |
|------|----------|---------|---------|----------|
| Pro ($99) | 500K | 88.6M | $21,259 | **$21,358** |
| Scale ($330) | 2M | 87.1M | $15,678 | **$16,008** |
| Business ($1,320) | 11M | 78.1M | $9,372 | **$10,692** |

**Worst-case 추천 플랜**:

| 시나리오 | 추천 플랜 | 월 비용 | 비고 |
|---------|---------|--------|------|
| 현재 (버그) | Creator | **$22/mo** | 89K자, 100K 한도 내 |
| 버그 수정 후 | **Free** | **$0/mo** | 9K자, 10K 한도 내 |
| 성장 (5텍스트) | Pro + 초과 | ~$193/mo | Scale($330)보다 저렴 |
| 확장 (20텍스트) | Business + 초과 | ~$10,692/mo | **비현실적** |

#### 관점 B: 서버 캐시 포함 (현실적 추정)

서버 파일 캐시(`cache/*.mp3`)는 영구 지속됩니다. 한번 생성된 단어-톤 조합은 서버에서 직접 MP3를 반환하므로 **ElevenLabs API를 재호출하지 않습니다.**

| 시나리오 | 고유 단어 수 | 일회성 API 문자 | 이후 월 비용 |
|---------|------------|---------------|------------|
| 현재/수정 후 (1텍스트) | 7 | 99자 | **$0** |
| 성장 (5텍스트) | 35 | 495자 | **$0** |
| 확장 (20텍스트) | 140 | 1,980자 | **$0** |

> **서버 캐시 유지 시 모든 시나리오에서 Free 플랜($0/mo)으로 충분합니다!**

**서버 캐시 무효화 빈도별 비용** (확장 시나리오, 140단어):

| 캐시 초기화 빈도 | 월 API 문자 | 필요 플랜 |
|----------------|-----------|---------|
| 월 1회 | 1,980 | Free ($0) |
| 주 1회 | 7,920 | Free ($0) |
| 일 1회 | 59,400 | Starter ($5) |

> ⚠️ **핵심 인사이트**: 서버 캐시 볼륨의 영속화가 비용에 결정적입니다. 배포 시 캐시 디렉토리(`cache/`)를 영구 볼륨에 마운트하면 비용을 사실상 제로로 유지할 수 있습니다.

---

## 5. 최적화 제안

### 5.1 제안 목록 (우선순위별)

#### P0 (즉시): 프리로드/재생 톤 불일치 수정

**문제**: `preloadText()`가 톤 없이 캐싱, `playWord()`가 톤 포함 키로 조회 → 항상 캐시 미스

**수정 방안 A (추천) — 기본 톤으로 프리로드**:

`selectTone()`의 기본 반환값이 `'excited'`(`toneMapping.ts:31`)이므로, 프리로드 시에도 `'excited'` 톤으로 통일합니다:

```typescript
// useTTSSoundEngine.ts — preloadText 수정
const DEFAULT_TONE: ToneName = 'excited';
const wordsWithTone = uniqueWords.map(w => ({ word: w, tone: DEFAULT_TONE }));
await cache.preloadChars(wordsWithTone);
```

- **장점**: 최소 코드 변경 (1-2시간), 대부분의 playback에서 캐시 히트 (excited가 기본)
- **단점**: excited 외 톤(sad, calm 등)은 여전히 캐시 미스 → 실시간 API 호출
- **캐시 적중률**: 약 70%+ (excited가 기본 톤이므로)

**수정 방안 B — 톤 제거 통일 (neutral 단일 음성)**:

```typescript
// 프리로드: 톤 없이 (현재대로)
// 재생: 톤 파라미터를 무시
playWord(word);  // tone 제거
```

- **장점**: 매우 낮은 노력, 100% 캐시 적중
- **단점**: 게임 상황에 따른 톤 변화 기능 상실 (게임성 감소)

**수정 방안 C — 모든 톤 사전 캐싱**:

```typescript
// useTTSSoundEngine.ts — preloadText 수정
const ALL_TONES: ToneName[] = ['excited', 'angry', 'whisper', 'happy', 'sad', 'calm', 'dramatic', 'neutral'];
for (const word of uniqueWords) {
  for (const tone of ALL_TONES) {
    await cache.getOrFetch(word, tone);
  }
}
```

- **장점**: 어떤 톤이 선택되든 항상 캐시 히트 (100%)
- **단점**: 7단어 × 8톤 = 56 API 호출 (최초만), 프리로드 시간 8배 증가

**노력/효과**: 낮은 노력 (코드 수십 줄 수정) / 극도로 높은 효과 (비용 50%+ 절감)

---

#### P0 (즉시): 메모리 캐시 LRU 제한

**파일**: `frontend/src/services/ttsAudioCache.ts:7`

```typescript
// 현재: 무한 증가
private memory = new Map<string, AudioBuffer>();

// 제안: 최대 100개 제한, LRU eviction
private memory = new Map<string, AudioBuffer>();
private static readonly MAX_ENTRIES = 100;

private setMemory(key: string, buf: AudioBuffer) {
  if (this.memory.size >= TTSAudioCache.MAX_ENTRIES) {
    const oldest = this.memory.keys().next().value;
    this.memory.delete(oldest);
  }
  this.memory.set(key, buf);
}
```

**노력/효과**: 낮음 (2시간) / 높음 (메모리 누수 방지, 모바일 OOM 예방)

---

#### P1 (1주 내): IndexedDB 캐시 관리 개선

**제안**:
1. **TTL 추가**: 캐시 항목에 저장 시각을 기록하고, 7일 이상 된 항목 자동 삭제
2. **용량 제한**: 총 저장 크기를 50MB로 제한, 초과 시 oldest 삭제
3. **스키마 업그레이드**: IndexedDB 버전을 올려서 `timestamp` 인덱스 추가

```typescript
// 제안: ttsIndexedDB.ts 개선 — DB_VERSION 2
interface CacheEntry {
  data: ArrayBuffer;
  timestamp: number;
  size: number;
}

// 저장 시 메타데이터 포함
store.put({ data, timestamp: Date.now(), size: data.byteLength }, key);

// 정리 로직 (앱 시작 시 또는 주기적)
function evictExpired(maxAge = 7 * 24 * 60 * 60 * 1000) { ... }
function evictBySize(maxBytes = 50 * 1024 * 1024) { ... }
```

**노력/효과**: 중간 (3-5일) / 높음 (스토리지 안정성 + stale 캐시 방지)

---

#### P1 (1주 내): 서버 통합 개선

**HTTP Cache-Control 헤더 추가**:

```typescript
// key-speed-server — tts.ts 응답에 추가
res.set('Cache-Control', 'public, max-age=604800');  // 7일
res.set('ETag', `"${textHash}"`);
```

- 브라우저 표준 캐시 활용 → 프론트엔드 IDB 캐시와 이중 관리 필요 제거 가능
- 노력: 서버 1시간 / 효과: 높음

**Batch API 엔드포인트 추가**:

```typescript
// key-speed-server — 새 엔드포인트
POST /api/tts/batch
body: { words: ["오늘", "하루도", ...], tone: "excited" }
response: multipart audio (또는 zip)
```

- 단일 요청으로 여러 단어 처리 → HTTP 오버헤드 감소
- 노력: 서버 4시간 / 효과: 높음 (프리로드 속도 개선)

---

#### P2 (2주 내): 프리로드 전략 최적화

**현재 문제**: 프리로드 완료까지 사용자 입력 차단

**Lazy 프리로드 — 현재 + 다음 3~5단어만 선행 로드**:

```typescript
// useTTSSoundEngine.ts — 2단계 프리로드
const PRIORITY_COUNT = 3;
const priority = uniqueWords.slice(0, PRIORITY_COUNT);
const rest = uniqueWords.slice(PRIORITY_COUNT);

await cache.preloadChars(priority);  // 우선 로드
setIsPreloading(false);               // 입력 허용
cache.preloadChars(rest);             // 백그라운드 (await 없이)
```

**Progressive 프리로드 — 타이핑 진행에 따라 다음 단어 선행 로드**:

- 사용자가 현재 단어를 입력하는 동안 다음 2-3단어를 비동기 로드
- 노력: 높음 / 효과: 중간 (UX 최적화)

---

#### P3 (1개월): 정적 음성 사전 생성 + CDN

**제안**: 모든 샘플 텍스트의 모든 단어를 **빌드 시점** 또는 **배포 시점**에 미리 생성하여 정적 파일로 제공

```
빌드 파이프라인:
  sampleTexts.ts → 고유 단어 추출 → ElevenLabs API → MP3 생성 → CDN 배포

런타임:
  프론트엔드 → CDN에서 MP3 다운로드 → 즉시 재생 (ElevenLabs API 호출 0)
```

`key-speed-server`의 `batch.ts` 스크립트(사전 캐싱 스크립트, 300ms 간격)를 CI/CD 파이프라인에 통합하여 자동화 가능.

**장점**:
- 런타임 ElevenLabs API 호출 **제로**
- 프리로드 속도 대폭 향상 (CDN 속도)
- 규모에 관계없이 비용 일정 (빌드 시 1회)

**노력/효과**: 높음 (1-2주, 빌드 파이프라인 구축) / 극대 (런타임 비용 ~$0)

---

#### P4 (장기): 서버-클라이언트 캐시 키 통일

현재 캐시 키 불일치 현황:

| 레이어 | 캐시 키 | 톤 반영 |
|--------|--------|--------|
| 프론트 Memory/IDB | `word:tone` | ✅ |
| 서버 파일 캐시 | 원문 텍스트 | ❌ (톤 무시) |
| ElevenLabs 전송 | `[excited] word!` | 항상 excited 고정 |

서버-클라이언트 간 캐시 키 전략을 통일하고, 서버에서 톤별 캐싱을 지원하도록 변경하는 것이 장기적으로 중요합니다.

### 5.2 노력/효과 매트릭스

```
효과 (비용 절감 + UX 개선)
  ^
  │
높 │  ★ P0 (톤 불일치 수정)         ★ P3 (정적 사전 생성)
음 │  ★ P0 (메모리 LRU)
  │
  │  ★ P1 (IDB 관리)
중 │  ★ P1 (HTTP Cache-Control)
간 │
  │  ★ P2 (Lazy 프리로드)          ★ P4 (캐시 키 통일)
  │
낮 │
음 │
  └──────────────────────────────────────────────────────► 노력
     낮음              중간              높음
```

| 제안 | 노력 | 효과 | 우선순위 | 비용 절감률 |
|------|------|------|---------|-----------|
| P0: 톤 불일치 수정 | 낮음 (1-2시간) | 극대 | **즉시** | **50-90%** |
| P0: 메모리 LRU | 낮음 (2시간) | 높음 | **즉시** | 간접적 (안정성) |
| P1: IDB TTL/LRU | 중간 (3-4시간) | 높음 | 1주 내 | 간접적 (스토리지) |
| P1: HTTP Cache-Control | 낮음 (1시간, 서버) | 높음 | 1주 내 | 이중 캐시 제거 |
| P1: Batch API | 중간 (4시간, 서버) | 높음 | 1주 내 | 프리로드 속도 |
| P2: Lazy 프리로드 | 중간 (4시간) | 중간 | 2주 내 | UX 개선 |
| P3: 정적 사전 생성 | 높음 (1-2주) | 극대 | 1개월 | **~100%** |
| P4: 캐시 키 통일 | 중간 (3-5일) | 중간 | 장기 | 아키텍처 정합성 |

---

## 6. 비용 절감 효과

### 6.1 최적화 전후 비교

#### Worst-case (서버 캐시 미보장, DAU 10)

| 지표 | 최적화 전 (버그) | P0 수정 후 | 절감률 |
|------|----------------|-----------|--------|
| 월간 API 호출 (캐시 미스) | 6,300 | 630 | **90.0%** |
| 월간 문자 소모 | 89,082 | 8,908 | **90.0%** |
| 추천 요금제 | Creator ($22) | Free ($0) | **100%** |
| **월 비용** | **$22/mo** | **$0/mo** | **$22 절감** |
| 연간 비용 | $264 | $0 | **$264 절감** |

#### Best-case (서버 캐시 영속, 모든 시나리오)

| 지표 | 상태 | 값 |
|------|------|-----|
| 일회성 API 호출 | 7단어 × 99자 | 99자 (1회) |
| 이후 월 비용 | **$0** | 서버가 MP3 직접 제공 |
| 추천 요금제 | Free ($0) | 모든 시나리오에서 충분 |

### 6.2 ROI 분석

#### P0 (톤 불일치 수정)

| 항목 | 값 |
|------|-----|
| 개발 비용 | ~2시간 (코드 수정 + 테스트) |
| 월간 절감 (worst-case) | $22 |
| 월간 절감 (서버 캐시 포함) | $22 → $0 |
| ROI 회수 기간 | **즉시** (첫 달부터 절감) |

#### P3 (정적 사전 생성) — 확장 시나리오

| 항목 | 값 |
|------|-----|
| 개발 비용 | ~40시간 (빌드 파이프라인 + CDN 설정) |
| 확장 시 절감 (DAU 1,000) | worst-case $10,692/mo → $0 |
| ROI 회수 기간 | **즉시** (확장 시 필수) |

#### 성장 시나리오별 연간 비용 비교

| 시나리오 | 현재 (버그, worst-case) | P0 수정 후 | 서버 캐시 영속 | P0+P3 |
|---------|----------------------|-----------|-------------|-------|
| DAU 10 | $264/yr | $0/yr | $0/yr | $0/yr |
| DAU 100 | ~$2,316+/yr | ~$2,316/yr | $0/yr | $0/yr |
| DAU 1,000 | ~$128,000+/yr | ~$128,000/yr | $0-60/yr | $0/yr |

> **핵심 결론**: 서버 캐시 볼륨 영속화(무비용) + P0 버그 수정(2시간)만으로 **모든 시나리오에서 Free 플랜 운영이 가능**합니다. 확장 시에는 P3(정적 사전 생성)으로 서버 캐시 의존도까지 제거할 수 있습니다.

---

## 7. 구현 로드맵

### 7.1 단기 (1-2주)

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 1 | **P0: 톤 불일치 수정** (방안 A — 기본 톤 프리로드) | `useTTSSoundEngine.ts`, `ttsAudioCache.ts` | 2시간 |
| 2 | **P0: 메모리 LRU** 추가 (최대 100 엔트리) | `ttsAudioCache.ts` | 2시간 |
| 3 | 수정 후 캐시 히트율 검증 | DevTools Console 모니터링 | 1시간 |
| 4 | **P2: Lazy 프리로드** (3단어 우선 로드) | `useTTSSoundEngine.ts` | 4시간 |
| 5 | 프리로드 UX 테스트 | 수동 테스트 + 단위 테스트 | 2시간 |

**1주차 마일스톤**: 톤 불일치 해결, 캐시 적중률 70%+, 메모리 안정화, 프리로드 중 입력 가능

### 7.2 중기 (1-2개월)

| 단계 | 작업 | 파일 | 예상 시간 |
|------|------|------|----------|
| 6 | **P1: IDB TTL/LRU** 구현 | `ttsIndexedDB.ts` | 4시간 |
| 7 | IDB 스키마 마이그레이션 (DB_VERSION 2) | `ttsIndexedDB.ts` | 2시간 |
| 8 | **P1: 서버 HTTP Cache-Control** 추가 | `key-speed-server/routes/tts.ts` | 1시간 |
| 9 | **P1: 서버 Batch API** 구현 | `key-speed-server` 새 엔드포인트 | 4시간 |
| 10 | 서버 배포 시 캐시 볼륨 영속화 설정 | 인프라/Docker 설정 | 2시간 |
| 11 | 샘플 텍스트 확장 (5→10개) | `sampleTexts.ts` | 2시간 |

**2개월 마일스톤**: 안정적 캐시 관리, 서버 캐시 영속화, 다양한 텍스트 지원

### 7.3 장기 (3개월+)

| 단계 | 작업 | 파일/시스템 | 예상 시간 |
|------|------|-----------|----------|
| 12 | **P3: 빌드 시 음성 사전 생성** (`batch.ts` CI/CD 통합) | 빌드 스크립트 | 16시간 |
| 13 | CDN 정적 배포 파이프라인 | AWS S3/CloudFront 등 | 8시간 |
| 14 | 프론트엔드 CDN 음성 로더 구현 | `ttsAudioCache.ts` 리팩토링 | 8시간 |
| 15 | **P4: 서버-클라이언트 캐시 키 통일** | 양쪽 서버 코드 | 8시간 |
| 16 | 서버 톤별 캐싱 지원 | `key-speed-server/elevenlabs.ts` | 4시간 |
| 17 | 부하 테스트 및 비용 모니터링 | 인프라 | 8시간 |

**3개월+ 마일스톤**: ElevenLabs 런타임 비용 제로, 확장 가능한 아키텍처

---

## 8. 결론

### 핵심 발견 5가지

1. **프리로드/재생 톤 불일치 버그**가 TTS 캐싱 시스템을 완전히 무효화하고 있습니다. `preloadText()`는 톤 없이 `"오늘"` 키로 저장하고, `playWord()`는 `"오늘:excited"` 키로 조회하여 **매번 캐시 미스**가 발생합니다.

2. **Audio Tags 오버헤드**로 인해 API 소비 문자가 원문의 **4.5배** 증가합니다. `[excited]` 태그가 단어당 +11자의 오버헤드를 추가합니다.

3. **서버 캐시가 비용의 핵심 변수**입니다. 서버 파일 캐시(`cache/*.mp3`)가 영속되면 **모든 시나리오에서 Free 플랜($0/mo) 운영이 가능**합니다. 배포 시 캐시 볼륨 영속화가 필수입니다.

4. **P0(톤 불일치 수정)은 2시간의 작업**으로 worst-case 기준 월 **$22 절감**, 캐시 적중률 **0% → 70%+** 개선을 달성할 수 있습니다.

5. DAU 1,000 이상 확장 시 서버 캐시 없이는 **월 $10,000+ 비용**이 발생할 수 있으며, **P3(정적 사전 생성)**으로 런타임 비용을 사실상 제로로 만들어야 합니다.

### 즉시 조치 사항

| 우선순위 | 작업 | 예상 시간 | 기대 효과 |
|---------|------|----------|----------|
| **즉시** | `preloadText()`에 기본 톤(`'excited'`) 전달 | 2시간 | 캐시 적중률 0% → 70%+, 비용 90% 절감 |
| **즉시** | 메모리 캐시 LRU 제한 (100 엔트리) | 2시간 | 모바일 OOM 방지 |
| **1주 내** | 서버 배포 시 캐시 볼륨 영속화 | 2시간 | 모든 시나리오에서 $0/mo |
| **1주 내** | 프리로드 중 입력 차단 완화 (Lazy preload) | 4시간 | UX 개선 |
| **2주 내** | IndexedDB 캐시 정리 정책 (TTL 7일) | 4시간 | 스토리지 안정성 |

### 요약

현재 TTS 시스템은 잘 설계된 4단계 캐싱 파이프라인을 갖추고 있으나, **프리로드와 재생 간의 캐시 키 불일치**(`useTTSSoundEngine.ts:58` vs `useTTSSoundEngine.ts:33`)라는 단일 버그로 인해 캐싱의 이점을 전혀 누리지 못하고 있습니다.

가장 효과적인 조치 조합은:

1. **P0 버그 수정** (2시간) → 캐시 정상 작동
2. **서버 캐시 영속화** (2시간, 인프라) → 런타임 API 호출 거의 제로
3. **P3 정적 사전 생성** (장기) → 서버 의존도 완전 제거

이 세 가지를 순차적으로 적용하면, **규모에 관계없이 ElevenLabs 런타임 비용을 사실상 $0**으로 유지할 수 있습니다.

---

> **분석 수행**: `arch-reviewer` (아키텍처 감사 T1-T3), `cost-analyst` (비용 분석 T4-T5), `report-writer` (보고서 종합 T6)
> **생성일**: 2026-02-22
