import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProjectListPanel from "../index.vue";

describe("ProjectListPanel", () => {
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
});
