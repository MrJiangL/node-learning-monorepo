# Task: Document Error Response Catalog

## 目标

现在项目已经有不少错误码了：

```text
VALIDATION_ERROR
AUTH_REQUIRED
INVALID_TOKEN
PLAN_NOT_FOUND
EMAIL_ALREADY_EXISTS
INVALID_CREDENTIALS
NOT_FOUND
INTERNAL_SERVER_ERROR
```

下一步我们不急着写新业务，先整理一份错误响应文档。

这张任务要新增：

```text
docs/error-responses.md
```

它会说明：

- 项目统一错误响应格式是什么。
- 每个错误码对应什么 HTTP 状态码。
- 什么时候会触发这个错误。
- 前端或调用方应该怎么理解它。

---

## 你会练到什么

- API 错误响应设计。
- HTTP status code 和业务 error code 的区别。
- 为什么后端要返回稳定的 `error.code`。
- 为什么有些权限错误返回 404 而不是 403。
- 如何让 API 文档服务调试和协作。

---

## Step 1: 新建错误响应文档

新建文件：

```text
docs/error-responses.md
```

开头可以写：

````md
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
- `error.code` 是稳定的机器可读错误码，适合前端写判断逻辑。
- `error.message` 是给人看的说明，适合调试和展示。
````

学习点：

- HTTP 状态码告诉你“大类”：400、401、404、500。
- `error.code` 告诉你“具体原因”：例如 `AUTH_REQUIRED`。
- 前端不要只靠 message 判断错误，因为 message 可能会改。

---

## Step 2: 增加错误码表格

继续写：

```md
## 错误码列表

| HTTP 状态码 | error.code            | 触发场景                                  |
| ----------- | --------------------- | ----------------------------------------- |
| 400         | VALIDATION_ERROR      | 请求体或 query 参数没有通过 Zod 校验      |
| 401         | AUTH_REQUIRED         | 访问受保护接口时没有传 token              |
| 401         | INVALID_TOKEN         | token 无效、过期，或 token 对应用户不存在 |
| 401         | INVALID_CREDENTIALS   | 登录邮箱或密码错误                        |
| 404         | PLAN_NOT_FOUND        | 当前用户访问不存在或不属于自己的计划      |
| 404         | NOT_FOUND             | 路由不存在                                |
| 409         | EMAIL_ALREADY_EXISTS  | 注册时邮箱已经存在                        |
| 500         | INTERNAL_SERVER_ERROR | 未预期的服务端错误                        |
```

注意：

- `PLAN_NOT_FOUND` 既包括“真的不存在”，也包括“这条计划属于别人”。
- 这是为了避免用户通过 id 猜别人的资源是否存在。

---

## Step 3: 写 400 示例

````md
## 400 VALIDATION_ERROR

触发示例：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"title":""}'
```
````

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

````

---

## Step 4: 写 401 示例

写两个 401：

```md
## 401 AUTH_REQUIRED

触发示例：

```bash
curl http://localhost:3001/plans
````

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
- 调用方应该先登录，再带 token 重试。

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

````

---

## Step 5: 写 404 示例

```md
## 404 PLAN_NOT_FOUND

触发场景：

- 计划 id 不存在。
- 计划存在，但不属于当前登录用户。

为什么不是 403？

因为如果返回 403，就等于告诉用户：

```text
这条资源确实存在，但你不能访问。
````

对私有资源来说，这可能泄露信息。
所以这里统一返回 404。

````

---

## Step 6: 更新 README 或 api-examples 引用

打开：

```text
docs/api-examples.md
````

在开头附近补一句：

```md
如果你想查看完整错误码说明，可以看：`docs/error-responses.md`。
```

---

## 完成标准

你完成后告诉我：

```text
错误响应文档完成了
```

我会帮你检查：

1. 错误码是否和当前代码一致。
2. 文档是否没有误导前端用 message 做判断。
3. 404 权限隐藏逻辑是否讲清楚。
4. `npm run format:check` 是否通过。
5. 全量测试、类型检查、构建、smoke 是否仍然通过。

---

## 这张任务最重要的一句话

```text
HTTP 状态码表达错误大类，error.code 表达业务细节。
```

这也是后端和前端协作时非常重要的一条边界。
