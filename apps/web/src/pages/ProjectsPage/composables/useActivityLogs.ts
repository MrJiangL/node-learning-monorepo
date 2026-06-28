import type { ActivityLog } from "@learn/shared";
import { ref } from "vue";
import { fetchActivityLogs } from "../../../api/activity-logs";
import { getAuthToken } from "../../../auth/token-storage";

export type ActivityLogListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: ActivityLog[] }
  | { status: "error"; message: string };

export function useActivityLogs() {
  const activityLogListState = ref<ActivityLogListState>({ status: "idle" });

  async function loadActivityLogs(projectId: string | null) {
    // Activity Log 和 Todo 一样，都是“当前选中 Project 的派生数据”。
    //
    // 页面刚进入时还没有 selectedProjectId，
    // 这时不应该请求 /projects/null/activity-logs，
    // 而是保持一个可理解的 idle 状态。
    if (!projectId) {
      activityLogListState.value = { status: "idle" };
      return;
    }

    const token = getAuthToken();

    if (!token) {
      activityLogListState.value = {
        status: "error",
        message: "请先登录，再加载活动记录"
      };
      return;
    }

    activityLogListState.value = { status: "loading" };

    try {
      const result = await fetchActivityLogs(projectId, token);

      activityLogListState.value = {
        status: "success",
        logs: result.data
      };
    } catch (error) {
      activityLogListState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  function resetActivityLogs() {
    activityLogListState.value = { status: "idle" };
  }

  return {
    activityLogListState,
    loadActivityLogs,
    resetActivityLogs
  };
}
