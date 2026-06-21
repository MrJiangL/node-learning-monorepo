# Task: GET /plans?page=1&pageSize=10

## 目标

给学习计划列表增加分页能力：

```text
GET /plans?page=1&pageSize=10
```

这次主要学习：

- query 参数默认是字符串
- `z.coerce.number()` 把 query 字符串转成数字
- `.int()` / `.min()` / `.max()` / `.default()`
- API response metadata
- service 如何组织列表结果
- repository 如何做 `slice` 分页
- 继续保持测试隔离

这张任务卡继续对应总计划：

```text
Task 4: Plans API With Zod Validation
```

做完这张任务卡后，我们就可以进入 Prisma + SQLite，把内存数组换成真正的数据库。

## 最终效果

创建 3 条学习计划后：

```bash
curl "http://localhost:3001/plans?page=1&pageSize=2"
```

返回前 2 条数据，并带上分页信息：

```json
{
  "success": true,
  "data": [
    {
      "id": "xxx",
      "title": "Plan 1",
      "description": null,
      "status": "active",
      "difficulty": "medium",
      "createdAt": "2026-05-19T00:00:00.000Z",
      "updatedAt": "2026-05-19T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 2,
    "total": 3,
    "totalPages": 2
  }
}
```

不带分页参数时：

```bash
curl http://localhost:3001/plans
```

使用默认值：

```text
page = 1
pageSize = 10
```

非法分页参数时：

```bash
curl "http://localhost:3001/plans?page=0&pageSize=200"
```

返回 `VALIDATION_ERROR`。

## 涉及文件

你需要修改：

- `packages/shared/src/index.ts`
- `apps/api/src/modules/plans/plans.schema.ts`
- `apps/api/src/modules/plans/plans.repository.ts`
- `apps/api/src/modules/plans/plans.service.ts`
- `apps/api/src/modules/plans/plans.routes.ts`
- `apps/api/tests/integration/plans.test.ts`

---

## Step 1: RED - 写失败测试

打开：

```text
apps/api/tests/integration/plans.test.ts
```

在 `describe("plans API", () => { ... })` 里面追加下面两个测试。

```ts
it("paginates learning plans", async () => {
  const app = createApp();

  await request(app).post("/plans").send({ title: "Plan 1" });
  await request(app).post("/plans").send({ title: "Plan 2" });
  await request(app).post("/plans").send({ title: "Plan 3" });

  const response = await request(app).get("/plans?page=1&pageSize=2");

  expect(response.status).toBe(200);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
    "Plan 1",
    "Plan 2"
  ]);
  expect(response.body.meta).toEqual({
    page: 1,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});

it("returns the requested page of learning plans", async () => {
  const app = createApp();

  await request(app).post("/plans").send({ title: "Plan 1" });
  await request(app).post("/plans").send({ title: "Plan 2" });
  await request(app).post("/plans").send({ title: "Plan 3" });

  const response = await request(app).get("/plans?page=2&pageSize=2");

  expect(response.status).toBe(200);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual(["Plan 3"]);
  expect(response.body.meta).toEqual({
    page: 2,
    pageSize: 2,
    total: 3,
    totalPages: 2
  });
});
```

再追加一个非法 query 测试：

```ts
it("rejects invalid pagination query", async () => {
  const app = createApp();

  const response = await request(app).get("/plans?page=0&pageSize=200");

  expect(response.status).toBe(400);
  expect(response.body).toMatchObject({
    success: false,
    error: {
      code: "VALIDATION_ERROR"
    }
  });
});
```

运行：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

预期结果：

```text
新增的分页测试失败
```

失败是正常的，因为你还没实现分页。

---

## Step 2: 增加共享类型

打开：

```text
packages/shared/src/index.ts
```

新增：

```ts
export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};
```

学习点：

- `PaginationMeta` 是分页说明。
- `PaginatedResult<T>` 是泛型类型。
- `T` 可以是 `Plan`，以后也可以是 `User`、`Course` 或其他资源。
- 共享类型放在 `packages/shared`，以后前端也可以复用。

---

## Step 3: 扩展 query schema

打开：

```text
apps/api/src/modules/plans/plans.schema.ts
```

把 `listPlansQuerySchema` 改成：

```ts
export const listPlansQuerySchema = z.object({
  // difficulty 仍然是可选过滤条件。
  // 不传 difficulty 时，列表返回所有难度。
  difficulty: z.enum(["easy", "medium", "hard"]).optional(),

  // request.query.page 来自 URL，所以原始值是字符串，例如 "1"。
  // z.coerce.number() 会先尝试把 "1" 转成数字 1，再继续执行后面的规则。
  page: z.coerce.number().int().min(1).default(1),

  // pageSize 控制每页数量。
  // max(50) 是一个简单的保护：避免用户一次请求太多数据。
  // 真实项目里这个上限通常由产品和性能一起决定。
  pageSize: z.coerce.number().int().min(1).max(50).default(10)
});
```

学习点：

- `z.number()` 不会接受字符串 `"1"`。
- `z.coerce.number()` 会把字符串 `"1"` 转成数字 `1`。
- `.default(1)` 表示 query 没传时自动补默认值。
- `.min(1)` 可以挡住 `page=0`。
- `.max(50)` 可以挡住 `pageSize=9999`。

---

## Step 4: repository 支持分页

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

先扩展 `ListPlansFilter`：

```ts
export type ListPlansFilter = {
  difficulty?: PlanDifficulty;
  page: number;
  pageSize: number;
};
```

再把 `findAll` 改成返回分页结果。

你可以先把 shared 类型 import 进来：

```ts
import type {
  CreatePlanInput,
  PaginatedResult,
  Plan,
  PlanDifficulty,
  UpdatePlanInput
} from "@learn/shared";
```

然后调整接口：

```ts
findAll(filter: ListPlansFilter): Promise<PaginatedResult<Plan>>;
```

实现参考：

```ts
async findAll(filter) {
  const filteredPlans = filter.difficulty
    ? plans.filter((plan) => plan.difficulty === filter.difficulty)
    : plans;

  // page 从 1 开始，但数组下标从 0 开始。
  // page=1,pageSize=10 => startIndex=0
  // page=2,pageSize=10 => startIndex=10
  const startIndex = (filter.page - 1) * filter.pageSize;
  const endIndex = startIndex + filter.pageSize;

  const pagePlans = filteredPlans.slice(startIndex, endIndex);
  const total = filteredPlans.length;

  return {
    data: [...pagePlans],
    meta: {
      page: filter.page,
      pageSize: filter.pageSize,
      total,
      totalPages: Math.ceil(total / filter.pageSize)
    }
  };
}
```

学习点：

- `slice(start, end)` 不会修改原数组。
- `total` 应该是“过滤后的总数”，不是“当前页数量”。
- `totalPages` 用 `Math.ceil`，因为 3 条数据每页 2 条时需要 2 页。

---

## Step 5: service 跟着改返回类型

打开：

```text
apps/api/src/modules/plans/plans.service.ts
```

`listPlans` 可以继续很薄：

```ts
listPlans(filter: ListPlansFilter) {
  return planRepository.findAll(filter);
}
```

学习点：

- 当前分页规则主要在 repository，因为这里是内存数组分页。
- 等换成 Prisma 时，repository 会把 `page/pageSize` 转成 `skip/take`。
- service 先保持简单，不急着加抽象。

---

## Step 6: route 返回 meta

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

GET `/plans` 里现在大概是：

```ts
const plans = await planService.listPlans(query);
response.json({ success: true, data: plans });
```

改成：

```ts
const result = await planService.listPlans(query);

response.json({
  success: true,
  data: result.data,
  meta: result.meta
});
```

学习点：

- route 负责决定 HTTP response 的形状。
- service/repository 返回的是领域结果。
- API response 里把列表放 `data`，把分页说明放 `meta`，这是很常见的 REST API 结构。

---

## Step 7: 跑验证

先跑当前任务测试：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

如果通过，再跑完整检查：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

如果格式检查失败，运行：

```bash
npm run format
```

然后再跑一次：

```bash
npm run format:check
```

## 完成标准

你完成后告诉我：

```text
分页任务完成了
```

我会帮你：

1. 跑完整测试和类型检查。
2. 看有没有隐藏问题。
3. 给你补详细中文注释。
4. 更新任务索引。
5. 如果都没问题，就带你进入 Prisma 阶段。
