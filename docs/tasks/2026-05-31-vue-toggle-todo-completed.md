# Task: Vue Toggle Todo Completed

## 目标

这一张继续补 Todo 的交互：

```text
点击 Todo 的完成状态按钮 -> PATCH /todos/:id -> 刷新当前 Project 的 Todo 列表
```

后端接口是：

```text
PATCH /todos/:id
```

前端走 Vite proxy：

```text
PATCH /api/todos/:id
```

你完成后，页面应该能做到：

- Todo 列表里每一项都有一个“标记完成 / 标记未完成”按钮
- 点击按钮后，请求后端更新 `completed`
- 更新成功后，重新加载当前 Project 的 Todo 列表
- 没有 token 时提示先登录
- 没有选中 Project 时提示先选择 Project

---

## 你会练到什么

- 用 `PATCH` 做局部更新
- 前端根据当前状态计算下一个状态：`!todo.completed`
- 复用已有的 `handleLoadTodos`
- 在列表项里绑定按钮事件
- 理解“更新成功后重新拉数据库最新列表”

---

## Step 1: 扩展 Todo API client

修改：

```text
apps/web/src/api/todos.ts
```

增加 import 里的 `UpdateTodoInput`：

```ts
import type { CreateTodoInput, PaginatedResult, Todo, UpdateTodoInput } from "@learn/shared";
```

增加响应类型：

```ts
export type UpdateTodoResponse = {
  success: true;
  data: Todo;
};
```

增加更新函数：

```ts
export async function updateTodo(
  todoId: string,
  token: string,
  input: UpdateTodoInput
): Promise<UpdateTodoResponse> {
  // PATCH 表示局部更新。
  //
  // 这里我们只传 { completed: true/false }，
  // 后端会只更新 completed，不会覆盖 title / dueDate 等其他字段。
  const response = await fetch(`/api/todos/${todoId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error("更新 Todo 状态失败");
  }

  return response.json() as Promise<UpdateTodoResponse>;
}
```

---

## Step 2: 在 App.vue 引入 updateTodo

修改：

```text
apps/web/src/App.vue
```

把原来的：

```ts
import { createTodo, fetchTodos } from "./api/todos";
```

改成：

```ts
import { createTodo, fetchTodos, updateTodo } from "./api/todos";
```

---

## Step 3: 增加切换完成状态函数

在 `App.vue` 的 `<script setup>` 里增加：

```ts
async function handleToggleTodo(todo: Todo) {
  const token = getAuthToken();

  if (!token) {
    todoListState.value = {
      status: "error",
      message: "请先登录，再更新 Todo"
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

  await updateTodo(todo.id, token, {
    completed: !todo.completed
  });

  // 更新成功后重新加载当前 Project 的 Todo 列表。
  //
  // 这样可以确保页面展示的 completed 状态来自后端数据库，
  // 而不是前端自己临时改数组。
  await handleLoadTodos(selectedProjectId.value);
}
```

注意：

```text
completed: !todo.completed

这行的意思是：
- 当前是 false，就更新成 true
- 当前是 true，就更新成 false
```

---

## Step 4: 在 Todo 列表里加按钮

找到当前 Todo 列表：

```vue
<ul v-if="todoListState.status === 'success'" class="todo-list">
  <li v-for="todo in todoListState.todos" :key="todo.id">
    <strong>{{ todo.title }}</strong>
    <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
  </li>
</ul>
```

改成：

```vue
<ul v-if="todoListState.status === 'success'" class="todo-list">
  <li v-for="todo in todoListState.todos" :key="todo.id">
    <div>
      <strong>{{ todo.title }}</strong>
      <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
    </div>

    <button type="button" @click="handleToggleTodo(todo)">
      {{ todo.completed ? "标记未完成" : "标记完成" }}
    </button>
  </li>
</ul>
```

为什么加一层 `<div>`？

```text
因为 Todo 一项里现在有两块内容：
1. 左侧：title + 状态文本
2. 右侧：操作按钮

用 div 包住左侧内容，CSS 更容易控制布局。
```

---

## Step 5: 补按钮样式

修改：

```text
apps/web/src/style.css
```

追加：

```css
.todo-list li div {
  display: grid;
  gap: 4px;
}

.todo-list button {
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 6px 10px;
  background: white;
  cursor: pointer;
  font: inherit;
  font-weight: 700;
  white-space: nowrap;
}
```

---

## Step 6: 自己验证

打开前端：

```text
http://localhost:5174
```

按顺序手动测：

1. 登录
2. 加载 Projects
3. 选择一个 Project
4. 如果没有 Todo，先创建一个 Todo
5. 点击“标记完成”
6. 确认状态从“未完成”变成“已完成”
7. 再点击“标记未完成”
8. 确认状态变回“未完成”

---

## Step 7: 你完成后告诉我

你完成后回复：

```text
Vue Todo 完成状态切换完成了
```

我会帮你：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试
- 用浏览器真实登录、选择 Project、切换 Todo 完成状态
- 补学习型注释
- 更新任务索引
- 给下一张 Todo 更新和删除任务卡
