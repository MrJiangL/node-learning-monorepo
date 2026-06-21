import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  test: {
    // Vue 组件测试会把组件渲染成 DOM。
    //
    // Vitest 默认运行在纯 Node 环境里，没有 document / window。
    // jsdom 会在 Node 里模拟浏览器 DOM，让 mount() 能正常工作。
    environment: "jsdom"
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        // 浏览器请求 /api/health，后端实际路由是 /health。
        // 所以这里要把 /api 前缀去掉。
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
