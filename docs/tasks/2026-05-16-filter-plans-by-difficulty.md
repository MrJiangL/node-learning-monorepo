# Task: GET /plans?difficulty=easy

## 目标

给学习计划列表增加按难度过滤的能力：

```text
GET /plans?difficulty=easy
```

这次主要学习：

- `request.query` 获取查询参数
- query 参数默认都是字符串
- Zod 校验 query 参数
- `z.enum(...).optional()`
- repository 如何过滤列表
- 无效 query 返回 `VALIDATION_ERROR`

这张任务卡继续对应总计划：

```text
Task 4: Plans API With Zod Validation
```

做完这张任务卡后，再做分页，就可以准备进入 Prisma 阶段。

## 最终效果

创建三条不同难度的计划后：

```bash
curl http://localhost:3001/plans?difficulty=easy
```

只返回 `difficulty` 为 `"easy"` 的计划。

不带 query 时：

```bash
curl http://localhost:3001/plans
```

仍然返回全部计划。

传非法 difficulty 时：

```bash
curl http://localhost:3001/plans?difficulty=impossible
```

返回：

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid enum value..."
  }
}
```

错误 message 不要求你和上面完全一致，测试只检查 `VALIDATION_ERROR`。

## 涉及文件

你需要修改：

- `apps/api/src/modules/plans/plans.schema.ts`
- `apps/api/src/modules/plans/plans.repository.ts`
- `apps/api/src/modules/plans/plans.service.ts`
- `apps/api/src/modules/plans/plans.routes.ts`
- `apps/api/tests/integration/plans.test.ts`

通常不需要修改：

- `packages/shared/src/index.ts`

原因：`PlanDifficulty` 已经存在，可以直接复用。

---

## Step 1: RED - 写失败测试

打开：

```text
apps/api/tests/integration/plans.test.ts
```

在 `describe("plans API", () => { ... })` 里面追加下面两个测试。

```ts
it("filters learning plans by difficulty", async () => {
  const app = createApp();

  await request(app).post("/plans").send({ title: "Easy plan", difficulty: "easy" });
  await request(app).post("/plans").send({ title: "Hard plan", difficulty: "hard" });
  await request(app).post("/plans").send({ title: "Another easy plan", difficulty: "easy" });

  const response = await request(app).get("/plans?difficulty=easy");

  expect(response.status).toBe(200);
  expect(response.body.data).toHaveLength(2);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual([
    "Easy plan",
    "Another easy plan"
  ]);
  expect(
    response.body.data.every((plan: { difficulty: string }) => plan.difficulty === "easy")
  ).toBe(true);
});

it("rejects invalid difficulty filters", async () => {
  const app = createApp();

  const response = await request(app).get("/plans?difficulty=impossible");

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
新增的 filter 测试失败
```

失败是正常的，因为你还没有实现 query 过滤。

---

## Step 2: 新增 listPlansQuerySchema

打开：

```text
apps/api/src/modules/plans/plans.schema.ts
```

新增：

```ts
export const listPlansQuerySchema = z.object({
  // request.query 里的 difficulty 可能不存在。
  // 如果存在，它只能是 easy / medium / hard。
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});
```

学习点：

- `request.query` 来自 URL 问号后面的参数。
- `/plans?difficulty=easy` 里的 `difficulty` 是字符串 `"easy"`。
- `.optional()` 表示不带这个 query 也合法。

---

## Step 3: repository 支持 findAll filter

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

先改 import：

```ts
import type { CreatePlanInput, Plan, PlanDifficulty, UpdatePlanInput } from "@learn/shared";
```

新增一个查询类型：

```ts
export type ListPlansFilter = {
  difficulty?: PlanDifficulty;
};
```

把接口里的 `findAll()` 改成：

```ts
findAll(filter?: ListPlansFilter): Promise<Plan[]>;
```

把实现改成：

```ts
async findAll(filter = {}) {
  const filteredPlans = filter.difficulty
    ? plans.filter((plan) => plan.difficulty === filter.difficulty)
    : plans;

  // 仍然返回新数组，避免暴露内部 plans。
  return [...filteredPlans];
}
```

学习点：

- repository 负责数据筛选。
- service/route 不直接操作数组。
- 即使过滤后也返回新数组，保持“不暴露内部状态”的习惯。

---

## Step 4: service 支持 listPlans filter

打开：

```text
apps/api/src/modules/plans/plans.service.ts
```

先改 import：

```ts
import type { ListPlansFilter, PlanRepository } from "./plans.repository.js";
```

把：

```ts
listPlans() {
  return planRepository.findAll();
}
```

改成：

```ts
listPlans(filter?: ListPlansFilter) {
  return planRepository.findAll(filter);
}
```

学习点：

- service 暂时不做额外业务规则，只把 filter 传给 repository。
- 但保留 service 这一层，将来可以加“只能看自己的计划”等规则。

---

## Step 5: route 解析 query

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

先改 schema import：

```ts
import { createPlanSchema, listPlansQuerySchema, updatePlanSchema } from "./plans.schema.js";
```

把 `GET /plans` 改成：

```ts
plansRouter.get(
  "/",
  asyncHandler(async (request, response) => {
    try {
      // request.query 里的值来自 URL 查询字符串。
      // 例如 /plans?difficulty=easy 会得到 { difficulty: "easy" }。
      const query = listPlansQuerySchema.parse(request.query);
      const plans = await planService.listPlans(query);

      response.json({ success: true, data: plans });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          error.issues[0]?.message ?? "Invalid query string"
        );
      }

      throw error;
    }
  })
);
```

学习点：

- body 用 schema 校验，query 也要用 schema 校验。
- `GET` 请求没有 body，但可以有 query string。
- 非法 query 也属于用户输入错误，返回 400。

---

## Step 6: 验证

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

- 不带 query 的 `GET /plans` 仍然返回全部计划。
- `GET /plans?difficulty=easy` 只返回 easy 计划。
- `GET /plans?difficulty=hard` 只返回 hard 计划。
- 非法 difficulty 返回 `VALIDATION_ERROR`。
- query 校验写在 route 层。
- 数据筛选写在 repository 层。
- service 没有直接操作数组。

## 完成后告诉我

你完成后告诉我：

```text
filter 任务完成了
```

然后我会：

1. 跑 plans 相关测试。
2. 跑全量测试、类型检查、格式检查和构建。
3. 如果失败，告诉你是哪一层的问题。
4. 如果通过，帮你给关键实现补学习型中文注释。
5. 更新任务索引，并给你下一张任务卡。
