# Task: 后端鉴权进阶：Refresh Token 和 Session

## 背景

现在登录接口已经能签发 JWT：

```text
POST /auth/login -> { user, token }
```

这个 `token` 是 access token，当前有效期是 1 小时。

真实后端通常还会有 refresh token / session 机制：

```text
access token：短期有效，用来访问 API
refresh token：长期一点，用来换新的 access token
session：服务端保存一次登录会话，方便刷新、退出、撤销
```

这一张开始做后端鉴权进阶，不再继续细拆 Vue 基础。

## 目标

实现最小可用的 refresh token session：

```text
登录成功时创建一条 session
登录响应返回 accessToken + refreshToken
POST /auth/refresh 用 refreshToken 换新的 accessToken
POST /auth/logout 撤销 refreshToken 对应的 session
```

先做后端，不要求立刻接前端。

---

## 你会练到什么

- access token 和 refresh token 的区别
- 为什么 refresh token 不能只放 JWT，不落库
- session 表如何支持服务端撤销登录
- token 不能明文存数据库，应该存 hash
- auth service 如何从“只登录”扩展成“登录会话管理”
- 集成测试如何覆盖登录、刷新、退出

---

## 建议实现顺序

### Step 1: 扩展 Prisma schema

在 `prisma/schema.prisma` 增加 `UserSession`：

```prisma
model UserSession {
  id               String   @id
  refreshTokenHash String   @unique
  expiresAt        DateTime
  revokedAt        DateTime?
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt

  userId           String
  user             User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}
```

并在 `User` 上增加：

```prisma
sessions UserSession[]
```

运行 migration：

```bash
npm run prisma:migrate -w @learn/api -- --name add_user_sessions
```

---

### Step 2: 增加 refresh token 工具

建议创建：

```text
apps/api/src/modules/auth/refresh-token.ts
```

你需要实现：

```ts
export function createRefreshToken(): string;
export function hashRefreshToken(refreshToken: string): string;
export function getRefreshTokenExpiresAt(): Date;
```

提示：

```text
createRefreshToken 可以用 crypto.randomBytes(32).toString("base64url")
hashRefreshToken 可以用 crypto.createHash("sha256").update(token).digest("hex")
expiresAt 先设置 7 天后
```

---

### Step 3: 调整 shared 类型

现在 shared 里有：

```ts
export type AuthTokenResult = {
  user: User;
  token: string;
};
```

把它调整成：

```ts
export type AuthTokenResult = {
  user: User;
  accessToken: string;
  refreshToken: string;
};
```

注意：这会影响前端登录页和 smoke 脚本，后面要跟着改。

---

### Step 4: 调整 login

登录成功时：

```text
1. 签发 accessToken
2. 生成 refreshToken
3. hash refreshToken
4. 创建 UserSession
5. 返回 user + accessToken + refreshToken
```

不要把 refresh token 明文存数据库。

---

### Step 5: 增加 refresh schema 和 logout schema

在 `auth.schema.ts` 增加：

```ts
export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required")
});
```

logout 可以复用同一个 schema。

---

### Step 6: 增加 auth service 方法

在 `auth.service.ts` 增加：

```ts
refresh(input: { refreshToken: string }): Promise<AuthTokenResult>
logout(input: { refreshToken: string }): Promise<void>
```

`refresh` 的行为：

```text
hash refreshToken
查 session
session 不存在 -> 401 INVALID_REFRESH_TOKEN
session revokedAt 不为空 -> 401 INVALID_REFRESH_TOKEN
session expiresAt 已过期 -> 401 INVALID_REFRESH_TOKEN
查 user
签发新的 accessToken
可以复用原 refreshToken，也可以轮换 refreshToken
```

学习阶段建议先复用原 refresh token，降低复杂度。

`logout` 的行为：

```text
hash refreshToken
找到 session 后设置 revokedAt
即使 token 不存在，也可以返回成功，避免泄露 token 是否有效
```

---

### Step 7: 增加路由

在 `auth.routes.ts` 增加：

```text
POST /auth/refresh
POST /auth/logout
```

响应建议：

```text
POST /auth/refresh -> 200 + { success: true, data: { user, accessToken, refreshToken } }
POST /auth/logout -> 204 No Content
```

---

### Step 8: 更新前端和 smoke 脚本

现在登录响应字段从 `token` 变成了 `accessToken`。

需要检查：

```text
apps/web/src/api/auth.ts
apps/web/src/pages/LoginPage/index.vue
apps/api/src/scripts/api-smoke.ts
```

如果前端本地仍然只存 access token，那么登录后应存：

```ts
result.data.accessToken;
```

refresh token 可以先不接前端，后续再做。

---

### Step 9: 测试要求

至少补这些集成测试：

```text
登录成功时返回 accessToken 和 refreshToken
登录成功时数据库创建 UserSession，且不保存明文 refreshToken
POST /auth/refresh 使用有效 refreshToken 返回新的 accessToken
POST /auth/refresh 使用无效 refreshToken 返回 401
POST /auth/logout 后，再 refresh 同一个 token 返回 401
```

测试描述继续用中文。

---

## 完成后告诉我

完成后直接说：

```text
Refresh token session 完成了
```

我会帮你检查：

```text
schema / migration
token hash 是否安全
auth service 边界
测试覆盖
前端登录是否被字段改名影响
完整验证
```
