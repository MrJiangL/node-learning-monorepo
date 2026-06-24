import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProjectListPanel from "../index.vue";

describe("ProjectListPanel", () => {
  it("idle 状态提示用户可以加载 Project", () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "idle"
        }
      }
    });

    // idle 表示“还没开始加载”。
    //
    // 用户此时需要知道下一步可以做什么，
    // 所以组件应该给出可行动的提示，而不是空白一片。
    expect(wrapper.text()).toContain("登录后可以加载你的 Project");
  });

  it("loading 状态显示正在加载 Projects", () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "loading"
        }
      }
    });

    expect(wrapper.text()).toContain("正在加载 Projects");
  });

  it("error 状态显示错误信息", () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "error",
          message: "加载 Project 失败"
        }
      }
    });

    expect(wrapper.text()).toContain("加载 Project 失败");
  });

  it("success 但列表为空时显示空状态", () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "success",
          projects: []
        }
      }
    });

    expect(wrapper.text()).toContain("你还没有 Project，先创建一个吧");
  });

  it("会渲染传入的 Project 列表", () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [
            {
              id: "project-1",
              userId: "user-1",
              name: "学习 Node",
              description: "每天练一点",
              createdAt: "2026-06-02T00:00:00.000Z",
              updatedAt: "2026-06-02T00:00:00.000Z"
            }
          ]
        }
      }
    });

    // wrapper.text() 会拿到组件渲染出来的所有文字。
    //
    // 这里我们不关心 DOM 结构细节，
    // 只关心用户能不能看到 Project 名称、描述和选中状态。
    expect(wrapper.text()).toContain("学习 Node");
    expect(wrapper.text()).toContain("每天练一点");
    expect(wrapper.text()).toContain("已选择");
  });

  it("提交创建表单时会 emit createProject 事件", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "idle"
        }
      }
    });

    // setValue() 模拟用户在 input 里输入内容。
    //
    // 组件内部使用 v-model 绑定了 projectName / projectDescription，
    // 所以 setValue 后，组件内部的 ref 也会被同步更新。
    await wrapper.get('input[name="projectName"]').setValue("新的 Project");
    await wrapper.get('input[name="projectDescription"]').setValue("新的描述");
    await wrapper.get("form").trigger("submit");

    // emitted() 可以查看组件向父组件发出了哪些事件。
    //
    // ProjectListPanel 不应该自己调用 API，
    // 它只需要告诉父组件：“用户提交了创建 Project 的表单”。
    expect(wrapper.emitted("createProject")).toEqual([
      [
        {
          name: "新的 Project",
          description: "新的描述"
        }
      ]
    ]);
  });

  it("点击退出登录按钮时会 emit logout 事件", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: null,
        projectListState: {
          status: "idle"
        }
      }
    });

    const logoutButton = wrapper.findAll("button").find((button) => button.text() === "退出登录");

    if (!logoutButton) {
      throw new Error("没有找到“退出登录”按钮");
    }

    await logoutButton.trigger("click");

    expect(wrapper.emitted("logout")).toEqual([[]]);
  });
});
