# Task: Update Auth API Examples

## 目标

现在 `/plans` 已经被 `requireAuth` 保护了。

这意味着旧的 API 示例已经不准确：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{"title":"30 days of Node"}'
```

这个请求现在应该返回 `401 AUTH_REQUIRED`，因为它没有带 token。

这张任务你要做的是更新：

```text
docs/api-examples.md
```

让它变成一份真正能跟着敲的 API 手册。

---

## 你会练到什么

- API 文档要随着鉴权变化同步更新。
- 如何用 curl 完成注册、登录、带 token 请求。
- 为什么 `Authorization: Bearer <token>` 是访问受保护接口的关键。
- 如何在文档里写“成功示例”和“失败示例”。
- 如何让文档服务学习，而不是只服务复制粘贴。

---

## Step 1: 更新启动说明

打开：

```text
docs/api-examples.md
```

保留已有的启动命令，但建议在后面补一句：

```md
如果你要测试 `/plans`，需要先注册并登录，因为计划 API 已经需要 JWT。
```

---

## Step 2: 增加注册示例

在健康检查后面增加一节：

````md
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
````

注意：

响应里不应该出现：

```text
password
passwordHash
```

这是安全边界。

---

## Step 3: 增加登录示例

继续增加：

````md
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
````

---

## Step 4: 增加 TOKEN 环境变量写法

文档里可以加入这个小技巧：

````md
## 保存 token 到变量

为了后面的 curl 少写一点，可以先把 token 保存成 shell 变量：

```bash
# 把这里的 JWT token 换成你登录接口返回的 data.token。
# 注意：这只是本地终端临时变量，不要把真实 token 写进代码仓库。
TOKEN="把登录返回的 token 粘贴到这里"
```
````

这里的注释很重要：

- 这是学习环境可以用的方式。
- 真实项目不要把 token 写进代码。
- 不要提交真实 token。

---

## Step 5: 更新创建计划示例

把旧的“创建学习计划”示例改成带 token：

````md
## 创建学习计划

请求：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":"30 days of Node","description":"Rebuild backend basics","difficulty":"easy"}'
```

说明：

- `Authorization: Bearer $TOKEN` 是访问受保护接口的关键。
- `userId` 不需要传，也不应该传。
- 后端会从 token 里识别当前用户，并把计划绑定到这个用户。

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
````

---

## Step 6: 更新查询计划列表示例

旧的：

```bash
curl http://localhost:3001/plans
```

现在也应该带 token：

````md
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
````

---

## Step 7: 增加当前用户示例

补一个 `/auth/me`：

````md
## 查询当前登录用户

请求：

```bash
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

说明：

- 这个接口可以用来检查 token 是否有效。
- 响应里的用户就是后端识别出的当前用户。
````

---

## Step 8: 增加 401 示例

把“受保护接口不带 token”的错误也写清楚：

````md
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
````

---

## Step 9: 自己跑一次 curl

启动服务：

```bash
npm run dev
```

然后按顺序跑：

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

如果你注册时提示邮箱已存在，可以换一个邮箱，例如：

```text
learner2@example.com
```

---

## 完成标准

你完成后告诉我：

```text
API 示例文档更新完成了
```

我会帮你检查：

1. Markdown 格式是否通过。
2. 示例是否符合当前鉴权逻辑。
3. 是否误导用户传 `userId`。
4. 是否泄露了任何真实 token、密码、数据库连接信息。
5. 全量测试、类型检查、格式检查、构建是否通过。

---

## 这张任务最重要的一句话

```text
文档也是代码的一部分；接口变了，文档也要跟着变。
```

尤其是鉴权接口。

如果文档没更新，后面的你会照着旧 curl 敲，然后以为代码坏了。
