# Task: User Login And JWT

## 目标

上一张任务已经完成了用户注册和密码哈希。

这一张任务做登录：

```text
POST /auth/login
```

登录成功后返回一个 JWT token。  
后面我们会用这个 token 识别“当前用户是谁”，再让计划 API 只能操作自己的数据。

这次你会练到：

- 校验登录输入
- 验证密码 hash
- 使用 `JWT_SECRET`
- 签发 JWT
- 不把 `passwordHash` 返回给客户端
- 登录失败时返回统一错误

---

## Step 1: 安装 JWT 依赖

在项目根目录运行：

```bash
npm install jsonwebtoken -w @learn/api
npm install -D @types/jsonwebtoken -w @learn/api
```

学习点：

- `jsonwebtoken` 是运行时代码需要的依赖，放 `dependencies`。
- `@types/jsonwebtoken` 只给 TypeScript 用，放 `devDependencies`。

---

## Step 2: 配置 JWT_SECRET

打开项目根目录的：

```text
.env
```

新增一行：

```env
JWT_SECRET="dev-learning-secret-change-me"
```

注意：

- 这是本地学习用的 secret。
- 不要把真实项目 secret 写进代码。
- 后端读取 secret 时要从环境变量读。

然后打开：

```text
apps/api/src/config/env.ts
```

给 `env` 增加：

```ts
JWT_SECRET: process.env.JWT_SECRET ?? "dev-learning-secret-change-me";
```

学习点：

- `JWT_SECRET` 是签名密钥。
- 同一个 secret 签出来的 token，后面也要用同一个 secret 验证。

---

## Step 3: 增加登录输入类型

打开：

```text
packages/shared/src/index.ts
```

新增：

```ts
export type LoginUserInput = {
  email: string;
  password: string;
};

export type AuthTokenResult = {
  user: User;
  token: string;
};
```

学习点：

- 登录输入只需要 email/password。
- 登录成功返回 user + token。
- user 仍然不能包含 `passwordHash`。

---

## Step 4: 增加 login schema

打开：

```text
apps/api/src/modules/auth/auth.schema.ts
```

新增：

```ts
export const loginUserSchema = z.object({
  email: z.string().trim().email("Email must be valid").max(255),
  password: z.string().min(1, "Password is required").max(100)
});
```

学习点：

- 登录时可以不用 `min(8)`。
- 因为已经注册过的用户可能来自旧系统或别的规则。
- 登录只需要判断“有没有传密码”，真正是否正确由 service 验证。

---

## Step 5: 增加密码验证函数

打开：

```text
apps/api/src/modules/auth/password.ts
```

新增：

```ts
import { timingSafeEqual } from "node:crypto";
```

然后增加函数：

```ts
export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  const [salt, storedHash] = passwordHash.split(":");

  if (!salt || !storedHash) {
    return false;
  }

  const derivedKey = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  const storedKey = Buffer.from(storedHash, "hex");

  if (derivedKey.length !== storedKey.length) {
    return false;
  }

  return timingSafeEqual(derivedKey, storedKey);
}
```

学习点：

- 登录不是“解密密码”。
- 哈希不能还原成原密码。
- 登录验证是：用同一个 salt 再算一次 hash，然后比较结果。
- `timingSafeEqual` 可以减少比较过程泄露信息的风险。

---

## Step 6: 增加 JWT 工具

新增文件：

```text
apps/api/src/modules/auth/token.ts
```

内容：

```ts
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";

export type AuthTokenPayload = {
  sub: string;
  email: string;
};

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "1h"
  });
}
```

学习点：

- `sub` 是 JWT 里常用的 subject，通常放用户 id。
- `expiresIn: "1h"` 表示 token 1 小时后过期。
- token 里不要放密码、passwordHash、敏感配置。

---

## Step 7: 增加 authService.login

打开：

```text
apps/api/src/modules/auth/auth.service.ts
```

新增 import：

```ts
import type { AuthTokenResult, LoginUserInput, RegisterUserInput, User } from "@learn/shared";
import { verifyPassword } from "./password.js";
import { signAuthToken } from "./token.ts.js";
```

在 `register` 后面新增：

```ts
async login(input: LoginUserInput): Promise<AuthTokenResult> {
  const user = await prisma.user.findUnique({
    where: { email: input.email }
  });

  if (!user) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError(401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  }

  const safeUser = mapUserToUser(user);
  const token = signAuthToken({
    sub: user.id,
    email: user.email
  });

  return {
    user: safeUser,
    token
  };
}
```

学习点：

- 邮箱不存在和密码错误都返回同一个错误。
- 不要告诉攻击者“这个邮箱存在，只是密码错了”。
- service 返回的是安全 user 和 token。

---

## Step 8: 增加登录路由

打开：

```text
apps/api/src/modules/auth/auth.routes.ts
```

新增 import：

```ts
import { loginUserSchema, registerUserSchema } from "./auth.schema.js";
```

新增路由：

```ts
router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const input = loginUserSchema.parse(req.body);
    const result = await authService.login(input);

    res.status(200).json({
      success: true,
      data: result
    });
  })
);
```

学习点：

- 注册成功是 `201 Created`。
- 登录成功不是创建用户，所以用 `200 OK`。

---

## Step 9: 写登录测试

打开：

```text
apps/api/tests/integration/auth.test.ts
```

新增测试：

```ts
it("logs in a registered user and returns a token.ts", async () => {
  const app = createApp();

  await request(app).post("/auth/register").send({
    email: "login@example.com",
    password: "password123",
    name: "Login User"
  });

  const response = await request(app).post("/auth/login").send({
    email: "login@example.com",
    password: "password123"
  });

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data.user.email).toBe("login@example.com");
  expect(typeof response.body.data.token).toBe("string");
  expect(response.body.data.token.split(".")).toHaveLength(3);
  expect(response.body.data.user.passwordHash).toBeUndefined();
});

it("rejects login with a wrong password", async () => {
  const app = createApp();

  await request(app).post("/auth/register").send({
    email: "wrong-password@example.com",
    password: "password123"
  });

  const response = await request(app).post("/auth/login").send({
    email: "wrong-password@example.com",
    password: "bad-password"
  });

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
});
```

---

## Step 10: 跑验证

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
用户登录 JWT 完成了
```

我会帮你：

1. 跑完整验证。
2. 检查 token 是否没有放敏感信息。
3. 补详细中文注释。
4. 带你进入“当前用户鉴权中间件”。
