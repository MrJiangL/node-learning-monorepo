# Task: Vue useProjects Composable

## 目标

这一张开始学习 Vue composables。

你已经把 UI 拆成：

```text
ProjectListPanel
TodoPanel
```

现在 `ProjectsPage` 模板变清楚了，但 `<script setup>` 里还有很多业务逻辑。

这一张先只抽 Project 相关逻辑：

```text
projectListState
handleLoadProjects
handleCreateProject
```

目标是创建：

```text
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
```

让它负责：

```text
保存 Project 列表状态
加载 Projects
创建 Project
处理 Project API 错误
```

`ProjectsPage/index.vue` 继续负责：

```text
selectedProjectId
Todo 相关逻辑
退出登录
把 useProjects 返回的状态和方法传给 ProjectListPanel
```

---

## 你会练到什么

- 什么是 composable
- 为什么 composable 通常命名为 `useXxx`
- 如何从页面组件里抽出可复用业务逻辑
- composable 如何返回状态和方法
- 页面组件如何使用 composable

---

## Step 1: 创建 composables 目录

创建目录：

```text
apps/web/src/pages/ProjectsPage/composables
```

然后创建文件：

```text
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
```

---

## Step 2: 写 useProjects

在 `useProjects.ts` 写入：

```ts
import type { Project } from "@learn/shared";
import { ref } from "vue";
import { createProject, fetchProjects } from "../../../api/projects";
import { getAuthToken } from "../../../auth/token-storage";

type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };

type CreateProjectFormInput = {
  name: string;
  description?: string;
};

export function useProjects() {
  const projectListState = ref<ProjectListState>({ status: "idle" });

  async function loadProjects() {
    // composable 可以保存状态，也可以提供修改状态的方法。
    //
    // 页面组件使用它时，不需要知道加载 Project 的完整细节，
    // 只需要调用 loadProjects()。
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

  async function createProjectFromInput(input: CreateProjectFormInput) {
    const token = getAuthToken();

    if (!token) {
      projectListState.value = {
        status: "error",
        message: "请先登录，再创建 Project"
      };
      return;
    }

    await createProject(token, input);
    await loadProjects();
  }

  return {
    projectListState,
    loadProjects,
    createProjectFromInput
  };
}
```

---

## Step 3: 修改 ProjectsPage import

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

删除这些 import：

```ts
import type { Project, Todo } from "@learn/shared";
import { createProject, fetchProjects } from "../../api/projects";
```

改成：

```ts
import type { Todo } from "@learn/shared";
import { useProjects } from "./composables/useProjects";
```

---

## Step 4: 删除 ProjectListState 类型

在 `ProjectsPage/index.vue` 删除：

```ts
type ProjectListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; projects: Project[] }
  | { status: "error"; message: string };
```

因为这个类型已经搬到 `useProjects.ts` 里了。

---

## Step 5: 使用 useProjects

在 `ProjectsPage/index.vue` 里找到：

```ts
const projectListState = ref<ProjectListState>({ status: "idle" });
```

替换成：

```ts
const { projectListState, loadProjects, createProjectFromInput } = useProjects();
```

然后删除父组件里的这两个函数：

```ts
async function handleLoadProjects() {
  ...
}

async function handleCreateProject(input: { name: string; description?: string }) {
  ...
}
```

---

## Step 6: 修改 ProjectListPanel 事件绑定

在 `ProjectsPage/index.vue` 的模板里，把：

```vue
@load-projects="handleLoadProjects" @create-project="handleCreateProject"
```

改成：

```vue
@load-projects="loadProjects" @create-project="createProjectFromInput"
```

---

## Step 7: 检查父组件还剩什么

完成后，`ProjectsPage/index.vue` 里应该仍然保留：

```text
selectedProjectId
todoListState
handleSelectProject
handleLoadTodos
handleCreateTodo
handleToggleTodo
handleSaveTodoTitle
handleDeleteTodo
handleLogout
```

这说明你只抽走了 Project 逻辑，没有顺手把 Todo 也混在这一张任务里。

---

## Step 8: 跑检查

完成后运行：

```bash
npm run format
npm run typecheck
npm run build
```

自己浏览器验证时，重点看：

```text
登录
加载 Projects
创建 Project
选择 Project 后 Todo 仍然能加载
```

---

## 完成后告诉我

完成后你直接说：

```text
useProjects composable 完成了
```

我会帮你：

- 跑格式检查、类型检查、构建
- 浏览器验证 Project 创建和 Todo 加载
- 检查 composable 的职责边界
- 补学习型中文注释
- 更新任务索引
- 给下一张 useTodos composable 任务卡
