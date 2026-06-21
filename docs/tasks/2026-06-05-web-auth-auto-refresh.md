# Task: 前端鉴权工程化：Access Token 过期后自动 Refresh

## 背景

后端现在已经支持：

```text
POST /auth/login -> accessToken + refreshToken
POST /auth/refresh -> 新 accessToken + 新 refreshToken
```

而且 refresh token 已经做了 rotation：

```text
每次 refresh 成功后，旧 refreshToken 失效，新 refreshToken 生效
```

但前端现在只保存了 `accessToken`：

```ts
setAuthToken(result.data.accessToken);
```

这会导致一个问题：

```text
accessToken 过期后，前端只能清空登录态，让用户重新登录。
```

这张任务要把前端接上后端的 refresh token 机制。

---

## 目标

实现一个最小可用的前端自动刷新流程：

```text
1. 登录成功后保存 accessToken + refreshToken
2. API 请求收到 401 时，调用 /auth/refresh
3. refresh 成功后更新 accessToken + refreshToken
4. 用新的 accessToken 重试原请求一次
5. refresh 失败时清理登录态
```

---

## 你会练到什么

- 前端如何承接 access token / refresh token 契约
- 为什么 refresh token rotation 后，前端也要更新 refreshToken
- API client 如何做“失败后重试一次”
- 为什么重试只能做一次，不能无限循环
- Vue 项目里如何把鉴权逻辑放在 API 层，而不是散落在页面组件里

---

## 任务 1：扩展 token storage

修改：

```text
apps/web/src/auth/token-storage.ts
```

现在只有 `auth_token`，你要增加 refresh token：

```ts
const AUTH_TOKEN_KEY = "auth_token";
const REFRESH_TOKEN_KEY = "refresh_token";
```

新增函数：

```ts
export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}
```

并更新 `clearAuthToken()`：

```ts
export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
```

---

## 任务 2：登录成功后保存 refreshToken

修改：

```text
apps/web/src/pages/LoginPage/index.vue
```

引入：

```ts
import { setAuthToken, setRefreshToken } from "../../auth/token-storage";
```

登录成功后：

```ts
setAuthToken(result.data.accessToken);
setRefreshToken(result.data.refreshToken);
```

注意：后端现在 refresh token 会轮换，所以前端必须保存最新的 refreshToken。

---

## 任务 3：新增 refresh API

修改：

```text
apps/web/src/api/auth.ts
```

新增类型：

```ts
export type RefreshTokenResponse = {
  success: true;
  data: AuthTokenResult;
};
```

新增函数：

```ts
export async function refreshAuthToken(refreshToken: string): Promise<RefreshTokenResponse> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  if (!response.ok) {
    throw await parseApiError(response, "登录已过期，请重新登录");
  }

  return response.json() as Promise<RefreshTokenResponse>;
}
```

---

## 任务 4：新增 authenticatedFetch helper

创建文件：

```text
apps/web/src/api/authenticated-fetch.ts
```

实现：

```ts
import { refreshAuthToken } from "./auth";
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken
} from "../auth/token-storage";

function withAuthHeader(headers: HeadersInit | undefined, accessToken: string): HeadersInit {
  return {
    ...headers,
    Authorization: `Bearer ${accessToken}`
  };
}

export async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {}
): Promise<Response> {
  const accessToken = getAuthToken();

  const firstResponse = await fetch(input, {
    ...init,
    headers: accessToken ? withAuthHeader(init.headers, accessToken) : init.headers
  });

  if (firstResponse.status !== 401) {
    return firstResponse;
  }

  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthToken();
    return firstResponse;
  }

  try {
    const refreshResult = await refreshAuthToken(refreshToken);

    setAuthToken(refreshResult.data.accessToken);
    setRefreshToken(refreshResult.data.refreshToken);

    return fetch(input, {
      ...init,
      headers: withAuthHeader(init.headers, refreshResult.data.accessToken)
    });
  } catch {
    clearAuthToken();
    return firstResponse;
  }
}
```

### 为什么只重试一次？

如果新的 accessToken 仍然返回 401，说明问题不是“accessToken 过期”这么简单。

可能是：

```text
refreshToken 也失效了
用户被删除了
后端鉴权配置变了
```

这时无限重试只会制造死循环。

---

## 任务 5：让业务 API 使用 authenticatedFetch

修改：

```text
apps/web/src/api/projects.ts
apps/web/src/api/todos.ts
```

把里面的：

```ts
fetch(...)
```

逐步换成：

```ts
authenticatedFetch(...)
```

注意：

```text
如果原来函数参数里已经传 token，可以先保留参数不动。
这一张任务重点是把请求底层切到 authenticatedFetch。
后面再单独清理 token 参数。
```

---

## 任务 6：运行验证

跑前端类型检查：

```bash
npm run typecheck -w @learn/web
```

跑前端测试：

```bash
npm run test -w @learn/web
```

跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] 登录成功后保存 `accessToken` 和 `refreshToken`
- [ ] `clearAuthToken()` 同时清理两个 token
- [ ] 新增 `refreshAuthToken()`
- [ ] 新增 `authenticatedFetch()`
- [ ] 业务 API 请求 401 时能 refresh 并重试一次
- [ ] refresh 失败时清理登录态
- [ ] `npm run typecheck -w @learn/web` 通过
- [ ] `npm run test -w @learn/web` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
前端自动 refresh 完成了
```
