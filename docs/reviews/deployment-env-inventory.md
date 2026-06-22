# 部署前环境变量盘点

## 1. 本地开发环境需要哪些变量

本地开发环境主要靠项目根目录的 `.env` 提供配置。

当前项目里，API 运行时和 Prisma CLI 读取环境变量的入口不完全一样：

- `apps/api/src/config/env.ts`：负责 API 服务启动时的通用配置，例如 `PORT`、`JWT_SECRET`、`NODE_ENV`、worker 开关。
- `apps/api/src/db/prisma.ts`：负责 Prisma Client 运行时连接 MySQL，读取拆开的数据库连接变量。
- `prisma.config.ts`：负责 Prisma CLI / migration，主要读取 `DATABASE_URL`。

本地开发至少需要这些变量：

| 变量                     | 本地用途                    | 示例格式                                             |
| ------------------------ | --------------------------- | ---------------------------------------------------- |
| `NODE_ENV`               | 标记运行环境                | `development`                                        |
| `PORT`                   | API 监听端口                | `3001`                                               |
| `JWT_SECRET`             | JWT 签名密钥                | 至少 16 位的随机字符串                               |
| `DATABASE_URL`           | Prisma CLI / migration 使用 | `mysql://user:password@localhost:3306/node_learning` |
| `DATABASE_HOST`          | Prisma Client adapter 使用  | `localhost`                                          |
| `DATABASE_PORT`          | MySQL 端口                  | `3306`                                               |
| `DATABASE_USER`          | MySQL 用户名                | `root`                                               |
| `DATABASE_PASSWORD`      | MySQL 密码                  | 本地数据库密码                                       |
| `DATABASE_NAME`          | MySQL database 名称         | `node_learning`                                      |
| `REDIS_URL`              | Redis 缓存连接地址          | `redis://localhost:6379`                             |
| `JOB_WORKER_ENABLED`     | 是否启动后台 worker loop    | `false` 或 `true`                                    |
| `JOB_WORKER_INTERVAL_MS` | worker 轮询间隔             | `1000`                                               |

本地 `.env` 不应该提交到 GitHub。它只属于当前机器。

## 2. CI 环境需要哪些变量

CI 环境是 GitHub Actions 提供的一台干净 Ubuntu 机器。它不会自动拥有本地 `.env`、本地 MySQL 或本地 Redis，所以 workflow 里必须显式准备依赖。

当前 `.github/workflows/ci.yml` 做了这些事情：

- 启动 MySQL 8.0 service
- 启动 Redis 7 service
- 在 `env` 里写入测试用数据库连接、JWT secret、Redis URL
- 运行 `npm ci`
- 运行 Prisma generate
- 运行 `prisma migrate deploy`
- 跑 format / typecheck / test

CI 里的变量是测试专用配置，例如：

| 变量                                                                                        | CI 用途                                |
| ------------------------------------------------------------------------------------------- | -------------------------------------- |
| `NODE_ENV=test`                                                                             | 让代码按测试环境运行                   |
| `JWT_SECRET`                                                                                | 提供测试用 JWT 密钥                    |
| `DATABASE_URL`                                                                              | 给 Prisma migration 使用               |
| `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` | 给 Prisma Client adapter 使用          |
| `REDIS_URL`                                                                                 | 给 Redis cache 测试使用                |
| `JOB_WORKER_ENABLED=false`                                                                  | 避免 CI 测试时自动启动后台 worker loop |

`JOB_WORKER_ENABLED` 在 CI 里关掉很重要。测试应该由测试代码明确触发行为，而不是让一个后台轮询任务在测试过程中自己跑起来。否则会产生不稳定、难复现的测试问题。

## 3. 生产环境需要哪些变量

生产环境需要的变量和本地类似，但来源不同：

- 本地：来自 `.env`。
- CI：来自 workflow 里的 `env` 或 GitHub Secrets。
- 生产：来自部署平台的 Environment Variables / Secrets 配置页。

生产环境至少需要：

| 变量                     | 生产用途                         | 注意点                               |
| ------------------------ | -------------------------------- | ------------------------------------ |
| `NODE_ENV=production`    | 标记生产环境                     | 不应该写成 development               |
| `PORT`                   | 部署平台分配或约定的端口         | 有些平台会自动注入 `PORT`            |
| `JWT_SECRET`             | 生产 JWT 签名密钥                | 必须足够长、随机、不能提交           |
| `DATABASE_URL`           | migration / Prisma CLI 使用      | 指向生产 MySQL                       |
| `DATABASE_HOST`          | API 运行时连接生产 MySQL         | 和 `DATABASE_URL` 保持一致           |
| `DATABASE_PORT`          | MySQL 端口                       | 通常是 `3306`                        |
| `DATABASE_USER`          | 生产数据库用户                   | 不建议用 root                        |
| `DATABASE_PASSWORD`      | 生产数据库密码                   | 必须放平台 secret                    |
| `DATABASE_NAME`          | 生产数据库名                     | 和 migration 目标一致                |
| `REDIS_URL`              | 生产 Redis 地址                  | 如果没有 Redis，要确认代码是否可降级 |
| `JOB_WORKER_ENABLED`     | 是否在生产 API 进程里启动 worker | 单实例可以先开，多实例要谨慎         |
| `JOB_WORKER_INTERVAL_MS` | worker 轮询间隔                  | 生产环境需要避免太频繁               |

生产环境里最容易踩坑的是：

- `DATABASE_URL` 给 Prisma CLI 用。
- `DATABASE_HOST` 等拆开的变量给 Prisma Client adapter 用。
- 两套配置必须指向同一个数据库。

## 4. 哪些变量不能提交到 GitHub

不能提交到 GitHub 的内容包括：

- 真实 `JWT_SECRET`
- 真实 `DATABASE_URL`
- 真实 `DATABASE_PASSWORD`
- 真实 `REDIS_URL`，如果里面包含密码
- GitHub token / access token
- 任何第三方服务密钥
- `.env` 文件
- 本地数据库文件，例如 `*.db`

可以提交的是：

- `.env.example`
- 变量名
- 示例格式
- 无效的占位值
- 文档里说明变量用途

例如文档里可以写：

`DATABASE_URL=mysql://user:password@host:3306/database_name`

但不能写真实生产地址和真实密码。

## 5. Prisma migration 部署时要注意什么

Prisma migration 在生产环境里不能随手运行 `migrate dev`。

本地开发可以用：

`prisma migrate dev`

但生产或 CI 应该用：

`prisma migrate deploy`

原因是：

- `migrate dev` 面向本地开发，会生成和应用 migration。
- `migrate deploy` 面向部署环境，只应用已经提交到仓库里的 migration。

当前 CI 里已经使用：

`npx prisma migrate deploy --config prisma.config.ts`

这说明部署时也应该沿用类似流程：

1. 先确保 `DATABASE_URL` 指向正确的目标数据库。
2. 先运行 `prisma generate`。
3. 再运行 `prisma migrate deploy`。
4. 最后启动 API 服务。

部署前还要确认：

- migration 文件已经提交到 GitHub。
- 生产数据库已经创建好。
- 数据库用户有执行 migration 的权限。
- 不要在多个部署进程里同时抢着跑 migration。

## 6. Redis / Job Worker 部署时要注意什么

Redis 在当前项目里主要用于缓存，例如 Project 列表缓存。

部署时有两种选择：

1. 有 Redis：配置 `REDIS_URL`，让缓存正常工作。
2. 暂时没有 Redis：确认代码能在 Redis 失败时降级到数据库。

这个项目之前已经做过 Redis fallback，所以生产早期可以先把 Redis 作为增强能力，而不是第一天必须阻塞部署的能力。

Job Worker 要更谨慎。

当前 worker loop 可以通过 `JOB_WORKER_ENABLED` 控制是否启动。

如果生产环境只有一个 API 实例，学习阶段可以先设置：

`JOB_WORKER_ENABLED=true`

让 API 进程同时处理后台任务。

但如果生产环境有多个 API 实例，同时开 worker 可能导致多个进程一起抢任务。虽然项目里已经做过一些 no-overlap 和状态控制练习，但真实生产里更推荐：

- API 服务单独部署
- Worker 服务单独部署
- 或者只允许一个实例开启 worker

所以第一版部署可以保守一点：

`JOB_WORKER_ENABLED=false`

先把 API 跑起来，再单独设计 worker 部署方式。

## 7. 我现在对部署的理解

部署不是简单地把代码放到服务器上运行。

部署真正要解决的是：

- 代码在哪里构建
- 环境变量在哪里配置
- 数据库在哪里创建
- migration 什么时候执行
- Redis 这类外部服务怎么连接
- 后台任务是否跟 API 放在一起
- 出错时怎么通过日志定位问题

我现在还不一定需要马上准备一台自己的服务器。

学习阶段更适合先用托管平台，例如 Render、Railway、Fly.io、Vercel 等。它们会帮我处理服务器、进程、域名、日志、环境变量面板和自动部署。

自己买云服务器当然也可以，但那会额外引入 Linux、Nginx、PM2、Docker、防火墙、SSL 证书、系统更新等运维内容。那些很重要，但会让学习重心从 Node 后端转向服务器运维。

所以当前更合理的下一步是：

1. 先完成环境变量盘点。
2. 再选择一个部署平台。
3. 先部署 API。
4. 再考虑 Web、数据库、Redis 和 worker 的生产化拆分。

我的理解是：部署阶段不是一步到位，而是先让最小系统在线跑起来，再逐步补齐数据库、缓存、worker、日志和监控。
