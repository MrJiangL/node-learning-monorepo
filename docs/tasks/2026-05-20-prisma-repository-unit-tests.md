# Task: Prisma Repository Unit Tests

## 目标

给 `createPrismaPlanRepository()` 补一组更贴近数据层的测试。

上一张任务我们已经通过 API 集成测试证明 Prisma repository 能跑通。  
这张任务专门练 repository 层，让你更熟悉 Prisma 的返回值、分页、找不到数据时的约定。

注意：如果你本地已经切到 MySQL，请先完成：

```text
docs/tasks/2026-05-21-switch-prisma-from-sqlite-to-mysql.md
```

再做这张 repository 单元测试任务。

这次主要学习：

- repository 测试和 API 集成测试的区别
- 如何在测试前清理数据库
- 直接测试 `createPrismaPlanRepository()`
- 验证 `findAll` 的 `data/meta`
- 验证 `update/delete` 找不到时不抛错，而是返回 `null/false`

## 最终效果

新增测试文件：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
```

运行：

```bash
npm run test -w @learn/api -- tests/unit/plans.prisma-repository.test.ts
```

应该通过。

---

## Step 1: 创建测试文件

新增：

```text
apps/api/tests/unit/plans.prisma-repository.test.ts
```

先写基础结构：

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaPlanRepository } from "../../src/modules/plans/plans.prisma-repository.js";

describe("prisma plan repository", () => {
  beforeEach(async () => {
    await prisma.plan.deleteMany();
  });

  it("creates and finds a plan by id", async () => {
    const repository = createPrismaPlanRepository();

    const createdPlan = await repository.create({
      title: "Repository test",
      difficulty: "easy"
    });

    const foundPlan = await repository.findById(createdPlan.id);

    expect(foundPlan).toMatchObject({
      id: createdPlan.id,
      title: "Repository test",
      difficulty: "easy",
      status: "active"
    });
  });
});
```

学习点：

- 这次不通过 HTTP 请求测试，而是直接调用 repository。
- 这样能更聚焦地测试数据访问层。

---

## Step 2: 测试 findAll 分页

继续追加：

```ts
it("paginates plans", async () => {
  const repository = createPrismaPlanRepository();

  await repository.create({ title: "Plan 1" });
  await repository.create({ title: "Plan 2" });
  await repository.create({ title: "Plan 3" });

  const result = await repository.findAll({
    page: 2,
    pageSize: 2
  });

  expect(result.data.map((plan) => plan.title)).toEqual(["Plan 3"]);
  expect(result.meta).toEqual({
    page: 2,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});
```

学习点：

- 这里直接验证 repository 返回的 `PaginatedResult<Plan>`。
- 不需要关心 HTTP status，也不需要关心 Express。

---

## Step 3: 测试 difficulty filter

继续追加：

```ts
it("filters plans by difficulty", async () => {
  const repository = createPrismaPlanRepository();

  await repository.create({ title: "Easy plan", difficulty: "easy" });
  await repository.create({ title: "Hard plan", difficulty: "hard" });
  await repository.create({ title: "Another easy plan", difficulty: "easy" });

  const result = await repository.findAll({
    difficulty: "easy",
    page: 1,
    pageSize: 10
  });

  expect(result.data.map((plan) => plan.title)).toEqual(["Easy plan", "Another easy plan"]);
  expect(result.meta.total).toBe(2);
});
```

学习点：

- `where` 条件和 `count` 必须使用同一套过滤条件。
- 否则 `data` 和 `meta.total` 会不一致。

---

## Step 4: 测试 update 找不到

继续追加：

```ts
it("returns null when updating a missing plan", async () => {
  const repository = createPrismaPlanRepository();

  const result = await repository.update("missing-id", {
    title: "No one"
  });

  expect(result).toBeNull();
});
```

学习点：

- Prisma 原生 `update` 找不到会抛错。
- 我们的 repository 接口约定是返回 `null`。
- 这类测试能保护 repository 的接口语义。

---

## Step 5: 测试 delete 找不到

继续追加：

```ts
it("returns false when deleting a missing plan", async () => {
  const repository = createPrismaPlanRepository();

  const result = await repository.delete("missing-id");

  expect(result).toBe(false);
});
```

学习点：

- repository 不应该知道 HTTP 404。
- 它只返回数据层语义：有没有删掉。
- service 再把 `false` 翻译成业务错误。

---

## Step 6: 跑验证

先跑这张任务的测试：

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
Prisma repository 测试完成了
```

我会帮你：

1. 跑完整验证。
2. 检查测试是否真的覆盖 repository 语义。
3. 补详细中文注释。
4. 带你进入“用户和计划的数据库关系”。
