import type { ActivityLogAction } from "@learn/shared";

const actionLabelMap: Record<ActivityLogAction, string> = {
  "project.created": "创建 Project",
  "project.updated": "更新 Project",
  "project.deleted": "删除 Project",
  "todo.created": "创建 Todo",
  "todo.updated": "更新 Todo",
  "todo.completed": "完成 Todo",
  "todo.deleted": "删除 Todo"
};

export function formatActivityLogAction(action: ActivityLogAction): string {
  return actionLabelMap[action];
}

export function formatActivityLogTime(createdAt: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(createdAt));
}
