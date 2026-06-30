# Task: 用户级 Activity Log 体验优化线上 smoke

## 背景

用户级 Activity Log 体验优化已经完成，并且本地 smoke 复盘已经完成。

这次体验优化改变的是用户能直接感知的交互行为：

- 初始进入 `/projects` 不自动请求 `GET /activity-logs`
- 用户点击“加载最近操作”后才加载用户级日志
- 用户已经加载过“我的最近操作”后，Project / Todo 操作成功会自动刷新
- idle / empty / error 文案更清楚

你在复盘里选择了：

```text
A. 用户级 Activity Log 体验优化线上 smoke
```

所以这张任务要验证：

```text
这些体验优化在线上 Netlify 环境里也真实可用。
```

---

## 为什么做线上 smoke

本地测试能证明代码逻辑。

本地 smoke 能证明浏览器里的交互符合预期。

线上 smoke 要证明：

```text
Netlify 已经部署最新前端 bundle，
并且它和 Railway API 的真实链路仍然正常。
```

这次重点不是只看 `GET /activity-logs` 是否 200。

还要看请求时机是否正确：

```text
进入页面时：不应该自动请求
点击加载后：应该请求
后续操作成功后：应该自动刷新
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
- 页面里能看到“我的最近操作”
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
3. 打开浏览器 Network
4. 先不要点击“加载最近操作”
5. 确认没有自动发起 GET /activity-logs
6. 点击“加载最近操作”
7. 确认 GET /activity-logs 返回 200
8. 确认页面展示最近操作
9. 创建一个 Project 或 Todo
10. 确认“我的最近操作”自动刷新
11. 编辑一个 Project 或 Todo
12. 确认“我的最近操作”自动刷新
13. 删除一个 Project 或 Todo
14. 确认“我的最近操作”自动刷新
15. 确认 action 是中文文案
16. 确认时间是格式化显示
17. 确认 idle / empty / error 文案是新版文案
```

重点观察：

```text
自动刷新只应该发生在用户已经加载过“我的最近操作”之后。
```

---

## 任务 4：如果失败怎么查

### 进入页面就请求了 GET /activity-logs

优先查：

- Netlify 是否部署了最新版本
- 是否有旧代码缓存
- ProjectsPage 是否误加了 mounted 自动加载

### 点击加载没有请求

优先查：

- 按钮点击事件是否触发
- `UserActivityLogPanel` 是否 emit `loadUserActivityLogs`
- 控制台是否有前端异常

### 操作成功后没有自动刷新

优先查：

- 操作前是否已经点过“加载最近操作”
- 操作本身是否真的成功
- Network 里是否出现第二次 `GET /activity-logs`
- 是否是请求发出但失败，而不是没有发出

### 请求失败

优先按状态码查：

- `401`：登录态或 Authorization header
- `404`：Railway 后端版本或 API 路由
- `500`：用 `X-Request-Id` 去 Railway logs 查

---

## 任务 5：创建线上 smoke 复盘文档

创建：

```text
docs/reviews/web-user-activity-log-experience-online-smoke.md
```

建议写：

```md
# 用户级 Activity Log 体验优化线上 smoke

## 1. 这次部署验证了什么

## 2. 线上是否没有首屏自动请求

## 3. 点击加载后 GET /activity-logs 是否正常

## 4. Project / Todo 操作后是否会自动刷新

## 5. 文案在线上是否是新版

## 6. 如果失败，我看到了什么 requestId

## 7. 下一步还要优化什么
```

---

## 完成标准

- [x] 部署前本地验证通过
- [x] Netlify 部署成功
- [x] 线上 `/projects` 能看到“我的最近操作”
- [x] 初始进入页面不会自动请求 `GET /activity-logs`
- [x] 点击“加载最近操作”后会请求 `GET /activity-logs`
- [x] `GET /activity-logs` 返回 200
- [x] Project 或 Todo 操作成功后会自动刷新用户级日志
- [x] action 是中文文案
- [x] 时间是格式化显示
- [x] idle / empty / error 文案是新版文案
- [x] 创建 `docs/reviews/web-user-activity-log-experience-online-smoke.md`
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 线上地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- 复盘文档：`docs/reviews/web-user-activity-log-experience-online-smoke.md`
- 验证结论：
  - 用户级 Activity Log 体验优化已经完成线上 smoke。
  - 初始进入 `/projects` 不自动请求 `GET /activity-logs`。
  - 点击“加载最近操作”后，线上可以正常请求用户级 Activity Log。
  - 用户已经加载过“我的最近操作”后，Project / Todo 操作成功会自动刷新。
  - 新版 idle / empty / error 文案在线上可用。
- 下一阶段选择：
  - Activity Log metadata 前端展示
- 选择原因：
  - 用户级 Activity Log 查询、入口、体验优化和线上验证已经闭环。
  - 后端 metadata 契约已经存在，下一步适合把 metadata 变成前端可读信息。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-display.md
```
