# 错误响应说明

项目里的错误响应统一使用下面的格式：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

字段说明：

- `success` 固定是 `false`，表示这次请求失败。
- `error.code` 是稳定的机器可读错误码，适合前端或调用方写判断逻辑。
- `error.message` 是给人看的说明，适合调试、日志和简单展示。

学习重点：

- HTTP 状态码表达错误大类，例如 `400`、`401`、`404`、`500`。
- `error.code` 表达业务细节，例如 `AUTH_REQUIRED`、`PLAN_NOT_FOUND`。
- 前端不要只靠 `error.message` 判断错误类型，因为文案以后可能调整。

## 错误码列表

| HTTP 状态码 | error.code              | 触发场景                                                      |
| ----------- | ----------------------- | ------------------------------------------------------------- |
| 400         | `VALIDATION_ERROR`      | 请求体或 query 参数没有通过 Zod 校验                          |
| 401         | `AUTH_REQUIRED`         | 访问受保护接口时没有传 token，或者 `Authorization` 格式不正确 |
| 401         | `INVALID_TOKEN`         | token 无效、过期，或 token 对应用户不存在                     |
| 401         | `INVALID_CREDENTIALS`   | 登录邮箱或密码错误                                            |
| 404         | `PLAN_NOT_FOUND`        | 当前用户访问不存在或不属于自己的计划                          |
| 404         | `NOT_FOUND`             | 路由不存在                                                    |
| 409         | `USER_EMAIL_EXISTS`     | 注册时邮箱已经存在                                            |
| 500         | `INTERNAL_SERVER_ERROR` | 未预期的服务端错误                                            |

注意：`PLAN_NOT_FOUND` 既包括“计划真的不存在”，也包括“计划存在但不属于当前用户”。这是为了避免用户通过 id 猜测别人的私有资源是否存在。

## 400 VALIDATION_ERROR

触发示例：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":""}'
```

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

说明：

- 这个错误来自 Zod。
- 它表示请求格式不符合后端规则。
- 调用方应该修正输入后再请求。

常见触发点：

- `POST /plans` 时 `title` 为空。
- `PATCH /plans/:id` 时传了非法 `difficulty`。
- `GET /plans?page=0&pageSize=200` 时分页参数越界。

## 401 AUTH_REQUIRED

触发示例：

```bash
curl http://localhost:3001/plans
```

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required"
  }
}
```

说明：

- 请求没有带 `Authorization: Bearer <token>`。
- 或者 `Authorization` 不是 Bearer token 格式。
- 调用方应该先登录，再带 token 重试。

受保护接口示例：

- `GET /auth/me`
- `GET /plans`
- `POST /plans`
- `GET /plans/:id`
- `PATCH /plans/:id`
- `DELETE /plans/:id`

## 401 INVALID_TOKEN

触发示例：

```bash
curl http://localhost:3001/plans \
  -H "Authorization: Bearer invalid-token"
```

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid"
  }
}
```

说明：

- token 不是合法 JWT。
- token 签名不正确。
- token 已经过期。
- token 里的用户 id 在数据库中找不到。

安全点：

- 后端不会把 JWT 的内部错误细节直接返回给客户端。
- 比如 `jwt expired`、`invalid signature` 这类细节应该留在服务端日志里。
- 客户端只需要知道 token 无效，并引导用户重新登录。

## 401 INVALID_CREDENTIALS

触发示例：

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"wrong-password"}'
```

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect"
  }
}
```

说明：

- 邮箱不存在时会返回这个错误。
- 密码错误时也会返回这个错误。
- 不区分“邮箱不存在”和“密码错误”，是为了避免泄露账号是否存在。

## 404 PLAN_NOT_FOUND

触发场景：

- 计划 id 不存在。
- 计划存在，但不属于当前登录用户。

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "PLAN_NOT_FOUND",
    "message": "Plan was not found"
  }
}
```

为什么不是 403？

如果返回 403，就等于告诉调用方：

```text
这条资源确实存在，但你不能访问。
```

对私有资源来说，这可能泄露信息。所以当前项目统一返回 404，让外部用户无法区分“资源不存在”和“资源属于别人”。

触发接口示例：

- `GET /plans/:id`
- `PATCH /plans/:id`
- `DELETE /plans/:id`

## 404 NOT_FOUND

触发示例：

```bash
curl http://localhost:3001/not-exist
```

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /not-exist was not found"
  }
}
```

说明：

- 这个错误来自 `notFound` middleware。
- 它表示没有任何路由匹配当前请求。
- 它和 `PLAN_NOT_FOUND` 不一样：`NOT_FOUND` 是路由不存在，`PLAN_NOT_FOUND` 是业务资源不存在或不可见。

## 409 USER_EMAIL_EXISTS

触发示例：

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"password123","name":"Node Learner"}'
```

如果同一个邮箱已经注册过，再次注册会返回：

```json
{
  "success": false,
  "error": {
    "code": "USER_EMAIL_EXISTS",
    "message": "Email is already registered"
  }
}
```

说明：

- `409 Conflict` 表示请求本身格式没问题，但和当前系统状态冲突。
- 这里的冲突是：邮箱字段要求唯一，但数据库里已经有这个邮箱。

## 500 INTERNAL_SERVER_ERROR

响应示例：

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Unexpected server error"
  }
}
```

说明：

- 这个错误来自统一错误处理中间件。
- 它表示出现了未预期的服务端错误。
- 客户端不应该看到原始异常堆栈或数据库错误细节。

安全点：

- 真实项目里，详细错误应该写到服务端日志或监控系统。
- 返回给客户端的 message 应该保持通用，避免泄露内部实现。

## 调用方建议

前端或其他 API 调用方可以按这个优先级处理错误：

1. 先看 HTTP 状态码，判断错误大类。
2. 再看 `error.code`，判断具体业务原因。
3. 不要依赖 `error.message` 做业务分支。

示例：

```ts
if (response.status === 401 && body.error.code === "AUTH_REQUIRED") {
  // 引导用户登录
}

if (response.status === 404 && body.error.code === "PLAN_NOT_FOUND") {
  // 展示“计划不存在或你没有权限访问”
}
```

## 当前设计边界

这份文档记录的是当前学习项目的错误响应约定。

后续如果新增模块，例如 Todo、Project、Team，可以继续补充新的业务错误码，例如：

```text
TODO_NOT_FOUND
PROJECT_NOT_FOUND
TEAM_ACCESS_DENIED
```

新增错误码时要同步更新：

- 抛出错误的 service 或 middleware。
- 对应的集成测试。
- 这份 `docs/error-responses.md` 文档。
