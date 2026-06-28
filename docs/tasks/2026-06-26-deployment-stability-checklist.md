# Task: 部署稳定性：上线前 Checklist 和回滚预案

## 背景

你已经完成了基础生产化监控阶段复盘，并且下一阶段选择了：

```text
B：部署稳定性
```

这个选择很适合你当前的项目状态。

因为你现在已经有了：

- Railway API
- Netlify 前端
- Railway MySQL
- `/health`
- `/ready`
- request logger
- error handler 日志
- Request ID
- 线上 smoke 经验

这些能力让你能在“出错之后”定位问题。

下一步要练的是：

    上线之前怎么少出错？
    上线之后怎么快速确认没坏？
    如果坏了，我怎么恢复？

这张任务先不改代码，而是写一份部署稳定性 runbook。

---

## 为什么先写 runbook

很多线上事故不是因为工程师不会写代码，而是因为上线流程没有固定下来。

比如：

- 忘记配生产环境变量
- 前端指向了错误 API 地址
- CORS 少配了一个域名
- 数据库 migration 没跑
- API 部署成功，但 `/ready` 已经失败
- 前端部署成功，但登录接口 401 / CORS
- 发现线上坏了，但不知道该继续查还是先回滚

runbook 的价值是：

    把“上线时脑子里想的一串事”，变成一张可以重复执行的清单。

它不是形式主义。

它是在降低发布时的人脑负担。

---

## 这张任务只练什么

只练三件事：

1. 写上线前 checklist
2. 写上线后 smoke 验证顺序
3. 写失败时的判断和回滚预案

不改代码，不改 CI，不改 Railway / Netlify 配置。

---

## 任务 1：创建部署稳定性文档

创建：

```text
docs/reviews/deployment-stability-checklist.md
```

写这些小标题：

```md
# 部署稳定性 Checklist 和回滚预案

## 1. 这份 checklist 解决什么问题

## 2. 部署前我应该检查什么

## 3. 后端 Railway 部署后我应该验证什么

## 4. 前端 Netlify 部署后我应该验证什么

## 5. 数据库和环境变量应该怎么检查

## 6. 线上 smoke 应该按什么顺序跑

## 7. 如果线上出问题，我怎么判断继续排查还是回滚

## 8. 当前项目的回滚预案是什么
```

---

## 任务 2：写部署前 checklist

建议至少覆盖这些项：

```text
代码层：
- npm run test -w @learn/api
- npm run test -w @learn/web
- npm run typecheck -w @learn/api
- npm run typecheck -w @learn/web
- npm run format:check
- npm run build -w @learn/web

配置层：
- Railway DATABASE_URL 已配置
- Railway JWT_SECRET 已配置
- Railway CORS_ORIGIN 包含 Netlify 前端域名
- Netlify VITE_API_BASE_URL 指向 Railway API

数据库层：
- Prisma schema 是否有变更
- 是否需要 migration
- migration 是否已经在目标环境执行

文档层：
- smoke 步骤是否清楚
- 如果失败，知道从哪里看日志
```

学习点：

```text
部署前 checklist 不是为了追求完美。
它是为了挡住最常见、最便宜、最不该发生的错误。
```

---

## 任务 3：写后端部署后验证

后端 Railway 部署后，建议按这个顺序验证：

```text
1. 打开 Railway deployment 状态，确认部署成功
2. 访问 GET /health
3. 访问 GET /ready
4. 如果 /ready 失败，优先检查 DATABASE_URL 和数据库连接
5. 跑 API smoke 或手动注册 / 登录
6. 创建 Project
7. 创建 Todo
8. 查看 Railway logs 是否有异常
```

学习点：

```text
/health 通过，只能说明 API 进程活着。
/ready 通过，才更接近业务依赖可用。
```

---

## 任务 4：写前端部署后验证

前端 Netlify 部署后，建议按这个顺序验证：

```text
1. 打开 Netlify deployment 状态，确认部署成功
2. 打开线上首页或 /login
3. 打开浏览器 DevTools Network
4. 注册新账号
5. 确认请求打到 Railway API，而不是 localhost
6. 登录成功后进入 /projects
7. 创建 Project
8. 创建 Todo
9. 退出登录
10. 再次登录确认 token 流程正常
```

重点看：

- API URL 是否正确
- CORS 是否正常
- Authorization header 是否正常
- 失败响应里有没有 `X-Request-Id`

---

## 任务 5：写线上 smoke 顺序

你可以把 smoke 写成一条用户路径：

```text
1. 打开 Netlify 前端
2. 进入注册页
3. 注册一个新测试账号
4. 自动进入 /projects
5. 创建 Project
6. 创建 Todo
7. 切换 Todo completed
8. 退出登录
9. 回到登录页
10. 用刚才账号重新登录
11. 确认能重新进入 /projects
```

学习点：

```text
smoke 不追求覆盖所有细节。
smoke 追求快速证明最关键链路没断。
```

---

## 任务 6：写失败时的判断逻辑

建议分成几类：

### /health 失败

说明 API 进程可能没起来。

优先看：

- Railway deployment 状态
- start command
- server logs
- 端口配置

### /ready 失败但 /health 成功

说明 API 进程还活着，但依赖可能失败。

优先看：

- DATABASE_URL
- 数据库是否在线
- Prisma 连接错误
- migration 是否缺失

### 前端页面能打开，但 API 请求失败

优先看：

- Netlify `VITE_API_BASE_URL`
- Railway CORS_ORIGIN
- 浏览器 Network
- 请求 URL 是否正确

### API 返回 500

优先看：

- Network 里的 `X-Request-Id`
- Railway logs 里同一个 requestId
- error handler 的 errorName、errorMessage、stack

---

## 任务 7：写当前项目的回滚预案

当前项目还没有复杂的自动化回滚系统，所以先写“手动回滚预案”。

建议写清楚：

```text
如果前端部署坏了：
- 优先回滚 Netlify 到上一个成功 deployment
- 回滚后重新跑前端 smoke

如果后端部署坏了：
- 优先检查 Railway 是否可以 redeploy 上一个成功版本
- 如果是环境变量错误，修正变量后重新部署
- 如果是代码错误，回退代码后重新部署

如果数据库 migration 坏了：
- 不要盲目回滚代码
- 先判断 migration 是否已经改变了数据结构
- 必要时停止写入，备份数据，再制定修复 migration
```

学习点：

```text
代码回滚不一定等于数据库回滚。
涉及数据库结构变化时，回滚要更谨慎。
```

---

## 先不要做

这张任务先不要：

- 不要真的改 Railway 配置
- 不要真的改 Netlify 配置
- 不要新增 GitHub Actions
- 不要写自动回滚脚本
- 不要做数据库 migration 实验

先把部署稳定性的思考路径写清楚。

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/deployment-stability-checklist.md
- [x] 写清楚部署前 checklist
- [x] 写清楚 Railway 后端部署后验证
- [x] 写清楚 Netlify 前端部署后验证
- [x] 写清楚线上 smoke 顺序
- [x] 写清楚失败时怎么判断
- [x] 写清楚当前项目的手动回滚预案
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 文档：docs/reviews/deployment-stability-checklist.md
- 核心结论：
  - 部署前 checklist 用来挡住最常见、最便宜、最不该发生的错误。
  - 部署后 smoke 用来快速证明关键用户路径没有断。
  - 回滚预案用来在核心链路故障时先恢复服务，再继续排查。
  - 数据库 migration 不能和普通代码回滚混为一谈，涉及数据结构时要先保护数据。
- 补充记录：
  - 追加部署前检查表。
  - 追加发布记录模板。
  - 追加 smoke 结果记录模板。
  - 追加 P0 / P1 / P2 故障分级。
  - 追加 Go / No-Go 判断。
  - 追加回滚后复盘问题。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-deployment-stability-retrospective.md
```
