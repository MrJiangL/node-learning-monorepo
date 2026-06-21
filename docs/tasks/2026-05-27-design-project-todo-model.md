# Task: Design Project And Todo Model

## 目标

到目前为止，你已经围绕 `Plan` 做完了一整条后端学习链路：

```text
Express route -> Zod 校验 -> service -> repository -> Prisma -> MySQL
```

现在我们准备进入一个更接近真实业务的模块：

```text
Project / Todo
```

这张任务先不急着写 API，而是先做数据模型设计。

你要先想清楚：

- 一个用户可以有多个 Project。
- 一个 Project 可以有多个 Todo。
- Todo 必须属于某个 Project。
- Project 必须属于当前用户。
- 用户只能访问自己的 Project 和 Todo。

这张任务主要学习：

- 如何在 Prisma 里设计一对多关系。
- 为什么先设计数据模型，再写 API。
- 如何从业务规则推导字段和关系。
- 如何给新模型写最小迁移和验证。

---

## Step 1: 阅读当前 Prisma schema

打开：

```text
prisma/schema.prisma
```

你现在已经有：

```prisma
model User {
  id           String   @id
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  plans        Plan[]
}

model Plan {
  id          String   @id
  title       String
  description String?
  status      String
  difficulty  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String?
  user        User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}
```

先观察两件事：

- `User -> Plan` 是一对多。
- `Plan.userId` 目前还是可空，是为了兼容前面学习阶段的历史数据。

新模块可以比 Plan 更严格一点：

```text
Project 必须属于 User
Todo 必须属于 Project
```

---

## Step 2: 添加 Project model

在 `schema.prisma` 里新增：

```prisma
model Project {
  id          String   @id
  name        String
  description String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Project 必须属于某个用户。
  //
  // 这里不像 Plan 那样写 String?。
  // 因为这是新业务模块，没有历史数据需要兼容，
  // 所以可以从一开始就设计成强归属。
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  todos       Todo[]

  @@index([userId])
}
```

学习点：

- `userId String` 表示必填外键。
- `user User @relation(...)` 表示 Prisma 层的关系。
- `onDelete: Cascade` 表示用户删除后，它的项目也会被删除。
- `@@index([userId])` 让按用户查询 Project 更快。

---

## Step 3: 添加 Todo model

继续新增：

```prisma
model Todo {
  id          String   @id
  title       String
  description String?
  completed   Boolean  @default(false)
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Todo 必须属于某个 Project。
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@index([projectId])
}
```

学习点：

- `completed Boolean @default(false)` 是 Todo 的完成状态。
- `dueDate DateTime?` 是可选截止时间。
- Todo 不直接放 `userId`，因为它可以通过 Project 找到 owner。
- 这会让权限判断变成：

```text
先查 Todo -> include Project -> 判断 project.userId 是否等于当前用户 id
```

---

## Step 4: 更新 User model

在 `User` 里加：

```prisma
projects     Project[]
```

最终 User 里会同时有：

```prisma
plans        Plan[]
projects     Project[]
```

学习点：

- 这是 Prisma 的反向关系字段。
- 它不会单独生成数据库字段，但会让 Prisma Client 能写 `include: { projects: true }`。

---

## Step 5: 运行 Prisma migration

运行：

```bash
npm run prisma:migrate -w @learn/api
```

migration 名字可以用：

```text
add-project-todo-models
```

如果 Prisma 提示你输入 migration name，就填这个。

---

## Step 6: 生成 Prisma Client

通常 migrate dev 会自动 generate。

如果你不确定，可以再跑：

```bash
npm run prisma:generate -w @learn/api
```

---

## Step 7: 做一个最小验证

你可以先不写 API，只用 Prisma Studio 或数据库工具看表：

```text
Project
Todo
```

也可以用 MySQL 查看表是否存在。

如果你想写脚本验证，先别急；下一张任务我们会把 Project repository 和测试补起来。

---

## 完成标准

你完成后告诉我：

```text
Project Todo 数据模型完成了
```

我会帮你检查：

1. Prisma schema 关系是否正确。
2. migration 是否生成。
3. Prisma Client 是否能通过类型检查。
4. 是否没有破坏现有 Plan/Auth 测试。
5. 下一张任务会进入 Project repository 和单元测试。

---

## 这张任务最重要的一句话

```text
先把数据关系想清楚，再写 API。
```

API 是对外入口，数据库模型是系统骨架。

骨架清楚，后面 route、service、repository 才不容易乱。
