# Task: Current User Auth Middleware

## 目标

上一张任务你已经完成了：

```text
POST /auth/login
```

登录成功后，后端会返回 JWT token。

这一张任务要做的是：写一个中间件读取请求头里的 token，并找出“当前登录用户是谁”。

最终我们会得到：

```text
requireAuth
```

它负责：

- 从 `Authorization` 请求头读取 Bearer token
- 验证 JWT 签名
- 从 token payload 里拿到用户 id
- 查询数据库确认用户仍然存在
- 把当前用户挂到 `req.user`
- 没有 token / token 错误 / 用户不存在时返回 401

这次主要学习：

- Express middleware 是什么
- `Authorization: Bearer <token>` 格式
- JWT 签发和验证是两件事
- 为什么 token 里有用户 id 还要查数据库
- 怎么给 Express 的 `Request` 类型扩展 `user`

---

## Step 1: 增加 verifyAuthToken

打开：

```text
apps/api/src/modules/auth/token.ts
```

把 import 改成：

```ts
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
```

然后在 `signAuthToken` 下面新增：

```ts
export function verifyAuthToken(token: string): AuthTokenPayload {
  // jwt.verify 会做两件事：
  // 1. 检查 token 签名是不是用同一个 JWT_SECRET 签出来的。
  // 2. 检查 expiresIn 这类时间规则，例如 token 是否过期。
  //
  // 如果 token 无效或过期，它会抛异常。
  // 我们先在这里保持简单，让调用方 middleware 去捕获并转换成 401。
  const payload = jwt.verify(token, env.JWT_SECRET);

  // jsonwebtoken 的类型比较宽，返回值可能是 string，也可能是 object。
  // 我们自己的 token 是用 signAuthToken() 签出来的 object payload，
  // 所以这里做一次运行时检查，避免错误 token 被当成合法用户。
  if (
    typeof payload === "string" ||
    typeof payload.sub !== "string" ||
    typeof payload.email !== "string"
  ) {
    throw new Error("Invalid auth token payload");
  }

  return {
    sub: payload.sub,
    email: payload.email
  };
}
```

学习点：

- `sign` 是签发 token。
- `verify` 是验证 token。
- `verify` 失败时不要把原始错误直接暴露给用户，后面 middleware 会统一返回 `INVALID_TOKEN`。

---

## Step 2: 创建 Express Request 类型扩展

新增文件：

```text
apps/api/src/types/express.ts
```

内容：

```ts
import type { User } from "@learn/shared";

declare global {
  namespace Express {
    interface Request {
      // requireAuth 中间件验证 token 成功后，会把当前用户放到 req.user。
      //
      // 这里写成可选，是因为不是所有路由都要求登录。
      // 例如 /health、/auth/register、/auth/login 都不会有 req.user。
      user?: User;
    }
  }
}

export {};
```

学习点：

- Express 原始的 `Request` 类型里没有 `user`。
- TypeScript 不知道你会动态加 `req.user`。
- 这个文件就是告诉 TypeScript：“我们的项目里 Request 允许有 user 字段”。
- `export {}` 是为了让这个文件被 TypeScript 当成模块处理。

---

## Step 3: 创建 requireAuth 中间件

新增文件：

```text
apps/api/src/middleware/require-auth.ts
```

内容：

```ts
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";
import { prisma } from "../db/prisma.js";
import { verifyAuthToken } from "../modules/auth/token.js";

function readBearerToken(authorizationHeader: string | undefined): string | null {
  // 浏览器或 curl 访问受保护接口时，通常会传：
  //
  // Authorization: Bearer eyJhbGciOi...
  //
  // 这里先处理没有 Authorization 请求头的情况。
  if (!authorizationHeader) {
    return null;
  }

  // Bearer token 的格式固定分成两段：
  // - 第一段：Bearer
  // - 第二段：真正的 JWT token
  const [scheme, token] = authorizationHeader.split(" ");

  // scheme 用小写比较，允许用户传 bearer / Bearer。
  if (scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }

  return token;
}

export const requireAuth: RequestHandler = async (req, _res, next) => {
  try {
    const token = readBearerToken(req.header("authorization"));

    if (!token) {
      throw new AppError(401, "AUTH_REQUIRED", "Authentication is required");
    }

    const payload = verifyAuthToken(token);

    // token 里有用户 id，但仍然要查数据库。
    //
    // 原因：
    // - 用户可能已经被删除
    // - 以后用户可能被禁用
    // - 数据库里的用户信息可能已经更新
    const user = await prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      throw new AppError(401, "INVALID_TOKEN", "Authentication token is invalid");
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString()
    };

    next();
  } catch (error) {
    // AppError 是我们主动抛出的业务错误，可以直接交给 errorHandler。
    if (error instanceof AppError) {
      next(error);
      return;
    }

    // jwt.verify 抛出的错误统一转换成 401。
    // 不把 “jwt expired” / “invalid signature” 这类内部细节直接返回给客户端。
    next(new AppError(401, "INVALID_TOKEN", "Authentication token is invalid"));
  }
};
```

学习点：

- 中间件的核心职责是“请求进入业务路由前先做一层检查”。
- `next()` 表示验证通过，继续往后走。
- `next(error)` 表示验证失败，交给统一错误处理中间件。

---

## Step 4: 新增一个测试用受保护路由

为了先测试 `requireAuth`，我们不急着改 `/plans`。

打开：

```text
apps/api/src/modules/auth/auth.routes.ts
```

新增 import：

```ts
import { requireAuth } from "../../middleware/require-auth.js";
```

然后在 `return router` 之前新增：

```ts
router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    // requireAuth 通过后，req.user 就是当前登录用户。
    // 这里的 /auth/me 是一个很小的验证接口：
    // 它不做复杂业务，只返回“我是谁”。
    res.status(200).json({
      success: true,
      data: req.user
    });
  })
);
```

学习点：

- `/auth/me` 是很多真实系统都会有的接口。
- 前端刷新页面时，可以用它确认当前 token 还能不能用。
- 这张任务先用 `/auth/me` 验证中间件，下一张再把中间件接到 `/plans` 上。

---

## Step 5: 写 auth/me 测试

打开：

```text
apps/api/tests/integration/auth.test.ts
```

新增测试：

```ts
it("returns the current user with a valid token", async () => {
  const app = createApp();

  // 先注册用户。
  await request(app).post("/auth/register").send({
    email: "me@example.com",
    password: "password123",
    name: "Me User"
  });

  // 再登录拿 token。
  const loginResponse = await request(app).post("/auth/login").send({
    email: "me@example.com",
    password: "password123"
  });

  const token = loginResponse.body.data.token;

  // 调用受保护接口时，把 token 放在 Authorization header。
  // 格式必须是 Bearer + 空格 + token。
  const response = await request(app).get("/auth/me").set("Authorization", `Bearer ${token}`);

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.email).toBe("me@example.com");
  expect(response.body.data.passwordHash).toBeUndefined();
});

it("rejects auth/me without a token", async () => {
  const app = createApp();

  const response = await request(app).get("/auth/me");

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("AUTH_REQUIRED");
});

it("rejects auth/me with an invalid token", async () => {
  const app = createApp();

  const response = await request(app)
    .get("/auth/me")
    .set("Authorization", "Bearer not-a-real-token");

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("INVALID_TOKEN");
});
```

学习点：

- 有 token：能拿到当前用户。
- 没 token：返回 `AUTH_REQUIRED`。
- 假 token：返回 `INVALID_TOKEN`。

---

## Step 6: 跑验证

先跑 auth 测试：

```bash
npm run test -w @learn/api -- tests/integration/auth.test.ts
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
当前用户鉴权中间件完成了
```

我会帮你：

1. 跑完整验证。
2. 检查 `req.user` 是否不包含敏感字段。
3. 补充或调整学习注释。
4. 带你进入“计划 API 权限边界”：用户只能看到和操作自己的计划。
