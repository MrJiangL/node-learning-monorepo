# Task: Activity Log metadata 展示增强线上 smoke

## 背景

Activity Log metadata 展示增强已经完成，并且本地 smoke 复盘已经完成。

这次增强把 changedFields 里的开发者字段名翻译成了中文：

```text
title -> 标题
dueDate -> 截止日期
completed -> 完成状态
name -> 名称
description -> 描述
```

你在复盘里选择了：

```text
A. Activity Log metadata 展示增强线上 smoke
```

所以这张任务要验证：

```text
字段名中文化在线上真实环境里也能正常展示。
```

---

## 为什么做线上 smoke

本地测试能证明 helper 逻辑。

本地 smoke 能证明浏览器展示符合预期。

线上 smoke 要证明：

```text
Netlify 最新前端 bundle
  -> Railway API
    -> Railway MySQL 真实 Activity Log 数据
```

一起工作时也能正确展示中文字段名。

这次重点不是只看 metadata 摘要是否存在，而是看：

```text
变更字段里是否已经从英文变成中文。
```

---

## 任务 1：部署前检查

部署前先跑：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

如果这次同时部署后端，也补跑：

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
npm run build -w @learn/api
```

---

## 任务 2：部署前端到 Netlify

按你当前 Netlify 流程部署前端。

线上地址：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

部署后确认：

- Netlify deployment 成功
- `/projects` 页面能打开
- 浏览器 Network 里的 JS / CSS 没有 404
- API 请求仍然打到 Railway 后端

---

## 任务 3：线上 smoke 路径

打开线上页面：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

建议按这个顺序验证：

```text
1. 登录测试账号
2. 进入 /projects
3. 选择一个 Project
4. 编辑 Todo 标题
5. 确认 Activity Log 显示“变更字段：标题”
6. 编辑 Todo dueDate
7. 确认 Activity Log 显示“变更字段：截止日期”
8. 标记 Todo 完成
9. 确认 Activity Log 显示“变更字段：完成状态”
10. 编辑 Project 名称或描述
11. 确认 Activity Log 显示“变更字段：名称、描述”
12. 点击“我的最近操作”
13. 确认用户级 Activity Log 里也显示中文字段名
14. 确认页面没有出现 title / dueDate / completed / name / description 这些已知英文字段名
```

重点观察：

```text
中文字段名应该出现在 metadata 摘要里，
message 和 action 的展示不应该被破坏。
```

---

## 任务 4：如果失败怎么查

### 页面仍然显示英文 changedFields

优先查：

- Netlify 是否部署了最新 bundle
- 浏览器是否缓存旧 JS
- 当前日志是否来自新代码产生的 changedFields
- helper 是否正确映射该字段

### 某些字段没翻译

优先查：

- 字段名是否在映射表里
- 是否是后端实际返回了不同字段名
- 未知字段保留原样是否符合预期

### 请求失败

优先按状态码查：

- `401`：登录态或 Authorization header
- `404`：Railway 后端版本或 API 路由
- `500`：用 `X-Request-Id` 去 Railway logs 查

---

## 任务 5：创建线上 smoke 复盘文档

创建：

```text
docs/reviews/web-activity-log-metadata-display-polish-online-smoke.md
```

建议写：

```md
# Activity Log metadata 展示增强线上 smoke

## 1. 这次部署验证了什么

## 2. Project 级 Activity Log 是否显示中文字段名

## 3. 用户级 Activity Log 是否显示中文字段名

## 4. 是否还出现已知英文字段名

## 5. 如果失败，我看到了什么 requestId

## 6. 下一步还要优化什么
```

---

## 完成标准

- [x] 部署前本地验证通过
- [x] Netlify 部署成功
- [x] Project 级 Activity Log 显示中文字段名
- [x] 用户级 Activity Log 显示中文字段名
- [x] 不再展示 `title` / `dueDate` / `completed` / `name` / `description` 这些已知英文字段名
- [x] 旧日志仍然安全展示
- [x] 创建 `docs/reviews/web-activity-log-metadata-display-polish-online-smoke.md`
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 线上地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- 复盘文档：`docs/reviews/web-activity-log-metadata-display-polish-online-smoke.md`
- 验证结论：
  - Activity Log metadata 展示增强已经完成线上 smoke。
  - Project 级 Activity Log 可以显示中文字段名。
  - 用户级 Activity Log 可以显示中文字段名。
  - 已知英文字段名不再直接展示给用户。
  - 旧日志仍然安全展示。
- 下一阶段选择：
  - Activity Log 阶段总复盘
- 选择原因：
  - Activity Log 已经完成从后端到前端、从本地到线上的完整闭环。
  - 继续加功能前，适合先把这条功能线的工程方法沉淀下来。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-activity-log-stage-retrospective.md
```
