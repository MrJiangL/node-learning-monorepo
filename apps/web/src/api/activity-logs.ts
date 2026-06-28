import type { ActivityLog, PaginatedResult } from "@learn/shared";
import { parseApiError } from "./api-error";
import { buildApiUrl } from "./api-url";
import { authenticatedFetch } from "./authenticated-fetch";

export type ListActivityLogsResponse = {
  success: true;
  data: ActivityLog[];
  meta: PaginatedResult<ActivityLog>["meta"];
};

export async function fetchActivityLogs(
  projectId: string,
  token: string
): Promise<ListActivityLogsResponse> {
  // Activity Log 是 Project 的子资源。
  //
  // 所以前端读取活动记录时，需要带上当前选中的 projectId，
  // 对应后端接口是 GET /projects/:projectId/activity-logs。
  const response = await authenticatedFetch(buildApiUrl(`/projects/${projectId}/activity-logs`), {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw await parseApiError(response, "加载活动记录失败");
  }

  return response.json() as Promise<ListActivityLogsResponse>;
}
