# Claude AI 개발 가이드

## 프로젝트 개요

**타자 속도 측정기** — Apps In Toss 플랫폼에서 동작하는 한글 타이핑 속도 측정 게임입니다.

> **전체 시스템 설계**는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

### 기술 스택

- **프레임워크**: Apps In Toss Web Framework v1.11.1 (Granite)
- **UI 라이브러리**: React 18 + TDS Mobile v2.2.1
- **빌드 도구**: Vite 7
- **스타일링**: Emotion (CSS-in-JS) + Tailwind CSS 3 + TDS
- **타입 체크**: TypeScript 5.9
- **테스팅**: Vitest + React Testing Library
- **린팅**: ESLint 9 + Prettier
- **패키지 관리자**: npm (workspaces)

### 시스템 구성

이 프로젝트는 두 개의 독립된 저장소로 구성됩니다:

| 저장소 | 역할 | 포트 |
|--------|------|------|
| `key-speed` (이 저장소) | 프론트엔드 미니앱 | 5173 (dev) |
| `key-speed-server` (별도) | TTS 프록시 서버 | 3000 |

TTS 서버는 한글 텍스트를 ElevenLabs API로 음성 합성하여 제공합니다. 프론트엔드에서 단어 완료 시 해당 단어의 발음을 재생합니다. **TTS 서버 없이도 타이핑 테스트는 정상 작동**하며, 소리만 나지 않습니다.

---

## 🎯 개발 원칙

### 1. Apps In Toss 가이드라인 준수

- **게임 타입 앱**: `granite.config.ts`에서 `webViewProps.type: "game"`으로 설정되어 있습니다. 게임 타입은 TDS 사용이 필수가 아니지만, 이 프로젝트에서는 일부 TDS 컴포넌트(ProgressBar, TextField, Button, Paragraph)를 혼용합니다
- **Granite 프레임워크**: `@apps-in-toss/web-framework` v1.x 이상 사용 (구 Bedrock)
- **권한 관리**: `granite.config.ts`의 `permissions` 배열에서 필요한 권한 선언

### 2. 코드 스타일

- **Functional Components**: 함수형 컴포넌트와 Hooks 사용
- **TypeScript Strict**: 타입 안정성 최우선
- **Tailwind CSS**: 유틸리티 클래스 기반 스타일링
- **파일 명명**: PascalCase for components (Button.tsx), camelCase for utilities (formatDate.ts)

### 3. 품질 보증

- **테스트 작성**: 모든 컴포넌트와 유틸리티에 단위 테스트 작성
- **타입 안정성**: `any` 사용 금지, 명시적 타입 선언
- **ESLint 준수**: 린트 에러 0개 유지
- **Pre-commit Hooks**: 자동 포맷팅 및 린팅

---

## 📁 프로젝트 구조

```
key-speed/
├── frontend/                    # 프론트엔드 워크스페이스
│   ├── src/
│   │   ├── components/          # React 컴포넌트
│   │   │   ├── TypingTest.tsx   # 메인 게임 컴포넌트
│   │   │   ├── TextDisplay.tsx  # 글자별 색상 표시
│   │   │   ├── TimerDisplay.tsx # WPM + 티어 이모지
│   │   │   ├── ResultPanel.tsx  # 결과 화면
│   │   │   ├── ComboDisplay.tsx # 콤보 카운터
│   │   │   ├── FloatingParticle.tsx # WPM 파티클 이펙트
│   │   │   └── SoundToggle.tsx  # 사운드 on/off
│   │   ├── hooks/               # Custom React Hooks
│   │   │   ├── useTypingTest.ts # 타이핑 엔진 (IME 처리)
│   │   │   ├── useTTSSoundEngine.ts # TTS 재생
│   │   │   ├── useSoundEngine.ts    # AudioContext 관리
│   │   │   ├── useComboTracker.ts   # 콤보 추적
│   │   │   ├── useGameUser.ts       # Granite 사용자/기록
│   │   │   ├── useExitConfirm.ts    # 뒤로가기 확인
│   │   │   └── useSafeArea.ts       # 노치 안전 영역
│   │   ├── services/            # TTS 캐싱 & API
│   │   │   ├── ttsAudioCache.ts # 3단계 캐시 관리자
│   │   │   ├── ttsIndexedDB.ts  # IndexedDB 래퍼
│   │   │   ├── ttsApiClient.ts  # TTS 서버 HTTP 클라이언트
│   │   │   └── ttsConfig.ts     # TTS 설정
│   │   ├── styles/              # Emotion 스타일
│   │   ├── utils/               # 유틸리티 (speedTier 등)
│   │   ├── data/                # 샘플 텍스트
│   │   ├── App.tsx              # 루트 컴포넌트
│   │   └── main.tsx             # 진입점
│   ├── package.json
│   ├── vite.config.ts
│   ├── vitest.config.ts
│   └── .env.example
├── granite.config.ts            # Apps In Toss 설정 (game type)
├── package.json                 # 루트 워크스페이스
├── CLAUDE.md                    # 이 파일
└── ARCHITECTURE.md              # 전체 시스템 설계 문서
```

---

## 🚀 개발 워크플로우

### 새 컴포넌트 생성

1. `src/components/` 디렉토리에 PascalCase 파일 생성 (예: `Button.tsx`)
2. TDS 컴포넌트를 우선 사용 (`@toss/tds-mobile`에서 import)
3. Props 타입을 명시적으로 정의
4. 테스트 파일 생성 (`Button.test.tsx`)

**예시:**

```tsx
// src/components/Button.tsx
import { Button as TDSButton } from '@toss/tds-mobile';

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

export function Button({ label, onClick, variant = 'primary' }: ButtonProps) {
  return (
    <TDSButton onClick={onClick} variant={variant}>
      {label}
    </TDSButton>
  );
}
```

### API 호출

- `@apps-in-toss/web-framework`의 API를 사용
- 에러 핸들링 필수
- 로딩 상태 관리

### 상태 관리

- 간단한 상태: `useState`, `useReducer`
- 전역 상태 필요 시: React Context API 또는 Zustand 고려

---

## 🎨 스타일링 규칙

### Tailwind CSS

- 유틸리티 클래스 우선 사용
- 커스텀 CSS는 최소화
- 반응형: `sm:`, `md:`, `lg:` breakpoints 활용

### TDS 사용

```tsx
// ✅ 좋은 예: TDS 컴포넌트 사용
import { Typography, Spacing, Button } from '@toss/tds-mobile';

<Spacing size={16}>
  <Typography variant="title1">제목</Typography>
  <Button>액션</Button>
</Spacing>

// ❌ 나쁜 예: 직접 스타일링 (TDS 무시)
<div style={{ margin: 16 }}>
  <h1 style={{ fontSize: 24 }}>제목</h1>
  <button>액션</button>
</div>
```

---

## 🧪 테스트 작성

### 테스트 원칙

- **단위 테스트**: 모든 컴포넌트와 유틸리티
- **통합 테스트**: 사용자 시나리오 중심
- **커버리지**: 80% 이상 목표

### 테스트 예시

```tsx
// src/components/Button.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders with label', () => {
    render(<Button label="클릭" onClick={() => {}} />);
    expect(screen.getByText('클릭')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<Button label="클릭" onClick={handleClick} />);

    fireEvent.click(screen.getByText('클릭'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

---

## 🔧 환경 변수

`frontend/.env` 파일 사용 (`frontend/.env.example` 참고):

```bash
VITE_TTS_SERVER_URL=http://localhost:3000
```

| 변수 | 필수 | 기본값 | 설명 |
|------|------|--------|------|
| `VITE_TTS_SERVER_URL` | 선택 | `http://localhost:3000` | TTS 프록시 서버 주소 |

- **접두사 필수**: `VITE_`로 시작
- **민감 정보**: `.gitignore`에 `.env` 추가됨
- **타입 정의**: `frontend/src/vite-env.d.ts`에 선언

### TTS 서버 연동

프론트엔드는 `VITE_TTS_SERVER_URL`로 TTS 서버에 접근합니다. 개발 시 **TTS 서버를 별도 터미널에서 실행**해야 소리가 나옵니다:

```bash
# 터미널 1: TTS 서버 (key-speed-server/)
cd ../key-speed-server && npm run dev    # localhost:3000

# 터미널 2: 프론트엔드 (key-speed/)
npm run dev                               # localhost:5173
```

TTS 서버 API: `GET /api/tts/:text` → `audio/mpeg` (한글 1~10자)

---

## 🚫 금지 사항

### 코드 작성 시

- ❌ `any` 타입 사용 금지
- ❌ `console.log` 프로덕션 코드에 남기지 않기
- ❌ TDS를 무시하고 직접 스타일링
- ❌ 인라인 스타일 사용 (`style={{ ... }}`)
- ❌ 테스트 없이 커밋
- ❌ ESLint 경고 무시
- ❌ 하드코딩된 URL, API 키 등

### Git 커밋 시

- ❌ `node_modules`, `dist` 커밋 금지
- ❌ `.env` 파일 커밋 금지
- ❌ 린트 에러가 있는 상태로 커밋 금지

---

## 📦 주요 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드
npm run build

# 테스트 실행
npm run test
npm run test:coverage  # 커버리지 포함

# 린팅
npm run lint
npm run lint:fix       # 자동 수정

# 포맷팅
npm run format
npm run format:check

# 배포
npm run deploy         # Apps In Toss에 배포
```

---

## 🤖 AI 개발 지원

### MCP 서버

- `.mcp.json`에 Apps In Toss MCP 서버 설정됨
- Claude Code에서 자동으로 SDK 문서 참조 가능

### AI 사용 시 주의사항

1. **항상 최신 문서 확인**: Apps In Toss API는 자주 업데이트됨
2. **TDS 사용 필수**: AI가 커스텀 컴포넌트를 제안하더라도 TDS 우선
3. **타입 안정성**: AI가 생성한 코드도 타입 체크 필수
4. **테스트 생성 요청**: AI에게 "테스트도 함께 작성해줘" 요청

---

## 🔍 트러블슈팅

### 빌드 실패

```bash
# 의존성 재설치
rm -rf node_modules package-lock.json
npm install

# 캐시 삭제
rm -rf .granite dist
npm run build
```

### 타입 에러

- `tsconfig.json`의 `strict: true` 확인
- `node_modules/@types` 재설치

### MCP 서버 연결 실패

```bash
# ax CLI 재설치
brew reinstall ax

# MCP 서버 재시작
ax mcp start
```

---

## 📚 참고 문서

- [Apps In Toss 개발자 문서](https://developers-apps-in-toss.toss.im/)
- [TDS Mobile 문서](https://tossmini-docs.toss.im/tds-mobile)
- [Granite Framework 가이드](https://developers-apps-in-toss.toss.im/framework/granite)
- [React 19 문서](https://react.dev/)
- [Vite 문서](https://vite.dev/)
- [Tailwind CSS 문서](https://tailwindcss.com/)

---

## 📝 코드 리뷰 체크리스트

AI가 생성한 코드나 수정 사항을 리뷰할 때:

- [ ] TDS 컴포넌트를 사용했는가?
- [ ] TypeScript 타입이 명시적으로 정의되었는가?
- [ ] 테스트가 작성되었는가?
- [ ] ESLint 에러가 없는가?
- [ ] Prettier로 포맷팅되었는가?
- [ ] 환경 변수가 하드코딩되지 않았는가?
- [ ] 접근성(a11y)을 고려했는가?
- [ ] 에러 핸들링이 적절한가?
- [ ] 성능 최적화가 필요한가? (useMemo, useCallback)
- [ ] 주석이 과도하지 않은가? (코드로 설명 가능한 경우)

---

## 🎓 베스트 프랙티스

### 1. 컴포넌트 구조

```tsx
// Props 타입 정의
interface ComponentProps {
  // ...
}

// 컴포넌트 함수
export function Component({ prop1, prop2 }: ComponentProps) {
  // Hooks (useState, useEffect 등)
  // 이벤트 핸들러
  // 렌더링
  return (
    // JSX
  );
}
```

### 2. 에러 바운더리

- 최상위에 ErrorBoundary 컴포넌트 적용
- Suspense로 비동기 로딩 처리

### 3. 성능 최적화

- `React.memo`로 불필요한 리렌더링 방지
- `useMemo`, `useCallback`으로 값/함수 메모이제이션
- 큰 리스트는 가상화 (react-window)

---

**마지막 업데이트**: 2026-02-21
**버전**: 1.1.0
