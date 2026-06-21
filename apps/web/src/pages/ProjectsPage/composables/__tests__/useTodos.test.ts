import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTodos } from "../useTodos";
import { fetchTodos } from "../../../../api/todos";
import { getAuthToken } from "../../../../auth/token-storage";

// useTodos 依赖 token-storage 判断当前用户是否已登录。
//
// 测试里不要真的读 localStorage，
// 而是用 vi.fn() 手动控制“有 token / 没 token”两种场景。
vi.mock("../../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

// Todo API client 在这里全部 mock 掉。
//
// 这样测试关注点会很清楚：
// useTodos 有没有正确调用 API client，
// 以及 API 返回后 todoListState.value 有没有正确变化。
vi.mock("../../../../api/todos", () => ({
  createTodo: vi.fn(),
  deleteTodo: vi.fn(),
  fetchTodos: vi.fn(),
  updateTodo: vi.fn()
}));

// vi.mocked 让 TypeScript 知道这些函数已经是 mock 函数。
//
// 否则 TS 只知道 getAuthToken 是普通函数，
// 不知道它运行时已经拥有 mockReturnValue 这些测试方法。
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

    // 没有 token 时不应该调用 Todo API。
    //
    // 这条断言保护的是“未登录请求在 composable 层被挡住”这个行为。
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

    // Todo 是 Project 的子资源，
    // 所以 fetchTodos 需要同时拿到 projectId 和 token。
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
