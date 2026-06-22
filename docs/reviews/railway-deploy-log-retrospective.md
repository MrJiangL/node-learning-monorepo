# Railway 部署日志复盘

## 1. 这次部署经历了哪些阶段

这次 Railway API 部署大致经历了这些阶段：

1. 从 GitHub 拉取代码
2. 安装 npm 依赖
3. 生成 Prisma Client
4. 构建 `packages/shared`
5. 构建 `apps/api`
6. 执行 Prisma migration
7. 启动 Express API
8. 通过公网访问 `/health`
9. 做线上 smoke 验证

对应到部署命令：

Build command：

`npm run prisma:generate -w @learn/api && npm run build -w @learn/shared && npm run build -w @learn/api`

Start command：

`npx prisma migrate deploy --config prisma.config.ts && npm run start -w @learn/api`

我现在理解，部署不是一个动作，而是一条流水线。

这条流水线里任何一段失败，最终表现都可能是“服务没起来”，所以看日志时要先判断失败发生在哪个阶段。

## 2. 哪些日志说明 build 成功

Build 成功通常要看到这些信号：

1. 依赖安装完成，没有 npm install / npm ci 失败。
2. Prisma generate 没有报 schema 或 database config 错误。
3. `@learn/shared` 的 TypeScript build 没有类型错误。
4. `@learn/api` 的 TypeScript build 没有类型错误。
5. 最终没有出现 non-zero exit code。

本项目本地已经验证过：

`npm run build -w @learn/shared && npm run build -w @learn/api`

线上 API 能启动，也侧面说明 build 阶段已经通过。

如果 build 失败，常见原因包括：

- TypeScript 类型错误
- Prisma Client 没生成
- monorepo workspace 路径不对
- build command 只构建了 API，没先构建 shared
- 缺少 devDependencies
- Node / npm 版本不符合项目要求

当前项目的关键点是：

`apps/api` 依赖 `packages/shared`，所以部署日志里必须能看到 shared 和 api 都成功构建。

## 3. 哪些日志说明 migration 成功

Migration 阶段运行的是：

`npx prisma migrate deploy --config prisma.config.ts`

这个阶段成功通常说明：

- `DATABASE_URL` 能被 Prisma CLI 读取到
- Railway MySQL 可以连接
- 数据库用户权限足够
- `prisma/migrations` 里的 migration 文件能应用到目标数据库

如果 migration 失败，常见原因包括：

- `DATABASE_URL` 没配置
- `DATABASE_URL` 指向错误数据库
- 数据库还没启动好
- 用户名或密码错误
- 数据库用户没有建表 / 改表权限
- migration 历史和数据库实际状态不一致

这次线上 smoke 中注册、登录、Project、Todo 都通过，说明数据库表结构至少已经能支持当前主链路。

所以可以判断：migration 阶段和数据库连接阶段基本成功。

## 4. 哪些日志说明 API start 成功

API start 阶段运行的是：

`npm run start -w @learn/api`

它最终执行：

`node dist/server.js`

代码里启动成功会输出类似：

`API listening on http://localhost:<PORT>`

Railway 不一定要求我关心内部端口是多少，因为平台会把公网流量转发到服务监听的端口。

API start 成功的更可靠外部验证是：

`GET /health` 返回 `200`。

本次已经验证：

- `/health` 返回 200
- `/openapi.json` 返回 200
- `/docs/` 返回 200
- 注册 / 登录 / Project / Todo 主链路全部通过

所以 API start 阶段成功。

如果 start 失败，常见原因包括：

- `dist/server.js` 不存在，说明 build 没产出
- `JWT_SECRET` 缺失，env 校验启动失败
- `PORT` 处理不正确
- `DATABASE_*` 配置错误，Prisma Client 初始化失败
- `REDIS_URL` 配置错误且代码没有降级
- worker 启动后报错导致进程退出

这也是为什么第一版建议 `JOB_WORKER_ENABLED=false`：先减少 start 阶段的不确定性。

## 5. 如果 deploy 失败，我应该先看哪里

部署失败时，不要一看到红色日志就马上改代码。

应该先按阶段定位：

### 1. 依赖安装阶段失败

优先看：

- `package-lock.json` 是否提交
- Node / npm 版本是否满足 `engines`
- workspace 依赖是否正常
- 是否有网络安装失败

### 2. Prisma generate 阶段失败

优先看：

- `prisma/schema.prisma` 是否存在
- `prisma.config.ts` 是否能加载
- `@prisma/client` 和 `prisma` 版本是否匹配

### 3. TypeScript build 阶段失败

优先看：

- 具体是哪一个 workspace build 失败
- 是 `@learn/shared` 失败，还是 `@learn/api` 失败
- 是否有类型错误
- 是否有路径 alias / exports 问题

### 4. Migration 阶段失败

优先看：

- `DATABASE_URL` 是否存在
- MySQL service 是否已创建
- 连接字符串是否指向 Railway MySQL
- 数据库用户权限是否足够
- migration 文件是否提交

### 5. Start 阶段失败

优先看：

- `dist/server.js` 是否存在
- `JWT_SECRET` 是否配置
- `NODE_ENV` 是否正确
- `DATABASE_HOST` 等拆分变量是否正确
- `JOB_WORKER_ENABLED` 是否先关掉

### 6. Deploy 显示成功但接口访问失败

优先看：

- 访问路径是否正确
- Railway domain 是否是最新服务地址
- `/health` 是否能访问
- 服务是否启动后又崩溃
- logs 里是否有 runtime error

## 6. 我现在怎么理解部署日志

我现在理解，部署日志不是一堆杂乱输出，而是线上服务从源码变成可访问 API 的过程记录。

日志可以按阶段看：

| 阶段            | 解决的问题               | 失败时说明什么                        |
| --------------- | ------------------------ | ------------------------------------- |
| install         | 依赖能不能装上           | package / workspace / 网络问题        |
| prisma generate | Prisma Client 能不能生成 | schema / Prisma 配置问题              |
| build shared    | shared 包能不能编译      | 共享类型或 TS 配置问题                |
| build api       | API 能不能编译           | API TypeScript 或依赖问题             |
| migrate deploy  | 数据库结构能不能同步     | DATABASE_URL / MySQL / migration 问题 |
| start api       | 服务能不能启动           | env / dist / runtime 问题             |
| health check    | 公网能不能访问           | 服务暴露或进程状态问题                |
| smoke test      | 主业务链路能不能跑       | 数据库、鉴权、业务接口问题            |

这次部署最重要的收获是：

`/health` 成功只是第一步，smoke 验证通过才说明 API 和数据库主链路真的跑通。

以后遇到部署失败，我应该先判断失败阶段，再决定要不要改代码。

很多部署问题不是业务代码错，而是：

- 环境变量缺失
- build command 不完整
- start command 不正确
- migration 没跑
- 数据库服务没连上
- token / secret / URL 配错

所以部署日志复盘的价值是：让我从“看到红字就慌”，变成“先定位阶段，再查原因”。

## 7. 下一步

Railway API 已经完成：

- 首次部署
- `/health` 验证
- OpenAPI / Swagger 验证
- 注册 / 登录 smoke
- Project / Todo smoke
- 部署日志复盘

下一步可以进入生产化日志、监控和健康检查强化。

重点不再是“服务能不能跑”，而是：

- 服务出错时我能不能看懂日志
- 线上有没有更适合机器读取的健康检查
- 是否需要 readiness / liveness 区分
- 错误日志是否包含足够上下文
- 是否需要接入平台监控或告警
