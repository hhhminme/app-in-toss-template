# 앱인토스 템플릿

Apps In Toss 프레임워크를 사용한 React + TypeScript + Vite 템플릿입니다.

## 기술 스택

- ⚡️ [Vite](https://vite.dev/) - 빠른 빌드 도구
- ⚛️ [React 19](https://react.dev/) - UI 라이브러리
- 🔷 [TypeScript](https://www.typescriptlang.org/) - 타입 안정성
- 🎨 [Tailwind CSS](https://tailwindcss.com/) - 유틸리티 CSS 프레임워크
- 📱 [@apps-in-toss/web-framework](https://developers-apps-in-toss.toss.im/) - 앱인토스 웹 프레임워크

## 시작하기

### 1. 의존성 설치

```bash
npm install
```

### 2. 개발 서버 실행

```bash
npm run dev
```

개발 서버가 http://localhost:5173 에서 실행됩니다.

### 3. 빌드

```bash
npm run build
```

### 4. 배포

```bash
npm run deploy
```

## AI 개발 지원

### MCP 서버 설정

`.mcp.json` 파일에 Apps In Toss MCP 서버가 설정되어 있습니다.

Claude Code나 Cursor IDE에서 앱인토스 SDK 문서와 API 스펙을 자동으로 참조할 수 있습니다.

### MCP 서버 사용 (macOS)

```bash
# ax 설치 (앱인토스 CLI)
brew tap toss/tap
brew install ax

# MCP 서버 시작 (자동으로 시작됨)
ax mcp start
```

### 참고 문서

- [앱인토스 개발자 문서](https://developers-apps-in-toss.toss.im/)
- [AI 개발 가이드](https://developers-apps-in-toss.toss.im/development/llms.html)
- [예제 코드](https://developers-apps-in-toss.toss.im/tutorials/examples.md)

## 프로젝트 구조

```
.
├── src/
│   ├── App.tsx          # 메인 앱 컴포넌트
│   ├── main.tsx         # 진입점
│   ├── index.css        # 전역 스타일
│   └── vite-env.d.ts    # Vite 타입 정의
├── public/              # 정적 파일
├── granite.config.ts    # 앱인토스 설정
├── vite.config.ts       # Vite 설정
├── tailwind.config.js   # Tailwind CSS 설정
├── tsconfig.json        # TypeScript 설정
└── package.json         # 프로젝트 정보
```

## 스크립트

- `npm run dev` - 개발 서버 실행
- `npm run build` - 프로덕션 빌드
- `npm run preview` - 빌드 결과 미리보기
- `npm run lint` - ESLint 실행
- `npm run deploy` - 앱인토스에 배포
