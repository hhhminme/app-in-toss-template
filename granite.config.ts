import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "key-speed",
  brand: {
    displayName: "타자 속도 측정기",
    primaryColor: "#3182F6",
    icon: "", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  webViewProps: {
    type: "game",
  },
  web: {
    host: "localhost",
    port: 5959,
    commands: {
      dev: "cd frontend && vite",
      build: "tsc -b frontend && cd frontend && vite build",
    },
  },
  permissions: [],
  outdir: "frontend/dist",
});
