# Task: Todo priority 展示和编辑

## 背景

Activity Log 阶段已经收束。

下一组业务功能建议从 Todo priority 开始。

当前 Todo 已经支持：

- title
- completed
- dueDate

但还没有优先级。

真实 Todo 产品里，用户经常需要区分：

```text
这个 Todo 重要吗？
我应该先做哪一个？
```

所以这张任务要给 Todo 增加一个小而完整的业务字段：

```text
priority
```

---

## 这张任务只练什么

只做 Todo priority 的第一版展示和编辑。

建议优先级取值：

```text
low
medium
high
```

第一版目标：

```text
Todo 列表能展示优先级。
创建 / 编辑 Todo 时能设置优先级。
```

先不要做：

- 按优先级排序
- 按优先级筛选
- 彩色标签复杂样式
- 批量修改
- 拖拽排序

第一版先把字段打通。

---

## 任务 1：确认数据模型

先检查：

```text
apps/api/prisma/schema.prisma
packages/shared/src/index.ts
```

确认 Todo 当前有没有 `priority` 字段。

如果没有，需要新增。

建议类型：

```text
low / medium / high
```

你可以选择两种实现方式：

### 方式 A：数据库用 string

学习成本低。

```prisma
priority String @default("medium")
```

shared 里定义：

```ts
export type TodoPriority = "low" | "medium" | "high";
```

### 方式 B：数据库用 enum

更严格，但迁移稍微多一点概念。

第一版我建议用方式 A，先把业务链路练顺。

---

## 任务 2：更新后端 Todo 创建和更新

检查这些文件：

```text
apps/api/src/modules/todos/todos.schema.ts
apps/api/src/modules/todos/todos.service.ts
apps/api/src/modules/todos/todos.repository.ts
apps/api/src/modules/todos/todos.prisma-repository.ts
```

目标：

- 创建 Todo 时可以传 `priority`
- 不传时默认为 `medium`
- 更新 Todo 时可以修改 `priority`
- API 返回 Todo 时包含 `priority`

schema 建议：

```ts
const todoPrioritySchema = z.enum(["low", "medium", "high"]);
```

学习点：

```text
前端传来的 priority 是用户输入。
必须在 API 边界用 schema 校验。
```

---

## 任务 3：更新前端 API 类型和表单

检查：

```text
apps/web/src/api/todos.ts
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
```

目标：

- 创建 Todo 时能选择 priority
- 编辑 Todo 时能修改 priority
- Todo 列表展示优先级中文文案

建议中文文案：

```text
low -> 低
medium -> 中
high -> 高
```

第一版可以用 `<select>`。

---

## 任务 4：补测试

后端至少补：

```text
apps/api/tests/unit/todos.service.test.ts
apps/api/tests/integration/todos.test.ts
```

覆盖：

- 创建 Todo 不传 priority 时默认 medium
- 创建 Todo 传 high 能保存
- 更新 Todo priority 能生效
- 非法 priority 返回校验错误

前端至少补：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useTodos.test.ts
```

覆盖：

- Todo 列表展示优先级中文文案
- 创建 Todo 会带 priority
- 编辑 Todo 会带 priority

---

## 验证命令

后端：

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
npm run build -w @learn/api
```

前端：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run build -w @learn/web
```

全局格式：

```bash
npm run format:check
```

---

## 完成标准

- [x] Todo 数据模型支持 priority
- [x] 创建 Todo 支持 priority，默认 medium
- [x] 更新 Todo 支持 priority
- [x] API 返回 Todo 包含 priority
- [x] 前端创建 Todo 可以选择 priority
- [x] 前端编辑 Todo 可以修改 priority
- [x] Todo 列表展示优先级中文文案
- [x] 后端测试通过
- [x] 前端测试通过
- [x] npm run typecheck -w @learn/api 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/api 通过
- [x] npm run build -w @learn/web 通过

完成后告诉我：

```text
Todo priority 展示和编辑完成了
```

---

## 完成记录

完成日期：2026-06-30

本次采用方式 A：

```prisma
priority String @default("medium")
```

也就是数据库先用字符串字段承载优先级，API 边界用 Zod 限制只能传：

```text
low / medium / high
```

### 已完成行为

- `Todo` shared 类型新增 `TodoPriority` 和 `priority`
- Prisma `Todo` 模型新增 `priority` 字段，默认值为 `medium`
- 新增 migration：`prisma/migrations/20260630090000_add_todo_priority/migration.sql`
- `POST /projects/:projectId/todos` 支持传 `priority`
- 创建 Todo 不传 `priority` 时返回 `medium`
- `PATCH /todos/:id` 支持更新 `priority`
- 非法 `priority` 会返回校验错误
- Project 初始 Todo 也支持 `priority`
- 前端创建 Todo 表单新增优先级选择
- 前端编辑 Todo 表单支持回填和修改优先级
- Todo 列表展示中文优先级文案：
  - `low` -> `低`
  - `medium` -> `中`
  - `high` -> `高`
- Activity Log metadata 的 changedFields 中，`priority` 显示为 `优先级`

### 主要改动文件

```text
packages/shared/src/index.ts
prisma/schema.prisma
prisma/migrations/20260630090000_add_todo_priority/migration.sql
apps/api/src/modules/todos/todos.schema.ts
apps/api/src/modules/todos/todos.mapper.ts
apps/api/src/modules/todos/todos.prisma-repository.ts
apps/api/src/modules/projects/projects.schema.ts
apps/api/src/modules/projects/projects.prisma-repository.ts
apps/api/tests/unit/todos.service.test.ts
apps/api/tests/integration/todos.test.ts
apps/api/tests/helpers/api-test-helpers.ts
apps/api/tests/helpers/test-data-factory.ts
apps/api/tests/unit/projects.service.test.ts
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useTodos.test.ts
apps/web/src/pages/ProjectsPage/index.vue
apps/web/src/pages/ProjectsPage/__tests__/ProjectsPage.test.ts
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
```

### 验证结果

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api
npm run test -w @learn/api -- todos.service.test.ts todos.test.ts
npm run test -w @learn/web -- TodoPanel useTodos ProjectsPage
npm run test -w @learn/api
npm run test -w @learn/web
npm run typecheck -w @learn/api
npm run typecheck -w @learn/web
npm run build -w @learn/api
npm run build -w @learn/web
npm run format:check
```

全部通过。

### 下一张任务

```text
docs/tasks/2026-06-30-todo-priority-smoke-retrospective.md
```
