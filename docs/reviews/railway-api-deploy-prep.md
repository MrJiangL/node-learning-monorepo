# Railway API 部署准备

## 1. 为什么第一版选择 Railway

第一版部署选择 Railway，是因为当前项目更适合先学习“Node API 如何上线”，而不是一开始就学习服务器运维。

当前项目需要部署的是一个 monorepo 里的 API 服务：

- 根目录是 npm workspaces
- API 在 `apps/api`
- shared 类型包在 `packages/shared`
- 数据库使用 Prisma + MySQL
- 项目里还有 Redis 缓存和 Job Worker，但第一版可以先不全部打开

如果直接买云服务器，我需要同时处理 Linux、Node 安装、Nginx、PM2、SSL、防火墙、MySQL、Redis、日志和系统安全。这些内容很重要，但对第一次部署来说太容易把学习重点带偏。

Railway 这类托管平台可以先帮我处理：

- 从 GitHub 拉代码
- 安装依赖
- 执行 build command
- 执行 start command
- 配置环境变量
- 查看运行日志
- 创建 MySQL service
- 给 API 分配可访问的公网地址

所以第一版选择 Railway 的目标是：

先把 API 在线跑起来，理解部署链路。

不是第一天就把 API、Web、Redis、worker、监控全部一次性做好。

## 2. API build command

当前项目是 monorepo，所以不能只在 `apps/api` 里随便执行一个 build。

API 依赖 `packages/shared`，所以部署时要先构建 shared，再构建 api。

本地已经验证通过的命令是：

`npm run build -w @learn/shared && npm run build -w @learn/api`

Railway 的 build command 建议写成：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

这里分三步：

1. `npm run prisma:generate -w @learn/api`

   根据 `prisma/schema.prisma` 生成 Prisma Client。部署平台是干净环境，不能假设 Prisma Client 已经存在。

2. `npm run build -w @learn/shared`

   构建共享包。API 代码里大量 import 了 `@learn/shared` 的类型和导出。

3. `npm run build -w @learn/api`

   把 API 的 TypeScript 编译到 `apps/api/dist`。

我现在对 build command 的理解是：

build 不是启动服务，而是把源码准备成生产环境可以运行的产物。

## 3. API start command

API 自己的 package 里已经有启动命令：

`npm run start -w @learn/api`

它最终会执行：

`node dist/server.js`

第一版 Railway start command 可以写成：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

这里前半段：

`npx prisma migrate deploy --config prisma.config.ts`

作用是把仓库里已经提交的 Prisma migration 应用到线上 MySQL 数据库。

后半段：

`npm run start -w @learn/api`

作用是启动 Express API。

我现在对 start command 的理解是：

start command 是部署平台真正启动服务时执行的命令。它必须以前台进程方式运行，不能启动完就退出。

注意：

把 migration 放进 start command 是第一版学习部署的简化做法。

真实生产环境里，如果有多个 API 实例同时启动，它们可能会同时尝试跑 migration。更成熟的做法是把 migration 放到单独的 release step / deploy step。

但当前第一版只部署一个 API 实例，所以可以先这样做，降低复杂度。

## 4. 需要配置哪些环境变量

当前项目的环境变量来自几个入口：

- `apps/api/src/config/env.ts`
- `apps/api/src/db/prisma.ts`
- `prisma.config.ts`

Railway API service 里至少要配置这些变量：

| 变量                     | 用途                        | 第一版建议                       |
| ------------------------ | --------------------------- | -------------------------------- |
| `NODE_ENV`               | 标记运行环境                | `production`                     |
| `JWT_SECRET`             | JWT 签名密钥                | 设置一串足够长的随机字符串       |
| `DATABASE_URL`           | Prisma CLI / migration 使用 | 来自 Railway MySQL 的连接字符串  |
| `DATABASE_HOST`          | Prisma Client adapter 使用  | 映射 Railway MySQL host          |
| `DATABASE_PORT`          | Prisma Client adapter 使用  | 映射 Railway MySQL port          |
| `DATABASE_USER`          | Prisma Client adapter 使用  | 映射 Railway MySQL user          |
| `DATABASE_PASSWORD`      | Prisma Client adapter 使用  | 映射 Railway MySQL password      |
| `DATABASE_NAME`          | Prisma Client adapter 使用  | 映射 Railway MySQL database      |
| `REDIS_URL`              | Redis 缓存连接              | 第一版可以先不配，或后续接 Redis |
| `JOB_WORKER_ENABLED`     | 是否启动后台 worker         | 第一版建议 `false`               |
| `JOB_WORKER_INTERVAL_MS` | worker 轮询间隔             | 可选，默认 `1000`                |

Railway 创建 MySQL service 后，通常会提供类似这些变量：

- `MYSQL_URL`
- `MYSQLHOST`
- `MYSQLPORT`
- `MYSQLUSER`
- `MYSQLPASSWORD`
- `MYSQLDATABASE`

但项目代码当前读取的是 `DATABASE_*`，所以我要在 API service 里做映射：

| 项目需要的变量      | Railway MySQL 来源 |
| ------------------- | ------------------ |
| `DATABASE_URL`      | `MYSQL_URL`        |
| `DATABASE_HOST`     | `MYSQLHOST`        |
| `DATABASE_PORT`     | `MYSQLPORT`        |
| `DATABASE_USER`     | `MYSQLUSER`        |
| `DATABASE_PASSWORD` | `MYSQLPASSWORD`    |
| `DATABASE_NAME`     | `MYSQLDATABASE`    |

具体在 Railway 里可能可以用变量引用，例如把 API service 的 `DATABASE_URL` 设置成 MySQL service 的 `MYSQL_URL`。如果平台变量引用语法变化，就以 Railway 页面实际提示为准。

这里最重要的是：

- 真实密码只放 Railway 环境变量
- 不写进 GitHub
- 不写进 docs
- 不写进 `.env.example` 的真实值

## 5. Prisma migration 第一版怎么处理

Prisma migration 部署时不要用：

`prisma migrate dev`

因为 `migrate dev` 是本地开发用的。

部署环境应该用：

`prisma migrate deploy`

它只会应用已经提交到仓库里的 migration，不会临时生成新的 migration。

当前项目里的部署命令是：

`npx prisma migrate deploy --config prisma.config.ts`

这个命令依赖：

- `prisma.config.ts`
- `prisma/schema.prisma`
- `prisma/migrations/`
- `DATABASE_URL`

第一版部署时，我可以把 migration 放在 start command 前面：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

部署前需要确认：

1. `prisma/migrations` 已经提交到 GitHub。
2. Railway MySQL 已经创建。
3. `DATABASE_URL` 指向 Railway MySQL。
4. 数据库用户有建表和改表权限。
5. 只部署一个 API 实例，避免多个实例同时跑 migration。

我现在对 migration 的理解是：

migration 是把数据库结构同步到目标环境的步骤。代码上线和数据库结构上线要配合，否则 API 可能启动了，但数据库表或字段不存在。

## 6. Redis 和 Job Worker 第一版怎么处理

Redis 第一版可以先不作为阻塞项。

原因是项目之前已经做过 Redis fallback：缓存失败时可以降级到数据库读取。第一版部署的目标是先让 API 和 MySQL 跑通，不需要一开始就把 Redis 也接上。

所以第一版可以这样处理：

- 暂时不配置 `REDIS_URL`，观察服务是否能正常启动和访问核心接口
- 或者后续再添加 Railway Redis / Upstash Redis

Job Worker 第一版建议关闭：

`JOB_WORKER_ENABLED=false`

原因是 worker 是后台轮询任务。第一版部署如果同时打开 worker，会增加排查复杂度：

- API 是否启动成功
- 数据库是否连接成功
- migration 是否成功
- worker 是否也在跑
- worker 是否处理任务失败

这些问题叠在一起，新手第一次部署会很难判断到底哪里坏了。

所以第一版先关闭 worker，等 API 稳定跑起来后，再单独开一张任务处理 worker 部署。

我现在对 Redis / Worker 的理解是：

缓存和后台任务是生产化增强能力，不应该阻塞第一版 API 上线。

## 7. 部署前我还需要确认什么

真正点 Railway deploy 前，我需要确认这些事情：

### GitHub 侧

- 代码已经 push 到 GitHub
- GitHub Actions CI 是绿色通过
- `.env` 没有提交
- `prisma/migrations` 已提交
- `.github/workflows/ci.yml` 已提交

### Railway 侧

- 已创建 Railway project
- 已连接 GitHub 仓库
- 已创建 API service
- 已创建 MySQL service
- API service 已配置 build command
- API service 已配置 start command
- API service 已配置环境变量

### 命令侧

Build command：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

Start command：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

### 验证侧

部署成功后，第一步不要急着测复杂接口。

先访问：

`/health`

如果 `/health` 能返回成功，再继续测：

- Swagger / docs 页面
- 注册接口
- 登录接口
- Project / Todo 基础接口

第一版部署完成的标准不是“所有生产能力都完美”，而是：

API 能在线启动，能连数据库，能通过健康检查。

## 8. 我现在的下一步

下一步不是继续写代码，而是去 Railway 页面做第一次 API 部署。

建议顺序：

1. 注册 / 登录 Railway。
2. New Project。
3. Deploy from GitHub repo。
4. 选择 `MrJiangL/node-learning-monorepo`。
5. 添加 MySQL service。
6. 配置 API service 的 build command。
7. 配置 API service 的 start command。
8. 配置环境变量。
9. Deploy。
10. 看日志。
11. 访问 `/health`。

如果部署失败，不要急着改代码。

先看失败发生在哪一步：

- install 失败
- build 失败
- prisma generate 失败
- migrate deploy 失败
- start 失败
- runtime 连接数据库失败

部署失败不是坏事。第一次部署的重点就是学会读日志，知道失败属于哪一层。
