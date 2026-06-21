# Task: Add User And Plan Relation

## 目标

这张任务开始进入“数据库关系”。

之前 `Plan` 是一张独立表：系统里只有学习计划，没有“这个计划属于谁”的概念。

真实后端里，大部分业务数据都会属于某个用户，比如：

- 用户 A 只能看到自己的计划
- 用户 B 不能删除用户 A 的计划
- 登录后创建的计划要自动绑定当前用户

这一张任务先不做登录，也不做 JWT。  
我们先练最核心的一步：在 Prisma 里建立 `User` 和 `Plan` 的关系。

这次你会练到：

- Prisma 里的 `model User`
- 一对多关系：一个用户有多个计划
- `@relation`
- `@unique`
- `@@index`
- 用 `upsert` 准备一个临时学习用户
- 在 repository 测试里用 `include` 查看关联数据

## 最终效果

数据库里会有两张表：

```text
User
Plan
```

关系是：

```text
User 1 ---- N Plan
```

也就是：

- 一个 `User` 可以有多个 `Plan`
- 一个 `Plan` 暂时可以关联一个 `User`

注意：这一阶段我们先把 `Plan.userId` 设计成可选字段。  
原因是你现在还没有登录系统，历史数据和测试数据也可能还没有用户。等进入鉴权阶段后，我们再把它逐步收紧成必填。

---

## Step 1: 修改 Prisma schema

打开：

```text
prisma/schema.prisma
```

新增 `User` model：

```prisma
model User {
  id        String   @id
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  plans     Plan[]
}
```

然后修改 `Plan` model，增加 `userId` 和 `user`：

```prisma
model Plan {
  id          String   @id
  title       String
  description String?
  status      String
  difficulty  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  userId      String?
  user        User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([userId])
}
```

学习点：

- `User.plans Plan[]` 表示“一个用户有多个计划”。
- `Plan.userId String?` 是外键字段，保存用户 id。
- `Plan.user User? @relation(...)` 是 Prisma 用来描述关联关系的字段。
- `references: [id]` 表示 `Plan.userId` 指向 `User.id`。
- `onDelete: SetNull` 表示用户被删除时，计划不会被一起删掉，而是把 `userId` 清空。
- `@@index([userId])` 给外键加索引，后面按用户查计划会更快。

---

## Step 2: 创建 migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name add_user_plan_relation
```

如果 Prisma 提示数据库里有旧数据，先不要乱重置。  
把完整报错发给我，我会带你判断是迁移问题、历史数据问题，还是 schema 写法问题。

然后生成 Prisma Client：

```bash
npm run prisma:generate -w @learn/api
```

学习点：

- 改了 `schema.prisma` 后，TypeScript 代码里不会自动知道新字段。
- `prisma:generate` 会重新生成 `@prisma/client` 的类型。

---

## Step 3: 在 repository 创建临时学习用户

打开：

```text
apps/api/src/modules/plans/plans.prisma-repository.ts
```

在文件顶部附近新增一个常量：

```ts
const LEARNING_USER_EMAIL = "learner@example.com";
```

然后在 `create()` 里，创建计划之前，先准备一个临时用户：

```ts
const learningUser = await prisma.user.upsert({
  where: { email: LEARNING_USER_EMAIL },
  update: {},
  create: {
    id: crypto.randomUUID(),
    email: LEARNING_USER_EMAIL,
    name: "Learning User"
  }
});
```

再给 `prisma.plan.create()` 的 `data` 里加：

```ts
userId: learningUser.id;
```

学习点：

- `upsert` = update or insert。
- 如果用户已经存在，就直接返回这个用户。
- 如果用户不存在，就创建一个。
- 这里先用临时学习用户，是为了让你先理解“数据关系”，后面 JWT 阶段再替换成真实登录用户。

---

## Step 4: 更新 repository 测试清理顺序

打开：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
```

把 `beforeEach` 改成：

```ts
beforeEach(async () => {
  await prisma.plan.deleteMany();
  await prisma.user.deleteMany();
});
```

学习点：

- 有外键关系后，清理数据要注意顺序。
- 先删 `Plan`，再删 `User`。
- 因为 `Plan.userId` 指向 `User.id`，如果先删用户，数据库可能会因为外键约束拒绝。

---

## Step 5: 新增一个关系测试

继续在：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
```

新增测试：

```ts
it("links a created plan to the learning user", async () => {
  const repository = createPrismaPlanRepository();

  const createdPlan = await repository.create({
    title: "Plan with owner",
    difficulty: "medium"
  });

  const savedPlan = await prisma.plan.findUnique({
    where: { id: createdPlan.id },
    include: { user: true }
  });

  expect(savedPlan?.user?.email).toBe("learner@example.com");
});
```

学习点：

- repository 返回给 API 的 `Plan` 目前还不暴露 `user`。
- 但测试可以直接用 Prisma 查数据库，确认关系是否真的保存成功。
- `include: { user: true }` 的意思是：查 Plan 的时候，把关联的 User 也一起查出来。

---

## Step 6: 跑验证

先跑这张任务相关的测试：

```bash
npm run test -w @learn/api -- tests/unit/plans.prisma-repository.test.ts
```

再跑完整检查：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

如果格式检查失败：

```bash
npm run format
```

然后重新跑：

```bash
npm run format:check
```

## 完成标准

你完成后告诉我：

```text
User 和 Plan 关系完成了
```

我会帮你：

1. 跑完整验证。
2. 检查 Prisma 关系是否写对。
3. 补详细中文注释。
4. 带你进入“按 userId 查询计划”和“为 JWT 鉴权做准备”。
