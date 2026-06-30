import type { ActivityLog, ActivityLogAction } from "@learn/shared";

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

function readString(metadata: Record<string, unknown>, key: string): string | null {
  const value = metadata[key];

  return typeof value === "string" && value.length > 0 ? value : null;
}

function readStringArray(metadata: Record<string, unknown>, key: string): string[] | null {
  const value = metadata[key];

  if (!Array.isArray(value)) {
    return null;
  }

  const strings = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0
  );

  return strings.length === value.length && strings.length > 0 ? strings : null;
}

function formatChangedFields(metadata: Record<string, unknown>): string | null {
  const changedFields = readStringArray(metadata, "changedFields");

  return changedFields ? `；变更字段：${changedFields.join("、")}` : null;
}

function formatProjectMetadata(
  metadata: Record<string, unknown>,
  options: { includeChangedFields: boolean }
): string | null {
  const projectName = readString(metadata, "projectName");

  if (!projectName) {
    return null;
  }

  if (!options.includeChangedFields) {
    return `Project：${projectName}`;
  }

  const changedFields = formatChangedFields(metadata);

  return changedFields ? `Project：${projectName}${changedFields}` : null;
}

function formatTodoMetadata(
  metadata: Record<string, unknown>,
  options: { includeChangedFields: boolean }
): string | null {
  const title = readString(metadata, "title");

  if (!title) {
    return null;
  }

  if (!options.includeChangedFields) {
    return `Todo：${title}`;
  }

  const changedFields = formatChangedFields(metadata);

  return changedFields ? `Todo：${title}${changedFields}` : null;
}

export function formatActivityLogMetadata(log: ActivityLog): string | null {
  if (!log.metadata) {
    return null;
  }

  switch (log.action) {
    case "project.created":
    case "project.deleted":
      return formatProjectMetadata(log.metadata, { includeChangedFields: false });
    case "project.updated":
      return formatProjectMetadata(log.metadata, { includeChangedFields: true });
    case "todo.created":
    case "todo.deleted":
      return formatTodoMetadata(log.metadata, { includeChangedFields: false });
    case "todo.updated":
    case "todo.completed":
      return formatTodoMetadata(log.metadata, { includeChangedFields: true });
  }
}
