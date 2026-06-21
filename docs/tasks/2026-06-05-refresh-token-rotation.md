# Task: 后端鉴权工程化：Refresh Token 轮换

## 背景

现在 refresh 接口的行为是：

```text
客户端提交 refreshToken
服务端校验 session
服务端返回新的 accessToken
refreshToken 仍然复用旧的
```

这在学习阶段是可以的，但真实项目里更常见的做法是 **refresh token rotation**：

```text
每次 refresh 成功，都撤销旧 refreshToken，并签发一个新的 refreshToken
```

这样做的好处是：

```text
如果旧 refreshToken 被别人偷走，
只要真正用户已经用它刷新过一次，
旧 token 就会失效，攻击者不能长期复用它。
```

---

## 目标

把 `POST /auth/refresh` 从“复用 refreshToken”改成“轮换 refreshToken”：

```text
旧 refreshToken 对应的 session 设置 revokedAt
创建新的 UserSession
返回新的 accessToken + 新的 refreshToken
旧 refreshToken 再次 refresh 会返回 401 INVALID_REFRESH_TOKEN
```

---

## 你会练到什么

- refresh token rotation 的安全意义
- 为什么 refresh 成功时也要写数据库
- Prisma transaction 在鉴权流程中的用途
- 如何测试“旧 token 已失效，新 token 可继续使用”
- 如何避免部分写入导致 session 状态不一致

---

## 任务 1：先写测试

修改：

```text
apps/api/tests/integration/auth.test.ts
```

新增一个中文测试：

```ts
it("refresh 成功后会轮换 refreshToken，并让旧 refreshToken 失效", async () => {
  const app = createApp();

  await request(app).post("/auth/register").send({
    email: "rotate-refresh@example.com",
    password: "password123"
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "rotate-refresh@example.com",
    password: "password123"
  });

  const oldRefreshToken = loginResponse.body.data.refreshToken as string;

  const refreshResponse = await request(app).post("/auth/refresh").send({
    refreshToken: oldRefreshToken
  });

  expect(refreshResponse.status).toBe(200);

  const newRefreshToken = refreshResponse.body.data.refreshToken as string;

  expect(newRefreshToken).not.toBe(oldRefreshToken);
  expect(typeof refreshResponse.body.data.accessToken).toBe("string");

  const oldTokenResponse = await request(app).post("/auth/refresh").send({
    refreshToken: oldRefreshToken
  });

  expectApiError(oldTokenResponse, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);

  const newTokenResponse = await request(app).post("/auth/refresh").send({
    refreshToken: newRefreshToken
  });

  expect(newTokenResponse.status).toBe(200);
});
```

先运行它：

```bash
npm run test -w @learn/api -- auth.test.ts
```

预期：这个测试一开始应该失败，因为当前实现还会复用旧 refreshToken。

---

## 任务 2：修改 auth service 的 refresh

修改：

```text
apps/api/src/modules/auth/auth.service.ts
```

当前 `refresh()` 大概是：

```ts
const accessToken = signAuthToken({
  sub: session.user.id,
  email: session.user.email
});

return {
  user: mapUserToUser(session.user),
  accessToken,
  refreshToken: input.refreshToken
};
```

你要改成：

```text
1. 生成 newRefreshToken
2. 在 transaction 里撤销旧 session
3. 在 transaction 里创建新 session
4. 返回 newRefreshToken
```

参考结构：

```ts
const newRefreshToken = createRefreshToken();

await prisma.$transaction([
  prisma.userSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() }
  }),
  prisma.userSession.create({
    data: {
      id: crypto.randomUUID(),
      userId: session.user.id,
      refreshTokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: getRefreshTokenExpiresAt()
    }
  })
]);

return {
  user: mapUserToUser(session.user),
  accessToken,
  refreshToken: newRefreshToken
};
```

### 为什么用 transaction？

因为 refresh 成功时有两个数据库写入：

```text
撤销旧 session
创建新 session
```

这两个动作应该一起成功或一起失败。

如果只撤销旧 session，但新 session 创建失败，用户会被迫重新登录。

---

## 任务 3：更新旧测试预期

现在已有测试：

```ts
it("使用有效 refreshToken 可以换新的 accessToken", ...)
```

这个测试里如果断言：

```ts
expect(response.body.data.refreshToken).toBe(loginResponse.body.data.refreshToken);
```

要改成：

```ts
expect(response.body.data.refreshToken).not.toBe(loginResponse.body.data.refreshToken);
```

因为 refresh 成功后，refreshToken 应该轮换。

---

## 任务 4：运行验证

先跑 auth 测试：

```bash
npm run test -w @learn/api -- auth.test.ts
```

再跑 API 类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] refresh 成功后返回新的 refreshToken
- [ ] 旧 refreshToken 再次 refresh 返回 `401 INVALID_REFRESH_TOKEN`
- [ ] 新 refreshToken 可以继续 refresh
- [ ] refresh 里的旧 session 撤销和新 session 创建使用 transaction
- [ ] `npm run test -w @learn/api -- auth.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Refresh Token 轮换完成了
```
