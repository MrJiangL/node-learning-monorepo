# Task: Vue Split TodoPanel

## 目标

上一张你已经把 Project 区域拆成了：

```text
ProjectsPage/components/ProjectListPanel/index.vue
```

这一张继续拆 Todo 区域。

目标是创建：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
```

让 `TodoPanel` 负责：

```text
展示 Todos 标题
展示“先选择一个 Project”
展示 Todo 创建表单
展示 Todo 加载 / 错误 / 空列表状态
展示 Todo 列表
展示编辑输入框
点击创建 Todo 时通知父组件
点击切换完成状态时通知父组件
点击编辑 / 取消编辑 / 保存编辑时通知父组件
点击删除 Todo 时通知父组件
```

父组件 `ProjectsPage/index.vue` 继续负责：

```text
保存 selectedProjectId
保存 todoListState
调用 Todo API
处理 token
重新加载 Todo 列表
```

---

## 你会练到什么

- 子组件接收多个 `props`
- 子组件发出多个 `emit`
- 父组件保存核心业务状态
- 子组件保存局部 UI 状态
- 如何判断状态应该放父组件还是子组件

---

## Step 1: 创建 TodoPanel 组件

创建：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
```

写入：

```vue
<script setup lang="ts">
import { ref } from "vue";
import type { Todo } from "@learn/shared";

type TodoListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; todos: Todo[] }
  | { status: "error"; message: string };

const props = defineProps<{
  selectedProjectId: string | null;
  todoListState: TodoListState;
}>();

const emit = defineEmits<{
  createTodo: [input: { title: string }];
  toggleTodo: [todo: Todo];
  saveTodoTitle: [todoId: string, input: { title: string }];
  deleteTodo: [todoId: string];
}>();

const todoTitle = ref("");
const editingTodoId = ref<string | null>(null);
const editingTodoTitle = ref("");

function handleSubmitCreateTodo() {
  const title = todoTitle.value.trim();

  if (!title) {
    alert("Todo 标题不能为空");
    return;
  }

  // 子组件只负责把用户输入整理成事件参数。
  //
  // 真正调用 createTodo API 的逻辑仍然在父组件里，
  // 因为父组件才知道 token、selectedProjectId 和重新加载列表的细节。
  emit("createTodo", { title });
  todoTitle.value = "";
}

function handleStartEditTodo(todo: Todo) {
  // 编辑状态只影响 TodoPanel 内部的 UI 展示，
  // 不需要让父组件知道，所以放在子组件里。
  editingTodoId.value = todo.id;
  editingTodoTitle.value = todo.title;
}

function handleCancelEditTodo() {
  editingTodoId.value = null;
  editingTodoTitle.value = "";
}

function handleSaveTodoTitle(todoId: string) {
  const title = editingTodoTitle.value.trim();

  if (!title) {
    alert("Todo 标题不能为空");
    return;
  }

  emit("saveTodoTitle", todoId, { title });
  handleCancelEditTodo();
}
</script>

<template>
  <section class="todo-panel">
    <div class="panel-header">
      <h2>Todos</h2>
    </div>

    <p v-if="!props.selectedProjectId">先选择一个 Project，再查看 Todo。</p>

    <form v-if="props.selectedProjectId" class="todo-form" @submit.prevent="handleSubmitCreateTodo">
      <input v-model="todoTitle" name="todoTitle" type="text" placeholder="Todo title" />
      <button type="submit">创建 Todo</button>
    </form>

    <p v-if="props.todoListState.status === 'loading'">正在加载 Todo...</p>
    <p v-if="props.todoListState.status === 'error'" class="error">
      {{ props.todoListState.message }}
    </p>

    <p v-if="props.todoListState.status === 'success' && props.todoListState.todos.length === 0">
      这个 Project 还没有 Todo。
    </p>

    <ul v-if="props.todoListState.status === 'success'" class="todo-list">
      <li v-for="todo in props.todoListState.todos" :key="todo.id">
        <div v-if="editingTodoId !== todo.id">
          <strong>{{ todo.title }}</strong>
          <span>{{ todo.completed ? "已完成" : "未完成" }}</span>
        </div>

        <div v-if="editingTodoId === todo.id" class="todo-edit-form">
          <input v-model="editingTodoTitle" name="editingTodoTitle" type="text" />
          <button type="button" @click="handleSaveTodoTitle(todo.id)">保存</button>
          <button type="button" @click="handleCancelEditTodo">取消</button>
        </div>

        <div class="todo-actions">
          <button type="button" @click="emit('toggleTodo', todo)">
            {{ todo.completed ? "标记未完成" : "标记完成" }}
          </button>
          <button type="button" @click="handleStartEditTodo(todo)">编辑</button>
          <button type="button" @click="emit('deleteTodo', todo.id)">删除</button>
        </div>
      </li>
    </ul>
  </section>
</template>
```

---

## Step 2: 在父组件 import TodoPanel

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

增加：

```ts
import TodoPanel from "./components/TodoPanel/index.vue";
```

---

## Step 3: 删除父组件里的 Todo 表单和编辑 UI 状态

在 `ProjectsPage/index.vue` 删除这些 ref：

```ts
const todoTitle = ref("");
const editingTodoId = ref<string | null>(null);
const editingTodoTitle = ref("");
```

保留：

```ts
const selectedProjectId = ref<string | null>(null);
const todoListState = ref<TodoListState>({ status: "idle" });
```

学习重点：

```text
selectedProjectId 和 todoListState 是业务状态，父组件要保留。
todoTitle 和 editingTodoTitle 只是 TodoPanel 内部输入框状态，可以放子组件。
```

---

## Step 4: 修改父组件 Todo handler

把 `handleCreateTodo` 改成接收子组件传来的 input：

```ts
async function handleCreateTodo(input: { title: string }) {
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

  await createTodo(selectedProjectId.value, token, input);
  await handleLoadTodos(selectedProjectId.value);
}
```

把 `handleSaveTodoTitle` 改成：

```ts
async function handleSaveTodoTitle(todoId: string, input: { title: string }) {
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

  await updateTodo(todoId, input);
  await handleLoadTodos(selectedProjectId.value);
}
```

注意：如果你发现上面 `updateTodo(todoId, input)` 报类型或参数错误，先去看：

```text
apps/web/src/api/todos.ts
```

现在的 `updateTodo` 需要几个参数？
父组件调用时必须和函数定义一致。

---

## Step 5: 替换 Todo 模板

删除 `ProjectsPage/index.vue` 里整个 Todo section：

```vue
<section class="todo-panel">
  ...
</section>
```

换成：

```vue
<TodoPanel
  :selected-project-id="selectedProjectId"
  :todo-list-state="todoListState"
  @create-todo="handleCreateTodo"
  @toggle-todo="handleToggleTodo"
  @save-todo-title="handleSaveTodoTitle"
  @delete-todo="handleDeleteTodo"
/>
```

---

## Step 6: 跑检查

完成后运行：

```bash
npm run format
npm run typecheck
npm run build
```

你也可以自己浏览器验证：

```text
登录
创建 Project
选择 Project
创建 Todo
编辑 Todo 标题
切换 Todo 完成状态
删除 Todo
```

---

## 完成后告诉我

完成后你直接说：

```text
TodoPanel 组件拆分完成了
```

我会帮你：

- 跑格式检查、类型检查、构建
- 浏览器验证 Todo 创建 / 编辑 / 切换 / 删除
- 检查 props / emit 和状态归属
- 补学习型中文注释
- 更新任务索引
- 给你组件拆分复盘任务卡
