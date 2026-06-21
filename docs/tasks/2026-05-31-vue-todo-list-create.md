# Task: Vue Todo List And Create

## 目标

这一张把 Project 继续往下接到 Todo：

```text
选择一个 Project -> 加载这个 Project 下的 Todos -> 创建新的 Todo
```

后端接口是：

```text
GET  /projects/:projectId/todos
POST /projects/:projectId/todos
```

前端仍然走 Vite proxy：

```text
GET  /api/projects/:projectId/todos
POST /api/projects/:projectId/todos
```

你完成后，页面应该能做到：

- 加载 Project 列表后，可以选择一个 Project
- 选择 Project 后，加载它下面的 Todo
- Todo 为空时显示空状态
- 输入 title 创建 Todo
- 创建成功后刷新 Todo 列表
- 没有 token 时提示先登录

---

## 你会练到什么

- 用 `selectedProjectId` 表示当前选中的 Project
- 根据 Project id 请求子资源
- `GET` 列表接口和 `POST` 创建接口共用 token
- Vue 表单输入、提交、清空输入框
- 创建成功后重新拉列表

---

## Step 1: 创建 Todo API client

创建：

```text
apps/web/src/api/todos.ts
```

写入：

```ts
import type { CreateTodoInput, PaginatedResult, Todo } from "@learn/shared";

export type ListTodosResponse = {
  success: true;
  data: Todo[];
  meta: PaginatedResult<Todo>["meta"];
};

export type CreateTodoResponse = {
  success: true;
  data: Todo;
};

export async function fetchTodos(projectId: string, token: string): Promise<ListTodosResponse> {
  // Todo 列表是 Project 的子资源。
  //
  // projectId 放在 URL 里：
  // /projects/:projectId/todos
  //
  // 后端 service 会继续校验这个 Project 是否属于当前登录用户。
  const response = await fetch(`/api/projects/${projectId}/todos`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("加载 Todo 列表失败");
  }

  return response.json() as Promise<ListTodosResponse>;
}

export async function createTodo(
  projectId: string,
  token: string,
  input: CreateTodoInput
): Promise<CreateTodoResponse> {
  const response = await fetch(`/api/projects/${projectId}/todos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("创建 Todo 失败");
  }

  return response.json() as Promise<CreateTodoResponse>;
}
```

---

## Step 2: 在 App.vue 增加 Todo 状态

修改：

```text
apps/web/src/App.vue
```

增加 import：

```ts
import type { Project, Todo } from "@learn/shared";
import { createTodo, fetchTodos } from "./api/todos";
```

注意：如果你现在已经有 `Project` import，就把它合并成一行：

```ts
import type { Project, Todo } from "@learn/shared";
```

然后增加状态：

```ts
type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };

const selectedProjectId = ref<string | null>(null);
const todoTitle = ref("");
const todoListState = ref<TodoListState>({ status: "idle" });
```

这几个状态分别代表：

```text
selectedProjectId：当前选中的 Project id
todoTitle：创建 Todo 表单里的标题
todoListState：Todo 列表当前加载状态
```

---

## Step 3: 增加选择 Project 并加载 Todo 的函数

在 `App.vue` 的 `<script setup>` 里增加：

```ts
async function handleSelectProject(projectId: string) {
  selectedProjectId.value = projectId;
  await handleLoadTodos(projectId);
}

async function handleLoadTodos(projectId: string) {
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
```

注意：

```text
handleSelectProject 负责“用户选中了哪个 Project”。
handleLoadTodos 负责“根据这个 Project id 去请求 Todo”。

两个函数拆开写，是为了以后支持“刷新当前 Project 的 Todo 列表”。
```

---

## Step 4: 增加创建 Todo 的函数

继续在 `App.vue` 里增加：

```ts
async function handleCreateTodo() {
  const token = getAuthToken();

  if (!token) {
    todoListState.value = {
      status: "error",
      message: "请先登录，再创建 Todo"
    };
    return;
  }

  if (!selectedProjectId.value) {
    todoListState.value = {
      status: "error",
      message: "请先选择一个 Project"
    };
    return;
  }

  const title = todoTitle.value.trim();

  if (!title) {
    todoListState.value = {
      status: "error",
      message: "Todo 标题不能为空"
    };
    return;
  }

  await createTodo(selectedProjectId.value, token, { title });

  // 创建成功后清空输入框。
  todoTitle.value = "";

  // 重新加载列表，确保页面展示的是数据库里的最新结果。
  await handleLoadTodos(selectedProjectId.value);
}
```

这里重点看 `trim()`：

```text
用户输入 "   " 时，视觉上看起来有内容，但业务上应该算空标题。
trim() 会去掉前后空格，再判断是否为空。
```

---

## Step 5: 给 Project 列表增加选择按钮

找到 Project 列表里的：

```vue
<li v-for="project in projectListState.projects" :key="project.id">
  <strong>{{ project.name }}</strong>
  <span>{{ project.description ?? "暂无描述" }}</span>
</li>
```

改成：

```vue
<li
  v-for="project in projectListState.projects"
  :key="project.id"
  :class="{ selected: selectedProjectId === project.id }"
>
  <strong>{{ project.name }}</strong>
  <span>{{ project.description ?? "暂无描述" }}</span>

  <button type="button" @click="handleSelectProject(project.id)">
    {{ selectedProjectId === project.id ? "已选择" : "选择" }}
  </button>
</li>
```

注意：

```text
:class="{ selected: selectedProjectId === project.id }"

这是 Vue 的动态 class 写法。
当右边表达式为 true 时，Vue 会给这个 li 加上 selected class。
```

---

## Step 6: 增加 Todo 面板

在 Project 面板下面加：

```vue
<section class="todo-panel">
  <div class="panel-header">
    <h2>Todos</h2>
  </div>

  <p v-if="!selectedProjectId">先选择一个 Project，再查看 Todo。</p>

  <form
    v-if="selectedProjectId"
    class="todo-form"
    @submit.prevent="handleCreateTodo"
  >
    <input v-model="todoTitle" type="text" placeholder="Todo title" />
    <button type="submit">创建 Todo</button>
  </form>

  <p v-if="todoListState.status === 'loading'">正在加载 Todo...</p>
  <p v-if="todoListState.status === 'error'" class="error">
    {{ todoListState.message }}
  </p>

  <p v-if="todoListState.status === 'success' && todoListState.todos.length === 0">
    这个 Project 还没有 Todo。
  </p>

  <ul v-if="todoListState.status === 'success'" class="todo-list">
    <li v-for="todo in todoListState.todos" :key="todo.id">
      <strong>{{ todo.title }}</strong>
      <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
    </li>
  </ul>
</section>
```

---

## Step 7: 补 Todo 样式

修改：

```text
apps/web/src/style.css
```

追加：

```css
.project-list li.selected {
  border-color: #2563eb;
  background: #eff6ff;
}

.project-list button {
  justify-self: start;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 10px;
  background: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.todo-panel {
  margin-top: 32px;
}

.todo-form {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.todo-form input {
  flex: 1;
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 10px 12px;
  font: inherit;
}

.todo-form button {
  border: 0;
  border-radius: 8px;
  padding: 10px 14px;
  background: #111827;
  color: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
}

.todo-list {
  display: grid;
  gap: 12px;
  padding: 0;
  margin: 16px 0 0;
  list-style: none;
}

.todo-list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
}

.todo-list span {
  color: #6b7280;
}
```

---

## Step 8: 自己验证

先确认后端和前端都在运行：

```bash
curl http://localhost:3001/health
```

打开前端页面：

```text
http://localhost:5174
```

按这个顺序手动测：

1. 登录
2. 点击“加载 Projects”
3. 点击某个 Project 的“选择”
4. 输入 Todo title
5. 点击“创建 Todo”
6. 看列表里是否出现新 Todo

---

## Step 9: 你完成后告诉我

你完成后回复：

```text
Vue Todo 列表和创建完成了
```

我会帮你：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试
- 用浏览器真实登录、选择 Project、创建 Todo
- 补学习型注释
- 更新任务索引
- 给下一张 Todo 完成状态切换任务卡
