# Task: Vue Project List Page

## 目标

这一张继续前端接入阶段：

```text
登录成功后，前端读取 localStorage 里的 JWT token，然后请求 GET /projects。
```

这一步会把你之前学过的鉴权边界真正串起来：

```text
Vue 页面
  -> localStorage 取 auth_token
  -> Authorization: Bearer <token>
  -> GET /api/projects
  -> Vite proxy 转发到后端 GET /projects
  -> requireAuth 解析 token
  -> service 只返回当前用户的 Project
```

你完成后，页面应该能做到：

- 未登录时提示“请先登录”
- 已登录时点击按钮加载 Project 列表
- 请求成功后显示 Project name / description
- Project 为空时显示空状态
- token 无效或过期时显示错误信息

---

## 你会练到什么

- 从 `localStorage` 读取 token
- 给 `fetch` 加 `Authorization` 请求头
- 复用 shared 里的 `Project` / `PaginatedResult`
- Vue 里处理列表渲染 `v-for`
- 区分三种状态：未登录、加载中、加载成功/失败

---

## Step 1: 创建 auth token helper

创建：

```text
apps/web/src/auth/token-storage.ts
```

写入：

```ts
const AUTH_TOKEN_KEY = "auth_token";

export function getAuthToken(): string | null {
  // localStorage 是浏览器提供的小型持久化存储。
  //
  // 登录页已经把 JWT token 保存成 auth_token。
  // 这里统一通过一个函数读取，避免后面到处手写 "auth_token" 字符串。
  return localStorage.getItem(AUTH_TOKEN_KEY);
}
```

为什么要单独拆文件？

```text
因为 token 以后不只 Project 列表会用：
- Todo 列表需要
- 创建 Project 需要
- 创建 Todo 需要
- /auth/me 也可能需要

把 key 和读取逻辑集中起来，后面改名字或清理 token 时更容易。
```

---

## Step 2: 创建 Project API client

创建：

```text
apps/web/src/api/projects.ts
```

写入：

```ts
import type { PaginatedResult, Project } from "@learn/shared";

export type ListProjectsResponse = {
  success: true;
  data: Project[];
  meta: PaginatedResult<Project>["meta"];
};

export async function fetchProjects(token: string): Promise<ListProjectsResponse> {
  // /api/projects 会由 Vite proxy 转发到后端 /projects。
  //
  // 这个接口受 requireAuth 保护，所以必须带 Authorization header。
  const response = await fetch("/api/projects", {
    headers: {
      // Bearer token 是后端 requireAuth 当前支持的格式。
      //
      // 注意 Bearer 和 token 中间必须有一个空格。
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("加载 Project 列表失败，请确认你已经登录");
  }

  return response.json() as Promise<ListProjectsResponse>;
}
```

---

## Step 3: 在 App.vue 增加 Project 列表状态

修改：

```text
apps/web/src/App.vue
```

先在 `<script setup>` 里增加 import：

```ts
import type { Project } from "@learn/shared";
import { getAuthToken } from "./auth/token-storage";
import { fetchProjects } from "./api/projects";
```

然后增加 Project 列表状态：

```ts
type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

const projectListState = ref<ProjectListState>({ status: "idle" });
```

再增加加载函数：

```ts
async function handleLoadProjects() {
  const token = getAuthToken();

  if (!token) {
    projectListState.value = {
      status: "error",
      message: "请先登录，再加载 Project 列表"
    };
    return;
  }

  projectListState.value = { status: "loading" };

  try {
    const result = await fetchProjects(token);

    projectListState.value = {
      status: "success",
      projects: result.data
    };
  } catch (error) {
    projectListState.value = {
      status: "error",
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
}
```

注意：

```text
这里先用按钮手动加载 Project。

原因是你现在还没有 Vue Router，也没有全局登录状态。
先手动加载能让你把“token -> Authorization -> 受保护 API”这条链路看清楚。
```

---

## Step 4: 在模板里显示 Project 列表

在登录表单下面加一块 Project 区域：

```vue
<section class="project-panel">
  <div class="panel-header">
    <h2>Projects</h2>
    <button type="button" @click="handleLoadProjects">
      {{ projectListState.status === "loading" ? "加载中..." : "加载 Projects" }}
    </button>
  </div>

  <p v-if="projectListState.status === 'idle'">登录后可以加载你的 Project。</p>
  <p v-if="projectListState.status === 'error'" class="error">
    {{ projectListState.message }}
  </p>

  <p
    v-if="
      projectListState.status === 'success' && projectListState.projects.length === 0
    "
  >
    你还没有 Project。
  </p>

  <ul v-if="projectListState.status === 'success'" class="project-list">
    <li v-for="project in projectListState.projects" :key="project.id">
      <strong>{{ project.name }}</strong>
      <span>{{ project.description ?? "暂无描述" }}</span>
    </li>
  </ul>
</section>
```

这里重点看 `v-for`：

```text
v-for 会根据数组渲染多个 DOM 节点。

:key="project.id" 很重要：
它告诉 Vue 每一项的稳定身份是什么。
以后列表新增、删除、重排时，Vue 才能更准确地复用 DOM。
```

---

## Step 5: 补 Project 列表样式

修改：

```text
apps/web/src/style.css
```

追加：

```css
.project-panel {
  margin-top: 32px;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.panel-header h2 {
  margin: 0;
  color: #111827;
  font-size: 20px;
}

.panel-header button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 12px;
  background: white;
  color: #111827;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.project-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 16px 0 0;
  list-style: none;
}

.project-list li {
  display: grid;
  gap: 4px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.project-list span {
  color: #6b7280;
}
```

---

## Step 6: 准备测试数据

如果你登录后 Project 列表为空，可以先用 curl 创建一个 Project。

先登录拿 token：

```bash
curl -sS -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vue-login-demo@example.com","password":"password123"}'
```

从返回结果里复制 `data.token`，然后创建 Project：

```bash
curl -sS -X POST http://localhost:3001/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 你复制的token" \
  -d '{"name":"Vue Project Demo","description":"Created for frontend list practice"}'
```

注意：

```text
不要把 token 写进代码文件。
token 是运行时数据，只应该放在 localStorage、请求头、终端临时命令里。
```

---

## Step 7: 你完成后告诉我

你完成后回复：

```text
Vue Project 列表完成了
```

我会帮你：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试，确认没有影响 API
- 用浏览器登录并加载 Project 列表
- 补学习型注释
- 更新任务索引
- 给下一张 Todo 列表任务卡
