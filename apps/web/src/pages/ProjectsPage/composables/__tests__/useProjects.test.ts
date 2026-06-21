import { beforeEach, describe, expect, it, vi } from "vitest";
import { useProjects } from "../useProjects";
import { fetchProjects } from "../../../../api/projects";
import { getAuthToken } from "../../../../auth/token-storage";

// vi.mock 会把指定模块替换成我们给出的假实现。
//
// 注意这里的路径要能解析到真实模块：
// apps/web/src/auth/token-storage.ts
// 这样 useProjects 内部调用 getAuthToken() 时，拿到的才是 vi.fn()。
vi.mock("../../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

// useProjects 内部会调用 fetchProjects / createProject。
//
// composable 测试不应该真的请求后端，
// 所以这里把 API client 整个 mock 掉，只保留“有没有被调用、返回什么数据”这层行为。
vi.mock("../../../../api/projects", () => ({
  createProject: vi.fn(),
  fetchProjects: vi.fn()
}));

// vi.mocked(...) 主要是给 TypeScript 用的。
//
// 它告诉 TS：“这个函数现在是 Vitest mock 函数”，
// 所以后面才能安全调用 mockReturnValue / mockResolvedValue。
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

    // 没有 token 时应该直接停在前端错误状态。
    //
    // 如果这里仍然调用 fetchProjects，
    // 说明 composable 把未登录请求放到了 API client / 后端才处理。
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

    // 这里验证的是 composable 和 API client 的协作合同：
    // loadProjects 从 token-storage 读到 token 后，
    // 应该把这个 token 交给 fetchProjects。
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
