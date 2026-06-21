# Task: Basic Rate Limit For Auth APIs

## 目标

这一张任务做一个基础版 rate limit，先保护最容易被攻击的接口：

```text
POST /auth/register
POST /auth/login
```

你要练的是：

- Express middleware 的写法。
- 用闭包保存 middleware 自己的内存状态。
- 为什么登录接口需要限流。
- 如何用 integration test 验证 `429 Too Many Requests`。
- 如何保持错误响应格式一致。

这张任务先不用 Redis，也不引入第三方库。我们先手写一个内存版 middleware，把原理吃透。

注意：

```text
内存版 rate limit 只适合学习和单进程开发环境。
真实生产环境多实例部署时，一般要用 Redis 或网关层限流。
```

---

## Step 1: 创建 rate limit middleware

创建文件：

```text
apps/api/src/middleware/rate-limit.ts
```

写入：

```ts
import type { RequestHandler } from "express";

type RateLimitOptions = {
  windowMs: number;
  max: number;
};

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

export function createRateLimiter(options: RateLimitOptions): RequestHandler {
  // hits 是这个 middleware 自己持有的内存状态。
  //
  // key 是访问者标识，例如 IP。
  // value 记录这个 key 在当前时间窗口内请求了多少次，以及窗口什么时候重置。
  //
  // 因为 hits 放在 createRateLimiter 里面，所以每次 createApp() 创建新 app 时，
  // 测试环境都会得到一份新的计数器，不容易互相污染。
  const hits = new Map<string, RateLimitRecord>();

  return (request, response, next) => {
    // req.ip 是 Express 解析出的客户端 IP。
    //
    // 如果拿不到 IP，就退回 unknown。
    // 学习阶段先这样处理；真实项目里要结合反向代理和 trust proxy 配置。
    const key = request.ip ?? "unknown";
    const now = Date.now();
    const current = hits.get(key);

    if (!current || current.resetAt <= now) {
      hits.set(key, {
        count: 1,
        resetAt: now + options.windowMs
      });

      next();
      return;
    }

    if (current.count >= options.max) {
      response.status(429).json({
        success: false,
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests, please try again later"
        }
      });
      return;
    }

    hits.set(key, {
      ...current,
      count: current.count + 1
    });

    next();
  };
}
```

学习点：

- `Map` 适合保存 key-value 计数。
- `windowMs` 是时间窗口，例如 60 秒。
- `max` 是一个窗口内最多允许多少次。
- `resetAt <= now` 表示旧窗口过期，要开启新窗口。
- `429` 是 HTTP 里常见的限流状态码。

---

## Step 2: 给 auth routes 接入 limiter

打开：

```text
apps/api/src/modules/auth/auth.routes.ts
```

新增导入：

```ts
import { createRateLimiter } from "../../middleware/rate-limit.js";
```

在 `const authService = createAuthService();` 后面新增：

```ts
const authWriteLimiter = createRateLimiter({
  // 学习项目先设 1 分钟 5 次。
  //
  // 这个值不是“标准答案”，只是一个方便测试和理解的起点。
  // 真实项目里可以按业务风险调整。
  windowMs: 60_000,
  max: 5
});
```

把 register route 从：

```ts
router.post(
  "/register",
  asyncHandler(async (req, res) => {
```

改成：

```ts
router.post(
  "/register",
  authWriteLimiter,
  asyncHandler(async (req, res) => {
```

把 login route 从：

```ts
router.post(
  "/login",
  asyncHandler(async (req, res) => {
```

改成：

```ts
router.post(
  "/login",
  authWriteLimiter,
  asyncHandler(async (req, res) => {
```

注意：

```text
/auth/me 不需要这个 limiter。
```

原因：

- `/auth/me` 是已登录用户查自己是谁。
- `/auth/login` 和 `/auth/register` 更容易被暴力尝试。
- 这张任务只保护 auth 写接口，先保持范围小。

---

## Step 3: 给 middleware 写单元测试

创建文件：

```text
apps/api/tests/unit/rate-limit.test.ts
```

写入：

```ts
import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimiter } from "../../src/middleware/rate-limit.js";

function createTestApp() {
  const app = express();

  app.get(
    "/limited",
    createRateLimiter({
      windowMs: 60_000,
      max: 2
    }),
    (_request, response) => {
      response.json({ success: true });
    }
  );

  return app;
}

describe("rate limit middleware", () => {
  it("allows requests until the limit is reached", async () => {
    const app = createTestApp();

    const firstResponse = await request(app).get("/limited");
    const secondResponse = await request(app).get("/limited");

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
  });

  it("returns 429 after too many requests", async () => {
    const app = createTestApp();

    await request(app).get("/limited");
    await request(app).get("/limited");

    const blockedResponse = await request(app).get("/limited");

    expect(blockedResponse.status).toBe(429);
    expect(blockedResponse.body).toEqual({
      success: false,
      error: {
        code: "RATE_LIMITED",
        message: "Too many requests, please try again later"
      }
    });
  });
});
```

学习点：

- 这个测试没有启动真实端口。
- Supertest 直接把请求打到 Express app 实例。
- `createTestApp()` 每次返回新 app，所以每个测试都有新的 limiter 状态。

---

## Step 4: 给 auth API 写 integration test

打开：

```text
apps/api/tests/integration/auth.test.ts
```

新增测试：

```ts
it("rate limits repeated login attempts", async () => {
  const app = createApp();

  for (let index = 0; index < 5; index += 1) {
    const response = await request(app).post("/auth/login").send({
      email: "missing-user@example.com",
      password: "wrong-password"
    });

    // 前 5 次请求还没触发 limiter。
    //
    // 因为用户不存在，authService 会返回登录失败相关错误；
    // 这个测试不关心具体是 400 还是 401，只关心它不是 429。
    expect(response.status).not.toBe(429);
  }

  const blockedResponse = await request(app).post("/auth/login").send({
    email: "missing-user@example.com",
    password: "wrong-password"
  });

  expect(blockedResponse.status).toBe(429);
  expect(blockedResponse.body.error.code).toBe("RATE_LIMITED");
});
```

注意：

```text
这里故意打 /auth/login，而不是 /auth/register。
```

因为 login 是更典型的暴力尝试目标：攻击者可能不断试邮箱和密码。

---

## Step 5: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/rate-limit.test.ts tests/integration/auth.test.ts
```

再跑类型检查：

```bash
npm run typecheck
```

如果都过，再跑全量：

```bash
npm run test
npm run format:check
npm run build
```

你完成后告诉我：

```text
Rate limit 完成了
```

然后我会继续帮你：

- 跑完整验证。
- 补更细的中文注释。
- 检查这个 limiter 有没有影响 smoke 或其它测试。
- 更新任务索引。
- 给下一张任务卡。
