import type { ActivityLog } from "@learn/shared";
import { computed, ref } from "vue";
import { fetchUserActivityLogs } from "../../../api/activity-logs";
import { getAuthToken } from "../../../auth/token-storage";

export type UserActivityLogListState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; logs: ActivityLog[] }
  | { status: "error"; message: string };

export function useUserActivityLogs() {
  const userActivityLogListState = ref<UserActivityLogListState>({ status: "idle" });
  const hasLoadedUserActivityLogs = computed(
    () => userActivityLogListState.value.status !== "idle"
  );

  async function loadUserActivityLogs() {
    const token = getAuthToken();

    if (!token) {
      userActivityLogListState.value = {
        status: "error",
        message: "请先登录，再加载最近操作"
      };
      return;
    }

    userActivityLogListState.value = { status: "loading" };

    try {
      const result = await fetchUserActivityLogs(token);

      userActivityLogListState.value = {
        status: "success",
        logs: result.data
      };
    } catch (error) {
      userActivityLogListState.value = {
        status: "error",
        message: error instanceof Error ? error.message : "未知错误"
      };
    }
  }

  return {
    userActivityLogListState,
    hasLoadedUserActivityLogs,
    loadUserActivityLogs
  };
}
