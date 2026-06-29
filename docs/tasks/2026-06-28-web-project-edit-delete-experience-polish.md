# Task: Project 编辑删除体验优化

## 背景

Project 编辑 / 删除入口已经完成，并且已经通过线上 smoke。

现在 Project 工作台已经支持：

- 创建 Project
- 选择 Project
- 编辑 Project
- 删除 Project
- 创建 / 更新 / 删除 Todo
- 查看 Activity Log

这说明主链路已经从“能不能用”进入了下一层：

```text
用户用起来是否稳定、清楚、可恢复？
```

目前 Project 编辑 / 删除第一版是合理的，但还有几个明显体验点可以打磨：

- 删除确认使用浏览器 `confirm`，体验比较原始
- 保存 Project 时没有 saving 状态
- 删除 Project 时没有 deleting 状态
- 保存失败时需要保证用户输入不丢
- 删除按钮和普通操作按钮的危险程度区分还可以更明显

这张任务就专门练：

```text
把一个已经可用的 CRUD 功能，打磨成更像产品的交互。
```

---

## 这张任务只练什么

只做 Project 编辑 / 删除体验优化。

不要顺手做：

- Todo dueDate 编辑
- 用户级 Activity Log
- Project 删除 undo
- 批量删除
- 后端 API 修改

这张任务的边界很清楚：

```text
不改业务能力，只优化已有 Project 编辑 / 删除入口的用户体验。
```

---

## 任务 1：把删除 confirm 改成页面内确认

当前删除使用浏览器 `confirm`。

第一版可以改成更轻量的页面内确认，不一定要做复杂 modal。

建议交互：

```text
点击“删除”
  -> 当前 Project item 展示确认区
  -> 文案：确定删除这个 Project 吗？
  -> 按钮：确认删除 / 取消
```

这样用户会感觉删除行为仍然发生在当前页面里，而不是突然弹出浏览器原生弹窗。

建议修改：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
```

组件内部可以维护一个本地状态：

```ts
const confirmingDeleteProjectId = ref<string | null>(null);
```

学习点：

```text
确认 UI 是组件本地交互状态。
真正删除仍然通过 emit 交给页面层处理。
```

不要让组件自己调用 API。

---

## 任务 2：增加保存中状态

编辑 Project 后点击保存，如果请求比较慢，用户可能重复点击。

可以加一个保存中状态。

建议从页面层传入：

```ts
savingProjectId?: string | null
```

或者在 `ProjectListPanel` 内部先做最小版本：

```text
点击保存后，按钮 disabled，显示“保存中...”
保存完成后退出编辑状态
保存失败后保留编辑态
```

更推荐页面层管理，因为真正的异步请求发生在页面层。

学习点：

```text
loading 状态最好跟真实异步边界放在一起。
```

---

## 任务 3：增加删除中状态

删除 Project 也是异步操作。

建议删除确认后：

```text
确认删除按钮 disabled
文案变成“删除中...”
其他删除按钮也可以暂时禁用
```

这能避免：

```text
重复点击删除
重复发送 DELETE 请求
删除过程中用户又切换状态导致 UI 混乱
```

建议页面层维护：

```ts
const deletingProjectId = ref<string | null>(null);
```

删除完成后清空。

删除失败也要清空，并把错误状态展示出来。

---

## 任务 4：保存失败时保留用户输入

这是一个很重要的小体验。

如果用户修改了 Project name / description，点击保存失败：

```text
不要直接退出编辑状态。
不要把用户输入清空。
```

更合理的是：

```text
继续停留在编辑态
保留输入内容
显示错误信息
允许用户修改后重试
```

这是表单类交互的基本尊重。

用户最怕的不是失败，而是：

```text
失败之后刚刚填的内容没了。
```

---

## 任务 5：优化危险按钮样式

删除按钮属于 destructive action。

建议给它更明确的视觉区分：

```text
普通按钮：中性
保存按钮：主操作
删除按钮：危险色
确认删除按钮：危险色 + 更明确文案
取消按钮：弱化
```

修改：

```text
apps/web/src/style.css
```

不需要追求花哨。

这一轮重点是让用户一眼看出：

```text
这个操作会破坏数据，需要小心。
```

---

## 任务 6：补测试

至少补这些测试：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts
```

建议覆盖：

1. 点击删除后显示页面内确认区
2. 点击取消后确认区消失，且不 emit `deleteProject`
3. 点击确认删除后 emit `deleteProject`
4. 保存中时保存按钮 disabled / 显示保存中文案
5. 删除中时确认删除按钮 disabled / 显示删除中文案
6. 保存失败时仍保留编辑态和输入内容

如果页面层新增了 `savingProjectId` / `deletingProjectId`，再补页面或组件 props 测试。

---

## 推荐实现顺序

建议按这个顺序做：

```text
1. 先改 ProjectListPanel 测试，描述页面内删除确认行为
2. 实现页面内删除确认
3. 补 saving / deleting 状态 props
4. 在 ProjectsPage 里维护 savingProjectId / deletingProjectId
5. 保存失败时保留编辑态
6. 补样式
7. 跑测试、typecheck、format、build
```

这次仍然保持教学重点：

```text
先让测试描述行为，再让实现满足行为。
```

---

## 验证命令

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

---

## 完成标准

- [x] 删除确认从浏览器 `confirm` 改成页面内确认
- [x] 取消删除不会 emit `deleteProject`
- [x] 确认删除才 emit `deleteProject`
- [x] 保存 Project 时有 saving 状态
- [x] 删除 Project 时有 deleting 状态
- [x] 保存失败时保留编辑态和用户输入
- [x] 删除按钮和确认删除按钮有危险操作样式
- [x] 补充 ProjectListPanel 相关测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-28
- 更新组件：
  - apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue
  - apps/web/src/pages/ProjectsPage/components/ProjectListPanel/**tests**/ProjectListPanel.test.ts
- 更新页面：
  - apps/web/src/pages/ProjectsPage/index.vue
- 更新 composable：
  - apps/web/src/pages/ProjectsPage/composables/useProjects.ts
- 更新样式：
  - apps/web/src/style.css
- 核心行为：
  - 删除确认从浏览器原生 `confirm` 改成 Project item 内的页面确认区。
  - 点击取消删除不会触发 `deleteProject`。
  - 点击确认删除才触发 `deleteProject`。
  - 保存 Project 时显示“保存中...”，并禁用保存按钮。
  - 删除 Project 时显示“删除中...”，并禁用确认删除按钮。
  - 保存失败时保留编辑态、保留用户输入，并展示错误信息。
  - 删除按钮和确认删除按钮使用危险操作样式。
- 设计取舍：
  - `ProjectListPanel` 只维护编辑态和删除确认这种本地 UI 状态。
  - `savingProjectId` / `deletingProjectId` / `projectMutationError` 放在 `ProjectsPage`，因为真实异步请求发生在页面编排层。
  - `useProjects` 的保存 / 删除方法返回成功或失败结果，让页面层可以决定是否清空 loading 状态、是否展示错误、是否刷新 Activity Log。
- 验证结果：
  - npm run test -w @learn/web 通过，14 个测试文件、60 个测试
  - npm run typecheck -w @learn/web 通过
  - npm run format:check 通过
  - npm run build -w @learn/web 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete-experience-smoke-retrospective.md
```
