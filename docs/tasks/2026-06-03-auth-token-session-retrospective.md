# Task: 后端鉴权复盘：access token / refresh token / session

## 背景

你已经完成了 refresh token session 的第一版：

```text
POST /auth/login -> 返回 accessToken + refreshToken
POST /auth/refresh -> 用 refreshToken 换新的 accessToken
POST /auth/logout -> 撤销 refreshToken 对应的 session
```

这张任务先不急着继续堆新功能。

鉴权是后端里非常容易“代码能跑，但脑子里链路不清楚”的模块，所以这张任务的目标是把你刚写过的代码讲明白、画明白、测明白。

---

## 你会练到什么

- 解释 access token 和 refresh token 的职责差异
- 理解为什么 refresh token 要落库，而 access token 通常不落库
- 理解 session 表如何支持服务端撤销登录
- 理解为什么数据库只能保存 `refreshTokenHash`，不能保存 refresh token 明文
- 通过一个小测试验证“过期 session 不能刷新”
- 用自己的话复盘鉴权链路

---

## 任务 1：读代码并画出登录链路

阅读这些文件：

```text
apps/api/src/modules/auth/auth.routes.ts
apps/api/src/modules/auth/auth.service.ts
apps/api/src/modules/auth/refresh-token.ts
apps/api/src/modules/auth/token.ts
prisma/schema.prisma
```

在本文档下面新增一个小节：

```markdown
## 我的复盘

### 登录链路

1. 客户端请求 `POST /auth/login`，body 里带上 `email` 和 `password`。
2. route 层用 `loginUserSchema` 校验 body。
3. service 层通过 email 查询用户。
4. service 层用 `verifyPassword()` 校验密码。
5. 密码正确后，service 层签发 `accessToken`。
6. service 层生成 `refreshToken`。
7. service 层把 `refreshToken` hash 后保存到 `UserSession.refreshTokenHash`。
8. API 返回 `user + accessToken + refreshToken`。
```

你可以照着这个结构写，但不要只复制。

你要用自己的话补充：

```text
accessToken 后续放在哪里？
refreshToken 后续用来干嘛？
为什么 session 里不保存明文 refreshToken？
```

---

## 任务 2：读代码并画出 refresh 链路

继续在 `## 我的复盘` 下新增：

```markdown
### Refresh 链路

1. 客户端请求 `POST /auth/refresh`，body 里带上 `refreshToken`。
2. route 层用 `refreshTokenSchema` 校验 body。
3. service 层先 hash 客户端传来的 refreshToken。
4. service 层用 hash 查询 `UserSession`。
5. 如果 session 不存在、已撤销、已过期，返回 `401 INVALID_REFRESH_TOKEN`。
6. 如果 session 有效，用 session 关联的 user 重新签发 accessToken。
7. API 返回 `user + accessToken + refreshToken`。
```

你要额外回答两个问题：

```text
为什么 refresh 接口不直接相信客户端传来的 userId？
为什么无效、撤销、过期三种情况都返回同一个 INVALID_REFRESH_TOKEN？
```

---

## 任务 3：读代码并画出 logout 链路

继续新增：

```markdown
### Logout 链路

1. 客户端请求 `POST /auth/logout`，body 里带上 `refreshToken`。
2. route 层用 `refreshTokenSchema` 校验 body。
3. service 层 hash refreshToken。
4. service 层把匹配的 session 更新为 revoked。
5. API 返回 `204 No Content`。
```

你要额外回答：

```text
为什么 logout 不返回 `{ success: true }`？
为什么 refreshToken 不存在时也可以让 logout 成功？
```

---

## 任务 4：补一个过期 session 的测试

在这个文件里新增一个测试：

```text
apps/api/tests/integration/auth.test.ts
```

测试描述用中文：

```ts
it("过期的 refreshToken 不能刷新 accessToken", async () => {
  const app = createApp();

  await request(app).post("/auth/register").send({
    email: "expired-refresh@example.com",
    password: "password123"
  });

  const loginResponse = await request(app).post("/auth/login").send({
    email: "expired-refresh@example.com",
    password: "password123"
  });

  const refreshToken = loginResponse.body.data.refreshToken as string;

  await prisma.userSession.updateMany({
    data: {
      expiresAt: new Date(Date.now() - 1000)
    }
  });

  const response = await request(app).post("/auth/refresh").send({
    refreshToken
  });

  expect(response.status).toBe(401);
  expect(response.body.error.code).toBe("INVALID_REFRESH_TOKEN");
});
```

### 这段测试在验证什么？

这段测试不是在验证“数据库能 update”。

它验证的是：

```text
即使 refreshToken 是系统真实签发过的，
只要它对应的 session 已经过期，
refresh 接口也不能再签发新的 accessToken。
```

---

## 任务 5：运行验证

先只跑 auth 测试：

```bash
npm run test -w @learn/api -- auth.test.ts
```

预期：

```text
auth.test.ts 全部通过
```

再跑 API 类型检查：

```bash
npm run typecheck -w @learn/api
```

预期：

```text
没有 TypeScript 报错
```

---

## 完成标准

- [ ] 你在本文档写了 `## 我的复盘`
- [ ] 你能解释 login / refresh / logout 三条链路
- [ ] 你能解释为什么 refresh token 明文不能入库
- [ ] 你补了“过期 refreshToken 不能刷新 accessToken”的测试
- [ ] `npm run test -w @learn/api -- auth.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过

完成后告诉我：

```text
鉴权复盘完成了
```

我会帮你检查复盘内容、补注释、跑验证，然后进入下一张后端工程化任务。
