# Task: Error Handling And Test Coverage Review

## 目标

这一张不是新增业务接口，而是做一次小复盘。

你刚刚已经完成了：

```text
Plan CRUD
Project CRUD
Todo CRUD
Auth
权限边界
分页 / 排序 / 过滤 / 搜索
Smoke 脚本
HTTP 状态码常量
```

现在要把几个后端判断能力整理清楚：

- 什么时候用 `200 / 201 / 204`。
- 什么时候 route 返回 JSON，什么时候只 `.send()`。
- `AppError` 怎么把 service 错误变成 HTTP 响应。
- focused test / full test / smoke 分别测什么。
- 后面写新接口时，怎么判断测试够不够。

---

## Step 1: 阅读 HTTP_STATUS

打开：

```text
apps/api/src/http/http-status.ts
```

重点看：

```ts
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
} as const;
```

写一段自己的理解：

```text
docs/reviews/http-status-notes.md
```

建议格式：

```md
# HTTP 状态码理解

## 200 OK

我理解它适合：

- ...

项目里的例子：

- ...

## 201 Created

我理解它适合：

- ...

项目里的例子：

- ...

## 204 No Content

我理解它适合：

- ...

项目里的例子：

- ...
```

---

## Step 2: 阅读错误处理链路

按这个顺序看：

```text
apps/api/src/errors/app-error.ts
apps/api/src/middleware/error-handler.ts
apps/api/src/http/validation-error.ts
apps/api/src/middleware/not-found.ts
```

然后在同一个文档里补：

```md
## 错误处理链路

我理解一次错误响应大概是：

1. ...
2. ...
3. ...

例如 Zod 校验失败时：

...

例如 service 抛 PROJECT_NOT_FOUND 时：

...
```

---

## Step 3: 阅读测试分层

挑这几个文件看：

```text
apps/api/tests/unit/todos.service.test.ts
apps/api/tests/unit/todos.prisma-repository.test.ts
apps/api/tests/integration/todos.test.ts
apps/api/src/scripts/api-smoke.ts
```

然后补：

```md
## 测试分层

### service unit test

它主要验证：

- ...

### repository unit test

它主要验证：

- ...

### integration test

它主要验证：

- ...

### smoke script

它主要验证：

- ...
```

---

## Step 4: 回答 5 个小问题

继续写在：

```text
docs/reviews/http-status-notes.md
```

回答：

```md
## 我的判断题

1. 为什么 POST /projects 用 201，而 PATCH /projects/:id 用 200？

2. 为什么 DELETE /todos/:id 用 204，而不是 200 + JSON？

3. 为什么“不属于当前用户”的 Project/Todo 很多时候返回 404，而不是 403？

4. 如果 Zod 校验失败，错误是在哪里变成 VALIDATION_ERROR 的？

5. 如果我要新增一个接口，我应该至少补哪几类测试？
```

---

## 完成后你告诉我

你完成后直接发：

```text
错误处理和测试覆盖复盘完成了
```

我会帮你：

- 看你的理解有没有偏差。
- 帮你补充更准确的表达。
- 如果需要，把这份复盘整理成以后写接口前的 checklist。
