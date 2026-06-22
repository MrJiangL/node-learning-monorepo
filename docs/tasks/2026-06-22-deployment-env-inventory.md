# Task: 部署前环境变量盘点

## 背景

你已经完成了第一条 GitHub Actions CI，并且远程 CI 已经通过。

下一阶段进入部署和环境变量管理。

不要一上来就急着选部署平台。真实项目部署失败，很多时候不是代码不能跑，而是这些东西没想清楚：

- 生产环境需要哪些环境变量
- 哪些变量只能放在部署平台，不能写进仓库
- 本地、CI、生产环境的配置有什么差异
- 数据库迁移应该由谁在什么时候执行
- API、Web、MySQL、Redis、后台 worker 之间怎么连接

这张任务先做部署前盘点，不写业务代码。

---

## 这张任务只练什么

只练三件事：

1. 从代码里找出项目依赖的环境变量
2. 区分 local / CI / production 三套环境
3. 写出部署前检查清单

---

## 任务 1：阅读环境变量入口

先读这些文件：

- `apps/api/src/config/env.ts`
- `apps/api/src/db/prisma.ts`
- `prisma.config.ts`
- `.github/workflows/ci.yml`

重点回答：

1. API 运行时读取哪些环境变量？
2. Prisma CLI / migration 读取哪些环境变量？
3. CI 里为什么要配置 MySQL 和 Redis service？
4. `JOB_WORKER_ENABLED` 为什么在 CI 里要关掉？

---

## 任务 2：创建部署环境变量盘点文档

创建：

`docs/reviews/deployment-env-inventory.md`

写下面这些小标题：

# 部署前环境变量盘点

## 1. 本地开发环境需要哪些变量

## 2. CI 环境需要哪些变量

## 3. 生产环境需要哪些变量

## 4. 哪些变量不能提交到 GitHub

## 5. Prisma migration 部署时要注意什么

## 6. Redis / Job Worker 部署时要注意什么

Redis 在当前项目里主要用于缓存，例如 Project 列表缓存。
部署时有两种选择：1.有 Redis：配置 REDIS_URL，让缓存正常工作。2.暂时没有 Redis：确认代码能在 Redis 失败时降级到数据库。
这个项目之前已经做过 Redis fallback，所以生产早期可以先把 Redis 作为增强能力，而不是第一天必须阻塞部署的能力。
Job Worker 要更谨慎。
当前 worker loop 可以通过 JOB_WORKER_ENABLED 控制是否启动。
如果生产环境只有一个 API 实例，学习阶段可以先设置：
JOB_WORKER_ENABLED=true
让 API 进程同时处理后台任务。
但如果生产环境有多个 API 实例，同时开 worker 可能导致多个进程一起抢任务。虽然项目里已经做过一些 no-overlap 和状态控制练习，但真实生产里更推荐：
API 服务单独部署
Worker 服务单独部署
或者只允许一个实例开启 worker
所以第一版部署可以保守一点：
JOB_WORKER_ENABLED=false
先把 API 跑起来，再单独设计 worker 部署方式。

## 7. 我现在对部署的理解

---

## 任务 3：建议先填的变量清单

你可以先从这些变量开始盘点：

- `NODE_ENV`
- `PORT`
- `JWT_SECRET`
- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `REDIS_URL`
- `JOB_WORKER_ENABLED`
- `JOB_WORKER_INTERVAL_MS`

不用真的写生产密钥。

文档里只能写变量名、用途、示例格式，不能写真实密码或真实 token。

---

## 验证命令

这张任务只改文档，所以运行：

`npm run format:check`

---

## 完成标准

- [ ] 创建 `docs/reviews/deployment-env-inventory.md`
- [ ] 列出本地 / CI / 生产环境的变量差异
- [ ] 写清楚哪些变量不能提交到 GitHub
- [ ] 写清楚 Prisma migration 部署时要注意什么
- [ ] 写清楚 Redis / Job Worker 部署时要注意什么
- [ ] `npm run format:check` 通过

完成后告诉我：

`部署前环境变量盘点完成了`
