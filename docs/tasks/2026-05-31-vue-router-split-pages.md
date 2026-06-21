# Task: Vue Router Split Pages

## 目标

这一张任务开始把现在越来越大的 `App.vue` 拆开。

当前页面把这些事情都放在一个文件里：

```text
登录表单
Project 列表
Project 创建
Todo 列表
Todo 创建 / 更新 / 删除
```

这在刚学习 Vue 时很正常，因为你能一眼看到所有状态和函数。
但功能继续增加后，`App.vue` 会越来越难读。

这次目标是：

```text
安装 Vue Router
App.vue 只负责显示路由出口
/login 显示登录页
/projects 显示 Project + Todo 工作台
未登录访问 /projects 时跳回 /login
登录成功后跳到 /projects
```

先不要追求拆得特别细。
这一张只做“页面级拆分”，不急着把 ProjectList、TodoList 再拆成组件。

---

## 你会练到什么

- Vue Router 的最小接入方式
- `createRouter` / `createWebHistory`
- `router.beforeEach` 路由守卫
- `useRouter` 编程式跳转
- 为什么 `App.vue` 通常不应该承载所有业务
- 如何把已有代码迁移到页面文件里，而不是每次都从零重写

---

## Step 1: 安装 Vue Router

在项目根目录运行：

```bash
npm install vue-router -w @learn/web
```

安装完成后，检查：

```bash
npm run typecheck
```

如果这里失败，先不要继续拆文件，先把安装或类型问题解决掉。

---

## Step 2: 新建 router 文件

创建：

```text
apps/web/src/router.ts
```

写入：

```ts
import { createRouter, createWebHistory } from "vue-router";
import LoginPage from "./pages/LoginPage.vue";
import ProjectsPage from "./pages/ProjectsPage.vue";
import { getAuthToken } from "./auth/token-storage";

export const router = createRouter({
  // createWebHistory 会让 URL 看起来像 /login、/projects。
  //
  // 这比 hash 模式的 /#/login 更接近真实项目常见写法。
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      redirect: "/projects"
    },
    {
      path: "/login",
      component: LoginPage
    },
    {
      path: "/projects",
      component: ProjectsPage,
      meta: {
        requiresAuth: true
      }
    }
  ]
});

router.beforeEach((to) => {
  // 路由守卫可以在页面真正切换前做检查。
  //
  // 这里的规则是：
  // - /projects 需要登录
  // - 如果没有 token，就跳回 /login
  // - /login 本身不需要登录
  if (to.meta.requiresAuth && !getAuthToken()) {
    return "/login";
  }
});
```

注意：

```text
meta: {
  requiresAuth: true
}
```

这是给路由加一个自定义标记。
后面的 `beforeEach` 会读取这个标记，判断这个页面是不是需要登录。

---

## Step 3: 在 main.ts 注册 router

修改：

```text
apps/web/src/main.ts
```

改成：

```ts
import { createApp } from "vue";
import "./style.css";
import App from "./App.vue";
import { router } from "./router";

createApp(App).use(router).mount("#app");
```

重点是这一段：

```ts
.use(router)
```

Vue 插件通常都是通过 `.use(...)` 注册。
Vue Router 注册以后，组件里才能使用：

```ts
useRouter();
useRoute();
<RouterView />
```

---

## Step 4: 把 App.vue 改成路由出口

修改：

```text
apps/web/src/App.vue
```

先把当前文件内容整体备份到临时文件或直接复制到下一步的 `ProjectsPage.vue` 里。
然后把 `App.vue` 改成：

```vue
<template>
  <RouterView />
</template>
```

这里不用写 import。
Vue Router 注册后，`RouterView` 可以直接在模板中使用。

`RouterView` 的意思是：

```text
当前 URL 匹配哪个页面，就把哪个页面组件渲染在这里。
```

---

## Step 5: 创建 LoginPage.vue

创建目录：

```text
apps/web/src/pages
```

创建：

```text
apps/web/src/pages/LoginPage.vue
```

写入下面的登录页代码：

```vue
<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { loginUser } from "../api/auth";

type LoginState =
  | { status: "idle" }
  | { status: "submitting" }
  | { status: "error"; message: string };

const router = useRouter();

const email = ref("");
const password = ref("");
const state = ref<LoginState>({ status: "idle" });

async function handleLogin() {
  state.value = { status: "submitting" };

  try {
    const result = await loginUser({
      email: email.value,
      password: password.value
    });

    // 登录成功后保存 token。
    //
    // 后续 /projects 页面会从 localStorage 读取这个 token，
    // 再请求受保护的 Project / Todo 接口。
    localStorage.setItem("auth_token", result.data.token);

    // 编程式跳转。
    //
    // 用户不需要手动点击链接，登录成功后直接进入工作台。
    await router.push("/projects");
  } catch (error) {
    state.value = {
      status: "error",
      message: error instanceof Error ? error.message : "未知错误"
    };
  }
}
</script>

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

      <p v-if="state.status === 'error'" class="error">{{ state.message }}</p>
    </section>
  </main>
</template>
```

---

## Step 6: 创建 ProjectsPage.vue

创建：

```text
apps/web/src/pages/ProjectsPage.vue
```

这一页先从你现在的 `App.vue` 迁移，不要从头写。

迁移规则：

1. 把当前 `App.vue` 里和 Project / Todo 相关的代码复制过来。
2. 删除登录相关代码：
   - `LoginState`
   - `email`
   - `password`
   - `state`
   - `handleLogin`
   - 登录表单模板
3. 保留这些内容：
   - `ProjectListState`
   - `TodoListState`
   - `selectedProjectId`
   - `projectName`
   - `projectDescription`
   - `todoTitle`
   - Todo 编辑相关状态
   - Project / Todo 的所有 handler
4. import 路径要从 `./api/...` 改成 `../api/...`。

文件开头大概会长这样：

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { Project, Todo } from "@learn/shared";
import { createProject, fetchProjects } from "../api/projects";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "../api/todos";
import { getAuthToken } from "../auth/token-storage";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };

// 下面继续放你现在已经写好的 Project / Todo 状态和函数。
// 注意：这一页不再放登录状态，因为登录已经移动到 LoginPage.vue。
</script>
```

模板外层可以这样保留：

```vue
<template>
  <main class="app-shell">
    <section class="project-panel">
      <!-- 这里放 Project 面板 -->
    </section>

    <section class="todo-panel">
      <!-- 这里放 Todo 面板 -->
    </section>
  </main>
</template>
```

---

## Step 7: 给工作台加一个退出登录按钮

在 `ProjectsPage.vue` 里增加：

```ts
import { useRouter } from "vue-router";

const router = useRouter();

async function handleLogout() {
  // 退出登录的核心就是删除本地 token。
  //
  // token 删除后，前端再访问 /projects 会被路由守卫拦回 /login。
  localStorage.removeItem("auth_token");
  await router.push("/login");
}
```

在 Project 面板顶部可以加一个按钮：

```vue
<div class="panel-header">
  <h2>Projects</h2>
  <div class="toolbar">
    <button type="button" @click="handleLoadProjects">
      {{ projectListState.status === "loading" ? "加载中..." : "加载 Projects" }}
    </button>
    <button type="button" @click="handleLogout">退出登录</button>
  </div>
</div>
```

然后在样式里补：

```css
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
```

---

## Step 8: 跑检查

完成后按顺序运行：

```bash
npm run format
npm run typecheck
npm run build
```

如果你想自己做浏览器验证，启动两个服务：

```bash
npm run dev:api
npm run dev:web
```

然后打开：

```text
http://localhost:5173/login
```

或者如果 5173 被占用，就看 Vite 输出的实际端口。

验证清单：

- 访问 `/login` 能看到登录页
- 登录成功后自动跳到 `/projects`
- `/projects` 能加载 Project
- 能创建 Project
- 能选择 Project 并加载 Todo
- 刷新 `/projects` 后如果 token 还在，不会跳回登录页
- 点击退出登录后跳回 `/login`
- 删除 token 后手动访问 `/projects` 会跳回 `/login`

---

## 完成后告诉我

完成后你直接说：

```text
Vue Router 拆页完成了
```

我会帮你做这些事：

- 跑格式检查
- 跑类型检查
- 跑构建
- 用浏览器验证登录跳转和 Project 工作台
- 检查有没有可以补的学习型中文注释
- 更新任务索引
- 给你下一张任务卡
