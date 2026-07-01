<script setup lang="ts">
import { ref } from "vue";
import type { Todo, TodoPriority } from "@learn/shared";

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
  createTodo: [input: { title: string; priority: TodoPriority }];
  toggleTodo: [todo: Todo];
  saveTodo: [
    todoId: string,
    input: { title: string; dueDate: string | null; priority: TodoPriority }
  ];
  deleteTodo: [todoId: string];
}>();

const priorityOptions: { value: TodoPriority; label: string }[] = [
  { value: "low", label: "低" },
  { value: "medium", label: "中" },
  { value: "high", label: "高" }
];

const todoTitle = ref("");
const todoPriority = ref<TodoPriority>("medium");
const editingTodoId = ref<string | null>(null);
const editingTodoTitle = ref("");
const editingTodoDueDate = ref("");
const editingTodoPriority = ref<TodoPriority>("medium");

function formatTodoPriority(priority: TodoPriority): string {
  return priorityOptions.find((option) => option.value === priority)?.label ?? priority;
}

function formatTodoDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "暂无截止日期";
  }

  const formattedDate = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dueDate));

  return `截止：${formattedDate}`;
}

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
  emit("createTodo", { title, priority: todoPriority.value });
  todoTitle.value = "";
  todoPriority.value = "medium";
}

function handleStartEditTodo(todo: Todo) {
  // 编辑状态只影响 TodoPanel 内部的 UI 展示，
  // 不需要让父组件知道，所以放在子组件里。
  editingTodoId.value = todo.id;
  editingTodoTitle.value = todo.title;
  editingTodoDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : "";
  editingTodoPriority.value = todo.priority;
}

function handleCancelEditTodo() {
  editingTodoId.value = null;
  editingTodoTitle.value = "";
  editingTodoDueDate.value = "";
  editingTodoPriority.value = "medium";
}

function handleSaveTodo(todoId: string) {
  const title = editingTodoTitle.value.trim();

  if (!title) {
    alert("Todo 标题不能为空");
    return;
  }

  emit("saveTodo", todoId, {
    title,
    dueDate: editingTodoDueDate.value || null,
    priority: editingTodoPriority.value
  });
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
      <select v-model="todoPriority" name="todoPriority">
        <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
          优先级：{{ option.label }}
        </option>
      </select>
      <button type="submit">创建 Todo</button>
    </form>

    <p v-if="props.todoListState.status === 'loading'">正在加载 Todos...</p>
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
          <span>优先级：{{ formatTodoPriority(todo.priority) }}</span>
          <span>{{ formatTodoDueDate(todo.dueDate) }}</span>
        </div>

        <div v-if="editingTodoId === todo.id" class="todo-edit-form">
          <input v-model="editingTodoTitle" name="editingTodoTitle" type="text" />
          <select v-model="editingTodoPriority" name="editingTodoPriority">
            <option v-for="option in priorityOptions" :key="option.value" :value="option.value">
              优先级：{{ option.label }}
            </option>
          </select>
          <input v-model="editingTodoDueDate" name="editingTodoDueDate" type="date" />
          <button type="button" @click="handleSaveTodo(todo.id)">保存</button>
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
