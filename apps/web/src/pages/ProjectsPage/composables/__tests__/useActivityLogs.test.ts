import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchActivityLogs } from "../../../../api/activity-logs";
import { getAuthToken } from "../../../../auth/token-storage";
import { useActivityLogs } from "../useActivityLogs";

vi.mock("../../../../auth/token-storage", () => ({
  getAuthToken: vi.fn()
}));

vi.mock("../../../../api/activity-logs", () => ({
  fetchActivityLogs: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedFetchActivityLogs = vi.mocked(fetchActivityLogs);

describe("useActivityLogs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("没有选中 Project 时保持 idle 状态", async () => {
    const { activityLogListState, loadActivityLogs } = useActivityLogs();

    await loadActivityLogs(null);

    expect(activityLogListState.value).toEqual({
      status: "idle"
    });
    expect(mockedGetAuthToken).not.toHaveBeenCalled();
    expect(mockedFetchActivityLogs).not.toHaveBeenCalled();
  });

  it("没有 token 时进入错误状态", async () => {
    mockedGetAuthToken.mockReturnValue(null);

    const { activityLogListState, loadActivityLogs } = useActivityLogs();

    await loadActivityLogs("project-1");

    expect(activityLogListState.value).toEqual({
      status: "error",
      message: "请先登录，再加载活动记录"
    });
    expect(mockedFetchActivityLogs).not.toHaveBeenCalled();
  });

  it("有 token 时加载活动记录并进入 success 状态", async () => {
    mockedGetAuthToken.mockReturnValue("access-token");
    mockedFetchActivityLogs.mockResolvedValue({
      success: true,
      data: [
        {
          id: "log-1",
          action: "project.created",
          message: "创建了 Project：学习项目",
          metadata: null,
          createdAt: "2026-06-28T10:00:00.000Z",
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

    const { activityLogListState, loadActivityLogs } = useActivityLogs();

    await loadActivityLogs("project-1");

    expect(mockedFetchActivityLogs).toHaveBeenCalledWith("project-1", "access-token");
    expect(activityLogListState.value).toEqual({
      status: "success",
      logs: [
        {
          id: "log-1",
          action: "project.created",
          message: "创建了 Project：学习项目",
          metadata: null,
          createdAt: "2026-06-28T10:00:00.000Z",
          userId: "user-1",
          projectId: "project-1",
          projectSnapshotId: "project-1",
          projectSnapshotName: "学习项目"
        }
      ]
    });
  });
});
