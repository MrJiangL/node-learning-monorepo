# Task: Write Plans Auth Boundary Tests

## 目标

上一张任务你已经把 `/plans` 接到了当前登录用户上。

这张任务不急着继续加新功能，先专门练一件非常重要的事：

```text
用测试证明权限边界真的成立。
```

你这次要学习的是：

- 测试不是“代码跑了一下”，而是“用自动化方式证明一个行为”。
- 一个测试通常分三段：准备数据、执行动作、检查结果。
- 权限测试不能只测成功路径，还要测失败路径和副作用。
- `userId` 必须来自 token，不能来自 body 或 query。

---

## 什么叫测试完成？

对这张任务来说，“测试完成”不是指你肉眼看过接口，也不是指服务启动了。

它指下面这些事情都成立：

1. 你写了测试用例，测试名能清楚说明它在证明什么。
2. 每个测试都有清楚的三段：
   - Arrange：准备 app、用户、token、计划数据。
   - Act：发 HTTP 请求或调用函数。
   - Assert：检查状态码、返回数据、数据库结果。
3. 权限相关测试覆盖了至少一个失败路径。
4. 失败路径不只检查返回 401/404，还要确认没有产生错误副作用。
5. 运行测试命令后，测试通过。

这张任务你只需要改测试文件，理论上不需要改生产代码。

---

## Step 1: 打开 plans 集成测试

打开：

```text
apps/api/tests/integration/plans.test.ts
```

先找到这两个 helper：

```ts
async function registerAndLogin(app: ReturnType<typeof createApp>, email: string) {
  // 这里先注册用户，再登录拿 token。
  //
  // 为什么测试里要这么做？
  // 因为 /plans 已经被 requireAuth 保护了。
  // 如果没有 Authorization header，请求应该直接返回 401。
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

function authHeader(token: string) {
  // Bearer token 是这种格式：
  //
  // Authorization: Bearer xxxxx.yyyyy.zzzzz
  //
  // requireAuth 会读取这个 header，验证 JWT，
  // 然后把当前用户放到 request.user。
  return { Authorization: `Bearer ${token}` };
}
```

这两个 helper 的作用是减少重复代码。

你后面新增测试时，可以直接用它们。

---

## Step 2: 增加“未登录不能创建计划”的测试

在 `describe("plans API", () => { ... })` 里面加一个测试。

建议放在已有的：

```ts
it("rejects listing plans without authentication", async () => {
  // ...
});
```

后面。

你可以写成这样：

```ts
it("rejects creating a plan without authentication", async () => {
  const app = createApp();

  // Act：不带 Authorization header，直接请求受保护接口。
  //
  // 这里不是忘了 set(authHeader(...))，
  // 而是故意不传 token，用来证明未登录用户不能创建计划。
  const response = await request(app).post("/plans").send({
    title: "Should not be created"
  });

  // Assert：requireAuth 应该在 route 处理创建逻辑之前拦截请求。
  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("AUTH_REQUIRED");

  // Assert：为了证明没有副作用，再查一次数据库。
  //
  // 权限测试很重要的一点：
  // 不能只看响应状态码，还要确认数据真的没有被写进去。
  const count = await prisma.plan.count();
  expect(count).toBe(0);
});
```

学习点：

- 这是失败路径测试。
- 如果这个测试失败，说明未登录用户可能能创建计划，是权限漏洞。
- `count === 0` 是副作用检查。

---

## Step 3: 增加“body.userId 不能伪造归属”的测试

继续在同一个文件里加一个测试：

```ts
it("ignores userId from request body when creating a plan", async () => {
  const app = createApp();

  // Arrange：准备两个用户。
  //
  // ownerA 是真正发请求的人。
  // ownerB 是攻击者试图伪造的目标用户。
  const ownerA = await registerAndLogin(app, "body-owner-a@example.com");
  const ownerB = await registerAndLogin(app, "body-owner-b@example.com");

  // Act：ownerA 带自己的 token 发请求，
  // 但在 body 里偷偷传 ownerB.user.id。
  //
  // 正确的后端必须忽略这个 body.userId。
  // 因为客户端传来的 userId 不可信。
  const response = await request(app).post("/plans").set(authHeader(ownerA.token)).send({
    title: "Created by owner A",

    // 这行是故意传的“坏数据”。
    // 如果后端相信它，计划就会被错误地挂到 ownerB 名下。
    userId: ownerB.user.id
  });

  // Assert：请求本身应该成功，因为 ownerA 是已登录用户。
  expect(response.status).toBe(201);

  // Assert：真正保存下来的 userId 必须是 ownerA.user.id。
  // 这证明 userId 来自 token，而不是 request body。
  expect(response.body.data.userId).toBe(ownerA.user.id);
  expect(response.body.data.userId).not.toBe(ownerB.user.id);
});
```

学习点：

- 这不是普通功能测试，而是安全边界测试。
- 测试故意传入不可信字段，看看后端会不会被客户端影响。
- 这类测试在真实项目里很常见，因为权限漏洞经常就藏在“客户端多传一个字段”里面。

---

## Step 4: 增加“query.userId 不能越权列表”的测试

再加一个测试：

```ts
it("ignores userId from query string when listing plans", async () => {
  const app = createApp();
  const ownerA = await registerAndLogin(app, "query-owner-a@example.com");
  const ownerB = await registerAndLogin(app, "query-owner-b@example.com");

  // Arrange：两个用户各自创建一条计划。
  await request(app).post("/plans").set(authHeader(ownerA.token)).send({ title: "Owner A plan" });

  await request(app).post("/plans").set(authHeader(ownerB.token)).send({ title: "Owner B plan" });

  // Act：ownerA 查询列表，但故意在 query 里传 ownerB 的 userId。
  //
  // 正确行为：
  // service 应该用 request.user.id 覆盖任何外部传入的 userId。
  const response = await request(app)
    .get(`/plans?userId=${ownerB.user.id}`)
    .set(authHeader(ownerA.token));

  // Assert：ownerA 只能看到自己的计划。
  expect(response.status).toBe(200);
  expect(response.body.data.map((plan: { title: string }) => plan.title)).toEqual(["Owner A plan"]);
});
```

学习点：

- `query` 也是客户端输入，和 `body` 一样不可信。
- 列表接口很容易出现数据泄漏，所以要专门测。
- 这个测试保护的是 service 里的这句逻辑：

```ts
return planRepository.findAll({ ...filter, userId: currentUserId });
```

---

## Step 5: 跑测试

先只跑 plans 集成测试：

```bash
npm run test -w @learn/api -- tests/integration/plans.test.ts
```

如果通过，再跑全量测试：

```bash
npm run test
```

如果你想顺手确认类型：

```bash
npm run typecheck
```

---

## 完成标准

你完成后告诉我：

```text
权限测试任务完成了
```

我会帮你做这些事：

1. 跑 `npm run test`
2. 跑 `npm run typecheck`
3. 跑 `npm run format:check`
4. 跑 `npm run build`
5. 如果有问题，我会解释根因。
6. 如果没问题，我会补更详细的中文注释。
7. 然后给你出下一张任务卡。

---

## 这张任务的核心理解

记住这个句子：

```text
权限测试不是证明“我能做什么”，而是证明“我不能做不该做的事”。
```

所以权限测试通常会故意做坏事：

- 不带 token
- 传假的 userId
- 拿 A 用户的 token 访问 B 用户的数据
- 修改失败后再查一次，确认数据没被改
- 删除失败后再查一次，确认数据还在

这就是权限边界测试的价值。
