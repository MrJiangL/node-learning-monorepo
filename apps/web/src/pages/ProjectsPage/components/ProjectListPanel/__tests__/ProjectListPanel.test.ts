import { mount } from "@vue/test-utils";
import type { Project } from "@learn/shared";
import { describe, expect, it } from "vitest";
import ProjectListPanel from "../index.vue";

function createProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "project-1",
    userId: "user-1",
    name: "学习 Node",
    description: "每天练一点",
    createdAt: "2026-06-02T00:00:00.000Z",
    updatedAt: "2026-06-02T00:00:00.000Z",
    ...overrides
  };
}

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
              ...createProject()
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

  it("点击编辑后显示 Project 编辑表单", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");

    expect(wrapper.get('input[name="editingProjectName"]').element).toHaveProperty(
      "value",
      "学习 Node"
    );
    expect(wrapper.get('input[name="editingProjectDescription"]').element).toHaveProperty(
      "value",
      "每天练一点"
    );
    expect(wrapper.text()).toContain("保存");
    expect(wrapper.text()).toContain("取消");
  });

  it("保存编辑时会 emit saveProject 事件并暂时保留编辑态", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");
    await wrapper.get('input[name="editingProjectName"]').setValue("更新后的 Project");
    await wrapper.get('input[name="editingProjectDescription"]').setValue("更新后的描述");

    const saveButton = wrapper.findAll("button").find((button) => button.text() === "保存");

    if (!saveButton) {
      throw new Error("没有找到“保存”按钮");
    }

    await saveButton.trigger("click");

    expect(wrapper.emitted("saveProject")).toEqual([
      [
        "project-1",
        {
          name: "更新后的 Project",
          description: "更新后的描述"
        }
      ]
    ]);
    expect(wrapper.find('input[name="editingProjectName"]').exists()).toBe(true);
  });

  it("保存中时会禁用保存按钮并显示保存中文案", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        savingProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");

    const saveButton = wrapper.findAll("button").find((button) => button.text() === "保存中...");

    if (!saveButton) {
      throw new Error("没有找到“保存中...”按钮");
    }

    expect(saveButton.attributes("disabled")).toBeDefined();
  });

  it("保存失败时保留编辑态、输入内容和错误提示", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        savingProjectId: null,
        projectMutationError: "保存失败，请重试",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");
    await wrapper.get('input[name="editingProjectName"]').setValue("失败后仍保留");
    await wrapper.get('input[name="editingProjectDescription"]').setValue("不要清空输入");

    const saveButton = wrapper.findAll("button").find((button) => button.text() === "保存");

    if (!saveButton) {
      throw new Error("没有找到“保存”按钮");
    }

    await saveButton.trigger("click");

    expect(wrapper.get('input[name="editingProjectName"]').element).toHaveProperty(
      "value",
      "失败后仍保留"
    );
    expect(wrapper.get('input[name="editingProjectDescription"]').element).toHaveProperty(
      "value",
      "不要清空输入"
    );
    expect(wrapper.text()).toContain("保存失败，请重试");
  });

  it("保存成功后退出编辑状态", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        savingProjectId: null,
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");
    await wrapper.setProps({ savingProjectId: "project-1" });
    await wrapper.setProps({ savingProjectId: null, projectMutationError: null });

    expect(wrapper.find('input[name="editingProjectName"]').exists()).toBe(false);
  });

  it("取消编辑时退出编辑状态且不 emit saveProject", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const editButton = wrapper.findAll("button").find((button) => button.text() === "编辑");

    if (!editButton) {
      throw new Error("没有找到“编辑”按钮");
    }

    await editButton.trigger("click");

    const cancelButton = wrapper.findAll("button").find((button) => button.text() === "取消");

    if (!cancelButton) {
      throw new Error("没有找到“取消”按钮");
    }

    await cancelButton.trigger("click");

    expect(wrapper.find('input[name="editingProjectName"]').exists()).toBe(false);
    expect(wrapper.emitted("saveProject")).toBeUndefined();
  });

  it("点击删除后显示页面内确认区", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const deleteButton = wrapper.findAll("button").find((button) => button.text() === "删除");

    if (!deleteButton) {
      throw new Error("没有找到“删除”按钮");
    }

    await deleteButton.trigger("click");

    expect(wrapper.text()).toContain("确定删除这个 Project 吗？");
    expect(wrapper.text()).toContain("确认删除");
    expect(wrapper.text()).toContain("取消删除");
  });

  it("取消页面内删除确认时不会 emit deleteProject 事件", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const deleteButton = wrapper.findAll("button").find((button) => button.text() === "删除");

    if (!deleteButton) {
      throw new Error("没有找到“删除”按钮");
    }

    await deleteButton.trigger("click");

    const cancelDeleteButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "取消删除");

    if (!cancelDeleteButton) {
      throw new Error("没有找到“取消删除”按钮");
    }

    await cancelDeleteButton.trigger("click");

    expect(wrapper.text()).not.toContain("确定删除这个 Project 吗？");
    expect(wrapper.emitted("deleteProject")).toBeUndefined();
  });

  it("确认页面内删除时会 emit deleteProject 事件", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const deleteButton = wrapper.findAll("button").find((button) => button.text() === "删除");

    if (!deleteButton) {
      throw new Error("没有找到“删除”按钮");
    }

    await deleteButton.trigger("click");

    const confirmDeleteButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "确认删除");

    if (!confirmDeleteButton) {
      throw new Error("没有找到“确认删除”按钮");
    }

    await confirmDeleteButton.trigger("click");

    expect(wrapper.emitted("deleteProject")).toEqual([["project-1"]]);
  });

  it("删除中时会禁用确认删除按钮并显示删除中文案", async () => {
    const wrapper = mount(ProjectListPanel, {
      props: {
        selectedProjectId: "project-1",
        deletingProjectId: null,
        projectListState: {
          status: "success",
          projects: [createProject()]
        }
      }
    });

    const deleteButton = wrapper.findAll("button").find((button) => button.text() === "删除");

    if (!deleteButton) {
      throw new Error("没有找到“删除”按钮");
    }

    await deleteButton.trigger("click");
    await wrapper.setProps({ deletingProjectId: "project-1" });

    const deletingButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "删除中...");

    if (!deletingButton) {
      throw new Error("没有找到“删除中...”按钮");
    }

    expect(deletingButton.attributes("disabled")).toBeDefined();
  });
});
