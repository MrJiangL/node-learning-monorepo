# Task: Replace Memory Repository With Prisma Repository

## 目标

把 `GET /plans`、`POST /plans`、`PATCH /plans/:id`、`DELETE /plans/:id` 背后的存储，从内存数组换成 SQLite 数据库。

这次主要学习：

- repository 接口为什么有价值
- Prisma model 和 API type 之间为什么需要 mapper
- `findMany` / `findUnique` / `create` / `update` / `delete`
- `skip` / `take` 如何实现分页
- 数据库返回 `Date`，API 返回 string
- 测试里为什么要清理数据库

这张任务卡对应总计划：

```text
Task 5: Prisma Persistence With SQLite
```

## 最终效果

启动 API 后，用 curl 创建计划：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{"title":"Learn Prisma","difficulty":"easy"}'
```

重启服务后，再请求：

```bash
curl http://localhost:3001/plans
```

这条计划仍然存在。也就是说，数据已经不再只存在内存里。

## 涉及文件

你需要新增：

- `apps/api/src/modules/plans/plans.mapper.ts`
- `apps/api/src/modules/plans/plans.prisma-repository.ts`

你需要修改：

- `apps/api/src/app.ts`
- `apps/api/src/modules/plans/plans.routes.ts`
- `apps/api/tests/integration/plans.test.ts`

尽量不要修改：

- `packages/shared/src/index.ts`
- `prisma/schema.prisma`

原因：这张任务重点是替换数据访问层，不是改 API 数据结构。

---

## Step 1: RED - 让测试先暴露“持久化需求”

打开：

```text
apps/api/tests/integration/plans.test.ts
```

先在文件顶部引入 Prisma：

```ts
import { prisma } from "../../src/db/prisma.js";
```

然后在 `describe("plans API", () => { ... })` 里面加：

```ts
beforeEach(async () => {
  await prisma.plan.deleteMany();
});
```

学习点：

- 以前每个 `createApp()` 都有新的内存数组，所以测试天然隔离。
- 换成数据库后，数据会留在 SQLite 文件里。
- 所以每个测试前要清空 `Plan` 表，避免测试互相污染。

运行：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

如果你还没把 route 接到 Prisma，这一步可能仍然通过。没关系，先继续实现。

---

## Step 2: 新增 mapper

新增文件：

```text
apps/api/src/modules/plans/plans.mapper.ts
```

写入：

```ts
import type { Plan as PrismaPlan } from "@prisma/client";
import type { Plan } from "@learn/shared";

export function mapPrismaPlanToPlan(plan: PrismaPlan): Plan {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    status: plan.status as Plan["status"],
    difficulty: plan.difficulty as Plan["difficulty"],
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  };
}
```

学习点：

- Prisma 里的 `createdAt` / `updatedAt` 是 `Date`。
- HTTP API 返回 JSON 时，更适合返回 ISO string。
- mapper 专门负责“数据库模型 -> API 模型”的转换。

---

## Step 3: 新增 Prisma repository

新增文件：

```text
apps/api/src/modules/plans/plans.prisma-repository.ts
```

先写骨架：

```ts
import type { CreatePlanInput, Plan, UpdatePlanInput } from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import type { ListPlansFilter, PlanRepository } from "./plans.repository.js";
import { mapPrismaPlanToPlan } from "./plans.mapper.js";

export function createPrismaPlanRepository(): PlanRepository {
  return {
    async create(input: CreatePlanInput): Promise<Plan> {
      // TODO: 你来实现
    },

    async findAll(filter: ListPlansFilter) {
      // TODO: 你来实现
    },

    async findById(id: string): Promise<Plan | null> {
      // TODO: 你来实现
    },

    async update(id: string, input: UpdatePlanInput): Promise<Plan | null> {
      // TODO: 你来实现
    },

    async delete(id: string): Promise<boolean> {
      // TODO: 你来实现
    }
  };
}
```

提示：

- `create` 用 `prisma.plan.create`
- `findAll` 用 `prisma.plan.findMany` 和 `prisma.plan.count`
- `findById` 用 `prisma.plan.findUnique`
- `update` 先查是否存在，再 `prisma.plan.update`
- `delete` 先查是否存在，再 `prisma.plan.delete`

---

## Step 4: 实现 create

参考：

```ts
const plan = await prisma.plan.create({
  data: {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? null,
    status: "active",
    difficulty: input.difficulty ?? "medium"
  }
});

return mapPrismaPlanToPlan(plan);
```

学习点：

- id 仍然由后端生成。
- status 仍然由后端默认成 `"active"`。
- difficulty 不传时仍然默认 `"medium"`。

---

## Step 5: 实现 findAll

参考思路：

```ts
const where = filter.difficulty ? { difficulty: filter.difficulty } : {};
const skip = (filter.page - 1) * filter.pageSize;

const [plans, total] = await Promise.all([
  prisma.plan.findMany({
    where,
    skip,
    take: filter.pageSize,
    orderBy: { createdAt: "asc" }
  }),
  prisma.plan.count({ where })
]);
```

返回：

```ts
return {
  data: plans.map(mapPrismaPlanToPlan),
  meta: {
    page: filter.page,
    pageSize: filter.pageSize,
    total,
    totalPages: Math.ceil(total / filter.pageSize)
  }
};
```

学习点：

- `skip` 表示跳过多少条。
- `take` 表示拿多少条。
- `count` 用来计算总数。
- `orderBy` 很重要，不然数据库不保证返回顺序稳定，分页测试会不稳定。

---

## Step 6: 实现 findById / update / delete

这三个方法你先自己写。

注意：

- `findById` 找不到时返回 `null`。
- `update` 找不到时返回 `null`，不要在 repository 里抛 404。
- `delete` 找不到时返回 `false`，删除成功返回 `true`。
- HTTP 404 仍然由 service 负责转换。

---

## Step 7: 接入 routes

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

把原来的：

```ts
createPlanService(createInMemoryPlanRepository());
```

换成：

```ts
createPlanService(createPrismaPlanRepository());
```

学习点：

- route/service 基本不用变。
- 这就是 repository 接口的价值：上层只依赖接口，不依赖具体存储。

---

## Step 8: 跑验证

运行：

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api -- --name create_plan
npm run test -w @learn/api -- tests/integration/plans.test.ts
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
Prisma repository 完成了
```

我会帮你：

1. 跑完整验证。
2. 检查数据库查询是否正确。
3. 补详细中文注释。
4. 继续出下一张任务卡。
