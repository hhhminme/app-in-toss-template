import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "app-in-toss-template",
  brand: {
    displayName: "앱인토스 템플릿",
    primaryColor: "#3B82F6",
    icon: "", // 화면에 노출될 앱의 아이콘 이미지 주소로 바꿔주세요.
  },
  web: {
    host: "localhost",
    port: 5173,
    commands: {
      dev: "vite",
      build: "tsc -b && vite build",
    },
  },
  permissions: [],
  outdir: "dist",
});
