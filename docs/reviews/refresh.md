# Refresh Token Session 复盘

## 登录链路

1. 客户端请求 `POST /auth/login`，body 里带上 `email` 和 `password`。
2. route 层用 `loginUserSchema` 校验 body。
3. service 层通过 email 查询用户。
4. service 层用 `verifyPassword()` 校验密码。
5. 密码正确后，service 层签发 `accessToken`。
6. service 层生成 `refreshToken`。
7. service 层把 `refreshToken` hash 后保存到 `UserSession.refreshTokenHash`。
8. API 返回 `user + accessToken + refreshToken`。

`accessToken` 后续放在哪里？

当前学习项目里，前端把 `accessToken` 放在 `localStorage`，后续请求受保护接口时放到 `Authorization: Bearer <accessToken>` header 里。

`refreshToken` 后续用来干嘛？

`refreshToken` 用来请求 `POST /auth/refresh`，换取新的 `accessToken`。它不是用来直接访问普通业务接口的。

为什么 session 里不保存明文 `refreshToken`？

`refreshToken` 和密码很像：拿到它的人就能换新的 `accessToken`。所以数据库里只保存 `refreshTokenHash`。客户端下次带 refresh token 来时，服务端先 hash 一次，再用 hash 查 session。

## Refresh 链路

1. 客户端请求 `POST /auth/refresh`，body 里带上 `refreshToken`。
2. route 层用 `refreshTokenSchema` 校验 body。
3. service 层先 hash 客户端传过来的 `refreshToken`。
4. service 层用 hash 查询 `UserSession`，并通过 session 关联查询 `user`。
5. 如果 session 不存在、已撤销、已过期，返回 `401 INVALID_REFRESH_TOKEN`。
6. 如果 session 有效，用 session 关联的 user 重新签发 `accessToken`。
7. API 返回 `user + accessToken + refreshToken`。

为什么 `refreshToken` 可以不用传 userId，也能知道是哪个用户？

因为登录时已经在 `UserSession` 表里保存了这条关系：

```text
refreshToken -> hash -> UserSession.refreshTokenHash -> UserSession.userId -> User
```

也就是说，`refreshToken` 自己不一定携带 userId，但它对应的 session 记录携带 `userId`。服务端通过 `refreshTokenHash` 找到 session，再通过 session 的 `userId` 找到用户。

为什么 refresh 接口不直接相信客户端传来的 userId？

因为客户端传来的任何数据都可能被人为修改。如果 refresh 接口相信 body 里的 `userId`，攻击者就可能拿自己的 refresh token，再传别人的 userId，尝试换出别人的 access token。真正可信的是服务端数据库里 session 和 user 的关系。

为什么无效、撤销、过期三种情况都返回同一个 `INVALID_REFRESH_TOKEN`？

因为对客户端来说，它们的处理方式都一样：这个 refresh token 不能继续换 access token。统一错误还能避免泄露更多信息，比如“这个 token 是否曾经存在过”。

## Logout 链路

1. 客户端请求 `POST /auth/logout`，body 里带上 `refreshToken`。
2. route 层用 `refreshTokenSchema` 校验 body。
3. service 层 hash `refreshToken`。
4. service 层把匹配的 session 更新为 revoked。
5. API 返回 `204 No Content`。

为什么 logout 不返回 `{ success: true }`？

因为 `204 No Content` 的语义就是“请求成功，但没有响应体”。既然没有新的资源或数据要返回，就不需要再额外返回 JSON。

为什么 `refreshToken` 不存在时也可以让 logout 成功？

logout 可以设计成幂等操作：不管 token 原本是否有效，最终结果都是“这个 token 不能再用了”。这样也不会向外泄露某个 refresh token 是否真实存在。
