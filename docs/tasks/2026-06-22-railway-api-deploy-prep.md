# Task: Railway API 第一版部署准备

## 背景

你已经选择托管平台，并且第一版先部署 API。

当前项目是 monorepo，不是单个 API 仓库，所以部署平台需要知道：

- 从仓库根目录安装依赖
- 先构建 `packages/shared`
- 再构建 `apps/api`
- 生成 Prisma Client
- 连接 MySQL
- 执行 Prisma migration
- 启动 API 服务

这张任务先准备部署配置，不急着点 deploy。

---

## 推荐平台

第一版推荐 Railway。

原因：

- 比较适合第一次部署 Node API
- 可以从 GitHub 仓库直接部署
- 可以创建 MySQL service
- 环境变量配置比较直观
- 适合 monorepo 学习部署

---

## 任务 1：确认 API 构建命令

在本地已经验证过这组命令可以通过：

`npm run build -w @learn/shared && npm run build -w @learn/api`

部署平台里的 build command 建议是：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

为什么要加 `prisma:generate`：

Prisma Client 是根据 `prisma/schema.prisma` 生成的。干净部署环境里不能假设它已经存在，所以 build 前显式生成更稳。

---

## 任务 2：确认 API 启动命令

API package 里已有启动命令：

`npm run start -w @learn/api`

它最终会执行：

`node dist/server.js`

第一版部署可以先用这个 start command：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

这样做的好处是：第一版部署时能自动把已提交的 migration 应用到线上数据库。

注意：

这只是学习阶段的简单做法。真实多实例生产环境里，migration 最好作为单独 deploy step 或 release command，不应该每个 API 实例启动时都抢着跑。

---

## 任务 3：整理 Railway 环境变量

第一版 API 部署至少需要：

| 变量                     | 建议值 / 来源                        |
| ------------------------ | ------------------------------------ |
| `NODE_ENV`               | `production`                         |
| `JWT_SECRET`             | 自己生成一串至少 16 位的随机字符串   |
| `DATABASE_URL`           | Railway MySQL 提供的连接字符串       |
| `DATABASE_HOST`          | Railway MySQL host                   |
| `DATABASE_PORT`          | Railway MySQL port                   |
| `DATABASE_USER`          | Railway MySQL user                   |
| `DATABASE_PASSWORD`      | Railway MySQL password               |
| `DATABASE_NAME`          | Railway MySQL database name          |
| `REDIS_URL`              | 第一版可以先不配，或后续接托管 Redis |
| `JOB_WORKER_ENABLED`     | 第一版建议 `false`                   |
| `JOB_WORKER_INTERVAL_MS` | 可选，默认 `1000`                    |

Railway 创建 MySQL service 后，通常会给出类似这些变量：

- `MYSQL_URL`
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`

项目当前代码使用的是 `DATABASE_*`，所以需要在 API service 的变量里把 Railway MySQL 变量映射过来。

示例格式：

- `DATABASE_URL` -> MySQL service 的 `MYSQL_URL`
- `DATABASE_HOST` -> MySQL service 的 `MYSQLHOST`
- `DATABASE_PORT` -> MySQL service 的 `MYSQLPORT`
- `DATABASE_USER` -> MySQL service 的 `MYSQLUSER`
- `DATABASE_PASSWORD` -> MySQL service 的 `MYSQLPASSWORD`
- `DATABASE_NAME` -> MySQL service 的 `MYSQLDATABASE`

不要把真实值写进 GitHub。

---

## 任务 4：创建部署准备文档

创建：

`docs/reviews/railway-api-deploy-prep.md`

写下面这些小标题：

# Railway API 部署准备

## 1. 为什么第一版选择 Railway

## 2. API build command

## 3. API start command

## 4. 需要配置哪些环境变量

## 5. Prisma migration 第一版怎么处理

## 6. Redis 和 Job Worker 第一版怎么处理

## 7. 部署前我还需要确认什么

---

## 验证命令

这张任务只改文档，但可以顺手验证 API build：

`npm run build -w @learn/shared && npm run build -w @learn/api`

最后运行：

`npm run format:check`

---

## 完成标准

- [ ] 创建 `docs/reviews/railway-api-deploy-prep.md`
- [ ] 写清楚 build command
- [ ] 写清楚 start command
- [ ] 写清楚 Railway 环境变量映射
- [ ] 写清楚 migration 第一版处理方式
- [ ] 写清楚 Redis / Worker 第一版先怎么处理
- [ ] API build 验证通过
- [ ] `npm run format:check` 通过

完成后告诉我：

`Railway API 部署准备完成了`
