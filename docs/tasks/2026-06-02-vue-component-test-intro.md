# Task: Vue Component Test Intro

## 目标

这一张开始学习前端组件测试。

你现在已经把页面拆成了：

```text
ProjectListPanel
TodoPanel
useProjects
useTodos
```

接下来先不要直接测整个 `ProjectsPage`，因为页面里包含：

```text
router
localStorage token
API 请求
多个子组件
多个 composable
```

这对刚开始写前端测试来说太大了。

这一张只测两个“纯组件”：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
```

目标是理解：

```text
props 传进去后，组件应该渲染什么
用户点击或提交表单后，组件应该 emit 什么事件
```

---

## 你会练到什么

- Vue 组件测试和 API 测试的区别
- `mount()` 是什么
- 怎么给组件传 `props`
- 怎么找 input / button
- 怎么触发表单提交
- 怎么断言组件 emit 事件
- 为什么组件测试不应该真的请求后端

---

## Step 1: 安装前端测试依赖

在项目根目录运行：

```bash
npm install -w @learn/web -D vitest @vue/test-utils jsdom
```

这些依赖的作用：

```text
vitest：测试运行器，类似后端已经用过的 Vitest
@vue/test-utils：专门用来 mount Vue 组件、查找 DOM、触发事件
jsdom：在 Node 环境里模拟浏览器 DOM
```

---

## Step 2: 给 web 增加测试脚本

打开：

```text
apps/web/package.json
```

在 `scripts` 里增加：

```json
"test": "vitest run",
"test:watch": "vitest"
```

修改后大概长这样：

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "vue-tsc -b --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

注意：JSON 最后一项不能多逗号。

---

## Step 3: 配置 jsdom 测试环境

打开：

```text
apps/web/vite.config.ts
```

把 import 改成：

```ts
/// <reference types="vitest" />

import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
```

然后在 `defineConfig` 里增加 `test`：

```ts
export default defineConfig({
  plugins: [vue()],
  test: {
    // Vue 组件会渲染成 DOM。
    //
    // Vitest 默认是纯 Node 环境，没有 document / window。
    // jsdom 会帮我们在 Node 里模拟一个浏览器 DOM 环境。
    environment: "jsdom"
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, "")
      }
    }
  }
});
```

---

## Step 4: 创建测试目录

创建目录：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__
```

---

## Step 5: 测 ProjectListPanel 渲染 Project

创建文件：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts
```

写入：

```ts
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
    // 只关心用户能不能看到 Project 名称和描述。
    expect(wrapper.text()).toContain("学习 Node");
    expect(wrapper.text()).toContain("每天练一点");
    expect(wrapper.text()).toContain("已选择");
  });
});
```

---

## Step 6: 测 ProjectListPanel 创建 Project 时 emit

继续在同一个文件里增加一个测试：

```ts
it("提交创建表单时会 emit createProject 事件", async () => {
  const wrapper = mount(ProjectListPanel, {
    props: {
      selectedProjectId: null,
      projectListState: {
        status: "idle"
      }
    }
  });

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
```

---

## Step 7: 测 TodoPanel 创建 Todo 时 emit

创建文件：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
```

写入：

```ts
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
});
```

---

## Step 8: 测 TodoPanel 点击完成按钮时 emit

继续在 `TodoPanel.test.ts` 增加：

```ts
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
```

如果这个按钮选择器让你觉得别扭，可以先跑测试看看。
这也是组件测试里很常见的问题：当 DOM 结构复杂时，测试选择器需要更清晰。

---

## Step 9: 运行测试

先只跑 web 测试：

```bash
npm run test -w @learn/web
```

再跑前端类型检查：

```bash
npm run typecheck -w @learn/web
```

最后跑全项目验证：

```bash
npm run format
npm run format:check
npm run typecheck
npm run build
npm run test -w @learn/api
npm run test -w @learn/web
```

---

## 完成后告诉我

你完成后直接说：

```text
Vue 组件测试入门完成了
```

我会帮你：

```text
检查测试写法
把不稳定的选择器改得更适合学习
补详细中文注释
跑 web/api 验证
更新任务索引
给下一张任务卡或安排一次 composables 复盘
```
