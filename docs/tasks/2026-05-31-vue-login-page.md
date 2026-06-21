# Task: Vue Login Page

## 目标

这一张开始让 Vue 前端真正接入鉴权接口：

```text
POST /auth/login
```

前端请求时仍然走 Vite proxy：

```text
浏览器请求：POST /api/auth/login
Vite 转发：POST http://localhost:3001/auth/login
```

你完成后，页面应该能做到：

- 输入 email 和 password
- 点击登录按钮
- 登录成功后显示当前用户 email
- 把 JWT token 保存到 `localStorage`
- 登录失败时显示错误信息
- 请求中禁用按钮，避免重复提交

---

## 你会练到什么

- Vue3 `ref`
- 表单 `v-model`
- `submit.prevent`
- 前端 API client
- 复用后端共享类型 `@learn/shared`
- `localStorage`
- loading / success / error 三种 UI 状态

---

## Step 1: 给 web 声明 shared 依赖

修改：

```text
apps/web/package.json
```

在 `dependencies` 里加上：

```json
{
  "dependencies": {
    "@learn/shared": "*",
    "vue": "^3.5.34"
  }
}
```

为什么要加？

```text
虽然 monorepo 里现在可能已经能解析到 @learn/shared，
但一个 workspace 包使用另一个 workspace 包时，最好显式写进 dependencies。

这会让依赖关系更清楚：
apps/web 依赖 packages/shared 里的类型。
```

改完后运行：

```bash
npm install
```

这个命令会更新根目录的 `package-lock.json`，让 npm 知道 `@learn/web` 现在依赖
`@learn/shared`。

---

## Step 2: 创建登录 API client

创建：

```text
apps/web/src/api/auth.ts
```

先写这个骨架：

```ts
import type { AuthTokenResult, LoginUserInput } from "@learn/shared";

export type LoginResponse = {
  success: true;
  data: AuthTokenResult;
};

export async function loginUser(input: LoginUserInput): Promise<LoginResponse> {
  // 这里请求 /api/auth/login，而不是直接请求 http://localhost:3001/auth/login。
  //
  // 原因：
  // - 浏览器当前页面来自 Vite，例如 http://localhost:5174
  // - /api/auth/login 是同源请求
  // - Vite proxy 会把 /api 前缀去掉，再转发到后端 /auth/login
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: {
      // 告诉后端：这次 body 是 JSON 字符串。
      "Content-Type": "application/json"
    },
    // fetch 的 body 不能直接传对象。
    // JSON.stringify 会把 JS 对象转成 HTTP 请求里能传输的字符串。
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    // 这一版先用一个简单错误文案。
    // 后面我们会专门做“前端解析后端错误响应”的任务。
    throw new Error("登录失败，请检查邮箱或密码");
  }

  return response.json() as Promise<LoginResponse>;
}
```

注意：

```text
这里的 import type 很重要。

AuthTokenResult / LoginUserInput 只是 TypeScript 类型，
它们在浏览器运行时不存在。
用 import type 可以告诉构建工具：只在类型检查时使用它，不要打包进运行时代码。
```

---

## Step 3: 把 App.vue 改成登录页

修改：

```text
apps/web/src/App.vue
```

这一张你可以先把健康检查页面替换掉。

建议结构如下，你自己手写，不要整段复制：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { loginUser } from "./api/auth";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "success"; email: string }
  | { status: "error"; message: string };

const email = ref("");
const password = ref("");
const state = ref<LoginState>({ status: "idle" });

async function handleLogin() {
  // 进入提交中状态后，按钮可以根据它禁用。
  // 这样用户连续点击按钮时，不会同时发出很多个登录请求。
  state.value = { status: "submitting" };

  try {
    const result = await loginUser({
      email: email.value,
      password: password.value
    });

    // token 是访问受保护 API 的凭证。
    //
    // 先保存到 localStorage，下一张 Project 列表任务会从这里取 token，
    // 再放进 Authorization: Bearer <token> 请求头。
    localStorage.setItem("auth_token", result.data.token);

    state.value = {
      status: "success",
      email: result.data.user.email
    };
  } catch (error) {
    state.value = {
      status: "error",
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
}
</script>
```

模板部分参考：

```vue
<template>
  <main class="app-shell">
    <section class="status-panel">
      <p class="eyebrow">Node Learning Monorepo</p>
      <h1>登录</h1>

      <form class="login-form" @submit.prevent="handleLogin">
        <label>
          邮箱
          <input v-model="email" type="email" autocomplete="email" required />
        </label>

        <label>
          密码
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <button type="submit" :disabled="state.status === 'submitting'">
          {{ state.status === "submitting" ? "登录中..." : "登录" }}
        </button>
      </form>

      <p v-if="state.status === 'success'">当前用户：{{ state.email }}</p>
      <p v-if="state.status === 'error'" class="error">{{ state.message }}</p>
    </section>
  </main>
</template>
```

---

## Step 4: 补样式

修改：

```text
apps/web/src/style.css
```

保留现在的整体布局就行，给表单补几个类：

```css
.login-form {
  display: grid;
  gap: 16px;
  margin-top: 24px;
}

.login-form label {
  display: grid;
  gap: 8px;
  color: #374151;
  font-size: 14px;
  font-weight: 600;
}

.login-form input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

.login-form button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #2563eb;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.login-form button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}
```

---

## Step 5: 自己验证

先开后端：

```bash
npm run dev:api
```

如果提示 `3001` 已经被占用，先试：

```bash
curl http://localhost:3001/health
```

如果能返回 `{"success":true,...}`，说明后端已经在运行，不需要再启动一个。

再开前端：

```bash
npm run dev:web
```

然后浏览器打开 Vite 给你的地址，例如：

```text
http://localhost:5173
```

如果 `5173` 被占用，Vite 会自动换成 `5174` 或其他端口，以终端显示为准。

---

## Step 6: 你完成后告诉我

你完成后回复：

```text
Vue 登录页完成了
```

我会帮你做这些事：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试，确认没有被前端改动影响
- 用浏览器实际登录一次
- 如果代码能再加学习型注释，我来补
- 更新任务索引
- 给你下一张：前端 Project 列表页
