# Task: Vue Composable Test Intro

## 目标

这一张开始测试 composable。

前面组件测试只测：

```text
props 怎么渲染
用户操作后 emit 什么事件
```

现在要测试：

```text
useProjects / useTodos 如何管理状态
有没有读取 token
有没有调用 API client
API 成功后状态怎么变
没有 token 时状态怎么变
```

这一张先不要测试所有函数，只测最核心的两个入口：

```text
useProjects.loadProjects
useTodos.loadTodos
```

---

## 你会练到什么

- composable 测试和组件测试的区别
- 怎么直接调用 composable 返回的方法
- 怎么 mock token-storage
- 怎么 mock API client
- 怎么断言 `ref.value`
- 为什么 composable 测试不需要 mount Vue 组件

---

## Step 1: 创建 useProjects 测试文件

创建文件：

```text
apps/web/src/pages/ProjectsPage/composables/__tests__/useProjects.test.ts
```

写入：

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjects } from "../useProjects";
import { fetchProjects } from "../../../api/projects";
import { getAuthToken } from "../../../auth/token-storage";

vi.mock("../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

vi.mock("../../../api/projects", () => ({
  createProject: vi.fn(),
  fetchProjects: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedFetchProjects = vi.mocked(fetchProjects);

describe("useProjects", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有 token 时会进入错误状态", async () => {
    mockedGetAuthToken.mockReturnValue(null);

    const { projectListState, loadProjects } = useProjects();

    await loadProjects();

    expect(projectListState.value).toEqual({
      status: "error",
      message: "请先登录，再加载 Project 列表"
    });
    expect(mockedFetchProjects).not.toHaveBeenCalled();
  });

  it("有 token 时会加载 Project 列表并进入 success 状态", async () => {
    mockedGetAuthToken.mockReturnValue("test-token");
    mockedFetchProjects.mockResolvedValue({
      success: true,
      data: [
        {
          id: "project-1",
          userId: "user-1",
          name: "学习 Node",
          description: "每天练一点",
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z"
        }
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    });

    const { projectListState, loadProjects } = useProjects();

    await loadProjects();

    expect(mockedFetchProjects).toHaveBeenCalledWith("test-token");
    expect(projectListState.value).toEqual({
      status: "success",
      projects: [
        {
          id: "project-1",
          userId: "user-1",
          name: "学习 Node",
          description: "每天练一点",
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z"
        }
      ]
    });
  });
});
```

---

## Step 2: 创建 useTodos 测试文件

创建文件：

```text
apps/web/src/pages/ProjectsPage/composables/__tests__/useTodos.test.ts
```

写入：

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTodos } from "../useTodos";
import { fetchTodos } from "../../../api/todos";
import { getAuthToken } from "../../../auth/token-storage";

vi.mock("../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

vi.mock("../../../api/todos", () => ({
  createTodo: vi.fn(),
  deleteTodo: vi.fn(),
  fetchTodos: vi.fn(),
  updateTodo: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedFetchTodos = vi.mocked(fetchTodos);

describe("useTodos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有 token 时会进入错误状态", async () => {
    mockedGetAuthToken.mockReturnValue(null);

    const { todoListState, loadTodos } = useTodos();

    await loadTodos("project-1");

    expect(todoListState.value).toEqual({
      status: "error",
      message: "请先登录，再加载 Todo 列表"
    });
    expect(mockedFetchTodos).not.toHaveBeenCalled();
  });

  it("有 token 时会加载 Todo 列表并进入 success 状态", async () => {
    mockedGetAuthToken.mockReturnValue("test-token");
    mockedFetchTodos.mockResolvedValue({
      success: true,
      data: [
        {
          id: "todo-1",
          projectId: "project-1",
          title: "学习 composable 测试",
          description: null,
          completed: false,
          dueDate: null,
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z"
        }
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    });

    const { todoListState, loadTodos } = useTodos();

    await loadTodos("project-1");

    expect(mockedFetchTodos).toHaveBeenCalledWith("project-1", "test-token");
    expect(todoListState.value).toEqual({
      status: "success",
      todos: [
        {
          id: "todo-1",
          projectId: "project-1",
          title: "学习 composable 测试",
          description: null,
          completed: false,
          dueDate: null,
          createdAt: "2026-06-02T00:00:00.000Z",
          updatedAt: "2026-06-02T00:00:00.000Z"
        }
      ]
    });
  });
});
```

---

## Step 3: 跑 web 测试

运行：

```bash
npm run test -w @learn/web
```

预期：

```text
ProjectListPanel 测试通过
TodoPanel 测试通过
useProjects 测试通过
useTodos 测试通过
```

---

## Step 4: 跑类型检查

运行：

```bash
npm run typecheck -w @learn/web
```

如果 mock 的返回值类型不对，TypeScript 会提醒你。

---

## Step 5: 全项目验证

最后运行：

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
Vue composable 测试入门完成了
```

我会帮你检查 mock 写法、补注释、跑完整验证，并安排下一步。
