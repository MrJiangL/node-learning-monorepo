import type { ActivityLog } from "@learn/shared";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserActivityLogPanel from "../index.vue";

function createActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: "log-1",
    action: "todo.updated",
    message: "更新了 Todo：学习 dueDate",
    metadata: null,
    createdAt: "2026-06-29T10:00:00.000Z",
    userId: "user-1",
    projectId: "project-1",
    projectSnapshotId: "project-1",
    projectSnapshotName: "学习项目",
    ...overrides
  };
}

describe("UserActivityLogPanel", () => {
  it("idle 状态提示用户可以加载最近操作", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "idle"
        }
      }
    });

    expect(wrapper.text()).toContain("加载后可以查看你跨 Project 的最近操作");
  });

  it("点击加载按钮会 emit loadUserActivityLogs", async () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "idle"
        }
      }
    });

    const button = wrapper.findAll("button").find((item) => item.text() === "加载最近操作");

    if (!button) {
      throw new Error("没有找到“加载最近操作”按钮");
    }

    await button.trigger("click");

    expect(wrapper.emitted("loadUserActivityLogs")).toEqual([[]]);
  });

  it("loading 状态显示正在加载最近操作", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "loading"
        }
      }
    });

    expect(wrapper.text()).toContain("正在加载最近操作");
  });

  it("error 状态显示友好提示、错误信息和重试按钮", async () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "error",
          message: "加载最近操作失败"
        }
      }
    });

    expect(wrapper.text()).toContain("最近操作加载失败，可以稍后重试");
    expect(wrapper.text()).toContain("加载最近操作失败");

    await wrapper.get("button").trigger("click");

    expect(wrapper.emitted("loadUserActivityLogs")).toEqual([[]]);
  });

  it("success 但 logs 为空时显示空状态", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "success",
          logs: []
        }
      }
    });

    expect(wrapper.text()).toContain("还没有最近操作");
    expect(wrapper.text()).toContain("创建 Project 或 Todo 后，这里会显示记录");
  });

  it("success 时展示 message、中文 action、Project 快照名和格式化时间", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "success",
          logs: [
            createActivityLog({
              action: "project.deleted",
              message: "删除了项目 学习项目",
              projectId: null,
              projectSnapshotName: "学习项目",
              createdAt: "2026-06-29T11:30:00.000Z"
            })
          ]
        }
      }
    });

    expect(wrapper.text()).toContain("删除了项目 学习项目");
    expect(wrapper.text()).toContain("删除 Project");
    expect(wrapper.text()).toContain("Project：学习项目");
    expect(wrapper.text()).toContain("2026");
    expect(wrapper.text()).toContain("06");
    expect(wrapper.text()).toContain("29");
    expect(wrapper.text()).not.toContain("project.deleted");
    expect(wrapper.text()).not.toContain("2026-06-29T11:30:00.000Z");
    expect(wrapper.get("time").attributes("datetime")).toBe("2026-06-29T11:30:00.000Z");
  });

  it("success 时展示中文字段名 metadata 摘要", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "success",
          logs: [
            createActivityLog({
              action: "project.updated",
              message: "更新了 Project：学习项目",
              metadata: {
                projectName: "学习项目",
                changedFields: ["name", "description"]
              }
            })
          ]
        }
      }
    });

    expect(wrapper.text()).toContain("Project：学习项目；变更字段：名称、描述");
    expect(wrapper.text()).not.toContain("name");
    expect(wrapper.text()).not.toContain("description");
  });

  it("metadata 缺失时不会展示 undefined", () => {
    const wrapper = mount(UserActivityLogPanel, {
      props: {
        userActivityLogListState: {
          status: "success",
          logs: [createActivityLog({ metadata: null })]
        }
      }
    });

    expect(wrapper.text()).not.toContain("undefined");
  });
});
