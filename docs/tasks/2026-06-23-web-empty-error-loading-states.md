# Task: 前端体验状态优化：空状态、错误状态、loading 状态

## 背景

现在前端已经有完整的基础链路：

    注册 -> 自动登录 -> 进入 /projects
    登录 -> 进入 /projects
    退出登录 -> 回到 /login
    accessToken 失效 -> authenticatedFetch 尝试 refresh

下一步不是继续加新接口，而是把用户在页面里看到的状态做得更清楚。

真实产品里，一个页面不只有“成功有数据”一种状态。

它至少会有：

    idle       还没开始加载
    loading    正在加载
    success    加载成功
    empty      加载成功但没有数据
    error      加载失败

当前项目里已经有一些状态，但还比较分散。这张任务要练的是：让用户在 Project / Todo 页面里更清楚地知道现在发生了什么。

---

## 这张任务只练什么

只练三件事：

1. Project 列表的 loading / empty / error 展示
2. Todo 列表的 loading / empty / error 展示
3. 用组件测试固定这些用户可见状态

不改后端，不改数据库，不做复杂 UI 美化。

---

## 任务 1：先阅读当前状态模型

打开：

    apps/web/src/pages/ProjectsPage/composables/useProjects.ts
    apps/web/src/pages/ProjectsPage/composables/useTodos.ts

重点看类似这样的状态类型：

    type ProjectListState =
      | { status: "idle" }
      | { status: "loading" }
      | { status: "success"; projects: Project[] }
      | { status: "error"; message: string };

学习点：

    这种写法叫 discriminated union。
    status 是判别字段。

好处是：

    当 status 是 success 时，TypeScript 知道里面有 projects。
    当 status 是 error 时，TypeScript 知道里面有 message。

这比用多个 boolean 更稳定：

    loading: boolean
    error: string | null
    projects: Project[]

多个 boolean 容易出现矛盾状态，比如 loading=true 但 error 也有值。

---

## 任务 2：补 ProjectListPanel 状态测试

打开：

    apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue

现在已经有一些状态展示，比如：

    登录后可以加载你的 Project。
    你还没有 Project。

在测试文件里补：

    apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts

建议补这些测试：

    it("idle 状态提示用户可以加载 Project", () => {
      const wrapper = mount(ProjectListPanel, {
        props: {
          selectedProjectId: null,
          projectListState: { status: "idle" }
        }
      });

      expect(wrapper.text()).toContain("登录后可以加载你的 Project");
    });

    it("loading 状态显示加载中按钮文案", () => {
      const wrapper = mount(ProjectListPanel, {
        props: {
          selectedProjectId: null,
          projectListState: { status: "loading" }
        }
      });

      expect(wrapper.text()).toContain("加载中");
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

      expect(wrapper.text()).toContain("你还没有 Project");
    });

学习点：

    这些测试不是测 CSS。
    它们测的是用户在不同数据状态下能看到什么反馈。

---

## 任务 3：补 TodoPanel 状态测试

打开：

    apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue

先看它现在对这些情况怎么展示：

    没选 Project
    Todo 正在加载
    Todo 加载失败
    Todo 为空
    Todo 有数据

在测试文件里补：

    apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts

建议至少覆盖：

1. 没有 selectedProjectId 时，提示先选择 Project
2. loading 状态显示加载中
3. error 状态显示错误信息
4. success 但 todos 为空时显示空状态

测试写法参考 ProjectListPanel。

---

## 任务 4：如果文案不清楚，再轻微改文案

如果你发现当前文案太模糊，可以轻微改。

推荐文案：

Project：

    idle: 登录后可以加载你的 Project。
    loading: 正在加载 Projects...
    empty: 你还没有 Project，先创建一个吧。
    error: 直接显示错误 message。

Todo：

    未选 Project: 先选择一个 Project，再查看 Todo。
    loading: 正在加载 Todos...
    empty: 这个 Project 还没有 Todo。
    error: 直接显示错误 message。

注意：

    这张任务只做文案和状态展示，不做大 UI 重构。

---

## 先不要做

这张任务先不要：

    不要做 skeleton loading
    不要做 toast 系统
    不要做弹窗
    不要做动画
    不要改 API 返回结构
    不要重构 composable

先把用户可见状态补清楚，并用组件测试固定住。

---

## 验证命令

先跑组件测试：

    npm run test -w @learn/web -- ProjectListPanel.test.ts TodoPanel.test.ts

再跑全部前端测试：

    npm run test -w @learn/web

最后跑：

    npm run typecheck -w @learn/web
    npm run format:check
    npm run build -w @learn/web

---

## 完成标准

- [x] ProjectListPanel 测试覆盖 idle 状态
- [x] ProjectListPanel 测试覆盖 loading 状态
- [x] ProjectListPanel 测试覆盖 error 状态
- [x] ProjectListPanel 测试覆盖 empty 状态
- [x] TodoPanel 测试覆盖未选择 Project 状态
- [x] TodoPanel 测试覆盖 loading 状态
- [x] TodoPanel 测试覆盖 error 状态
- [x] TodoPanel 测试覆盖 empty 状态
- [x] 必要时优化状态文案
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-23
- ProjectListPanel 测试数从 3 个增加到 7 个
- TodoPanel 测试数从 2 个增加到 6 个
- 前端测试总数：9 个文件，31 个测试
- 文案优化：
  - Project loading：正在加载 Projects...
  - Project empty：你还没有 Project，先创建一个吧。
  - Todo loading：正在加载 Todos...

完成后告诉我：

    前端状态体验优化完成了
