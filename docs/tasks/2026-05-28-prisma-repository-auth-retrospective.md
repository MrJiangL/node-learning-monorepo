# Task: Prisma Repository Auth Retrospective

## 目标

这一张任务不是继续堆新功能，而是做一次阶段复盘。

你已经从零走完了这条链路：

```text
Express route
-> Zod validation
-> service
-> repository
-> Prisma
-> MySQL
-> tests
-> smoke script
```

现在需要把这些知识点在脑子里“压实”。

---

## Step 1: 画出当前数据关系

先用你自己的话写下这三个模型的关系：

```text
User -> Plan
User -> Project
Project -> Todo
```

你要回答：

```text
1. Plan 为什么有 userId？
2. Project 为什么必须有 userId？
3. Todo 为什么没有 userId？
4. Todo 如何判断属于哪个用户？
```

建议写在：

```text
docs/learning-notes/prisma-repository-auth-retrospective.md
```

如果没有 `docs/learning-notes` 目录，就新建一个。

---

## Step 2: 复盘 Repository 的作用

写下你对 Repository 的理解：

```text
Repository 负责什么？
Service 负责什么？
Route 负责什么？
为什么不直接在 route 里写 prisma.xxx？
```

你可以参考这个结构：

```md
## Repository

- 负责和数据库交互
- 把 Prisma 返回的数据转成 shared 类型
- 找不到数据时返回 null / false，而不是直接处理 HTTP 响应

## Service

- 负责业务规则
- 负责权限边界
- 把 repository 的 null 转成 AppError

## Route

- 负责 HTTP 输入输出
- 负责调用 Zod parse
- 负责返回 status code 和 JSON envelope
```

---

## Step 3: 复盘权限边界

重点写这三段：

```text
Plan 权限：
只能访问自己的 plan。

Project 权限：
只能访问自己的 project。

Todo 权限：
Todo 没有 userId，所以要通过 Todo -> Project -> User 判断权限。
```

你可以用伪代码写：

```ts
const todo = await todoRepository.findById(todoId);
const project = await projectRepository.findById(todo.projectId);

if (project.userId !== currentUserId) {
  throw notFound();
}
```

---

## Step 4: 复盘你踩过的坑

至少写 5 个。

可以从这些里面选：

```text
1. Prisma @relation(fields: [id]) 写错，应该是 fields: [userId]
2. create Todo 时漏传 title，TypeScript 报错
3. POST 创建资源应该返回 201
4. async service 调用忘记 await，会把 Promise 放进 response
5. 数据库测试要 beforeEach 清理数据，否则历史数据污染测试
6. 根路径 router 里全局 use(requireAuth) 会拦截未知路由，导致 404 变 401
7. Todo 更新权限不能拿 todoId 当 projectId，要先查 Todo 再查 Project
8. route 里不要误用别的模块 schema，例如 updatePlanSchema
```

---

## Step 5: 你自己的 3 个问题

最后写 3 个你现在还不确定的问题。

例如：

```text
1. 我什么时候应该把逻辑放 service，什么时候放 repository？
2. Prisma include 和 select 什么时候用？
3. 为什么有些接口返回 404 而不是 403？
```

你写完后告诉我：

```text
阶段复盘写完了
```

我会帮你检查这份复盘，指出你理解准确的地方和需要补强的地方。
然后我们再决定下一阶段：继续深入 Node 后端，还是加一个前端来调用这些 API。
