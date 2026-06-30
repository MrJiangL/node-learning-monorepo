# Task: 用户级 Activity Log 前端入口线上 smoke

## 背景

你已经完成了用户级 Activity Log 前端入口，并完成了本地 smoke 复盘。

当前本地已经确认：

- ProjectsPage 有“我的最近操作”入口
- 点击后会调用 `GET /activity-logs`
- 用户级日志不依赖当前选中的 Project
- action 显示为中文文案
- 时间显示为格式化时间
- 日志里能显示 Project 快照名

你在复盘里选择了：

```text
A. 部署上线和线上 smoke
```

所以这张任务要验证：

```text
用户级 Activity Log 在线上是否真的能通过 Netlify 前端调用 Railway API。
```

---

## 为什么做线上 smoke

本地测试能证明代码逻辑。

线上 smoke 要证明真实部署链路：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> Activity Log 数据
```

用户级 Activity Log 这条链路依赖：

- Netlify 是否部署了最新前端 bundle
- `VITE_API_BASE_URL` 是否仍然指向 Railway API
- 登录 token 是否能正常保存
- `Authorization: Bearer <token>` 是否会发到后端
- Railway API 是否包含最新的 `GET /activity-logs`
- Railway MySQL 是否有 Activity Log 数据
- CORS 和鉴权是否正常

所以这张任务不是为了写新代码，而是确认：

```text
本地完成的用户级入口，在线上也真的可用。
```

---

## 任务 1：部署前本地检查

部署前先跑：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

如果这次要同时部署后端，也补跑：

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
npm run build -w @learn/api
```

学习点：

```text
前端入口调用了新后端 API。
如果后端线上还没有部署对应接口，前端即使部署成功也会 404。
```

---

## 任务 2：部署到线上

按你当前流程部署。

前端线上地址：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

部署后确认：

- Netlify deployment 成功
- 打开的 `/projects` 是最新页面
- 页面里能看到“我的最近操作”
- 浏览器 Network 里的 JS / CSS 没有 404
- API 请求仍然打到 Railway 后端

---

## 任务 3：线上 smoke 路径

打开线上页面：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

建议按这个顺序走：

```text
1. 登录测试账号
2. 进入 /projects
3. 确认页面能看到“我的最近操作”
4. 点击“加载最近操作”
5. 确认 Network 出现 GET /activity-logs
6. 确认请求带 Authorization header
7. 确认接口返回 200
8. 确认页面展示最近操作
9. 创建一个 Project 或 Todo
10. 点击“刷新最近操作”
11. 确认新操作出现在“我的最近操作”
12. 确认 action 是中文文案
13. 确认时间不是 ISO 原始字符串
14. 确认能看到 Project 快照名或“未知项目”
```

如果线上账号没有数据，可以先创建一个新的 Project 和 Todo。

---

## 任务 4：如果失败怎么查

### 页面没有“我的最近操作”

优先查：

- Netlify 是否部署了最新版本
- 浏览器是否缓存旧 bundle
- 当前访问路径是否是 `/projects`

### 请求是 404

优先查：

- Railway 后端是否已经部署包含 `GET /activity-logs` 的版本
- 前端请求 URL 是否正确
- `VITE_API_BASE_URL` 是否指向正确的 Railway API

### 请求是 401

优先查：

- 是否已经登录
- localStorage 里是否有 access token
- 请求是否带了 `Authorization: Bearer <token>`
- token 是否过期

### 请求是 500

优先查：

- Response header 里是否有 `X-Request-Id`
- Railway logs 里是否能搜到同一个 requestId
- 是否是数据库连接、Prisma 查询或迁移问题

---

## 任务 5：创建线上 smoke 复盘文档

创建：

```text
docs/reviews/web-user-activity-log-online-smoke.md
```

建议写：

```md
# 用户级 Activity Log 前端入口线上 smoke

## 1. 这次部署验证了什么

## 2. 线上是否能看到“我的最近操作”

## 3. GET /activity-logs 是否正常

## 4. 最近操作是否能展示中文 action 和格式化时间

## 5. 如果失败，我看到了什么 requestId

## 6. 下一步还要优化什么
```

---

## 完成标准

- [x] 部署前本地验证通过
- [x] Netlify 部署成功
- [x] 线上 `/projects` 能看到“我的最近操作”
- [x] 点击后能发起 `GET /activity-logs`
- [x] 请求带登录 token
- [x] 接口返回 200
- [x] 页面能展示用户级最近操作
- [x] 新建 Project 或 Todo 后，刷新最近操作能看到新日志
- [x] action 是中文文案
- [x] 时间是格式化显示
- [x] 创建 `docs/reviews/web-user-activity-log-online-smoke.md`
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-29
- 线上地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- 复盘文档：`docs/reviews/web-user-activity-log-online-smoke.md`
- 验证结论：
  - 用户级 Activity Log 前端入口已经完成线上 smoke。
  - Netlify 前端可以访问用户级入口。
  - `GET /activity-logs` 线上链路已经验证通过。
  - 中文 action 和格式化时间在线上可用。
- 下一阶段建议：
  - 先做用户级 Activity Log 体验优化。
  - 暂缓 metadata 展示，等基础入口更顺手后再做更复杂的信息层。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-web-user-activity-log-experience-polish.md
```
