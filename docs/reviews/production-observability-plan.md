# 生产化日志、监控和健康检查规划

## 1. 当前 `/health` 能说明什么

当前 `/health` 的实现很简单：

`GET /health`

返回：

`{"success":true,"data":{"status":"ok","service":"node-learning-api"}}`

它现在能说明：

- Express API 进程已经启动
- HTTP 路由能正常响应
- Railway 的公网域名能打到服务
- Node 进程没有直接崩溃

这类 health check 更接近 liveness check。

liveness 的意思是：

这个进程还活着吗？

当前 `/health` 适合作为第一版部署验证入口，因为它不依赖数据库、Redis、登录状态或其他外部服务。

这样设计有一个好处：

如果 `/health` 都失败，说明问题大概率在应用启动、路由、端口、平台转发或进程层面，而不是业务数据层面。

## 2. 当前 `/health` 不能说明什么

当前 `/health` 不能说明：

- MySQL 是否可连接
- Prisma migration 是否已经完整应用
- Redis 是否可连接
- JWT_SECRET 是否适合生产长期使用
- 注册 / 登录是否可用
- Project / Todo 业务接口是否可用
- Job Worker 是否正常处理任务
- 外部依赖是否健康

这就是为什么 `/health` 通过后，还需要做线上 smoke 验证。

当前项目已经做过：

- `/health` 验证
- `/openapi.json` 验证
- `/docs/` 验证
- 注册 / 登录验证
- Project / Todo 验证

所以我现在理解：

`/health` 是部署成功的第一道门，不是全部证明。

后续可以考虑增加更细的健康检查，例如：

- `/health`：只检查进程是否活着
- `/ready`：检查数据库、Redis 等依赖是否可用
- `/version`：返回版本、commit、部署时间等信息

## 3. 当前日志能帮助我定位哪些问题

当前项目有基础 request logger：

`apps/api/src/middleware/request-logger.ts`

它会记录：

- HTTP method
- URL
- status code
- request duration

日志格式类似：

`GET /health 200 3ms`

这些日志可以帮助我定位：

- 有没有请求进来
- 请求路径是什么
- 响应状态码是多少
- 请求耗时大概是多少
- 哪些接口频繁报 4xx / 5xx

当前项目还有 error handler：

`apps/api/src/middleware/error-handler.ts`

它已经做对了一件重要事情：

未知错误返回给客户端时，不直接暴露原始错误 message。

客户端只看到：

`Unexpected server error`

这避免了把数据库错误、路径、内部实现、依赖细节泄露给用户。

## 4. 当前日志还缺什么

当前日志还比较基础，主要缺这些能力：

### 1. 未知错误没有写服务端详细日志

当前 error handler 对未知错误只返回 500，但没有把详细错误写到服务端日志。

生产环境里应该至少记录：

- error name
- error message
- stack trace
- request method
- request path
- request id
- user id，如果有

注意：

详细错误应该写进服务端日志，不应该返回给客户端。

### 2. 没有 request id

当前日志无法把一次请求的多条日志串起来。

后续可以给每个请求生成 request id，例如：

`x-request-id`

这样排查线上问题时，可以根据 request id 找到同一次请求的完整链路。

### 3. 日志还是纯字符串

当前日志是：

`GET /path 200 12ms`

这对人眼友好，但不太适合机器分析。

后续可以改成结构化 JSON 日志，例如：

`{"method":"GET","path":"/health","statusCode":200,"durationMs":12}`

结构化日志更适合搜索、过滤和监控平台采集。

### 4. 缺少慢请求判断

当前只记录 duration，但没有对慢请求做额外标记。

后续可以约定：

- 超过 500ms 记录 warning
- 超过 1000ms 记录 slow request

### 5. 缺少数据库 / Redis 健康日志

现在不能从日志直接判断 MySQL / Redis 在启动时是否连接成功。

后续可以在启动时或 readiness check 里记录依赖状态。

## 5. 下一步健康检查可以怎么增强

我建议不要把当前 `/health` 改得太重。

当前 `/health` 保持简单，作为 liveness：

- 不查数据库
- 不查 Redis
- 不要求登录
- 只证明 API 进程活着

然后新增一个 readiness 类型接口，例如：

`GET /ready`

`/ready` 可以检查：

- MySQL 是否能执行简单查询
- Redis 是否能 ping 通，如果配置了 Redis
- 关键环境变量是否存在

这样两个接口分工更清晰：

| 接口      | 目的                       | 是否依赖外部服务 |
| --------- | -------------------------- | ---------------- |
| `/health` | 进程是否活着               | 否               |
| `/ready`  | 服务是否准备好承接真实流量 | 是               |

第一版 readiness 可以先只查 MySQL。

例如：

- Prisma 执行一个轻量查询
- 成功返回 `ready: true`
- 失败返回 `ready: false` 和 503

注意：

readiness 失败时可以返回依赖名称，但不要返回真实数据库地址、密码或完整错误堆栈。

## 6. 下一步日志可以怎么增强

日志增强可以按小步来，不要一次引入复杂平台。

第一步：增强 error handler 的服务端日志。

目标：

- 客户端仍然只看到通用 500
- Railway logs 里能看到详细错误

第二步：给请求增加 request id。

目标：

- 每次请求都有唯一 id
- 响应头返回 `x-request-id`
- request logger 和 error logger 都记录这个 id

第三步：改造 request logger 为结构化日志。

目标：

- method
- path
- statusCode
- durationMs
- requestId
- userAgent
- ip

第四步：增加慢请求标记。

目标：

- 慢接口更容易从日志里发现
- 为后续性能优化提供线索

第五步：再考虑外部监控平台。

比如：

- Railway Metrics
- UptimeRobot
- Sentry
- Logtail / Better Stack
- Grafana Cloud

但现在不急着接。第一阶段先把自己的日志打清楚。

## 7. 我现在怎么理解生产化可观察性

我现在理解，可观察性不是“出了事之后翻一堆日志碰运气”。

可观察性是提前设计好：

- 服务是否活着
- 服务是否准备好
- 请求有没有进来
- 请求花了多久
- 请求失败在哪一层
- 失败时服务端有没有足够信息定位
- 客户端有没有被保护，不看到内部错误细节

当前项目已经有一个不错的起点：

- `/health` 可以证明进程活着
- request logger 可以看到请求路径、状态码和耗时
- error handler 不把未知错误直接泄露给客户端
- Railway logs 可以查看线上输出

下一步最值得做的不是马上接复杂监控，而是先增强两个基础能力：

1. `/ready`：检查 MySQL 是否真的可用。
2. error logging：未知错误写入服务端日志。

这样项目就从“能部署”往“出问题能定位”迈进一步。

我的下一步建议：

先实现一个轻量 `/ready` 接口，只检查数据库连接。

然后再增强 error handler，把未知错误的详细信息写到 Railway logs，但客户端仍然返回安全的通用错误。
