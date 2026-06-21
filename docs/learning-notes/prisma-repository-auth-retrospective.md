# Prisma Repository Auth Retrospective

## 我的原始理解

1. Plan 为什么有 userId？
   每个 plan 有个归属者，主要目的是实现用户的数据自己查询。

2. Project 为什么必须有 userId？
   因为查找的时候需要知道查谁的 project，新增也需要知道给谁新增。

3. Todo 为什么没有 userId？
   Todo 只需要有所属的 project 即可，因为对应的 project 有对应的 user。

4. Todo 如何判断属于哪个用户？
   Todo 有 projectId，可以查到所属 project，再查到 user。

5. Repository 负责什么？
   接口类型的定义。

6. Service 负责什么？
   接口实现和数据库的写入。

7. Route 负责什么？
   接口分发和读取前端传过来的数据。

8. 为什么不直接在 route 里写 prisma.xxx？
   因为需要处理校验数据的准确性，所以不能直接写到 prisma。

## 我还不确定的问题

1. 我什么时候应该把逻辑放 service，什么时候放 repository？
2. Prisma include 和 select 什么时候用？
3. 为什么有些接口返回 404 而不是 403？

## 这阶段踩过的坑

1. Prisma `@relation(fields: [id])` 写错，应该是 `fields: [userId]`。
2. create Todo 时漏传 `title`，TypeScript 报错。
3. POST 创建资源应该返回 201。
4. async service 调用忘记 `await`，会把 Promise 放进 response。
5. 数据库测试要 `beforeEach` 清理数据，否则历史数据污染测试。
6. 根路径 router 里全局 `use(requireAuth)` 会拦截未知路由，导致 404 变 401。
7. Todo 更新权限不能拿 todoId 当 projectId，要先查 Todo 再查 Project。
8. route 里不要误用别的模块 schema，例如 `updatePlanSchema`。

## 校正版理解

### 数据关系

`Plan` 有 `userId`，是因为计划是用户自己的学习数据。列表、详情、更新、删除都必须围绕“当前登录用户”做数据隔离。

`Project` 必须有 `userId`，因为它是新模块，没有历史兼容负担，所以可以从一开始就设计成强归属资源。创建 Project 时，`userId` 不能来自客户端 body，只能来自 JWT 解析出来的当前用户。

`Todo` 没有 `userId`，是因为 Todo 的直接父级是 Project。它的归属链路是：

```text
Todo.projectId -> Project.id -> Project.userId -> User.id
```

所以判断 Todo 是否属于当前用户时，不能只查 Todo，还要继续查它所属的 Project。

### 分层职责

`Route` 负责 HTTP 层：

- 读取 `request.params`、`request.query`、`request.body`
- 调用 Zod 做输入校验
- 调用 service
- 返回 HTTP status code 和 JSON envelope

`Service` 负责业务规则：

- 当前用户能不能访问这条数据
- 找不到时抛什么业务错误
- 更新/删除前是否需要先校验归属
- 把 repository 返回的 `null` 转成 `AppError`

`Repository` 负责数据访问：

- 调用 Prisma 读写数据库
- 把 Prisma model 转成 shared 类型
- 找不到数据时返回 `null` 或 `false`
- 不关心 HTTP status code

一句话记忆：

```text
Route 管 HTTP。
Service 管业务和权限。
Repository 管数据库。
```

### 为什么不直接在 Route 里写 Prisma？

不是因为 Route 不能写，而是写了以后会越来越难维护。

如果 route 直接写 Prisma，后面会出现这些问题：

- 每个路由都混着 HTTP、校验、权限、数据库查询
- 权限逻辑容易重复，也容易漏
- 测试时很难单独测试业务逻辑
- 换数据库查询方式时，要改很多 route

现在拆成三层以后，代码流向更清楚：

```text
request
-> route parse
-> service permission
-> repository prisma
-> response
```

## 三个问题的当前答案

### 1. 什么时候放 Service，什么时候放 Repository？

如果问题是“怎么从数据库拿数据”，放 Repository。

例如：

```text
findById
findAllByProjectId
create
update
delete
```

如果问题是“当前用户能不能做这件事”，放 Service。

例如：

```text
Plan.userId 是否等于 currentUserId
Project.userId 是否等于 currentUserId
Todo.projectId 对应的 Project 是否属于 currentUserId
```

### 2. Prisma include 和 select 什么时候用？

`include` 用来把关联数据一起查出来。

例如查询 Todo 时顺便拿 Project：

```ts
prisma.todo.findUnique({
  where: { id },
  include: { project: true }
});
```

`select` 用来只选择你需要的字段。

例如只拿用户安全字段，不拿 `passwordHash`：

```ts
prisma.user.findUnique({
  where: { id },
  select: {
    id: true,
    email: true,
    name: true
  }
});
```

简单记：

```text
include 是“带上关系”。
select 是“只拿字段”。
```

### 3. 为什么有些接口返回 404 而不是 403？

在当前项目里，访问别人的资源时返回 404，是为了不暴露资源是否存在。

如果返回 403，含义会变成：

```text
这条资源存在，但你不能访问。
```

这可能泄露信息。

所以我们现在对“资源不存在”和“资源不属于你”都统一返回 404：

```text
Plan was not found
Project was not found
Todo was not found
```

这是一种常见的权限边界策略。
