# 앱인토스 템플릿

Apps In Toss 프레임워크를 사용한 프로덕션 레디 React + TypeScript + Vite 템플릿입니다.

## ✨ 주요 특징

- ⚡️ **빠른 개발**: Vite 기반 HMR로 즉각적인 피드백
- 🔷 **타입 안전**: TypeScript Strict 모드
- 🎨 **모던 스타일링**: Tailwind CSS + TDS 지원
- 🧪 **테스트 자동화**: Vitest + React Testing Library
- 📝 **코드 품질**: ESLint + Prettier + Husky
- 🤖 **AI 친화적**: Claude Code, Cursor IDE 지원
- 🚀 **CI/CD**: GitHub Actions 자동 배포
- 📱 **Apps In Toss**: Granite Framework 1.11+

## 🛠 기술 스택

### 핵심

- [Vite 7](https://vite.dev/) - 빠른 빌드 도구
- [React 19](https://react.dev/) - UI 라이브러리
- [TypeScript 5.9](https://www.typescriptlang.org/) - 타입 안정성
- [@apps-in-toss/web-framework 1.11+](https://developers-apps-in-toss.toss.im/) - 앱인토스 웹 프레임워크 (Granite)

### 스타일링

- [Tailwind CSS 3](https://tailwindcss.com/) - 유틸리티 CSS
- [@toss/tds-mobile](https://tossmini-docs.toss.im/tds-mobile) - Toss Design System

### 테스팅

- [Vitest 3](https://vitest.dev/) - 단위 테스트 프레임워크
- [React Testing Library](https://testing-library.com/react) - 컴포넌트 테스트
- [jsdom](https://github.com/jsdom/jsdom) - DOM 환경

### 코드 품질

- [ESLint 9](https://eslint.org/) - 정적 분석
- [Prettier 3](https://prettier.io/) - 코드 포맷팅
- [Husky 9](https://typicode.github.io/husky/) - Git Hooks
- [lint-staged](https://github.com/okonet/lint-staged) - Pre-commit 린팅

## 🚀 시작하기

### 필수 요구사항

- Node.js 24 이상 (`.nvmrc` 참고)
- npm 10 이상

```bash
# nvm 사용 시
nvm install
nvm use
```

### 1. 의존성 설치

```bash
npm install --legacy-peer-deps
```

> **참고**: `--legacy-peer-deps` 플래그는 React 19와 TDS 간 peer dependency 호환성을 위해 필요합니다.

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버가 http://localhost:5173 에서 실행됩니다.

### 3. 빌드

```bash
npm run build
```

빌드 결과물은 `dist/` 디렉토리에 생성됩니다.

### 4. 배포

```bash
npm run deploy
```

Apps In Toss 플랫폼에 직접 배포됩니다.

## 📜 스크립트

### 개발

- `npm run dev` - 개발 서버 실행 (HMR 포함)
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기

### 코드 품질

- `npm run lint` - ESLint 실행
- `npm run format` - Prettier로 코드 포맷팅
- `npm run format:check` - 포맷팅 검사

### 테스팅

- `npm test` - 테스트 실행 (watch 모드)
- `npm run test:ui` - Vitest UI 실행
- `npm run test:coverage` - 커버리지 리포트 생성

### 배포

- `npm run deploy` - Apps In Toss에 배포

## 📁 프로젝트 구조

```
.
├── src/
│   ├── components/      # React 컴포넌트
│   │   ├── Welcome.tsx
│   │   └── Welcome.test.tsx
│   ├── App.tsx          # 메인 앱 컴포넌트
│   ├── main.tsx         # 진입점
│   ├── index.css        # 전역 스타일 (Tailwind)
│   └── vite-env.d.ts    # Vite 타입 정의
├── tests/
│   └── setup.ts         # 테스트 설정
├── public/              # 정적 파일
├── .github/
│   └── workflows/
│       └── ci.yml       # GitHub Actions CI
├── .husky/              # Git Hooks
│   └── pre-commit       # Pre-commit hook
├── granite.config.ts    # Apps In Toss 설정
├── vite.config.ts       # Vite 설정
├── vitest.config.ts     # Vitest 설정
├── tailwind.config.js   # Tailwind CSS 설정
├── tsconfig.json        # TypeScript 설정
├── .prettierrc          # Prettier 설정
├── .env.example         # 환경 변수 예시
├── .nvmrc               # Node.js 버전
├── CLAUDE.md            # AI 개발 가이드
└── package.json         # 프로젝트 정보
```

## 🤖 AI 개발 지원

### MCP 서버 설정

이 프로젝트는 **Claude Code**와 **Cursor IDE**에 최적화되어 있습니다.

`.mcp.json` 파일에 Apps In Toss MCP 서버가 설정되어 있어, AI가 자동으로 앱인토스 SDK 문서와 API 스펙을 참조할 수 있습니다.

### MCP 서버 사용 (macOS)

```bash
# ax 설치 (앱인토스 CLI)
brew tap toss/tap
brew install ax

# MCP 서버 시작 (자동으로 시작됨)
ax mcp start
```

### AI 가이드라인

AI를 활용한 개발 시 `CLAUDE.md` 파일을 참고하세요. 프로젝트 규칙, 코딩 컨벤션, 제약사항 등이 명시되어 있습니다.

## 🧪 테스트 작성

### 컴포넌트 테스트 예시

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MyComponent } from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<MyComponent onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

### 테스트 커버리지

```bash
npm run test:coverage
```

커버리지 리포트는 `coverage/` 디렉토리에 생성됩니다.

## 🔧 환경 변수

`.env.example` 파일을 복사하여 `.env` 파일을 생성하세요:

```bash
cp .env.example .env
```

### 주요 환경 변수

```env
VITE_API_BASE_URL=https://api.example.com
VITE_APP_NAME=app-in-toss-template
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

> **중요**: 모든 환경 변수는 `VITE_` 접두사를 사용해야 합니다.

## 🎨 스타일링 가이드

### Tailwind CSS

```tsx
// ✅ 좋은 예: Tailwind 유틸리티 클래스 사용
<div className="flex items-center justify-center p-4 bg-blue-600">
  <p className="text-white font-bold">Hello</p>
</div>

// ❌ 나쁜 예: 인라인 스타일
<div style={{ display: 'flex', padding: '16px' }}>
  <p style={{ color: 'white' }}>Hello</p>
</div>
```

### TDS (선택사항)

```tsx
import { Button, Typography, Spacing } from '@toss/tds-mobile';

<Spacing size={16}>
  <Typography variant="title1">제목</Typography>
  <Button variant="primary">액션</Button>
</Spacing>;
```

> **참고**: TDS는 현재 React 19와 완전히 호환되지 않을 수 있습니다. Tailwind CSS로 대체 가능합니다.

## 🔍 코드 품질 관리

### Pre-commit Hooks

Husky와 lint-staged가 설정되어 있어, 커밋 전 자동으로:

- ESLint 검사 및 자동 수정
- Prettier 포맷팅
- 타입 체크

### CI/CD

GitHub Actions를 통해 자동으로:

- 린트 검사
- 테스트 실행
- 빌드 확인
- 커버리지 업로드

`.github/workflows/ci.yml` 참고

## 📚 참고 문서

### Apps In Toss

- [개발자 문서](https://developers-apps-in-toss.toss.im/)
- [Granite Framework 가이드](https://developers-apps-in-toss.toss.im/framework/granite)
- [AI 개발 가이드](https://developers-apps-in-toss.toss.im/development/llms.html)
- [예제 코드](https://developers-apps-in-toss.toss.im/tutorials/examples.md)

### TDS (Toss Design System)

- [TDS Mobile 문서](https://tossmini-docs.toss.im/tds-mobile)
- [컴포넌트 갤러리](https://tossmini-docs.toss.im/tds-mobile/components)

### 프레임워크 & 라이브러리

- [React 19 문서](https://react.dev/)
- [Vite 문서](https://vite.dev/)
- [Vitest 문서](https://vitest.dev/)
- [Tailwind CSS 문서](https://tailwindcss.com/)
- [TypeScript 문서](https://www.typescriptlang.org/)

## 🚨 알려진 이슈

### React 19 & TDS 호환성

현재 `@toss/tds-mobile`은 React 18까지 공식 지원합니다. React 19 사용 시:

- `--legacy-peer-deps` 플래그로 설치 필요
- 일부 TDS 컴포넌트 동작에 제한이 있을 수 있음
- Tailwind CSS로 대체 가능

### Node.js 버전

Apps In Toss CLI (`@apps-in-toss/ait-format`)는 Node.js 24 이상을 요구합니다:

```bash
nvm install 24
nvm use 24
```

### 보안 취약점

npm audit에서 보고되는 일부 취약점은 Apps In Toss 프레임워크의 내부 의존성에서 발생합니다. 이는 프레임워크 업데이트를 통해 해결될 예정입니다.

## 🤝 기여하기

이슈 및 개선 제안은 GitHub Issues를 통해 제출해주세요.

## 📄 라이선스

MIT License

---

**Happy Coding! 🚀**

> 이 템플릿으로 Apps In Toss 미니앱을 빠르게 시작하세요.
