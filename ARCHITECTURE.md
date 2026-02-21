# 시스템 아키텍처 — 타자 속도 측정기

## 시스템 개요

```
┌─────────────────────────────────────────────────────┐
│                    Toss App                          │
│  ┌───────────────────────────────────────────────┐  │
│  │           key-speed (프론트엔드)                │  │
│  │          WebView (game type)                   │  │
│  │                                                │  │
│  │  React 18 + Vite 7 + Emotion + TDS Mobile     │  │
│  │                                                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│  │  │TypingTest│  │ TTS Sound│  │ Game User  │  │  │
│  │  │  + Hooks │  │  Engine  │  │  (Granite) │  │  │
│  │  └────┬─────┘  └────┬─────┘  └────────────┘  │  │
│  │       │              │                         │  │
│  │       │         ┌────┴──────────┐              │  │
│  │       │         │  TTS Cache    │              │  │
│  │       │         │ (Memory+IDB)  │              │  │
│  │       │         └────┬──────────┘              │  │
│  └───────┼──────────────┼────────────────────────┘  │
│          │              │                            │
└──────────┼──────────────┼────────────────────────────┘
           │              │ HTTP (audio/mpeg)
           │              ▼
           │    ┌─────────────────────┐
           │    │  key-speed-server   │
           │    │  (TTS 프록시 서버)   │
           │    │                     │
           │    │  Express + TS       │
           │    │  ┌───────────────┐  │
           │    │  │ File Cache    │  │
           │    │  │ (cache/*.mp3) │  │
           │    │  └───────┬───────┘  │
           │    └──────────┼──────────┘
           │               │ HTTPS
           │               ▼
           │    ┌─────────────────────┐
           │    │   ElevenLabs API    │
           │    │  (eleven_multi_v2)  │
           │    └─────────────────────┘
           │
           ▼
     사용자 타이핑
```

**저장소:**
- `key-speed/` — 프론트엔드 (Apps In Toss 미니앱)
- `key-speed-server/` — TTS 프록시 서버 (별도 저장소)

---

## 프론트엔드 아키텍처

### 컴포넌트 계층

```
App.tsx
└── TypingTest.tsx ─────────── 메인 게임 오케스트레이터
    ├── Header
    │   ├── Title ("타자 속도 측정기")
    │   └── SoundToggle ────── 🔊/🔇 토글
    ├── TimerDisplay ───────── WPM 표시 + 티어 이모지
    │   └── FloatingParticle ─ WPM 점프 시 +10, +15 파티클
    ├── ComboDisplay ───────── 🔥 콤보 (5회 이상)
    ├── ProgressBar ────────── TDS 진행률 바
    ├── TextDisplay ────────── 타이핑 대상 텍스트 (글자별 색상)
    ├── TextField ──────────── TDS 입력 필드
    └── ResultPanel ────────── 완료 후 결과 화면
        ├── 티어 디스플레이 (이모지 + 레이블)
        ├── 주요 스탯 (WPM, 정확도)
        └── 상세 스탯 (에러, 콤보, 최고기록, 총 게임)
```

### 훅(Hook) 관계

```
TypingTest.tsx
├── useTypingTest ─────── 핵심 타이핑 엔진 (입력, WPM, 정확도)
│                          ├── onCharCompleted 콜백
│                          └── onWordCompleted 콜백
├── useComboTracker ───── 연속 정답 추적 (콤보/최대콤보/티어)
├── useTTSSoundEngine ─── TTS 재생 관리
│   └── useSoundEngine ── AudioContext 관리 + 사운드 on/off
├── useGameUser ───────── Granite 사용자 식별 + 기록 저장
├── useExitConfirm ────── 뒤로가기 확인 다이얼로그
└── useSafeArea ───────── 노치 디바이스 안전 영역
```

### 서비스 레이어

```
frontend/src/services/
├── ttsApiClient.ts ───── TTS 서버 HTTP 클라이언트 (재시도 로직)
├── ttsAudioCache.ts ──── 3단계 캐시 관리자 (Memory → IDB → API)
├── ttsIndexedDB.ts ───── IndexedDB 래퍼 (음절 단위 저장)
└── ttsConfig.ts ─────── TTS 설정 (서버 URL, 동시 요청 수)
```

---

## TTS 서버 아키텍처

### API 엔드포인트

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `/api/tts/:text` | GET | 한글 텍스트 → MP3 변환 (1~10자, 가-힣만) |
| `/health` | GET | 서버 상태 확인 → `{ status: "ok" }` |

### 서버 구성

```
src/
├── index.ts ─────────── Express 설정 (CORS: localhost만)
├── routes/
│   └── tts.ts ───────── 입력 검증 + 응답 (audio/mpeg)
├── services/
│   └── elevenlabs.ts ── API 호출 + 파일 캐시 (cache/*.mp3)
└── batch.ts ─────────── 사전 캐싱 스크립트 (300ms 간격)
```

### 음성 톤 처리

ElevenLabs API 호출 시 텍스트에 `!`를 추가하여 더 역동적인 톤의 음성을 생성합니다. 이 가공은 `elevenlabs.ts`의 `synthesize()` 함수 내부에서만 수행되며, 캐시 키(파일명)와 라우트 검증에는 원래 텍스트가 사용됩니다.

---

## 4단계 TTS 캐싱 전략

음성 데이터는 4단계 캐시를 거쳐 제공됩니다:

```
요청: "안녕" 발음 재생

1. Memory Cache (AudioBuffer Map)
   ├── HIT → 즉시 재생
   └── MISS ↓

2. IndexedDB ("tts-audio-cache" DB)
   ├── HIT → decode → Memory에 저장 → 재생
   └── MISS ↓

3. TTS 서버 파일 캐시 (cache/*.mp3)
   ├── HIT → 파일 반환 → IDB 저장 → decode → Memory 저장 → 재생
   └── MISS ↓

4. ElevenLabs API (eleven_multilingual_v2)
   └── 응답 → 서버 파일 저장 → IDB 저장 → decode → Memory 저장 → 재생
```

**캐시 특성:**

| 레이어 | 위치 | 지속성 | 저장 형태 | 용도 |
|--------|------|--------|-----------|------|
| Memory | 브라우저 (JS) | 페이지 새로고침까지 | AudioBuffer | 즉시 재생 |
| IndexedDB | 브라우저 | 영구 (도메인별) | ArrayBuffer | 세션 간 재사용 |
| 서버 파일 | 서버 디스크 | 영구 | MP3 파일 | API 호출 절감 |
| ElevenLabs | 외부 API | — | — | 원본 음성 합성 |

**성능 최적화:**
- 프리로딩: 텍스트 로드 시 고유 한글 글자를 미리 캐싱
- 동시 요청 제한: 최대 3개 (`TTS_CONFIG.maxConcurrent`)
- 중복 방지: `pending` Map으로 동일 글자 중복 요청 차단
- IDB 배치 조회: 여러 글자를 한 번에 조회

---

## 타이핑 테스트 흐름

```
[초기화]
  │
  ├── 샘플 텍스트 로드 (sampleTexts)
  ├── TTS 프리로딩 시작 (고유 한글 글자)
  ├── 사용자 기록 로드 (localStorage)
  │
  ▼
[대기] ──── 첫 글자 입력 ────▶ [타이핑 중]
                                    │
                                    ├── 100ms마다 WPM 계산
                                    ├── 글자 완료 → 정답/오답 판정
                                    │   ├── 정답: 콤보 +1, 파란색
                                    │   └── 오답: 콤보 리셋, 빨간색 + 흔들림
                                    ├── 단어 완료 (스페이스) → TTS 재생
                                    ├── WPM 10+ 점프 → 파티클 이펙트
                                    │
                                    ▼
[완료] ◀── 모든 글자 입력 완료
  │
  ├── 최종 WPM/정확도 계산
  ├── 속도 티어 결정
  ├── 기록 저장 (최고 WPM, 총 게임 수)
  ├── ResultPanel 표시
  │
  ▼
[다시하기] → [초기화]로 돌아감
```

### 속도 티어

| WPM | 이모지 | 레이블 | 색상 | 글로우 |
|-----|--------|--------|------|--------|
| 0-49 | 🐢 | 느긋하게 | #8B95A1 | 없음 |
| 50-99 | 🚶 | 가볍게 | #3182F6 | 없음 |
| 100-149 | 🏃 | 빠르게 | #00B76A | 없음 |
| 150-199 | 🚀 | 초고속 | #FF8800 | 있음 |
| 200+ | ⚡ | 번개 | #FFD700 | 있음 |

---

## 한글 IME 처리

한글 입력은 조합(composition) 과정이 있어 특별한 처리가 필요합니다:

```
사용자 키 입력: ㅎ → 하 → 한 → 한ㄱ → 한글

브라우저 이벤트 순서:
1. compositionStart → composingRef = true
2. onChange("ㅎ")   → 조합 중이므로 글자 완료 판정 안 함
3. onChange("하")   → 조합 중이므로 대기
4. onChange("한")   → 조합 중이므로 대기
5. compositionEnd("한") → 첫 번째 글자 확정 판정
6. compositionStart  → 새 조합 시작
7. onChange("글")   → 조합 중이므로 대기
8. compositionEnd("글") → 두 번째 글자 확정 판정
```

**핵심 구현:**
- `composingRef`: 현재 IME 조합 중인지 추적
- `composingStartIdxRef`: 조합 시작 위치 기록
- `onCompositionEnd`: 최종 확정된 글자만 판정에 사용
- `onChange`에서 조합 중이 아닌 경우에만 글자 완료 처리 (영문/숫자 등)

**단어 완료 판정:**
- 스페이스 입력 시 단어 경계로 판단 (조합 상태와 무관)
- 완료된 단어에서 한글만 추출: `word.replace(/[^가-힣]/g, '')`

---

## 데이터 흐름

### 타이핑 입력 → 화면 업데이트

```
TextField onChange
  │
  ├── useTypingTest.handleInput()
  │   ├── inputValue 업데이트
  │   ├── WPM 재계산 (100ms 인터벌)
  │   ├── 글자 비교 → onCharCompleted 콜백
  │   │   └── useComboTracker.registerCorrect/Incorrect()
  │   └── 단어 완료 감지 → onWordCompleted 콜백
  │       └── useTTSSoundEngine.playWord()
  │           └── TTSAudioCache.getOrFetch() → AudioContext 재생
  │
  └── React 리렌더링
      ├── TextDisplay: 글자별 색상 업데이트
      ├── TimerDisplay: WPM 숫자 + 티어 이모지
      ├── ComboDisplay: 콤보 카운터
      └── FloatingParticle: WPM 점프 시 파티클
```

### TTS 오디오 재생 흐름

```
playWord("오늘")
  │
  ├── AudioContext 가져오기 (없으면 생성)
  ├── TTSAudioCache.getOrFetch("오늘")
  │   ├── memory.get("오늘") → HIT? → AudioBuffer 반환
  │   ├── IDB.get("오늘") → HIT? → decode → memory 저장 → 반환
  │   └── API fetch → IDB 저장 → decode → memory 저장 → 반환
  │
  └── AudioContext.createBufferSource()
      └── source.start() → 스피커 출력
```

---

## 환경 변수 총정리

### 프론트엔드 (`frontend/.env`)

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `VITE_TTS_SERVER_URL` | 선택 | `http://localhost:3000` | TTS 서버 주소 |

### TTS 서버 (`key-speed-server/.env`)

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `ELEVENLABS_API_KEY` | **필수** | — | ElevenLabs API 키 |
| `ELEVENLABS_VOICE_ID` | 선택 | `pNInz6obpgDQGcFmaJgB` | 음성 ID |
| `PORT` | 선택 | `3000` | 서버 포트 |

---

## 개발 환경 실행

두 프로젝트를 동시에 실행해야 TTS 기능이 작동합니다:

```bash
# 터미널 1: TTS 서버 (key-speed-server/)
cd key-speed-server
cp .env.example .env    # ELEVENLABS_API_KEY 설정
npm install
npm run dev             # localhost:3000

# 터미널 2: 프론트엔드 (key-speed/)
cd key-speed
npm install
npm run dev             # localhost:5173 (Vite dev server)
```

**TTS 서버 없이도 실행 가능**: 프론트엔드는 TTS 서버 없이도 동작합니다. 소리만 나지 않을 뿐 타이핑 테스트 자체는 정상 작동합니다. TTS 요청 실패 시 조용히 무시됩니다.

---

**마지막 업데이트**: 2026-02-21
