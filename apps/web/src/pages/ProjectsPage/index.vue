<script setup lang="ts">
import type { Todo } from "@learn/shared";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { clearAuthToken } from "../../auth/token-storage";
import ProjectListPanel from "./components/ProjectListPanel/index.vue";
import TodoPanel from "./components/TodoPanel/index.vue";
import { useProjects } from "./composables/useProjects";
import { useTodos } from "./composables/useTodos";

const router = useRouter();
const { projectListState, loadProjects, createProjectFromInput } = useProjects();
const {
  todoListState,
  loadTodos,
  createTodoForProject,
  toggleTodo,
  saveTodoTitle,
  deleteTodoFromProject
} = useTodos();
const selectedProjectId = ref<string | null>(null);

async function handleSelectProject(projectId: string) {
  // selectedProjectId 是页面状态。
  //
  // 它表示“当前用户正在查看哪个 Project 的 Todo”，
  // 所以仍然放在 ProjectsPage，而不是放进 useTodos。
  selectedProjectId.value = projectId;
  await loadTodos(projectId);
}

async function handleCreateTodo(input: { title: string }) {
  // TodoPanel 只知道用户提交了 title。
  //
  // 当前选中的 Project 由页面状态 selectedProjectId 管理，
  // 所以这里把 selectedProjectId 和表单 input 一起交给 useTodos。
  await createTodoForProject(selectedProjectId.value, input);
}

async function handleToggleTodo(todo: Todo) {
  // toggleTodo 需要完整 Todo，因为它要根据当前 completed 取反。
  //
  // 页面本身不再关心 PATCH /todos/:id 的细节，
  // 只是把“当前 Project + 当前 Todo”交给 composable。
  await toggleTodo(selectedProjectId.value, todo);
}

async function handleSaveTodoTitle(todoId: string, input: { title: string }) {
  // 编辑标题后仍然重新加载当前 Project 的 Todo 列表。
  //
  // 这件事已经封装在 saveTodoTitle 里，
  // 页面只负责把事件参数转发过去。
  await saveTodoTitle(selectedProjectId.value, todoId, input);
}

async function handleDeleteTodo(todoId: string) {
  // 删除 Todo 和更新 Todo 一样，需要知道当前 Project。
  //
  // 因为删除成功后 useTodos 会重新加载这个 Project 下的 Todo 列表。
  await deleteTodoFromProject(selectedProjectId.value, todoId);
}

async function handleLogout() {
  // 退出登录的核心就是删除本地 token。
  //
  // token 删除后，前端再访问 /projects 会被路由守卫拦回 /login。
  clearAuthToken();
  await router.push("/login");
}
</script>

<template>
  <main class="app-shell">
    <ProjectListPanel
      :project-list-state="projectListState"
      :selected-project-id="selectedProjectId"
      @load-projects="loadProjects"
      @logout="handleLogout"
      @select-project="handleSelectProject"
      @create-project="createProjectFromInput"
    />

    <TodoPanel
      :selected-project-id="selectedProjectId"
      :todo-list-state="todoListState"
      @create-todo="handleCreateTodo"
      @toggle-todo="handleToggleTodo"
      @save-todo-title="handleSaveTodoTitle"
      @delete-todo="handleDeleteTodo"
    />
  </main>
</template>
