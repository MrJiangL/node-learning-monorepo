# Task: Filter Plans By User Id

## 目标

上一张任务我们已经让 `Plan` 可以关联 `User`。

但是现在的列表查询还是：

```text
GET /plans
```

它会返回所有计划。

真实登录系统里，用户登录后应该只看到自己的计划。  
在做 JWT 之前，我们先用一个更小的练习理解这件事：

```text
repository.findAll({ userId })
```

这张任务只做 repository 层，不改 HTTP API。

你会练到：

- 给 filter 类型增加 `userId`
- Prisma `where` 同时支持多个条件
- 测试两个用户的数据隔离
- 理解“鉴权之前先把数据访问边界准备好”

---

## Step 1: 扩展 ListPlansFilter

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

找到：

```ts
export type ListPlansFilter = {
  difficulty?: PlanDifficulty;

  page: number;
  pageSize: number;
};
```

新增：

```ts
userId?: string;
```

最终类似：

```ts
export type ListPlansFilter = {
  difficulty?: PlanDifficulty;
  userId?: string;

  page: number;
  pageSize: number;
};
```

学习点：

- `difficulty` 是业务筛选条件。
- `userId` 是数据归属筛选条件。
- 后面有登录以后，`userId` 不应该来自 query，而应该来自登录态。

---

## Step 2: 更新 Prisma repository 的 where

打开：

```text
apps/api/src/modules/plans/plans.prisma-repository.ts
```

现在你大概率会看到类似：

```ts
const where = filter.difficulty ? { difficulty: filter.difficulty } : {};
```

把它改成可以同时支持 `difficulty` 和 `userId`。

提示：

```ts
const where = {
  ...(filter.difficulty ? { difficulty: filter.difficulty } : {}),
  ...(filter.userId ? { userId: filter.userId } : {})
};
```

学习点：

- `...条件 ? 对象 : {}` 是一种常见的“按条件拼对象”写法。
- 如果传了 `difficulty`，where 里就有 difficulty。
- 如果传了 `userId`，where 里就有 userId。
- 如果两个都传了，where 会同时包含两个条件。

---

## Step 3: 让测试能创建第二个用户的数据

打开：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
```

新增一个测试，先准备两个用户：

```ts
it("filters plans by user id", async () => {
  const repository = createPrismaPlanRepository();

  const anotherUser = await prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email: "another@example.com",
      name: "Another User"
    }
  });

  const learningUserPlan = await repository.create({
    title: "Learning user plan",
    difficulty: "easy"
  });

  await prisma.plan.create({
    data: {
      id: crypto.randomUUID(),
      title: "Another user plan",
      description: null,
      status: "active",
      difficulty: "hard",
      userId: anotherUser.id
    }
  });

  const result = await repository.findAll({
    userId: learningUserPlan.userId ?? undefined,
    page: 1,
    pageSize: 10
  });

  expect(result.data.map((plan) => plan.title)).toEqual(["Learning user plan"]);
  expect(result.meta.total).toBe(1);
});
```

学习点：

- `repository.create()` 现在会自动绑定 `learner@example.com`。
- 第二条数据我们直接用 `prisma.plan.create()` 创建，并绑定另一个用户。
- 最后用 `findAll({ userId })` 验证只返回学习用户自己的计划。

---

## Step 4: 让 difficulty 和 userId 可以组合

再新增一个测试：

```ts
it("combines user id and difficulty filters", async () => {
  const repository = createPrismaPlanRepository();

  await repository.create({ title: "Easy owned plan", difficulty: "easy" });
  await repository.create({ title: "Hard owned plan", difficulty: "hard" });

  const learningUser = await prisma.user.findUniqueOrThrow({
    where: { email: "learner@example.com" }
  });

  const result = await repository.findAll({
    userId: learningUser.id,
    difficulty: "easy",
    page: 1,
    pageSize: 10
  });

  expect(result.data.map((plan) => plan.title)).toEqual(["Easy owned plan"]);
  expect(result.meta.total).toBe(1);
});
```

学习点：

- 后端经常需要多个筛选条件同时生效。
- 这里保护的是：`where` 不要因为加了 `userId` 就弄丢 `difficulty`。

---

## Step 5: 跑验证

先跑 repository 测试：

```bash
npm run test -w @learn/api -- tests/unit/plans.prisma-repository.test.ts
```

然后跑完整检查：

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

再重新跑：

```bash
npm run format:check
```

## 完成标准

你完成后告诉我：

```text
userId 查询计划完成了
```

我会帮你：

1. 跑完整验证。
2. 检查 `where` 是否正确组合条件。
3. 补详细中文注释。
4. 带你进入 JWT 登录鉴权阶段。
