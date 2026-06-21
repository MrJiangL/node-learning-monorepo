# Task: Protect Plans With Current User

## 目标

上一张任务你已经完成了：

```text
requireAuth
GET /auth/me
```

现在我们要把鉴权接到计划 API 上，让用户只能看到和操作自己的计划。

这张任务是权限边界的关键一步：

- 未登录用户不能访问 `/plans`
- 登录用户创建计划时，计划要属于当前用户
- 登录用户列表查询时，只能看到自己的计划
- 登录用户不能查看、修改、删除别人的计划

这次主要学习：

- 鉴权 authentication 和授权 authorization 的区别
- 为什么 `userId` 不能从客户端 body 传
- service 层如何接收 currentUserId
- repository 层如何用 `userId` 做数据隔离
- 如何写“两个用户互相隔离”的测试

---

## Step 1: 改造 repository.create

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

把 `PlanRepository.create` 从：

```ts
create(input: CreatePlanInput): Promise<Plan>;
```

改成：

```ts
create(input: CreatePlanInput, userId: string): Promise<Plan>;
```

然后把内存 repository 的 create 也改成：

```ts
async create(input, userId) {
  const now = new Date().toISOString();

  const plan: Plan = {
    id: crypto.randomUUID(),
    title: input.title,
    description: input.description ?? null,
    status: "active",
    difficulty: input?.difficulty ?? "medium",
    createdAt: now,
    updatedAt: now,

    // 计划现在必须属于某个用户。
    // 这个 userId 后面来自 req.user.id，而不是客户端自己传。
    userId
  };

  plans = [...plans, plan];
  return plan;
}
```

学习点：

- 创建计划时，`userId` 是服务端上下文，不是用户输入。
- 用户不能通过 body 传 `userId` 来冒充别人。

---

## Step 2: 改造 Prisma repository.create

打开：

```text
apps/api/src/modules/plans/plans.prisma-repository.ts
```

把 create 改成：

```ts
async create(input: CreatePlanInput, userId: string): Promise<Plan> {
  const plan = await prisma.plan.create({
    data: {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? null,
      status: "active",
      difficulty: input.difficulty ?? "medium",

      // 这里直接使用当前登录用户 id。
      // 之前的临时学习用户逻辑可以删掉了。
      userId
    }
  });

  return mapPrismaPlanToPlan(plan);
}
```

学习点：

- 这一张任务会删除 `LEARNING_USER_EMAIL` 和 `upsert` 临时用户。
- 计划归属从“固定学习用户”变成“当前登录用户”。

---

## Step 3: 改造 service 方法参数

打开：

```text
apps/api/src/modules/plans/plans.service.ts
```

你会看到类似：

```ts
async createPlan(input: CreatePlanInput) {
  return planRepository.create(input);
}
```

把它改成：

```ts
async createPlan(input: CreatePlanInput, currentUserId: string) {
  // service 不直接相信客户端传来的 userId。
  // currentUserId 来自 requireAuth 解析出来的 req.user.id。
  return planRepository.create(input, currentUserId);
}
```

然后把 list 也改成接收 currentUserId：

```ts
async listPlans(filter: ListPlansFilter, currentUserId: string) {
  // 无论 query 里传了什么，当前用户只能查询自己的计划。
  return planRepository.findAll({
    ...filter,
    userId: currentUserId
  });
}
```

再把 `getPlanById / updatePlan / deletePlan` 也加上 `currentUserId`。

示例：

```ts
async getPlanById(id: string, currentUserId: string) {
  const plan = await planRepository.findById(id);

  if (!plan || plan.userId !== currentUserId) {
    throw new AppError(404, "PLAN_NOT_FOUND", "Plan was not found");
  }

  return plan;
}
```

学习点：

- 对“别人的计划”返回 404，而不是 403。
- 这样外部用户不能通过 id 猜测“这条计划是否存在”。

---

## Step 4: 给 plans routes 加 requireAuth

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

新增 import：

```ts
import { requireAuth } from "../../middleware/require-auth.js";
```

然后在 router 上统一使用：

```ts
router.use(requireAuth);
```

建议放在所有 `/plans` 子路由之前：

```ts
export function createPlansRouter() {
  const router = Router();
  const planService = createPlanService(createPrismaPlanRepository());

  // 这个 router 被 app.ts 挂载到 /plans。
  // 所以这里的 router.use(requireAuth) 会保护所有 /plans 路由。
  //
  // 例如：
  // - GET /plans
  // - POST /plans
  // - GET /plans/:id
  router.use(requireAuth);

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const query = listPlansQuerySchema.parse(req.query);

      const result = await planService.listPlans(query, req.user!.id);

      res.json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    })
  );

  return router;
}
```

学习点：

- `req.user!` 的 `!` 是告诉 TypeScript：这里一定有 user。
- 因为上面已经 `router.use(requireAuth)`，能执行到这里就说明登录通过了。
- 真实项目也可以写 helper 函数避免到处使用 `!`。

---

## Step 5: 修改 plans 集成测试的准备方式

打开：

```text
apps/api/tests/integration/plans.test.ts
```

以前测试可以直接：

```ts
const app = createApp();
await request(app).post("/plans").send(...)
```

现在 `/plans` 需要 token，所以建议先写一个测试 helper：

```ts
async function registerAndLogin(app: ReturnType<typeof createApp>, email: string) {
  await request(app).post("/auth/register").send({
    email,
    password: "password123",
    name: "Plan Owner"
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email,
    password: "password123"
  });

  return {
    token: loginResponse.body.data.token as string,
    user: loginResponse.body.data.user as { id: string; email: string }
  };
}
```

然后请求 `/plans` 时加 header：

```ts
const auth = await registerAndLogin(app, "owner@example.com");

const response = await request(app)
  .post("/plans")
  .set("Authorization", `Bearer ${auth.token}`)
  .send({ title: "Private plan", difficulty: "easy" });
```

学习点：

- 测试受保护接口时，必须先准备登录态。
- 这里不 mock `requireAuth`，而是走真实注册登录流程，更接近用户真实行为。

---

## Step 6: 新增权限边界测试

在 `plans.test.ts` 里新增两个重点测试。

第一个：未登录不能访问计划列表。

```ts
it("rejects listing plans without authentication", async () => {
  const app = createApp();

  const response = await request(app).get("/plans");

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("AUTH_REQUIRED");
});
```

第二个：用户看不到别人的计划。

```ts
it("only lists plans owned by the current user", async () => {
  const app = createApp();

  const ownerA = await registerAndLogin(app, "owner-a@example.com");
  const ownerB = await registerAndLogin(app, "owner-b@example.com");

  await request(app)
    .post("/plans")
    .set("Authorization", `Bearer ${ownerA.token}`)
    .send({ title: "Owner A plan", difficulty: "easy" });

  await request(app)
    .post("/plans")
    .set("Authorization", `Bearer ${ownerB.token}`)
    .send({ title: "Owner B plan", difficulty: "hard" });

  const response = await request(app).get("/plans").set("Authorization", `Bearer ${ownerA.token}`);

  expect(response.status).toBe(200);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual(["Owner A plan"]);
});
```

第三个：用户不能读取别人的单条计划。

```ts
it("returns 404 when reading another user's plan", async () => {
  const app = createApp();

  const ownerA = await registerAndLogin(app, "reader-a@example.com");
  const ownerB = await registerAndLogin(app, "reader-b@example.com");

  const createResponse = await request(app)
    .post("/plans")
    .set("Authorization", `Bearer ${ownerB.token}`)
    .send({ title: "Owner B private plan" });

  const planId = createResponse.body.data.id;

  const response = await request(app)
    .get(`/plans/${planId}`)
    .set("Authorization", `Bearer ${ownerA.token}`);

  expect(response.status).toBe(404);
  expect(response.body.error.code).toBe("PLAN_NOT_FOUND");
});
```

学习点：

- 这类测试不是测“功能能不能用”，而是测“越权能不能被挡住”。
- 权限测试是后端非常重要的测试。

---

## Step 7: 跑验证

先跑计划 API 测试：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
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

再重新跑：

```bash
npm run format:check
```

## 完成标准

你完成后告诉我：

```text
计划 API 权限边界完成了
```

我会帮你：

1. 跑完整验证。
2. 检查是否还有越权漏洞。
3. 补充或调整学习注释。
4. 带你整理 API 示例文档和手动 curl 流程。
