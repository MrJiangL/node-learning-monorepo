# Task: Activity Log metadata 展示增强

## 背景

Activity Log metadata 前端展示已经完成，并且线上 smoke 已经通过。

当前页面可以展示类似：

```text
Todo：学习 metadata；变更字段：title、dueDate
Project：学习项目；变更字段：name、description
```

这已经比只展示 message 更清楚。

但还有一个体验问题：

```text
changedFields 里的字段名仍然偏开发者视角。
```

用户看到 `title`、`dueDate`、`completed` 时，需要自己理解它们是什么意思。

这张任务要做的是：

```text
把 metadata 里的字段名翻译成用户能读懂的中文文案。
```

---

## 这张任务只练什么

只做 metadata 字段名展示增强。

目标是把：

```text
变更字段：title、dueDate、completed
```

展示成：

```text
变更字段：标题、截止日期、完成状态
```

先不要做：

- 展开 / 收起详情
- 修改后端 metadata 结构
- 展示修改前 / 修改后的值
- 自然语言整句 diff
- 新接口

---

## 任务 1：新增字段名展示 helper

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/activity-log-display.ts
```

可以新增：

```ts
function formatActivityLogChangedField(field: string): string {
  // title -> 标题
  // dueDate -> 截止日期
  // completed -> 完成状态
  // name -> 名称
  // description -> 描述
}
```

建议映射：

```text
title -> 标题
dueDate -> 截止日期
completed -> 完成状态
name -> 名称
description -> 描述
```

未知字段先保留原样。

学习点：

```text
后端字段名是契约。
前端展示文案是产品语言。
这两层不要混在一起。
```

---

## 任务 2：更新 metadata 摘要

继续使用：

```ts
formatActivityLogMetadata(log);
```

但把 changedFields 从原始字段名变成中文文案。

例如：

```text
Todo：学习 dueDate；变更字段：标题、截止日期
Project：学习项目；变更字段：名称、描述
```

---

## 任务 3：补 helper 测试

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/activity-log-display.test.ts
```

至少覆盖：

1. `title` 显示为 `标题`
2. `dueDate` 显示为 `截止日期`
3. `completed` 显示为 `完成状态`
4. `name` 显示为 `名称`
5. `description` 显示为 `描述`
6. 未知字段保留原样

---

## 任务 4：补组件测试

修改：

```text
apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts
apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts
```

至少覆盖：

- Project 级 Activity Log 展示中文字段名
- 用户级 Activity Log 展示中文字段名
- 页面不再展示已知字段的英文名，例如 `dueDate`

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

- [x] changedFields 已知字段显示为中文
- [x] 未知字段保留原样
- [x] Project 级 Activity Log 展示中文字段名
- [x] 用户级 Activity Log 展示中文字段名
- [x] 页面不再展示 `title` / `dueDate` / `completed` / `name` / `description` 这些已知英文字段名
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
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/activity-log-display.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/ActivityLogPanel/__tests__/ActivityLogPanel.test.ts`
  - `apps/web/src/pages/ProjectsPage/components/UserActivityLogPanel/__tests__/UserActivityLogPanel.test.ts`
- 核心行为：
  - `title` 展示为 `标题`
  - `dueDate` 展示为 `截止日期`
  - `completed` 展示为 `完成状态`
  - `name` 展示为 `名称`
  - `description` 展示为 `描述`
  - 未知字段保留原样
  - Project 级和用户级 Activity Log 都展示中文字段名
- 验证结果：
  - `npm run test -w @learn/web -- ActivityLogPanel UserActivityLogPanel activity-log-display` 通过：3 files，24 tests
  - `npm run test -w @learn/web` 通过：17 files，92 tests
  - `npm run typecheck -w @learn/web` 通过
  - `npm run format:check` 通过
  - `npm run build -w @learn/web` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-display-polish-smoke-retrospective.md
```
