# Task: Scaffold Vite Vue Web App

## 目标

这一张正式进入：

```text
前端接入阶段
```

你想用 Vue3 实现前端，这个选择可以。

第一步不要急着做登录、Project、Todo 页面。

先做一件最关键的事：

```text
创建 apps/web，并让 Vue3 前端能成功请求后端 GET /health。
```

这一步要打通：

- npm workspace 里的前端 app
- Vite dev server
- Vue3 + TypeScript
- 前端通过 `/api/health` 调后端
- Vite proxy 把 `/api` 转发到 `http://localhost:3001`

---

## Step 1: 创建 Vite Vue 项目

在项目根目录运行：

```bash
npm create vite@latest apps/web -- --template vue-ts
```

然后安装依赖：

```bash
npm install
```

这个命令会让 root workspace 识别新的：

```text
apps/web/package.json
```

---

## Step 2: 修改 root package.json 脚本

修改：

```text
package.json
```

把 scripts 调整成包含 web：

```json
{
  "scripts": {
    "dev": "npm run dev -w @learn/api",
    "dev:api": "npm run dev -w @learn/api",
    "dev:web": "npm run dev -w @learn/web",
    "build": "npm run build -w @learn/shared && npm run build -w @learn/api && npm run build -w @learn/web",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "npm run test -w @learn/api",
    "test:watch": "npm run test:watch -w @learn/api",
    "typecheck": "npm run typecheck -w @learn/shared && npm run typecheck -w @learn/api && npm run typecheck -w @learn/web"
  }
}
```

注意：不是让你整份复制 `package.json`，只改 scripts 里的相关项。

---

## Step 3: 修改 apps/web/package.json

打开：

```text
apps/web/package.json
```

把 name 改成：

```json
{
  "name": "@learn/web"
}
```

确认 scripts 至少包含：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc -b --noEmit"
  }
}
```

说明：

```text
Vue 单文件组件是 .vue 文件。
TypeScript 自己不完全理解 .vue，所以 Vue 项目通常用 vue-tsc 做类型检查。
```

---

## Step 4: 配置 Vite proxy

修改：

```text
apps/web/vite.config.ts
```

改成：

```ts
import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
```

为什么要这样？

```text
浏览器访问前端：http://localhost:5173
前端请求：/api/health
Vite 转发到：http://localhost:3001/health
```

这样第一步不需要先处理 CORS。

---

## Step 5: 创建 API client

创建：

```text
apps/web/src/api/health.ts
```

写入：

```ts
export type HealthResponse = {
  success: true;
  data: {
    status: string;
  };
};

export async function fetchHealth(): Promise<HealthResponse> {
  // 前端只请求 /api/health。
  //
  // 开发环境下，Vite proxy 会把它转发到后端 /health。
  const response = await fetch("/api/health");

  if (!response.ok) {
    throw new Error("后端健康检查请求失败");
  }

  return response.json() as Promise<HealthResponse>;
}
```

---

## Step 6: 修改 App.vue 显示后端状态

修改：

```text
apps/web/src/App.vue
```

写成一个最小可用页面：

```vue
<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchHealth } from "./api/health";

type LoadState =
  | { status: "loading" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

const state = ref<LoadState>({ status: "loading" });

onMounted(async () => {
  try {
    const result = await fetchHealth();

    state.value = {
      status: "success",
      message: result.data.status
    };
  } catch (error) {
    state.value = {
      status: "error",
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
});
</script>

<template>
  <main class="app-shell">
    <section class="status-panel">
      <p class="eyebrow">Node Learning Monorepo</p>
      <h1>前端已连接后端</h1>

      <p v-if="state.status === 'loading'">正在检查 API 状态...</p>
      <p v-if="state.status === 'success'">API 状态：{{ state.message }}</p>
      <p v-if="state.status === 'error'" class="error">错误：{{ state.message }}</p>
    </section>
  </main>
</template>
```

这一段你要重点理解：

```text
ref：保存页面状态。
onMounted：组件挂载后执行请求。
v-if：根据不同状态显示不同内容。
{{ state.message }}：Vue 的模板插值。
```

---

## Step 7: 简单整理 CSS

修改：

```text
apps/web/src/style.css
```

写入：

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  background: #f6f7f9;
  color: #17202a;
}

.app-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px;
}

.status-panel {
  width: min(560px, 100%);
  border: 1px solid #d8dde6;
  border-radius: 8px;
  padding: 24px;
  background: #ffffff;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 13px;
  color: #5c6b7a;
}

h1 {
  margin: 0 0 16px;
  font-size: 28px;
}

p {
  line-height: 1.6;
}

.error {
  color: #b42318;
}
```

确认：

```text
apps/web/src/main.ts
```

里有导入：

```ts
import "./style.css";
```

Vite Vue 模板一般默认已经有这行。

---

## Step 8: 本地验证

开两个终端。

终端 1：

```bash
npm run dev:api
```

确认后端跑在：

```text
http://localhost:3001
```

终端 2：

```bash
npm run dev:web
```

打开：

```text
http://localhost:5173
```

你应该看到：

```text
前端已连接后端
API 状态：ok
```

---

## Step 9: 完成后的口令

完成后告诉我：

```text
前端 Vite Vue 骨架完成了
```

我会帮你：

1. 跑 `npm run typecheck`。
2. 跑 `npm run build`。
3. 启动 API 和 Web。
4. 用浏览器检查页面是否真的拿到 `/health`。
5. 给你下一张 Vue 登录页任务卡。
