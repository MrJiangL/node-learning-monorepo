import { describe, expect, it } from "vitest";
import type { ActivityLog } from "@learn/shared";
import {
  formatActivityLogAction,
  formatActivityLogMetadata,
  formatActivityLogTime
} from "../activity-log-display";

function createActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: "log-1",
    action: "todo.created",
    message: "创建了 Todo：学习 Activity Log",
    metadata: null,
    createdAt: "2026-06-28T10:00:00.000Z",
    userId: "user-1",
    projectId: "project-1",
    projectSnapshotId: "project-1",
    projectSnapshotName: "学习项目",
    ...overrides
  };
}

describe("activity log display helpers", () => {
  it("把 todo.completed 映射成中文 action 文案", () => {
    expect(formatActivityLogAction("todo.completed")).toBe("完成 Todo");
  });

  it("把 project.created 映射成中文 action 文案", () => {
    expect(formatActivityLogAction("project.created")).toBe("创建 Project");
  });

  it("把 ISO 时间格式化成更适合展示的本地时间", () => {
    const result = formatActivityLogTime("2026-06-28T11:30:00.000Z");

    expect(result).toContain("2026");
    expect(result).toContain("06");
    expect(result).toContain("28");
    expect(result).not.toContain("T");
  });

  it("把 todo.created metadata 格式化成 Todo 标题摘要", () => {
    const result = formatActivityLogMetadata(
      createActivityLog({
        action: "todo.created",
        metadata: {
          todoId: "todo-1",
          title: "学习 metadata"
        }
      })
    );

    expect(result).toBe("Todo：学习 metadata");
  });

  it("把 todo.updated metadata 格式化成 Todo 标题和变更字段摘要", () => {
    const result = formatActivityLogMetadata(
      createActivityLog({
        action: "todo.updated",
        metadata: {
          todoId: "todo-1",
          title: "学习 dueDate",
          changedFields: ["title", "dueDate"]
        }
      })
    );

    expect(result).toBe("Todo：学习 dueDate；变更字段：title、dueDate");
  });

  it("把 project.updated metadata 格式化成 Project 名称和变更字段摘要", () => {
    const result = formatActivityLogMetadata(
      createActivityLog({
        action: "project.updated",
        metadata: {
          projectName: "学习项目",
          changedFields: ["name", "description"]
        }
      })
    );

    expect(result).toBe("Project：学习项目；变更字段：name、description");
  });

  it("metadata 为 null 时返回 null", () => {
    expect(formatActivityLogMetadata(createActivityLog({ metadata: null }))).toBeNull();
  });

  it("metadata 形状不符合 action 预期时返回 null", () => {
    const result = formatActivityLogMetadata(
      createActivityLog({
        action: "todo.created",
        metadata: {
          todoId: "todo-1"
        }
      })
    );

    expect(result).toBeNull();
  });
});
