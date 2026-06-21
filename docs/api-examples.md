# API 调用示例

这些示例可以帮你验证服务是否正常，也能帮助你理解 HTTP 请求的结构。

先启动服务：

```bash
cd /Users/jianglin/project/node/node-learning-monorepo
npm run dev
```

如果你要测试 `/plans`，需要先注册并登录，因为计划 API 已经需要 JWT。

如果你想查看完整错误码说明，可以看：

```text
docs/error-responses.md
```

下面的示例建议按顺序执行：

```text
1. 健康检查
2. 注册用户
3. 登录并获取 token
4. 保存 token 到终端变量
5. 查询当前登录用户
6. 创建学习计划
7. 查询当前用户的学习计划列表
8. 触发几个常见错误，理解后端保护边界
```

## 健康检查

请求：

```bash
curl http://localhost:3001/health
```

预期响应：

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "service": "node-learning-api"
  }
}
```

这个接口通常用来判断服务是否启动成功。它不依赖数据库，也不需要登录。

## 注册用户

请求：

```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"password123","name":"Node Learner"}'
```

说明：

- `email` 是登录账号。
- `password` 会在后端用 bcrypt 哈希后保存，不应该明文入库。
- `name` 是可选展示名。

预期响应：

```json
{
  "success": true,
  "data": {
    "id": "用户 id",
    "email": "learner@example.com",
    "name": "Node Learner",
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
}
```

注意：响应里不应该出现：

```text
password
passwordHash
```

这是安全边界。后端可以保存密码哈希，但不能把密码或密码哈希返回给客户端。

如果你已经注册过这个邮箱，可以换一个邮箱继续测试，例如：

```text
learner2@example.com
```

## 登录并获取 token

请求：

```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"learner@example.com","password":"password123"}'
```

预期响应：

```json
{
  "success": true,
  "data": {
    "token": "JWT token",
    "user": {
      "id": "用户 id",
      "email": "learner@example.com",
      "name": "Node Learner",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  }
}
```

学习点：

- `token` 是后续访问受保护接口的凭证。
- 后端通过 token 找到当前用户。
- 客户端不能自己传 `userId` 来决定数据归属。

## 保存 token 到变量

为了后面的 curl 少写一点，可以先把 token 保存成 shell 变量：

```bash
# 把这里的 JWT token 换成你登录接口返回的 data.token。
# 注意：这只是本地终端临时变量，不要把真实 token 写进代码仓库。
TOKEN="把登录返回的 token 粘贴到这里"
```

这里有三个提醒：

- 这是学习环境可以用的方式。
- 真实项目不要把 token 写进代码。
- 不要把真实 token 提交到 Git。

## 查询当前登录用户

请求：

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

说明：

- 这个接口可以用来检查 token 是否有效。
- 响应里的用户就是后端识别出的当前用户。
- 如果 token 无效或没传 token，这个接口会返回 401。

预期响应：

```json
{
  "success": true,
  "data": {
    "id": "用户 id",
    "email": "learner@example.com",
    "name": "Node Learner",
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
}
```

## 创建学习计划

请求：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"30 days of Node","description":"Rebuild backend basics","difficulty":"easy"}'
```

这里有四个重点：

- `-X POST` 表示这次请求是创建资源。
- `Content-Type: application/json` 告诉 Express 请求体是 JSON。
- `Authorization: Bearer $TOKEN` 是访问受保护接口的关键。
- `userId` 不需要传，也不应该传。

后端会从 token 里识别当前用户，并把计划绑定到这个用户。

预期响应：

```json
{
  "success": true,
  "data": {
    "id": "计划 id",
    "title": "30 days of Node",
    "description": "Rebuild backend basics",
    "status": "active",
    "difficulty": "easy",
    "userId": "当前登录用户 id",
    "createdAt": "创建时间",
    "updatedAt": "更新时间"
  }
}
```

## 查询当前用户的学习计划列表

请求：

```bash
curl http://localhost:3001/plans \
  -H "Authorization: Bearer $TOKEN"
```

说明：

- 返回的是当前 token 对应用户自己的计划。
- 即使 URL 里传 `userId`，后端也应该忽略它。
- 当前用户不能通过 query 参数查看别人的计划。

预期响应：

```json
{
  "success": true,
  "data": [
    {
      "id": "计划 id",
      "title": "30 days of Node",
      "description": "Rebuild backend basics",
      "status": "active",
      "difficulty": "easy",
      "userId": "当前登录用户 id",
      "createdAt": "创建时间",
      "updatedAt": "更新时间"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

## 按难度筛选当前用户的计划

请求：

```bash
curl "http://localhost:3001/plans?difficulty=easy" \
  -H "Authorization: Bearer $TOKEN"
```

说明：

- `difficulty=easy` 是普通筛选条件。
- 它只能在当前登录用户自己的计划里筛选。
- 它不能绕过 user 权限边界。

## 分页查询当前用户的计划

请求：

```bash
curl "http://localhost:3001/plans?page=1&pageSize=2" \
  -H "Authorization: Bearer $TOKEN"
```

说明：

- `page` 表示第几页，从 1 开始。
- `pageSize` 表示每页多少条，目前最大值是 50。
- 分页信息会放在响应里的 `meta` 字段。

## 触发未登录错误

请求：

```bash
curl http://localhost:3001/plans
```

预期响应：

```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "Authentication is required"
  }
}
```

学习点：

- 这是 `requireAuth` 中间件返回的错误。
- 它发生在具体 plans route 业务逻辑之前。
- 没有 token 时，后端不会执行查询计划的逻辑。

## 触发无效 token 错误

请求：

```bash
curl http://localhost:3001/plans \
  -H "Authorization: Bearer invalid-token"
```

预期响应：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "Authentication token is invalid"
  }
}
```

学习点：

- 后端不会把 JWT 的内部错误细节直接返回给客户端。
- 客户端只需要知道 token 无效，服务端日志才应该记录更多细节。

## 触发参数校验错误

请求：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":""}'
```

预期响应：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Title is required"
  }
}
```

这个错误来自 Zod。它说明后端没有盲目相信用户输入，而是在进入业务逻辑之前先做了校验。

## 触发 404

请求：

```bash
curl http://localhost:3001/not-exist
```

预期响应：

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Route GET /not-exist was not found"
  }
}
```

这个响应来自 `notFound` 中间件。它放在所有正常路由后面，所以只有当前面的路由都匹配不到时才会执行。

## 测试顺序速查

你可以按这个顺序手动测试：

```text
1. GET /health
2. POST /auth/register
3. POST /auth/login
4. 设置 TOKEN
5. GET /auth/me
6. POST /plans
7. GET /plans
8. 不带 token 请求 GET /plans，看 401
```

如果某一步失败，先看两件事：

- 服务是否还在运行。
- `$TOKEN` 是否真的设置成了登录接口返回的 `data.token`。
