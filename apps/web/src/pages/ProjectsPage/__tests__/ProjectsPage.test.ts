import type { Project, Todo } from "@learn/shared";
import { mount } from "@vue/test-utils";
import { computed, ref } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProjectsPage from "../index.vue";

const mocks = vi.hoisted(() => {
  return {
    push: vi.fn(),
    loadProjects: vi.fn(),
    createProjectFromInput: vi.fn(),
    saveProject: vi.fn(),
    deleteProjectFromList: vi.fn(),
    loadTodos: vi.fn(),
    createTodoForProject: vi.fn(),
    toggleTodo: vi.fn(),
    saveTodo: vi.fn(),
    deleteTodoFromProject: vi.fn(),
    resetTodos: vi.fn(),
    loadActivityLogs: vi.fn(),
    resetActivityLogs: vi.fn(),
    loadUserActivityLogs: vi.fn()
  };
});

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mocks.push
  })
}));

vi.mock("../../../auth/token-storage", () => ({
  clearAuthToken: vi.fn()
}));

vi.mock("../composables/useProjects", () => ({
  useProjects: () => ({
    projectListState: ref({
      status: "success",
      projects: [
        {
          id: "project-1",
          userId: "user-1",
          name: "学习项目",
          description: null,
          createdAt: "2026-06-29T00:00:00.000Z",
          updatedAt: "2026-06-29T00:00:00.000Z"
        } satisfies Project
      ]
    }),
    loadProjects: mocks.loadProjects,
    createProjectFromInput: mocks.createProjectFromInput,
    saveProject: mocks.saveProject,
    deleteProjectFromList: mocks.deleteProjectFromList
  })
}));

vi.mock("../composables/useTodos", () => ({
  useTodos: () => ({
    todoListState: ref({
      status: "success",
      todos: [
        {
          id: "todo-1",
          projectId: "project-1",
          title: "学习自动刷新",
          description: null,
          completed: false,
          priority: "medium",
          dueDate: null,
          createdAt: "2026-06-29T00:00:00.000Z",
          updatedAt: "2026-06-29T00:00:00.000Z"
        } satisfies Todo
      ]
    }),
    loadTodos: mocks.loadTodos,
    createTodoForProject: mocks.createTodoForProject,
    toggleTodo: mocks.toggleTodo,
    saveTodo: mocks.saveTodo,
    deleteTodoFromProject: mocks.deleteTodoFromProject,
    resetTodos: mocks.resetTodos
  })
}));

vi.mock("../composables/useActivityLogs", () => ({
  useActivityLogs: () => ({
    activityLogListState: ref({
      status: "success",
      logs: []
    }),
    loadActivityLogs: mocks.loadActivityLogs,
    resetActivityLogs: mocks.resetActivityLogs
  })
}));

const userActivityLogListState = ref<
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: [] }
  | { status: "error"; message: string }
>({ status: "idle" });

vi.mock("../composables/useUserActivityLogs", () => ({
  useUserActivityLogs: () => ({
    userActivityLogListState,
    hasLoadedUserActivityLogs: computed(() => userActivityLogListState.value.status !== "idle"),
    loadUserActivityLogs: mocks.loadUserActivityLogs
  })
}));

function mountProjectsPage() {
  return mount(ProjectsPage, {
    global: {
      stubs: {
        ProjectListPanel: {
          props: ["projectListState", "selectedProjectId"],
          emits: ["selectProject", "createProject", "saveProject", "deleteProject"],
          template: `
            <section>
              <button type="button" data-test="select-project" @click="$emit('selectProject', 'project-1')">选择</button>
              <button type="button" data-test="create-project" @click="$emit('createProject', { name: '新 Project' })">创建 Project</button>
              <button type="button" data-test="save-project" @click="$emit('saveProject', 'project-1', { name: '更新 Project' })">保存 Project</button>
              <button type="button" data-test="delete-project" @click="$emit('deleteProject', 'project-1')">删除 Project</button>
            </section>
          `
        },
        TodoPanel: {
          props: ["selectedProjectId", "todoListState"],
          emits: ["createTodo", "toggleTodo", "saveTodo", "deleteTodo"],
          template: `
            <section>
              <button type="button" data-test="create-todo" @click="$emit('createTodo', { title: '新 Todo', priority: 'medium' })">创建 Todo</button>
              <button type="button" data-test="toggle-todo" @click="$emit('toggleTodo', { id: 'todo-1', projectId: 'project-1', title: '学习自动刷新', description: null, completed: false, priority: 'medium', dueDate: null, createdAt: '2026-06-29T00:00:00.000Z', updatedAt: '2026-06-29T00:00:00.000Z' })">标记完成</button>
              <button type="button" data-test="save-todo" @click="$emit('saveTodo', 'todo-1', { title: '更新 Todo', dueDate: null, priority: 'high' })">保存 Todo</button>
              <button type="button" data-test="delete-todo" @click="$emit('deleteTodo', 'todo-1')">删除 Todo</button>
            </section>
          `
        },
        ActivityLogPanel: true,
        UserActivityLogPanel: {
          props: ["userActivityLogListState"],
          emits: ["loadUserActivityLogs"],
          template: `
            <section>
              <button type="button" data-test="load-user-activity-logs" @click="$emit('loadUserActivityLogs')">加载最近操作</button>
            </section>
          `
        }
      }
    }
  });
}

describe("ProjectsPage user activity log refresh", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    userActivityLogListState.value = { status: "idle" };
    mocks.saveProject.mockResolvedValue({ success: true });
    mocks.deleteProjectFromList.mockResolvedValue({ success: true });
  });

  it("初始进入页面不会自动请求用户级 Activity Log", () => {
    mountProjectsPage();

    expect(mocks.loadUserActivityLogs).not.toHaveBeenCalled();
  });

  it("用户级 Activity Log 还没加载过时，Todo 操作成功后不会自动刷新", async () => {
    const wrapper = mountProjectsPage();

    await wrapper.get('[data-test="select-project"]').trigger("click");
    await wrapper.get('[data-test="create-todo"]').trigger("click");

    expect(mocks.createTodoForProject).toHaveBeenCalledWith("project-1", {
      title: "新 Todo",
      priority: "medium"
    });
    expect(mocks.loadUserActivityLogs).not.toHaveBeenCalled();
  });

  it("用户级 Activity Log 已加载过时，Todo 操作成功后会自动刷新", async () => {
    const wrapper = mountProjectsPage();

    await wrapper.get('[data-test="select-project"]').trigger("click");
    userActivityLogListState.value = { status: "success", logs: [] };
    await wrapper.get('[data-test="create-todo"]').trigger("click");

    expect(mocks.createTodoForProject).toHaveBeenCalledWith("project-1", {
      title: "新 Todo",
      priority: "medium"
    });
    expect(mocks.loadUserActivityLogs).toHaveBeenCalledTimes(1);
  });

  it("用户级 Activity Log 已加载过时，Project 操作成功后会自动刷新", async () => {
    const wrapper = mountProjectsPage();

    userActivityLogListState.value = { status: "success", logs: [] };

    await wrapper.get('[data-test="create-project"]').trigger("click");
    await wrapper.get('[data-test="save-project"]').trigger("click");
    await wrapper.get('[data-test="delete-project"]').trigger("click");

    expect(mocks.createProjectFromInput).toHaveBeenCalledWith({ name: "新 Project" });
    expect(mocks.saveProject).toHaveBeenCalledWith("project-1", { name: "更新 Project" });
    expect(mocks.deleteProjectFromList).toHaveBeenCalledWith("project-1");
    expect(mocks.loadUserActivityLogs).toHaveBeenCalledTimes(3);
  });
});
