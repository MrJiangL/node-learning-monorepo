# Task: Activity Log metadata 展示线上 smoke

## 背景

Activity Log metadata 前端展示已经完成，并且本地 smoke 复盘已经完成。

当前本地已经确认：

- Project 级 Activity Log 可以展示 metadata 摘要
- 用户级 Activity Log 可以展示 metadata 摘要
- 更新类日志可以展示 changedFields
- metadata 缺失或形状不对时会安全跳过
- 页面不会展示 `undefined`

你在复盘里选择了：

```text
A. Activity Log metadata 展示线上 smoke
```

所以这张任务要验证：

```text
metadata 摘要在线上真实数据里也能安全展示。
```

---

## 为什么做线上 smoke

本地测试能证明 helper 和组件逻辑。

本地 smoke 能证明浏览器里展示符合预期。

线上 smoke 要证明：

```text
Netlify 最新前端 bundle
  -> Railway API
    -> Railway MySQL 里的真实 Activity Log 数据
```

都能一起工作。

这次尤其要关注旧数据。

因为线上数据库里可能有之前创建的 Activity Log，它们的 metadata 可能是：

- `null`
- 字段不完整
- 和当前前端预期不完全一致

前端应该安全跳过这些 metadata，而不是展示 `undefined`。

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
4. 创建一个 Todo
5. 确认 Project 级 Activity Log 展示 Todo metadata 摘要
6. 编辑 Todo 标题或 dueDate
7. 确认 Project 级 Activity Log 展示 changedFields
8. 点击“我的最近操作”
9. 确认用户级 Activity Log 也展示 metadata 摘要
10. 编辑 Project 名称或描述
11. 确认 Project metadata 摘要展示 Project 名称和 changedFields
12. 查看旧日志
13. 确认页面没有出现 undefined / [object Object] / null 文本
```

重点观察：

```text
metadata 摘要应该帮助理解日志，
但不能盖过 message 这个主信息。
```

---

## 任务 4：如果失败怎么查

### 页面没有 metadata 摘要

优先查：

- Netlify 是否部署了最新 bundle
- 当前日志是否真的有 metadata
- 浏览器 Elements 里是否有 `<small>` 摘要节点
- 控制台是否有前端异常

### 页面出现 undefined

优先查：

- 是哪条日志出现了问题
- 这条日志的 action 是什么
- Network response 里的 metadata 形状是什么
- `formatActivityLogMetadata` 是否需要兼容这种历史数据

### 请求失败

优先按状态码查：

- `401`：登录态或 Authorization header
- `404`：Railway 后端版本或 API 路由
- `500`：用 `X-Request-Id` 去 Railway logs 查

---

## 任务 5：创建线上 smoke 复盘文档

创建：

```text
docs/reviews/web-activity-log-metadata-online-smoke.md
```

建议写：

```md
# Activity Log metadata 展示线上 smoke

## 1. 这次部署验证了什么

## 2. Project 级 Activity Log metadata 是否正常

## 3. 用户级 Activity Log metadata 是否正常

## 4. 旧日志没有 metadata 时是否安全

## 5. 如果失败，我看到了什么 requestId

## 6. 下一步还要优化什么
```

---

## 完成标准

- [x] 部署前本地验证通过
- [x] Netlify 部署成功
- [x] Project 级 Activity Log 能展示 metadata 摘要
- [x] 用户级 Activity Log 能展示 metadata 摘要
- [x] 更新类日志能展示 changedFields
- [x] 旧日志没有 metadata 时不会出现 `undefined`
- [x] 页面没有出现 `[object Object]`
- [x] 创建 `docs/reviews/web-activity-log-metadata-online-smoke.md`
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 线上地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- 复盘文档：`docs/reviews/web-activity-log-metadata-online-smoke.md`
- 验证结论：
  - Activity Log metadata 展示已经完成线上 smoke。
  - Project 级和用户级 Activity Log 都能展示 metadata 摘要。
  - 更新类日志能展示 changedFields。
  - 旧日志没有 metadata 时不会出现 `undefined`。
  - 页面没有出现 `[object Object]`。
- 下一阶段选择：
  - Activity Log metadata 展示增强
- 选择原因：
  - metadata 展示已经安全上线。
  - 当前 changedFields 仍然偏开发者字段名。
  - 下一步把 `title` / `dueDate` / `completed` 翻译成中文字段名，能明显提升产品感。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-display-polish.md
```
