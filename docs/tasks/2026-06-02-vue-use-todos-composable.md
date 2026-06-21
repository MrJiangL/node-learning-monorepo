# Task: Vue useTodos Composable

## 目标

上一张你已经把 Project 相关逻辑抽到了：

```text
apps/web/src/pages/ProjectsPage/composables/useProjects.ts
```

这一张继续抽 Todo 相关逻辑，目标是创建：

```text
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
```

让它负责：

```text
保存 Todo 列表状态
加载某个 Project 下的 Todos
创建 Todo
切换 Todo 完成状态
更新 Todo 标题
删除 Todo
处理 Todo API 错误
```

`ProjectsPage/index.vue` 继续负责：

```text
selectedProjectId
用户选择了哪个 Project
退出登录
把 useTodos 返回的状态和方法传给 TodoPanel
```

这就是 composable 的边界：

```text
useTodos 管 Todo 数据和 Todo API。
ProjectsPage 管页面编排，比如“当前选中了哪个 Project”。
TodoPanel 管表单和按钮事件。
```

---

## 你会练到什么

- composable 不一定只接收表单数据，也可以接收业务上下文参数
- 为什么 Todo 操作几乎都需要 `projectId`
- 为什么成功创建、更新、删除后通常重新加载列表
- 页面组件如何从“业务实现者”变成“业务编排者”
- 如何逐步瘦身一个 Vue 页面组件

---

## Step 1: 创建 useTodos 文件

创建文件：

```text
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
```

---

## Step 2: 写 useTodos

在 `useTodos.ts` 写入下面代码。

注意：这里的注释比较多，是为了让你理解每个函数在做什么；你可以先照着敲，敲完再自己读一遍注释。

```ts
import type { Todo } from "@learn/shared";
import { ref } from "vue";
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "../../../api/todos";
import { getAuthToken } from "../../../auth/token-storage";

type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };

type CreateTodoFormInput = {
  title: string;
};

type UpdateTodoTitleFormInput = {
  title: string;
};

export function useTodos() {
  const todoListState = ref<TodoListState>({ status: "idle" });

  async function loadTodos(projectId: string) {
    // Todo 是 Project 的子资源。
    //
    // 所以加载 Todo 时必须知道当前 Project 的 id，
    // 对应后端接口是 GET /projects/:projectId/todos。
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再加载 Todo 列表"
      };
      return;
    }

    todoListState.value = { status: "loading" };

    try {
      const result = await fetchTodos(projectId, token);

      todoListState.value = {
        status: "success",
        todos: result.data
      };
    } catch (error) {
      todoListState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  async function createTodoForProject(projectId: string | null, input: CreateTodoFormInput) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再创建 Todo"
      };
      return;
    }

    // 这里允许 projectId 是 null，是因为页面刚进入时还没有选中 Project。
    //
    // composable 在这里兜底处理错误状态，
    // 这样调用方不需要每次都重复写“是否选择 Project”的判断。
    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await createTodo(projectId, token, input);
    await loadTodos(projectId);
  }

  async function toggleTodo(projectId: string | null, todo: Todo) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再更新 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await updateTodo(todo.id, token, {
      completed: !todo.completed
    });

    // 更新成功后重新加载列表。
    //
    // 这样页面展示的数据会重新来自数据库，
    // 不需要前端手动去改数组里某一项的 completed。
    await loadTodos(projectId);
  }

  async function saveTodoTitle(
    projectId: string | null,
    todoId: string,
    input: UpdateTodoTitleFormInput
  ) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再更新 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    await updateTodo(todoId, token, input);
    await loadTodos(projectId);
  }

  async function deleteTodoFromProject(projectId: string | null, todoId: string) {
    const token = getAuthToken();

    if (!token) {
      todoListState.value = {
        status: "error",
        message: "请先登录，再删除 Todo"
      };
      return;
    }

    if (!projectId) {
      todoListState.value = {
        status: "error",
        message: "请先选择一个 Project"
      };
      return;
    }

    // deleteTodo 成功时，后端返回 204 No Content。
    //
    // API client 内部已经处理了“不需要 response.json()”这件事，
    // 所以这里直接 await deleteTodo(...) 就可以。
    await deleteTodo(todoId, token);
    await loadTodos(projectId);
  }

  return {
    todoListState,
    loadTodos,
    createTodoForProject,
    toggleTodo,
    saveTodoTitle,
    deleteTodoFromProject
  };
}
```

---

## Step 3: 修改 ProjectsPage import

打开：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

删除这些 import：

```ts
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "../../api/todos";
import { getAuthToken } from "../../auth/token-storage";
```

然后新增：

```ts
import { useTodos } from "./composables/useTodos";
```

注意：`clearAuthToken` 还要保留，因为退出登录仍然在页面组件里。

`Todo` 类型也要保留，因为页面还会接收 `TodoPanel` emit 出来的完整 Todo：

```ts
import type { Todo } from "@learn/shared";
```

---

## Step 4: 删除 TodoListState 类型

在 `ProjectsPage/index.vue` 删除：

```ts
type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };
```

因为这个类型已经搬到 `useTodos.ts` 里了。

---

## Step 5: 使用 useTodos

在 `ProjectsPage/index.vue` 里找到：

```ts
const todoListState = ref<TodoListState>({ status: "idle" });
```

替换成：

```ts
const {
  todoListState,
  loadTodos,
  createTodoForProject,
  toggleTodo,
  saveTodoTitle,
  deleteTodoFromProject
} = useTodos();
```

---

## Step 6: 保留 handleSelectProject

`handleSelectProject` 仍然留在 `ProjectsPage/index.vue`。

把它改成：

```ts
async function handleSelectProject(projectId: string) {
  // selectedProjectId 是页面状态。
  //
  // 它表示“当前用户正在查看哪个 Project 的 Todo”，
  // 所以仍然放在 ProjectsPage，而不是放进 useTodos。
  selectedProjectId.value = projectId;
  await loadTodos(projectId);
}
```

---

## Step 7: 删除旧 Todo 函数

在 `ProjectsPage/index.vue` 删除这些函数：

```ts
handleLoadTodos;
handleCreateTodo;
handleToggleTodo;
handleSaveTodoTitle;
handleDeleteTodo;
```

然后新增下面这些很薄的事件转发函数：

```ts
async function handleCreateTodo(input: { title: string }) {
  await createTodoForProject(selectedProjectId.value, input);
}

async function handleToggleTodo(todo: Todo) {
  await toggleTodo(selectedProjectId.value, todo);
}

async function handleSaveTodoTitle(todoId: string, input: { title: string }) {
  await saveTodoTitle(selectedProjectId.value, todoId, input);
}

async function handleDeleteTodo(todoId: string) {
  await deleteTodoFromProject(selectedProjectId.value, todoId);
}
```

注意：这里仍然需要 `Todo` 类型。

这也是一个学习点：

```text
页面不再自己调用 Todo API，
但页面仍然可能需要 Todo 类型，
因为事件函数接收的参数是 Todo。
```

---

## Step 8: 检查页面职责

完成后，`ProjectsPage/index.vue` 里应该只剩这些核心内容：

```text
router
useProjects()
useTodos()
selectedProjectId
handleSelectProject
handleCreateTodo
handleToggleTodo
handleSaveTodoTitle
handleDeleteTodo
handleLogout
```

如果你还能看到下面这些内容，说明还没抽干净：

```text
fetchTodos
createTodo
updateTodo
deleteTodo
getAuthToken
TodoListState
```

---

## Step 9: 自测命令

你写完后先跑：

```bash
npm run format
npm run typecheck
npm run build
```

如果都通过，再启动前后端：

```bash
npm run dev:api
npm run dev:web
```

浏览器检查：

```text
1. 登录
2. 创建或选择一个 Project
3. 创建 Todo
4. 点击“标记完成”
5. 编辑 Todo 标题
6. 删除 Todo
```

这六步都能跑通，就说明 `useTodos` 抽取没有破坏页面行为。

---

## 完成后告诉我

你完成后直接说：

```text
useTodos composable 完成了
```

我会帮你：

```text
检查代码边界
补学习型注释
跑格式检查、类型检查、构建、测试
用浏览器走真实 Todo 流程
更新任务索引
给下一张任务卡
```
