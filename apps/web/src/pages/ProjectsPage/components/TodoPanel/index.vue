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
