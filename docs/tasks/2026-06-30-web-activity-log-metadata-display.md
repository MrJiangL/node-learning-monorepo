# Task: Activity Log metadata 前端展示

## 背景

用户级 Activity Log 已经完成了从后端到前端再到线上 smoke 的闭环。

现在页面能展示：

- message
- 中文 action
- 格式化时间
- Project 快照名

但 Activity Log 里还有一个重要字段：

```ts
metadata: Record<string, unknown> | null;
```

后端已经通过 metadata schema 给不同 action 的 metadata 建立了契约。

例如：

```text
project.created:
  { projectName }

project.updated:
  { projectName, changedFields }

todo.created:
  { todoId, title }

todo.updated:
  { todoId, title, changedFields }

todo.completed:
  { todoId, title, changedFields }

todo.deleted:
  { todoId, title }
```

现在前端只展示 message，没有把 metadata 里的上下文展示出来。

这张任务要做的是：

```text
把 Activity Log metadata 变成用户能读懂的补充信息。
```

---

## 这张任务只练什么

只做第一版 metadata 展示。

目标是：

```text
在 Project 级 Activity Log 和用户级 Activity Log 里，都展示一行 metadata 摘要。
```

先不要做：

- 展开 / 收起详情
- JSON 原文展示
- 复杂 diff UI
- 后端 metadata schema 改造
- 新接口
- 筛选和分页

第一版先做稳定、简单、可测试的展示 helper。

---

## 任务 1：新增 metadata 展示 helper

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
```

新增：

```ts
export function formatActivityLogMetadata(log: ActivityLog): string | null {
  // 根据 log.action 和 log.metadata 返回用户能读懂的一行摘要
}
```

建议第一版展示规则：

```text
project.created:
  Project：{projectName}

project.updated:
  Project：{projectName}；变更字段：{changedFields}

project.deleted:
  Project：{projectName}

todo.created:
  Todo：{title}

todo.updated:
  Todo：{title}；变更字段：{changedFields}

todo.completed:
  Todo：{title}；变更字段：{changedFields}

todo.deleted:
  Todo：{title}
```

如果 metadata 缺失或形状不符合预期，返回：

```ts
null;
```

学习点：

```text
前端展示 metadata 时仍然要防御式读取。
后端有 schema，不代表前端可以对历史数据完全放心。
```

---

## 任务 2：更新 ActivityLogPanel

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue
```

在每条日志里增加 metadata 摘要。

建议位置：

```vue
<strong>{{ log.message }}</strong>
<small v-if="formatActivityLogMetadata(log)">
  {{ formatActivityLogMetadata(log) }}
</small>
<span>{{ formatActivityLogAction(log.action) }}</span>
<time :datetime="log.createdAt">{{ formatActivityLogTime(log.createdAt) }}</time>
```

可以先不纠结样式。

这张任务重点是数据展示和测试。

---

## 任务 3：更新 UserActivityLogPanel

修改：

```text
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue
```

同样展示 metadata 摘要。

用户级 Activity Log 已经展示 Project 快照名。

metadata 摘要负责展示更具体的业务上下文：

```text
Project 快照名：这条日志属于哪个 Project
metadata 摘要：这条日志具体涉及哪个 Todo / 哪些字段
```

---

## 任务 4：补 helper 测试

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/activity-log-display.test.ts
```

至少覆盖：

1. `todo.created` 能展示 Todo 标题
2. `todo.updated` 能展示 Todo 标题和 changedFields
3. `project.updated` 能展示 Project 名称和 changedFields
4. metadata 为 null 时返回 null
5. metadata 形状不对时返回 null

---

## 任务 5：补组件测试

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts
```

至少覆盖：

- Project 级 Activity Log 能展示 metadata 摘要
- 用户级 Activity Log 能展示 metadata 摘要
- metadata 缺失时不会展示奇怪的 `undefined`

---

## 验证命令

先跑相关测试：

```bash
npm run test -w @learn/web -- ActivityLogPanel UserActivityLogPanel activity-log-display
```

再跑完整前端验证：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

---

## 完成标准

- [x] 新增 `formatActivityLogMetadata`
- [x] Project 级 Activity Log 展示 metadata 摘要
- [x] 用户级 Activity Log 展示 metadata 摘要
- [x] metadata 缺失时不展示 `undefined`
- [x] metadata 形状不对时安全跳过
- [x] 补 helper 测试
- [x] 补 Project 级组件测试
- [x] 补用户级组件测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-30
- 本次更新文件：
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts`
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/index.vue`
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/activity-log-display.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/index.vue`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts`
- 核心行为：
  - 新增 `formatActivityLogMetadata`
  - Project 级 Activity Log 展示 metadata 摘要
  - 用户级 Activity Log 展示 metadata 摘要
  - `project.updated` 展示 Project 名称和 changedFields
  - `todo.updated` / `todo.completed` 展示 Todo 标题和 changedFields
  - metadata 缺失或形状不符合预期时安全跳过，不展示 `undefined`
- 验证结果：
  - `npm run test -w @learn/web -- ActivityLogPanel UserActivityLogPanel activity-log-display` 通过：3 files，23 tests
  - `npm run test -w @learn/web` 通过：17 files，91 tests
  - `npm run typecheck -w @learn/web` 通过
  - `npm run format:check` 通过
  - `npm run build -w @learn/web` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-smoke-retrospective.md
```
