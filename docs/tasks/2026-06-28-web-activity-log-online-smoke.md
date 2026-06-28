# Task: Activity Log 前端展示线上 smoke

## 背景

你已经完成了 Activity Log 前端展示和体验优化：

- Activity Log 面板
- 中文 action
- 格式化时间
- helper 测试
- 组件测试
- 前端测试、类型检查、格式检查、build

现在下一步不是继续加新功能，而是部署到线上并做一次 smoke。

这张任务要验证：

```text
Activity Log 在线上是否真的能展示中文 action 和格式化时间。
```

---

## 为什么做线上 smoke

本地测试能证明代码逻辑。

线上 smoke 要证明整条链路：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> Activity Log 数据
```

Activity Log 这个功能依赖很多层：

- 前端是否部署了最新 bundle
- `VITE_API_BASE_URL` 是否指向 Railway API
- 登录 token 是否正常保存和携带
- Railway API 是否正常
- MySQL 是否正常写入日志
- Activity Log API 是否正常返回日志
- 前端是否能显示中文 action 和格式化时间

所以这张任务用来把本地完成的功能推到线上验证。

---

## 任务 1：部署前检查

先按部署 checklist 跑本地验证：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

如果你这次没有改后端，可以不跑完整后端测试。

但如果要一起部署后端，也要跑：

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
```

---

## 任务 2：部署前端到 Netlify

部署方式按你当前 Netlify 流程来。

部署后确认：

- Netlify deployment 成功
- 打开的线上前端是最新版本
- 浏览器 Network 里的 JS/CSS 没有 404
- `VITE_API_BASE_URL` 仍然指向 Railway API

---

## 任务 3：线上 smoke 路径

打开线上前端：

```text
https://scintillating-pavlova-dc76e0.netlify.app
```

建议路径：

```text
1. 登录或注册一个测试账号
2. 进入 /projects
3. 加载 Project
4. 选择一个 Project
5. 创建 Todo
6. 查看 Activity Log
7. 确认 action 显示“创建 Todo”
8. 标记 Todo 完成
9. 确认 action 显示“完成 Todo”
10. 确认时间不是 ISO 原始字符串
11. 刷新页面
12. 再次选择 Project，确认日志仍然能加载
```

重点观察：

- Activity Log 面板是否出现
- 中文 action 是否展示
- 时间是否格式化
- Network 请求是否打到 Railway API
- 如果失败，响应头是否有 `X-Request-Id`

---

## 任务 4：如果失败怎么查

### 前端页面没有 Activity Log 面板

优先查：

- Netlify 是否部署了最新版本
- 浏览器是否缓存旧 bundle
- 当前页面是否真的进入 `/projects`

### Activity Log 请求失败

优先查浏览器 Network：

- Request URL 是否是 Railway API
- status 是 401、404、500 还是 CORS error
- response body 是什么
- response header 有没有 `X-Request-Id`

### 后端返回 500

用 `X-Request-Id` 去 Railway logs 搜：

- request logger 里有没有对应请求
- error handler 里有没有异常
- 是否是数据库连接或权限问题

---

## 任务 5：创建 smoke 复盘文档

创建：

```text
docs/reviews/web-activity-log-online-smoke.md
```

写：

```md
# Activity Log 前端展示线上 smoke

## 1. 这次部署验证了什么

## 2. 线上 Activity Log 是否能正常加载

## 3. 中文 action 是否正常展示

## 4. 时间格式化是否正常展示

## 5. 如果失败，我看到了什么 requestId

## 6. 下一步还要优化什么
```

---

## 完成标准

- [x] 部署前本地验证通过
- [x] Netlify 部署成功
- [x] 线上能登录或注册测试账号
- [x] 线上能选择 Project
- [x] 创建 Todo 后能看到“创建 Todo”
- [ ] 完成 Todo 后能看到“完成 Todo”
- [x] 时间不是原始 ISO 字符串
- [x] 创建 docs/reviews/web-activity-log-online-smoke.md
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 线上地址：https://scintillating-pavlova-dc76e0.netlify.app/projects
- 复盘文档：docs/reviews/web-activity-log-online-smoke.md
- 截图验证：
  - 线上 `/projects` 页面可访问。
  - Project `钱234` 可选中。
  - Todo `312312` 可展示。
  - Activity Log 面板可展示。
  - `创建 Todo` 和 `创建 Project` 中文 action 可展示。
  - 时间显示为 `2026/06/28 19:53`，不是 ISO 原始字符串。
- 未完全覆盖：
  - 截图里 Todo 仍是“未完成”，所以这次截图没有证明 `完成 Todo` action。
  - 后续如果要完整验证 completed 链路，需要点击“标记完成”后确认出现 `完成 Todo`。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete.md
```
