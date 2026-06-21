# Task: Vue Update And Delete Todo

## 目标

这一张继续完善 Todo 的前端 CRUD：

```text
编辑 Todo title -> PATCH /todos/:id
删除 Todo -> DELETE /todos/:id
```

后端接口是：

```text
PATCH  /todos/:id
DELETE /todos/:id
```

前端走 Vite proxy：

```text
PATCH  /api/todos/:id
DELETE /api/todos/:id
```

你完成后，页面应该能做到：

- 每个 Todo 可以进入编辑状态
- 编辑 title 后保存
- 保存成功后刷新当前 Project 的 Todo 列表
- 每个 Todo 可以删除
- 删除成功后刷新当前 Project 的 Todo 列表
- 没有 token / 没有选择 Project 时显示错误

---

## 你会练到什么

- 继续练 `PATCH` 局部更新
- 使用 `DELETE` 请求
- 用 `editingTodoId` 表示当前正在编辑哪一条 Todo
- 用 `editingTodoTitle` 表示编辑输入框里的值
- 更新成功和删除成功后，复用 `handleLoadTodos`

---

## Step 1: 扩展 Todo API client

修改：

```text
apps/web/src/api/todos.ts
```

你现在应该已经有：

```ts
export async function updateTodo(...)
```

继续增加删除函数：

```ts
export async function deleteTodo(todoId: string, token: string): Promise<void> {
  // DELETE /todos/:id 删除一条 Todo。
  //
  // 后端成功时返回 204 No Content。
  // 204 的意思是“成功，但没有响应体”，所以这里不需要 response.json()。
  const response = await fetch(`/api/todos/${todoId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error("删除 Todo 失败");
  }
}
```

---

## Step 2: 在 App.vue 引入 deleteTodo

修改：

```text
apps/web/src/App.vue
```

把：

```ts
import { createTodo, fetchTodos, updateTodo } from "./api/todos";
```

改成：

```ts
import { createTodo, deleteTodo, fetchTodos, updateTodo } from "./api/todos";
```

---

## Step 3: 增加编辑状态

在 `App.vue` 的 `<script setup>` 里增加：

```ts
const editingTodoId = ref<string | null>(null);
const editingTodoTitle = ref("");
```

这两个状态分别表示：

```text
editingTodoId：当前正在编辑的 Todo id
editingTodoTitle：编辑输入框里的 title
```

---

## Step 4: 增加开始编辑函数

在 `App.vue` 里增加：

```ts
function handleStartEditTodo(todo: Todo) {
  // 进入编辑状态时，把当前 Todo 的 id 和 title 放进编辑状态。
  //
  // 这样模板就知道：
  // - 哪一条 Todo 要显示输入框
  // - 输入框初始值应该是什么
  editingTodoId.value = todo.id;
  editingTodoTitle.value = todo.title;
}
```

---

## Step 5: 增加取消编辑函数

继续增加：

```ts
function handleCancelEditTodo() {
  editingTodoId.value = null;
  editingTodoTitle.value = "";
}
```

取消编辑时要清空这两个状态，避免下次编辑时残留上一次输入。

---

## Step 6: 增加保存编辑函数

继续增加：

```ts
async function handleSaveTodoTitle(todoId: string) {
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

  const title = editingTodoTitle.value.trim();

  if (!title) {
    todoListState.value = {
      status: "error",
      message: "Todo 标题不能为空"
    };
    return;
  }

  await updateTodo(todoId, token, { title });
  handleCancelEditTodo();
  await handleLoadTodos(selectedProjectId.value);
}
```

这里的重点：

```text
updateTodo(todoId, token, { title })

PATCH 只传 title，后端只更新 title。
completed / dueDate 等字段不会被这次请求覆盖。
```

---

## Step 7: 增加删除函数

继续增加：

```ts
async function handleDeleteTodo(todoId: string) {
  const token = getAuthToken();

  if (!token) {
    todoListState.value = {
      status: "error",
      message: "请先登录，再删除 Todo"
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

  await deleteTodo(todoId, token);
  await handleLoadTodos(selectedProjectId.value);
}
```

这一版先不加浏览器确认弹窗，先把接口链路练通。

---

## Step 8: 修改 Todo 列表模板

找到 Todo 列表里的：

```vue
<li v-for="todo in todoListState.todos" :key="todo.id">
  <div>
    <strong>{{ todo.title }}</strong>
    <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
  </div>

  <button type="button" @click="handleToggleTodo(todo)">
    {{ todo.completed ? "标记未完成" : "标记完成" }}
  </button>
</li>
```

改成：

```vue
<li v-for="todo in todoListState.todos" :key="todo.id">
  <div v-if="editingTodoId !== todo.id">
    <strong>{{ todo.title }}</strong>
    <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
  </div>

  <div v-if="editingTodoId === todo.id" class="todo-edit-form">
    <input v-model="editingTodoTitle" type="text" />
    <button type="button" @click="handleSaveTodoTitle(todo.id)">保存</button>
    <button type="button" @click="handleCancelEditTodo">取消</button>
  </div>

  <div class="todo-actions">
    <button type="button" @click="handleToggleTodo(todo)">
      {{ todo.completed ? "标记未完成" : "标记完成" }}
    </button>
    <button type="button" @click="handleStartEditTodo(todo)">编辑</button>
    <button type="button" @click="handleDeleteTodo(todo.id)">删除</button>
  </div>
</li>
```

---

## Step 9: 补样式

修改：

```text
apps/web/src/style.css
```

追加：

```css
.todo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}

.todo-edit-form {
  display: flex;
  flex: 1;
  gap: 8px;
}

.todo-edit-form input {
  min-width: 0;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  padding: 8px 10px;
  font: inherit;
}
```

---

## Step 10: 自己验证

打开前端：

```text
http://localhost:5174
```

按顺序测：

1. 登录
2. 加载 Projects
3. 选择 Project
4. 创建一个 Todo
5. 点击编辑
6. 修改 title 并保存
7. 确认页面显示新 title
8. 点击删除
9. 确认 Todo 从列表消失

---

## Step 11: 你完成后告诉我

你完成后回复：

```text
Vue Todo 更新和删除完成了
```

我会帮你：

- 跑 `npm run typecheck`
- 跑 `npm run build`
- 跑 `npm run format:check`
- 跑后端测试
- 用浏览器真实登录、编辑 Todo、删除 Todo
- 补学习型注释
- 更新任务索引
- 给下一张前端创建 Project 任务卡
