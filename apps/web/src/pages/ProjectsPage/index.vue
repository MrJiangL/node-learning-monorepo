<script setup lang="ts">
import type { Todo, TodoPriority } from "@learn/shared";
import { ref } from "vue";
import { useRouter } from "vue-router";
import { clearAuthToken } from "../../auth/token-storage";
import ActivityLogPanel from "./components/ActivityLogPanel/index.vue";
import ProjectListPanel from "./components/ProjectListPanel/index.vue";
import TodoPanel from "./components/TodoPanel/index.vue";
import UserActivityLogPanel from "./components/UserActivityLogPanel/index.vue";
import { useActivityLogs } from "./composables/useActivityLogs";
import { useProjects } from "./composables/useProjects";
import { useTodos } from "./composables/useTodos";
import { useUserActivityLogs } from "./composables/useUserActivityLogs";

const router = useRouter();
const {
  projectListState,
  loadProjects,
  createProjectFromInput,
  saveProject,
  deleteProjectFromList
} = useProjects();
const { activityLogListState, loadActivityLogs, resetActivityLogs } = useActivityLogs();
const {
  todoListState,
  loadTodos,
  createTodoForProject,
  toggleTodo,
  saveTodo,
  deleteTodoFromProject,
  resetTodos
} = useTodos();
const selectedProjectId = ref<string | null>(null);
const savingProjectId = ref<string | null>(null);
const deletingProjectId = ref<string | null>(null);
const projectMutationError = ref<string | null>(null);
const { userActivityLogListState, hasLoadedUserActivityLogs, loadUserActivityLogs } =
  useUserActivityLogs();

async function refreshUserActivityLogsIfLoaded() {
  // 用户级 Activity Log 是一个“可选的最近动态面板”。
  //
  // 首屏不要自动请求它，避免进入 /projects 时多一次附加请求。
  // 但用户已经手动加载过之后，Project / Todo 操作成功就顺手刷新，
  // 这样“我的最近操作”会自然跟上页面变化。
  if (hasLoadedUserActivityLogs.value) {
    await loadUserActivityLogs();
  }
}

async function handleSelectProject(projectId: string) {
  // selectedProjectId 是页面状态。
  //
  // 它表示“当前用户正在查看哪个 Project 的 Todo”，
  // 所以仍然放在 ProjectsPage，而不是放进 useTodos。
  selectedProjectId.value = projectId;
  await Promise.all([loadTodos(projectId), loadActivityLogs(projectId)]);
}

async function handleCreateTodo(input: { title: string; priority: TodoPriority }) {
  // TodoPanel 只知道用户提交了 title。
  //
  // 当前选中的 Project 由页面状态 selectedProjectId 管理，
  // 所以这里把 selectedProjectId 和表单 input 一起交给 useTodos。
  await createTodoForProject(selectedProjectId.value, input);
  await loadActivityLogs(selectedProjectId.value);
  await refreshUserActivityLogsIfLoaded();
}

async function handleToggleTodo(todo: Todo) {
  // toggleTodo 需要完整 Todo，因为它要根据当前 completed 取反。
  //
  // 页面本身不再关心 PATCH /todos/:id 的细节，
  // 只是把“当前 Project + 当前 Todo”交给 composable。
  await toggleTodo(selectedProjectId.value, todo);
  await loadActivityLogs(selectedProjectId.value);
  await refreshUserActivityLogsIfLoaded();
}

async function handleSaveTodo(
  todoId: string,
  input: { title: string; dueDate: string | null; priority: TodoPriority }
) {
  // 编辑 Todo 后仍然重新加载当前 Project 的 Todo 列表。
  //
  // 这件事已经封装在 saveTodo 里，
  // 页面只负责把事件参数转发过去。
  await saveTodo(selectedProjectId.value, todoId, input);
  await loadActivityLogs(selectedProjectId.value);
  await refreshUserActivityLogsIfLoaded();
}

async function handleDeleteTodo(todoId: string) {
  // 删除 Todo 和更新 Todo 一样，需要知道当前 Project。
  //
  // 因为删除成功后 useTodos 会重新加载这个 Project 下的 Todo 列表。
  await deleteTodoFromProject(selectedProjectId.value, todoId);
  await loadActivityLogs(selectedProjectId.value);
  await refreshUserActivityLogsIfLoaded();
}

async function handleCreateProject(input: { name: string; description?: string }) {
  await createProjectFromInput(input);
  await refreshUserActivityLogsIfLoaded();
}

async function handleSaveProject(projectId: string, input: { name: string; description?: string }) {
  savingProjectId.value = projectId;
  projectMutationError.value = null;

  try {
    const result = await saveProject(projectId, input);

    if (!result.success) {
      projectMutationError.value = result.message;
      return;
    }

    await loadActivityLogs(projectId);
    await refreshUserActivityLogsIfLoaded();
  } finally {
    savingProjectId.value = null;
  }
}

async function handleDeleteProject(projectId: string) {
  deletingProjectId.value = projectId;
  projectMutationError.value = null;

  try {
    const result = await deleteProjectFromList(projectId);

    if (!result.success) {
      projectMutationError.value = result.message;
      return;
    }

    if (selectedProjectId.value === projectId) {
      selectedProjectId.value = null;
      resetTodos();
      resetActivityLogs();
    }

    await refreshUserActivityLogsIfLoaded();
  } finally {
    deletingProjectId.value = null;
  }
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
      :saving-project-id="savingProjectId"
      :deleting-project-id="deletingProjectId"
      :project-mutation-error="projectMutationError"
      @load-projects="loadProjects"
      @logout="handleLogout"
      @select-project="handleSelectProject"
      @create-project="handleCreateProject"
      @save-project="handleSaveProject"
      @delete-project="handleDeleteProject"
    />

    <TodoPanel
      :selected-project-id="selectedProjectId"
      :todo-list-state="todoListState"
      @create-todo="handleCreateTodo"
      @toggle-todo="handleToggleTodo"
      @save-todo="handleSaveTodo"
      @delete-todo="handleDeleteTodo"
    />

    <ActivityLogPanel
      :selected-project-id="selectedProjectId"
      :activity-log-list-state="activityLogListState"
      @load-activity-logs="loadActivityLogs(selectedProjectId)"
    />

    <UserActivityLogPanel
      :user-activity-log-list-state="userActivityLogListState"
      @load-user-activity-logs="loadUserActivityLogs"
    />
  </main>
</template>
