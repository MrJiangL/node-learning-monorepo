import { describe, expect, it } from "vitest";
import { formatActivityLogAction, formatActivityLogTime } from "../activity-log-display";

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
});
