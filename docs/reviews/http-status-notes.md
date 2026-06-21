# HTTP 状态码理解

这份笔记不是为了背状态码，而是为了以后写接口时能快速判断：

- 请求成功后应该返回什么状态码。
- 响应里要不要带 JSON body。
- 错误从哪里抛出，最后在哪里变成统一响应。
- 新增接口时，测试应该覆盖到哪几层。

## 200 OK

我理解它适合：

- 查询成功，并且要返回查询结果。
- 更新成功，并且要返回更新后的资源。
- 执行一个动作成功，但这个动作不是“创建新资源”。

项目里的例子：

- `GET /projects/:id`：查到 Project 后返回 `200 + JSON`。
- `GET /projects`：查到列表后返回 `200 + JSON + meta`。
- `PATCH /projects/:id`：更新成功后返回更新后的 Project。
- `PATCH /todos/:id`：更新 Todo 的 `completed / title / dueDate` 后返回更新后的 Todo。
- `POST /auth/login`：登录成功后返回 token，但登录不是创建一个新资源，所以用 `200` 合理。

代码里可以写：

```ts
response.json({ success: true, data: project });
```

或者更明确地写：

```ts
response.status(HTTP_STATUS.OK).json({ success: true, data: project });
```

目前项目里很多查询和更新接口直接用 `response.json(...)`，因为 Express 默认就是 `200 OK`。

## 201 Created

我理解它适合：

- 客户端请求成功，并且服务端创建了一个新资源。
- 通常出现在 `POST` 创建类接口里。
- 响应体一般会返回刚创建出来的资源，方便客户端直接使用新资源的 `id`。

项目里的例子：

- `POST /plans`：创建一个新的 Plan。
- `POST /projects`：创建一个新的 Project。
- `POST /projects/with-todos`：创建新的 Project 和初始 Todo。
- `POST /projects/:projectId/todos`：创建一个新的 Todo。
- `POST /auth/register`：创建一个新用户账号。

代码里写：

```ts
response.status(HTTP_STATUS.CREATED).json({
  success: true,
  data: project
});
```

我现在的判断是：

```text
POST 不一定永远是 201。
如果 POST 是创建资源，通常用 201。
如果 POST 是执行动作，比如 login，通常用 200。
```

## 204 No Content

我理解它适合：

- 请求成功。
- 服务端不需要返回任何数据。
- 最常见场景是删除成功。

项目里的例子：

- `DELETE /plans/:id`
- `DELETE /projects/:id`
- `DELETE /todos/:id`

代码里写：

```ts
response.status(HTTP_STATUS.NO_CONTENT).send();
```

注意：

```text
204 的意思就是没有响应体。
```

所以不要写：

```ts
response.status(HTTP_STATUS.NO_CONTENT).json({ success: true });
```

如果我想删除成功后返回 JSON，那就不应该用 `204`，而应该用 `200`：

```ts
response.status(HTTP_STATUS.OK).json({
  success: true,
  data: deletedTodo
});
```

但当前项目选择的是更常见的 REST 风格：

```text
DELETE 成功 -> 204 No Content
```

## 其他常用状态码

### 400 Bad Request

适合请求参数不合法，例如：

- body 里缺少必填字段。
- query string 页码小于 1。
- `completed=yes` 这种不符合 schema 的值。

项目里主要由 Zod 校验失败触发，最后变成：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "..."
  }
}
```

### 401 Unauthorized

适合没有登录，或者 token 无效。

项目里的例子：

- 没带 `Authorization` 访问 `/plans`。
- JWT 过期、伪造、格式错误。
- 登录时邮箱或密码错误。

### 404 Not Found

适合资源不存在。

项目里还有一个重要用法：

```text
资源存在，但不属于当前用户，也返回 404。
```

这样做是为了避免泄露资源是否真实存在。

### 409 Conflict

适合请求和当前系统状态冲突。

项目里的例子：

- 注册时邮箱已经存在，返回 `USER_EMAIL_EXISTS`。

### 429 Too Many Requests

适合触发限流。

项目里的例子：

- 短时间内反复请求登录或注册。

### 500 Internal Server Error

适合未知错误。

项目里 `errorHandler` 会把非 `AppError` 的未知错误统一变成：

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Unexpected server error"
  }
}
```

真实项目里，未知错误的详细信息应该记录到服务端日志，不应该直接返回给客户端。

## 错误处理链路

我理解一次错误响应大概是：

1. route / service / middleware 里发现问题。
2. 如果是可预期错误，就抛 `AppError`。
3. 如果是 async route 里抛错，`asyncHandler` 会 `.catch(next)`，把错误交给 Express。
4. Express 跳到最后的 `errorHandler`。
5. `errorHandler` 判断错误类型：
   - 如果是 `AppError`，按它的 `statusCode / code / message` 返回。
   - 如果不是 `AppError`，统一返回 `500 INTERNAL_SERVER_ERROR`。

项目里正常请求的顺序大概是：

```text
request
-> requestLogger
-> express.json()
-> route
-> service
-> repository
-> response
```

项目里错误请求的顺序可能是：

```text
request
-> route / service 抛错
-> asyncHandler 捕获
-> next(error)
-> errorHandler
-> JSON 错误响应
```

### 例如 Zod 校验失败时

以 `PATCH /projects/:id` 为例：

1. route 里执行 `updateProjectSchema.parse(request.body)`。
2. 如果 body 不合法，Zod 会抛 `ZodError`。
3. route 的 `catch` 会调用：

```ts
mapZodErrorToAppError(error, "body");
```

4. `mapZodErrorToAppError` 把 `ZodError` 转换成：

```ts
new AppError(HTTP_STATUS.BAD_REQUEST, "VALIDATION_ERROR", message);
```

5. 这个 `AppError` 继续往外抛。
6. `asyncHandler` 捕获后交给 `next(error)`。
7. `errorHandler` 返回：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Project name is required"
  }
}
```

### 例如 service 抛 PROJECT_NOT_FOUND 时

以 `PATCH /projects/:id` 为例：

1. route 解析 body 成功。
2. route 调用 `projectService.updateProject(id, input, currentUserId)`。
3. service 先通过 repository 查 Project。
4. 如果 Project 不存在，或者 `project.userId !== currentUserId`，service 抛：

```ts
new AppError(HTTP_STATUS.NOT_FOUND, "PROJECT_NOT_FOUND", "Project was not found");
```

5. `asyncHandler` 把错误交给 `errorHandler`。
6. `errorHandler` 返回：

```json
{
  "success": false,
  "error": {
    "code": "PROJECT_NOT_FOUND",
    "message": "Project was not found"
  }
}
```

这里返回 404，而不是 403，是为了不告诉调用方：

```text
这个 projectId 到底是真的不存在，还是存在但属于别人。
```

## 测试分层

### service unit test

它主要验证：

- 业务规则是否正确。
- 权限边界是否正确。
- 不该调用 repository 时，是否真的停住了。
- 当前用户 id 有没有正确传下去。
- service 是否把 repository 的 `null / false` 翻译成合适的 `AppError`。

它不应该重点测试：

- Prisma 具体怎么写数据库。
- Express route 怎么解析参数。
- HTTP 状态码是多少。

项目里的例子：

- `todos.service.test.ts` 验证不能更新或删除别人 Project 下的 Todo。
- `projects.service.test.ts` 验证不能查看、更新、删除别人的 Project。

### repository unit test

它主要验证：

- Prisma 查询条件是否正确。
- 数据是否真的写入、更新、删除了数据库。
- 分页的 `data / meta.total / totalPages` 是否一致。
- 过滤条件是否进入了数据库查询。
- 找不到数据时是否按 repository 约定返回 `null` 或 `false`。

它不应该重点测试：

- 当前用户权限。
- HTTP 状态码。
- route 的请求响应格式。

项目里的例子：

- `todos.prisma-repository.test.ts` 验证删除 Todo 后数据库里查不到。
- `projects.prisma-repository.test.ts` 验证删除 Project 时它下面的 Todo 也被删除。

### integration test

它主要验证：

- 真实 Express app 的 HTTP 行为。
- route 是否挂载正确。
- `requireAuth` 是否生效。
- Zod 校验失败是否返回 `VALIDATION_ERROR`。
- service 权限边界是否能通过 HTTP 层触发。
- 数据库最终状态是否符合预期。

它会比 service / repository 测试更接近真实请求。

项目里的例子：

- `todos.test.ts` 验证 `DELETE /todos/:id` 返回 204，并且数据库里的 Todo 真的被删除。
- `projects.test.ts` 验证不能通过 API 更新别人的 Project。
- `plans.test.ts` 验证只返回当前用户自己的 Plan。

### smoke script

它主要验证：

- 本地启动的真实 API 服务是否能跑完整主链路。
- 注册、登录、鉴权、创建 Plan、创建 Project、创建 Todo、更新、过滤、删除这些动作能否串起来。
- 路由、数据库、环境变量、JWT、真实端口服务是否都能一起工作。

它和 integration test 的区别：

```text
integration test 直接 createApp()，不需要真实监听 3001 端口。
smoke script 请求的是 http://localhost:3001，是真实运行中的服务。
```

所以 smoke 更像“开发者手动验收脚本”，不是替代所有测试。

## 我的判断题

### 1. 为什么 POST /projects 用 201，而 PATCH /projects/:id 用 200？

因为 `POST /projects` 创建了一个新的 Project 资源，所以用 `201 Created`。

`PATCH /projects/:id` 是修改已经存在的 Project，不是创建新资源。它更新成功后返回更新后的 Project，所以用 `200 OK + JSON`。

简单判断：

```text
创建新资源 -> 201
更新已有资源并返回数据 -> 200
```

### 2. 为什么 DELETE /todos/:id 用 204，而不是 200 + JSON？

因为当前项目的删除接口只需要告诉客户端：

```text
删除成功了。
```

不需要返回被删除的 Todo。

`204 No Content` 的语义正好是：

```text
请求成功，但响应体为空。
```

所以写：

```ts
response.status(HTTP_STATUS.NO_CONTENT).send();
```

如果以后产品需要“删除后返回被删除的数据”，那就可以改成：

```ts
response.status(HTTP_STATUS.OK).json({
  success: true,
  data: deletedTodo
});
```

但那就不是 204 了。

### 3. 为什么“不属于当前用户”的 Project/Todo 很多时候返回 404，而不是 403？

因为返回 403 会暗示：

```text
这个资源确实存在，只是你没有权限。
```

对于强隐私资源，最好不要让调用方知道这个 id 是否存在。

所以项目里采用：

```text
不存在 -> 404
存在但不属于你 -> 404
```

这样外部看到的都是：

```json
{
  "code": "PROJECT_NOT_FOUND"
}
```

或：

```json
{
  "code": "TODO_NOT_FOUND"
}
```

这是一种安全边界设计。

### 4. 如果 Zod 校验失败，错误是在哪里变成 VALIDATION_ERROR 的？

是在：

```text
apps/api/src/http/validation-error.ts
```

里面的：

```ts
mapZodErrorToAppError(error, "body");
mapZodErrorToAppError(error, "query");
```

这个 helper 会判断：

```ts
error instanceof ZodError;
```

如果是 Zod 错误，就抛：

```ts
new AppError(HTTP_STATUS.BAD_REQUEST, "VALIDATION_ERROR", message);
```

最后由 `errorHandler` 统一返回 JSON。

### 5. 如果我要新增一个接口，我应该至少补哪几类测试？

我现在的判断：

1. 如果新增 repository 方法，要补 repository unit test。
2. 如果新增或改变业务规则，要补 service unit test。
3. 如果新增 HTTP API，要补 integration test。
4. 如果这个 API 属于主流程，要补 smoke script。

例如新增：

```text
DELETE /todos/:id
```

至少要补：

- repository：删除存在的 Todo、删除不存在的 Todo。
- service：当前用户能删除自己的 Todo、不能删除别人的 Todo。
- integration：API 返回 204、数据库真的删除、不能删除别人的 Todo。
- smoke：真实链路里创建 Todo 后删除，并确认列表里查不到。

## 新接口 Checklist

以后写一个新接口前，我可以按这个顺序想：

1. 这个接口是 `GET / POST / PATCH / DELETE` 哪一种？
2. 成功后应该是 `200 / 201 / 204` 哪一种？
3. 要不要返回 JSON body？
4. 输入来自哪里：`body / query / params / currentUser`？
5. 哪些输入必须用 Zod 校验？
6. 这个资源属于当前用户吗？权限边界放在 service 里怎么判断？
7. repository 找不到数据时返回什么？
8. service 要把找不到或无权限翻译成什么 `AppError`？
9. 需要补哪些测试：repository / service / integration / smoke？
10. smoke 脚本的顺序会不会互相影响，比如先清空字段再查询字段？
