import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TodoPanel from "../index.vue";

describe("TodoPanel", () => {
  it("提交创建表单时会 emit createTodo 事件", async () => {
    const wrapper = mount(TodoPanel, {
      props: {
        selectedProjectId: "project-1",
        todoListState: {
          status: "success",
          todos: []
        }
      }
    });

    await wrapper.get('input[name="todoTitle"]').setValue("学习组件测试");
    await wrapper.get("form").trigger("submit");

    // 子组件只负责把用户输入整理成事件参数。
    //
    // 真正的 createTodo API 调用在 useTodos 里，
    // 所以组件测试只断言 emit，不断言网络请求。
    expect(wrapper.emitted("createTodo")).toEqual([
      [
        {
          title: "学习组件测试"
        }
      ]
    ]);
  });

  it("点击标记完成按钮时会 emit toggleTodo 事件", async () => {
    const todo = {
      id: "todo-1",
      projectId: "project-1",
      title: "学习 emit",
      description: null,
      completed: false,
      dueDate: null,
      createdAt: "2026-06-02T00:00:00.000Z",
      updatedAt: "2026-06-02T00:00:00.000Z"
    };

    const wrapper = mount(TodoPanel, {
      props: {
        selectedProjectId: "project-1",
        todoListState: {
          status: "success",
          todos: [todo]
        }
      }
    });

    // 这里按按钮文字找，而不是用 nth-of-type 这种位置选择器。
    //
    // 位置选择器很容易因为多加一个按钮就失效；
    // 按用户看到的文字找，更接近“用户点击标记完成按钮”的真实行为。
    const toggleButton = wrapper.findAll("button").find((button) => button.text() === "标记完成");

    if (!toggleButton) {
      throw new Error("没有找到“标记完成”按钮");
    }

    await toggleButton.trigger("click");

    // toggleTodo 事件需要把完整 todo 传给父组件。
    //
    // 因为 useTodos 需要根据 todo.completed 取反，
    // 再调用 PATCH /todos/:id。
    expect(wrapper.emitted("toggleTodo")).toEqual([[todo]]);
  });
});
