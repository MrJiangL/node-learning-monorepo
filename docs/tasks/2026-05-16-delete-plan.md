# Task: DELETE /plans/:id

## 目标

给学习计划增加删除接口：

```text
DELETE /plans/:id
```

这次主要学习：

- `DELETE` 的 REST 语义
- `204 No Content` 状态码
- 删除资源时为什么通常不返回 body
- repository 如何删除内存数据
- service 如何把 `false` 翻译成业务 404
- 测试删除成功和删除不存在两种场景

这张任务卡继续对应总计划：

```text
Task 4: Plans API With Zod Validation
```

它是进入 Prisma 前的 REST API 基础练习之一。

## 最终效果

先创建一条计划：

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{"title":"Plan to delete","difficulty":"easy"}'
```

然后删除它：

```bash
curl -i -X DELETE http://localhost:3001/plans/<plan-id>
```

成功时应该返回：

```text
HTTP/1.1 204 No Content
```

注意：`204` 响应不应该有 JSON body。

再次查询这条计划：

```bash
curl http://localhost:3001/plans/<plan-id>
```

应该返回：

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

- `apps/api/src/modules/plans/plans.repository.ts`
- `apps/api/src/modules/plans/plans.service.ts`
- `apps/api/src/modules/plans/plans.routes.ts`
- `apps/api/tests/integration/plans.test.ts`

这次通常不需要修改：

- `packages/shared/src/index.ts`
- `apps/api/src/modules/plans/plans.schema.ts`

原因：

- 删除接口不需要请求 body。
- 删除接口只需要 URL 里的 `:id`。
- 现有 `Plan` 类型不需要新增字段。

---

## Step 1: RED - 写失败测试

打开：

```text
apps/api/tests/integration/plans.test.ts
```

在 `describe("plans API", () => { ... })` 里面追加下面两个测试。

```ts
it("deletes a learning plan by id", async () => {
  const app = createApp();

  // 先创建一条计划。
  // 集成测试从 HTTP API 入口开始，更贴近用户真实使用方式。
  const createResponse = await request(app)
    .post("/plans")
    .send({ title: "Plan to delete", difficulty: "easy" });

  const planId = createResponse.body.data.id;

  // DELETE 成功时使用 204。
  // 204 的意思是“请求成功了，但响应里没有内容”。
  const deleteResponse = await request(app).delete(`/plans/${planId}`);

  expect(deleteResponse.status).toBe(204);
  expect(deleteResponse.text).toBe("");

  // 删除后再查同一个 id，应该变成业务 404。
  const getResponse = await request(app).get(`/plans/${planId}`);

  expect(getResponse.status).toBe(404);
  expect(getResponse.body).toEqual({
    success: false,
    error: {
      code: "PLAN_NOT_FOUND",
      message: "Plan was not found"
    }
  });
});

it("returns 404 when deleting a missing learning plan", async () => {
  const app = createApp();

  const response = await request(app).delete("/plans/missing-plan-id");

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
新增的 DELETE 测试失败
```

失败是正常的，因为你还没有实现 `DELETE /plans/:id`。

---

## Step 2: repository 增加 delete

打开：

```text
apps/api/src/modules/plans/plans.repository.ts
```

先给 `PlanRepository` 增加方法：

```ts
delete(id: string): Promise<boolean>;
```

接口最终应该包含：

```ts
export type PlanRepository = {
  create(input: CreatePlanInput): Promise<Plan>;
  findAll(): Promise<Plan[]>;
  findById(id: string): Promise<Plan | null>;
  update(id: string, input: UpdatePlanInput): Promise<Plan | null>;
  delete(id: string): Promise<boolean>;
};
```

然后在 `createInMemoryPlanRepository()` 返回对象里增加：

```ts
async delete(id: string) {
  const planExists = plans.some((plan) => plan.id === id);

  if (!planExists) {
    return false;
  }

  // filter 会创建一个新数组，保留所有 id 不匹配的计划。
  // 这是一种不可变删除方式，不直接修改原数组。
  plans = plans.filter((plan) => plan.id !== id);

  return true;
}
```

学习点：

- repository 不关心 HTTP 状态码。
- 删除成功返回 `true`。
- 找不到要删除的数据返回 `false`。
- service 再决定 `false` 应该变成什么业务错误。

---

## Step 3: service 增加 deletePlan

打开：

```text
apps/api/src/modules/plans/plans.service.ts
```

在 service 返回对象里增加：

```ts
async deletePlan(id: string) {
  const deleted = await planRepository.delete(id);

  if (!deleted) {
    throw new AppError(404, "PLAN_NOT_FOUND", "Plan was not found");
  }
}
```

学习点：

- 这里没有返回 plan，因为删除成功后客户端不一定需要旧数据。
- 找不到资源仍然复用 `PLAN_NOT_FOUND`。
- service 继续负责把 repository 的结果翻译成业务语义。

---

## Step 4: route 增加 DELETE /:id

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

增加路由：

```ts
plansRouter.delete(
  "/:id",
  asyncHandler(async (request, response) => {
    await planService.deletePlan(request.params.id as string);

    // 204 表示成功但没有响应内容。
    // 注意：不要写 response.json(...)，否则语义就不是 No Content 了。
    response.status(204).send();
  })
);
```

学习点：

- `DELETE /plans/:id` 和 `GET /plans/:id` 一样，都从 `request.params.id` 取 id。
- 删除成功用 `204` 很常见。
- `204` 不返回 body，所以用 `.send()` 结束响应。

---

## Step 5: 验证

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

- `DELETE /plans/:id` 删除存在的计划时返回 204。
- 204 响应没有 JSON body。
- 删除后再 `GET /plans/:id` 返回 `PLAN_NOT_FOUND`。
- 删除不存在的计划返回 `PLAN_NOT_FOUND`。
- repository 用 `filter` 做不可变删除。
- service 把 `false` 转成 `AppError`。
- route 没有在 204 时返回 JSON。

## 完成后告诉我

你完成后告诉我：

```text
DELETE 任务完成了
```

然后我会：

1. 跑 plans 相关测试。
2. 跑全量测试、类型检查、格式检查和构建。
3. 如果失败，告诉你是哪一层的问题。
4. 如果通过，帮你给关键实现补学习型中文注释。
5. 更新任务索引，并给你下一张任务卡。
