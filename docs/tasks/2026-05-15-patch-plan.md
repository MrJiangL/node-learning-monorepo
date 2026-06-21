# Task: PATCH /plans/:id

## 目标

给学习计划增加更新接口：

```text
PATCH /plans/:id
```

这次主要学习：

- `PATCH` 和 `POST` 的区别
- `request.params.id` 获取 URL 参数
- `request.body` 获取更新内容
- Zod 的 `.partial()` 或手写可选字段 schema
- repository 更新内存数据
- service 处理“找不到资源”的业务错误
- 测试成功场景和 404 场景

## 最终效果

先创建一个 plan：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{"title":"Original title","difficulty":"medium"}'
```

然后更新它：

```bash
curl -X PATCH http://localhost:3001/plans/<plan-id> \
  -H "Content-Type: application/json" \
  -d '{"title":"Updated title","difficulty":"hard"}'
```

成功响应应该包含更新后的数据：

```json
{
  "success": true,
  "data": {
    "id": "<plan-id>",
    "title": "Updated title",
    "difficulty": "hard",
    "status": "active"
  }
}
```

找不到计划时返回：

```json
{
  "success": false,
  "error": {
    "code": "PLAN_NOT_FOUND",
    "message": "Plan was not found"
  }
}
```

## 涉及文件

你需要修改：

- `packages/shared/src/index.ts`
- `apps/api/src/modules/plans/plans.schema.ts`
- `apps/api/src/modules/plans/plans.repository.ts`
- `apps/api/src/modules/plans/plans.service.ts`
- `apps/api/src/modules/plans/plans.routes.ts`
- `apps/api/tests/integration/plans.test.ts`

你不用修改：

- `apps/api/src/app.ts`
- `apps/api/src/middleware/error-handler.ts`
- `apps/api/src/errors/app-error.ts`

这些已经能处理 AppError。

---

## Step 1: RED - 写失败测试

打开：

```text
apps/api/tests/integration/plans.test.ts
```

在 `describe("plans API", () => { ... })` 里面追加下面两个测试。

```ts
it("updates a learning plan by id", async () => {
  const app = createApp();

  // 先创建一条数据。
  // 集成测试应该尽量从用户真实流程出发，而不是直接操作 repository。
  const createResponse = await request(app)
    .post("/plans")
    .send({ title: "Original title", description: "Before update", difficulty: "medium" });

  const planId = createResponse.body.data.id;

  // 再通过 PATCH /plans/:id 更新它。
  // PATCH 的语义是“局部更新”，所以这里不需要传完整 Plan。
  const updateResponse = await request(app)
    .patch(`/plans/${planId}`)
    .send({ title: "Updated title", difficulty: "hard" });

  expect(updateResponse.status).toBe(200);
  expect(updateResponse.body).toMatchObject({
    success: true,
    data: {
      id: planId,
      title: "Updated title",
      description: "Before update",
      difficulty: "hard",
      status: "active"
    }
  });
});

it("returns 404 when updating a missing learning plan", async () => {
  const app = createApp();

  const response = await request(app)
    .patch("/plans/missing-plan-id")
    .send({ title: "This should not exist" });

  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    success: false,
    error: {
      code: "PLAN_NOT_FOUND",
      message: "Plan was not found"
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
新增的 PATCH 测试失败
```

失败是正常的，因为你还没有实现 `PATCH /plans/:id`。

---

## Step 2: 共享类型增加 UpdatePlanInput

打开：

```text
packages/shared/src/index.ts
```

增加一个输入类型：

```ts
export type UpdatePlanInput = {
  title?: string;
  description?: string;
  difficulty?: PlanDifficulty;
};
```

学习点：

- `CreatePlanInput` 代表创建时的输入。
- `UpdatePlanInput` 代表更新时的输入。
- 更新接口通常允许只传部分字段，所以字段大多是可选的。

注意：这里不允许更新 `id`、`status`、`createdAt`、`updatedAt`。这些字段由服务端控制。

---

## Step 3: Zod 增加 updatePlanSchema

打开：

```text
apps/api/src/modules/plans/plans.schema.ts
```

新增 schema：

```ts
export const updatePlanSchema = z.object({
  // PATCH 是局部更新，所以 title 可以不传。
  // 但如果传了，它仍然不能是空字符串。
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less")
    .optional(),

  // description 也可以不传。
  // 如果传了，最多 1000 个字符。
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  // difficulty 只能是固定枚举值。
  // 这里不要 default，因为 PATCH 不传 difficulty 时应该保持原值，而不是强行改成 medium。
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});
```

学习点：

- 创建接口可以有默认值，例如 `difficulty.default("medium")`。
- 更新接口通常不要乱加默认值，因为“不传”表示“不更新这个字段”。
- `.optional()` 表示这个字段可以不存在。

---

## Step 4: repository 增加 update

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

先改 import：

```ts
import type { CreatePlanInput, Plan, UpdatePlanInput } from "@learn/shared";
```

再改接口：

```ts
export type PlanRepository = {
  create(input: CreatePlanInput): Promise<Plan>;
  findAll(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
  update(id: string, input: UpdatePlanInput): Promise<Plan | null>;
};
```

然后在内存 repository 里增加 `update`：

```ts
async update(id, input) {
  const existingPlan = plans.find((plan) => plan.id === id);

  if (!existingPlan) {
    return null;
  }

  const updatedPlan: Plan = {
    ...existingPlan,

    // `??` 表示只有 input.title 是 null 或 undefined 时才保留原值。
    // 这里不要用 `||`，因为空字符串已经在 Zod 层被拦住了。
    title: input.title ?? existingPlan.title,
    description: input.description ?? existingPlan.description,
    difficulty: input.difficulty ?? existingPlan.difficulty,

    // 更新成功后刷新 updatedAt。
    // createdAt 不应该改，因为它表示最初创建时间。
    updatedAt: new Date().toISOString()
  };

  plans = plans.map((plan) => (plan.id === id ? updatedPlan : plan));

  return updatedPlan;
}
```

学习点：

- repository 不抛 404，它只返回 `Plan | null`。
- 业务错误由 service 决定。
- `plans.map(...)` 是不可变更新，不直接修改原数组里的对象。

---

## Step 5: service 增加 updatePlan

打开：

```text
apps/api/src/modules/plans/plans.service.ts
```

先改 import：

```ts
import type { CreatePlanInput, UpdatePlanInput } from "@learn/shared";
```

然后在 service 返回对象里增加：

```ts
async updatePlan(id: string, input: UpdatePlanInput) {
  const plan = await planRepository.update(id, input);

  if (!plan) {
    throw new AppError(404, "PLAN_NOT_FOUND", "Plan was not found");
  }

  return plan;
}
```

学习点：

- service 负责把 repository 的 `null` 转换成业务错误。
- route 不需要知道“找不到时怎么构造错误”，它只调用 service。

---

## Step 6: route 增加 PATCH /:id

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

先改 import：

```ts
import { createPlanSchema, updatePlanSchema } from "./plans.schema.js";
```

然后增加路由：

```ts
plansRouter.patch(
  "/:id",
  asyncHandler(async (request, response) => {
    try {
      // request.params.id 来自 URL 里的 :id。
      // request.body 是用户要更新的字段。
      const input = updatePlanSchema.parse(request.body);
      const plan = await planService.updatePlan(request.params.id, input);

      response.json({ success: true, data: plan });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          error.issues[0]?.message ?? "Invalid request body"
        );
      }

      throw error;
    }
  })
);
```

学习点：

- `PATCH /:id` 和 `GET /:id` 都用 `request.params.id`。
- `PATCH` 还需要解析 `request.body`。
- ZodError 仍然在 route 层转换成 `VALIDATION_ERROR`。

---

## Step 7: 验证

先跑本功能相关测试：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

如果通过，再跑全量：

```bash
npm run format
npm run format:check
npm run test
npm run typecheck
npm run build
```

完成标准：

```text
plans.test.ts 通过
format:check 通过
test 通过
typecheck 通过
build 通过
```

## 自查清单

完成后你自己先检查：

- `PATCH /plans/:id` 能更新 title。
- `PATCH /plans/:id` 能更新 difficulty。
- 不传 description 时，原 description 保留。
- 找不到 id 时返回 `PLAN_NOT_FOUND`。
- `updatePlanSchema` 没有给 difficulty 设置 default。
- repository 用 `map` 返回新数组，没有直接改原对象。
- service 里把 `null` 转成了 `AppError`。

## 完成后告诉我

你完成后告诉我：

```text
PATCH 任务完成了
```

然后我会：

1. 跑测试、类型检查、格式检查、构建。
2. 如果失败，告诉你具体是哪一层的问题。
3. 如果通过，帮你给关键实现补充学习型中文注释。
