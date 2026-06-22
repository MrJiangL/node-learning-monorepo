# Railway API 首次部署记录

## 1. Railway Project 创建情况

Railway Project 已创建，并且已经连接 GitHub 仓库：

`MrJiangL/node-learning-monorepo`

当前线上 API 地址：

https://node-learning-monorepo-production.up.railway.app

## 2. MySQL Service 创建情况

本次部署已经能通过 `/health`，说明 API 服务至少已经成功启动。

如果本次 Railway project 中已经创建 MySQL service，则后续需要继续验证：

- Prisma migration 是否成功执行
- 注册 / 登录接口是否能写入数据库
- Project / Todo 接口是否能读写数据库

仅 `/health` 成功还不能证明数据库链路一定完整，因为 `/health` 当前主要验证 API 进程是否存活。

## 3. API Service build command

第一版 API build command：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

这条命令的作用：

1. 生成 Prisma Client。
2. 构建 shared package。
3. 构建 API TypeScript 代码。

当前线上服务能成功启动，说明 build 阶段已经基本跑通。

## 4. API Service start command

第一版 API start command：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

这条命令的作用：

1. 先把已提交的 Prisma migration 应用到 Railway MySQL。
2. 再启动 Express API。

第一版这样做可以降低部署复杂度。

后续如果有多个 API 实例，migration 应该拆成单独 deploy step，避免多个实例同时执行 migration。

## 5. 环境变量配置情况

第一版至少需要配置：

- `NODE_ENV=production`
- `JWT_SECRET`
- `DATABASE_URL`
- `DATABASE_HOST`
- `DATABASE_PORT`
- `DATABASE_USER`
- `DATABASE_PASSWORD`
- `DATABASE_NAME`
- `JOB_WORKER_ENABLED=false`
- `JOB_WORKER_INTERVAL_MS=1000`

真实变量值只应该存在 Railway 环境变量面板中，不能写进 GitHub，也不能写进文档。

Redis 第一版可以暂时不作为阻塞项。

Worker 第一版建议保持关闭：

`JOB_WORKER_ENABLED=false`

## 6. 第一次部署是否成功

第一次 Railway API 部署已经成功启动。

验证时间：2026-06-22

验证 URL：

https://node-learning-monorepo-production.up.railway.app/health

返回结果：

`HTTP/2 200`

响应体：

`{"success":true,"data":{"status":"ok","service":"node-learning-api"}}`

## 7. 如果失败，失败在哪一步

本次 `/health` 验证没有失败。

但后续还需要继续验证数据库相关接口。如果注册 / 登录 / Project / Todo 接口失败，优先排查：

- Railway MySQL 环境变量是否映射正确
- `DATABASE_URL` 是否给 Prisma migration 使用
- `DATABASE_HOST` / `DATABASE_PORT` / `DATABASE_USER` / `DATABASE_PASSWORD` / `DATABASE_NAME` 是否给 Prisma Client adapter 使用
- migration 是否真正执行成功
- Railway logs 里是否有 Prisma / MySQL 连接错误

## 8. `/health` 验证结果

本地 curl 验证结果：

- Status：`200`
- Server：`railway-hikari`
- Service：`node-learning-api`
- Body：`success: true`

这说明线上 API 进程已经正常启动，并能响应 HTTP 请求。

## 9. 我这次学到了什么

这次第一次部署的关键收获是：

1. 部署不是先买服务器，而是先跑通一条线上服务链路。
2. 托管平台会帮我处理很多服务器层面的细节。
3. monorepo 部署时要明确 build command，不能只写单包命令。
4. API 启动前要考虑 Prisma Client 生成和 migration。
5. `/health` 是部署成功后的第一个验证点。
6. `/health` 成功只说明 API 活着，下一步还要验证数据库读写。

下一步应该做线上 API smoke 验证：

- `/openapi.json` 是否能访问
- `/docs` 是否能访问
- 注册接口是否成功
- 登录接口是否成功
- 创建 Project / Todo 是否成功

这样才能确认 Railway 上的 API、数据库、Prisma migration 和业务接口都真正串起来。
