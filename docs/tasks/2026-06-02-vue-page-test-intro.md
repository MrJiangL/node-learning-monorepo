# Task: Vue Page Test Intro

## 目标

前面你已经写过两类前端测试：

```text
组件测试：ProjectListPanel / TodoPanel
composable 测试：useProjects / useTodos
```

这一张开始测试页面组件：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

页面组件的职责不是自己请求 API，也不是自己渲染所有细节。

现在 `ProjectsPage` 的核心职责是：

```text
调用 useProjects / useTodos
保存 selectedProjectId
把状态传给子组件
接收子组件 emit，再调用 composable 方法
处理退出登录和路由跳转
```

所以页面测试要测的是“编排逻辑”，不是子组件内部 UI。

---

## 你会练到什么

- 页面测试和组件测试的区别
- 怎么 stub 子组件
- 怎么 mock composable
- 怎么 mock vue-router
- 怎么触发子组件 emit
- 怎么断言页面是否调用了正确的 composable 方法

---

## Step 1: 创建 ProjectsPage 测试文件

创建文件：

```text
apps/web/src/pages/ProjectsPage/__tests__/ProjectsPage.test.ts
```

---

## Step 2: 写 mock

写入：

```ts
import { mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ref } from "vue";
import ProjectsPage from "../index.vue";
import { useProjects } from "../composables/useProjects";
import { useTodos } from "../composables/useTodos";

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}));

vi.mock("../../../auth/token-storage", () => ({
  clearAuthToken: vi.fn()
}));

vi.mock("../composables/useProjects", () => ({
  useProjects: vi.fn()
}));

vi.mock("../composables/useTodos", () => ({
  useTodos: vi.fn()
}));

const mockedUseProjects = vi.mocked(useProjects);
const mockedUseTodos = vi.mocked(useTodos);
```

学习点：

```text
页面测试不需要真的跑 useProjects / useTodos。
这里 mock 它们，是为了只测试 ProjectsPage 怎么调用它们。
```

---

## Step 3: 准备 setup helper

继续写：

```ts
function mountProjectsPage() {
  const loadProjects = vi.fn();
  const createProjectFromInput = vi.fn();
  const loadTodos = vi.fn();
  const createTodoForProject = vi.fn();
  const toggleTodo = vi.fn();
  const saveTodoTitle = vi.fn();
  const deleteTodoFromProject = vi.fn();

  mockedUseProjects.mockReturnValue({
    projectListState: ref({ status: "idle" }),
    loadProjects,
    createProjectFromInput
  });

  mockedUseTodos.mockReturnValue({
    todoListState: ref({ status: "idle" }),
    loadTodos,
    createTodoForProject,
    toggleTodo,
    saveTodoTitle,
    deleteTodoFromProject
  });

  const wrapper = mount(ProjectsPage, {
    global: {
      stubs: {
        ProjectListPanel: {
          props: ["projectListState", "selectedProjectId"],
          emits: ["loadProjects", "logout", "selectProject", "createProject"],
          template: "<section data-test='project-list-panel'></section>"
        },
        TodoPanel: {
          props: ["selectedProjectId", "todoListState"],
          emits: ["createTodo", "toggleTodo", "saveTodoTitle", "deleteTodo"],
          template: "<section data-test='todo-panel'></section>"
        }
      }
    }
  });

  return {
    wrapper,
    loadProjects,
    createProjectFromInput,
    loadTodos,
    createTodoForProject,
    toggleTodo,
    saveTodoTitle,
    deleteTodoFromProject
  };
}

describe("ProjectsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
});
```

学习点：

```text
stubs 会用一个假的 ProjectListPanel / TodoPanel 替代真实子组件。
这样页面测试不会重复测试子组件内部 UI。
```

---

## Step 4: 测选择 Project 会加载 Todo

在 `describe` 里增加：

```ts
it("选择 Project 时会记录选中 id 并加载 Todo", async () => {
  const { wrapper, loadTodos } = mountProjectsPage();
  const projectPanel = wrapper.getComponent({ name: "ProjectListPanel" });
  const todoPanel = wrapper.getComponent({ name: "TodoPanel" });

  await projectPanel.vm.$emit("selectProject", "project-1");

  expect(loadTodos).toHaveBeenCalledWith("project-1");
  expect(todoPanel.props("selectedProjectId")).toBe("project-1");
});
```

学习点：

```text
这里不是点击真实按钮。
因为真实按钮属于 ProjectListPanel 的测试范围。
页面测试只需要模拟子组件 emit 事件。
```

---

## Step 5: 测创建 Todo 会带上 selectedProjectId

继续增加：

```ts
it("创建 Todo 时会把 selectedProjectId 和表单输入交给 useTodos", async () => {
  const { wrapper, createTodoForProject } = mountProjectsPage();
  const projectPanel = wrapper.getComponent({ name: "ProjectListPanel" });
  const todoPanel = wrapper.getComponent({ name: "TodoPanel" });

  await projectPanel.vm.$emit("selectProject", "project-1");
  await todoPanel.vm.$emit("createTodo", { title: "页面测试 Todo" });

  expect(createTodoForProject).toHaveBeenCalledWith("project-1", {
    title: "页面测试 Todo"
  });
});
```

学习点：

```text
这个测试证明 selectedProjectId 留在页面里是有意义的：
页面把“当前选中的 Project”和“TodoPanel 传来的表单输入”组合起来了。
```

---

## Step 6: 跑测试

运行：

```bash
npm run test -w @learn/web
```

再运行：

```bash
npm run typecheck -w @learn/web
```

---

## Step 7: 全项目验证

运行：

```bash
npm run format
npm run format:check
npm run typecheck
npm run build
npm run test -w @learn/api
npm run test -w @learn/web
```

---

## 完成后告诉我

完成后直接说：

```text
Vue 页面测试入门完成了
```

我会帮你检查页面测试的 mock / stub 写法，并安排一次前端测试小复盘。
