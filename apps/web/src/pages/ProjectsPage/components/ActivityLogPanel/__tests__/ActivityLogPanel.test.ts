import type { ActivityLog } from "@learn/shared";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ActivityLogPanel from "../index.vue";

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

describe("ActivityLogPanel", () => {
  it("没有选中 Project 时提示先选择 Project", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: null,
        activityLogListState: {
          status: "idle"
        }
      }
    });

    expect(wrapper.text()).toContain("先选择一个 Project，再查看活动记录");
  });

  it("loading 状态显示正在加载活动记录", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "loading"
        }
      }
    });

    expect(wrapper.text()).toContain("正在加载活动记录");
  });

  it("error 状态显示错误信息和重试按钮", async () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "error",
          message: "加载活动记录失败"
        }
      }
    });

    expect(wrapper.text()).toContain("加载活动记录失败");

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("loadActivityLogs")).toEqual([[]]);
  });

  it("success 但 logs 为空时显示空状态", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "success",
          logs: []
        }
      }
    });

    expect(wrapper.text()).toContain("这个 Project 还没有活动记录");
  });

  it("success 时展示活动记录 message、中文 action 和格式化时间", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "success",
          logs: [
            createActivityLog({
              action: "todo.completed",
              message: "完成了 Todo：学习组件测试",
              createdAt: "2026-06-28T11:30:00.000Z"
            })
          ]
        }
      }
    });

    expect(wrapper.text()).toContain("完成了 Todo：学习组件测试");
    expect(wrapper.text()).toContain("完成 Todo");
    expect(wrapper.text()).toContain("2026");
    expect(wrapper.text()).toContain("06");
    expect(wrapper.text()).toContain("28");
    expect(wrapper.text()).not.toContain("todo.completed");
    expect(wrapper.text()).not.toContain("2026-06-28T11:30:00.000Z");
    expect(wrapper.get("time").attributes("datetime")).toBe("2026-06-28T11:30:00.000Z");
  });

  it("success 时展示 metadata 摘要", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "success",
          logs: [
            createActivityLog({
              action: "todo.updated",
              message: "更新了 Todo：学习 metadata",
              metadata: {
                todoId: "todo-1",
                title: "学习 metadata",
                changedFields: ["title", "dueDate"]
              }
            })
          ]
        }
      }
    });

    expect(wrapper.text()).toContain("Todo：学习 metadata；变更字段：title、dueDate");
  });

  it("metadata 缺失时不会展示 undefined", () => {
    const wrapper = mount(ActivityLogPanel, {
      props: {
        selectedProjectId: "project-1",
        activityLogListState: {
          status: "success",
          logs: [createActivityLog({ metadata: null })]
        }
      }
    });

    expect(wrapper.text()).not.toContain("undefined");
  });
});
