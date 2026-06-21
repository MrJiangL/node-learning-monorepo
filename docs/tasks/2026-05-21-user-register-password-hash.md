# Task: User Register And Password Hash

## 目标

这一张任务开始进入登录鉴权阶段，但先不做 JWT。

JWT 登录需要先有用户账号。  
而真实后端绝对不能把用户密码明文存进数据库，所以我们先做：

```text
POST /auth/register
```

它负责：

- 接收 `email`、`password`、`name`
- 用 Zod 校验输入
- 把 password 变成 passwordHash
- 创建 User
- 返回不包含 passwordHash 的用户信息
- email 重复时返回业务错误

这张任务主要学习：

- 密码为什么不能明文存储
- Node 内置 `crypto.scrypt` 怎么做密码哈希
- salt 是什么
- User 输入类型和输出类型为什么要分开
- auth 模块怎么拆分：schema / service / route

---

## 最终效果

新增接口：

```text
POST /auth/register
```

请求：

```json
{
  "email": "learner@example.com",
  "password": "password123",
  "name": "Learning User"
}
```

响应：

```json
{
  "success": true,
  "data": {
    "id": "...",
    "email": "learner@example.com",
    "name": "Learning User",
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

注意响应里不能有：

```text
password
passwordHash
```

---

## Step 1: 给 User 增加 passwordHash

打开：

```text
prisma/schema.prisma
```

在 `User` model 里新增：

```prisma
passwordHash String
```

最终类似：

```prisma
model User {
  id           String   @id
  email        String   @unique
  passwordHash String
  name         String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  plans        Plan[]
}
```

然后运行 migration：

```bash
npm run prisma:migrate -w @learn/api -- --name add_user_password_hash
```

再生成 Prisma Client：

```bash
npm run prisma:generate -w @learn/api
```

如果这里报错，不要重置数据库，先把报错发给我。

学习点：

- 数据库里保存的是 `passwordHash`，不是 `password`。
- `passwordHash` 是服务端生成的，客户端永远不应该直接传这个字段。

---

## Step 2: 在 shared 里增加 User 类型

打开：

```text
packages/shared/src/index.ts
```

新增：

```ts
export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  name?: string;
};
```

学习点：

- `User` 是返回给客户端看的用户。
- `RegisterUserInput` 是客户端注册时传进来的数据。
- `passwordHash` 不属于这两个类型，因为它是数据库内部字段。

---

## Step 3: 创建 auth schema

新增文件：

```text
apps/api/src/modules/auth/auth.schema.ts
```

内容：

```ts
import { z } from "zod";

export const registerUserSchema = z.object({
  email: z.string().trim().email("Email must be valid").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  name: z.string().trim().min(1).max(100).optional()
});
```

学习点：

- email 必须是合法邮箱格式。
- password 设置最小长度。
- name 可选，但如果传了就不能是空字符串。

---

## Step 4: 创建密码哈希工具

新增文件：

```text
apps/api/src/modules/auth/password.ts
```

内容：

```ts
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;

  return `${salt}:${derivedKey.toString("hex")}`;
}
```

学习点：

- `salt` 是每个密码随机生成的一段字符串。
- 同样的密码，因为 salt 不同，最终 hash 也会不同。
- 数据库保存 `salt:hash`，后面登录验证密码时会用同一个 salt 再算一次。

---

## Step 5: 创建 auth service

新增文件：

```text
apps/api/src/modules/auth/auth.service.ts
```

参考结构：

```ts
import type { RegisterUserInput, User } from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import { prisma } from "../../db/prisma.js";
import { hashPassword } from "./password.js";

function mapUserToUser(user: {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  updatedAt: Date;
}): User {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export function createAuthService() {
  return {
    async register(input: RegisterUserInput): Promise<User> {
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email }
      });

      if (existingUser) {
        throw new AppError(409, "USER_EMAIL_EXISTS", "Email is already registered");
      }

      const passwordHash = await hashPassword(input.password);

      const user = await prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: input.email,
          name: input.name ?? null,
          passwordHash
        }
      });

      return mapUserToUser(user);
    }
  };
}
```

学习点：

- 注册前先查 email 是否存在。
- `409 Conflict` 表示资源冲突，这里就是邮箱已被使用。
- service 返回的是安全的 `User`，不包含 `passwordHash`。

---

## Step 6: 创建 auth route

新增文件：

```text
apps/api/src/modules/auth/auth.routes.ts
```

参考结构：

```ts
import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { createAuthService } from "./auth.service.js";
import { registerUserSchema } from "./auth.schema.js";

export function createAuthRouter() {
  const router = Router();
  const authService = createAuthService();

  router.post(
    "/register",
    asyncHandler(async (req, res) => {
      const input = registerUserSchema.parse(req.body);
      const user = await authService.register(input);

      res.status(201).json({
        success: true,
        data: user
      });
    })
  );

  return router;
}
```

然后打开：

```text
apps/api/src/app.ts
```

挂载路由：

```ts
import { createAuthRouter } from "./modules/auth/auth.routes.js";
```

然后在 `createApp()` 里面加：

```ts
app.use("/auth", createAuthRouter());
```

学习点：

- `auth.routes.ts` 只负责 HTTP 输入输出。
- 业务规则放在 `auth.service.ts`。
- 密码哈希细节放在 `password.ts`。

---

## Step 7: 写集成测试

新增文件：

```text
apps/api/tests/integration/auth.test.ts
```

先写这三个测试：

```ts
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";

describe("auth API", () => {
  beforeEach(async () => {
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
  });

  it("registers a user without returning passwordHash", async () => {
    const app = createApp();

    const response = await request(app).post("/auth/register").send({
      email: "learner@example.com",
      password: "password123",
      name: "Learning User"
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      email: "learner@example.com",
      name: "Learning User"
    });
    expect(response.body.data.password).toBeUndefined();
    expect(response.body.data.passwordHash).toBeUndefined();
  });

  it("stores a password hash instead of the plain password", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "hash@example.com",
      password: "password123"
    });

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: "hash@example.com" }
    });

    expect(user.passwordHash).not.toBe("password123");
    expect(user.passwordHash).toContain(":");
  });

  it("rejects duplicate email registration", async () => {
    const app = createApp();

    await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123"
    });

    const response = await request(app).post("/auth/register").send({
      email: "duplicate@example.com",
      password: "password123"
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("USER_EMAIL_EXISTS");
  });
});
```

---

## Step 8: 修正学习用户创建

你现在的 `createPrismaPlanRepository()` 里会 upsert 一个临时学习用户。

因为 `User` 新增了必填 `passwordHash`，所以 `create` 里也要补：

```ts
passwordHash: "temporary-learning-user";
```

注意：这个只是学习阶段的临时用户。  
等后面接入真实登录后，我们会删除这个固定学习用户逻辑。

---

## Step 9: 跑验证

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
用户注册完成了
```

我会帮你：

1. 跑完整验证。
2. 检查是否没有泄露 `passwordHash`。
3. 补详细中文注释。
4. 带你进入登录和 JWT 签发。
