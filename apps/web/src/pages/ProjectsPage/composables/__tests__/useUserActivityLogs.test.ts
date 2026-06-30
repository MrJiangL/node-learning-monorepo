import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchUserActivityLogs } from "../../../../api/activity-logs";
import { getAuthToken } from "../../../../auth/token-storage";
import { useUserActivityLogs } from "../useUserActivityLogs";

vi.mock("../../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

vi.mock("../../../../api/activity-logs", () => ({
  fetchUserActivityLogs: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedFetchUserActivityLogs = vi.mocked(fetchUserActivityLogs);

describe("useUserActivityLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有 token 时进入错误状态", async () => {
    mockedGetAuthToken.mockReturnValue(null);

    const { userActivityLogListState, hasLoadedUserActivityLogs, loadUserActivityLogs } =
      useUserActivityLogs();

    expect(hasLoadedUserActivityLogs.value).toBe(false);

    await loadUserActivityLogs();

    expect(userActivityLogListState.value).toEqual({
      status: "error",
      message: "请先登录，再加载最近操作"
    });
    expect(hasLoadedUserActivityLogs.value).toBe(true);
    expect(mockedFetchUserActivityLogs).not.toHaveBeenCalled();
  });

  it("有 token 时加载用户级活动记录并进入 success 状态", async () => {
    mockedGetAuthToken.mockReturnValue("access-token");
    mockedFetchUserActivityLogs.mockResolvedValue({
      success: true,
      data: [
        {
          id: "log-1",
          action: "todo.updated",
          message: "更新了 Todo：学习 dueDate",
          metadata: null,
          createdAt: "2026-06-29T10:00:00.000Z",
          userId: "user-1",
          projectId: "project-1",
          projectSnapshotId: "project-1",
          projectSnapshotName: "学习项目"
        }
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1
      }
    });

    const { userActivityLogListState, hasLoadedUserActivityLogs, loadUserActivityLogs } =
      useUserActivityLogs();

    expect(hasLoadedUserActivityLogs.value).toBe(false);

    await loadUserActivityLogs();

    expect(mockedFetchUserActivityLogs).toHaveBeenCalledWith("access-token");
    expect(hasLoadedUserActivityLogs.value).toBe(true);
    expect(userActivityLogListState.value).toEqual({
      status: "success",
      logs: [
        {
          id: "log-1",
          action: "todo.updated",
          message: "更新了 Todo：学习 dueDate",
          metadata: null,
          createdAt: "2026-06-29T10:00:00.000Z",
          userId: "user-1",
          projectId: "project-1",
          projectSnapshotId: "project-1",
          projectSnapshotName: "学习项目"
        }
      ]
    });
  });

  it("加载失败时进入错误状态", async () => {
    mockedGetAuthToken.mockReturnValue("access-token");
    mockedFetchUserActivityLogs.mockRejectedValue(new Error("加载最近操作失败"));

    const { userActivityLogListState, loadUserActivityLogs } = useUserActivityLogs();

    await loadUserActivityLogs();

    expect(userActivityLogListState.value).toEqual({
      status: "error",
      message: "加载最近操作失败"
    });
  });
});
