# Task: Vue Error Response And Auth State

## 目标

这一张任务把前端的错误处理从“固定写死文案”升级成“尽量读取后端返回的错误信息”。

现在很多 API client 都是这样：

```ts
if (!response.ok) {
  throw new Error("创建 Project 失败");
}
```

这能用，但学习真实项目时会遇到两个问题：

```text
后端明明返回了具体错误，前端没有展示
401 token 失效时，前端没有统一清理登录态
```

这次目标是：

```text
封装一个 parseApiError helper
登录 / Project / Todo 请求都复用它
封装 setAuthToken / clearAuthToken
401 时清理 token
页面上显示更接近后端的错误 message
```

---

## 你会练到什么

- 后端错误响应 envelope 的前端解析方式
- `unknown` 数据如何安全收窄类型
- 为什么不要在每个 API 文件里重复写 `response.json()`
- 为什么 token 的读写删应该统一放在 `token-storage.ts`
- 401 Unauthorized 在前端通常应该触发什么行为

---

## Step 1: 创建 API error helper

创建：

```text
apps/web/src/api/api-error.ts
```

写入：

```ts
type ApiErrorBody = {
  success: false;
  error: {
    code: string;
    message: string;
  };
};

function isApiErrorBody(value: unknown): value is ApiErrorBody {
  // fetch 解析出来的 JSON 在 TypeScript 里是 unknown。
  //
  // unknown 的意思是：“我还不知道它长什么样”。
  // 所以读取 value.error.message 前，要先确认结构真的存在。
  if (typeof value !== "object" || value === null) {
    return false;
  }

  if (!("success" in value) || !("error" in value)) {
    return false;
  }

  const maybeBody = value as {
    success: unknown;
    error: unknown;
  };

  if (maybeBody.success !== false) {
    return false;
  }

  if (typeof maybeBody.error !== "object" || maybeBody.error === null) {
    return false;
  }

  const maybeError = maybeBody.error as {
    code?: unknown;
    message?: unknown;
  };

  return typeof maybeError.code === "string" && typeof maybeError.message === "string";
}

export async function parseApiError(response: Response, fallbackMessage: string): Promise<Error> {
  // 有些响应可能不是 JSON，例如网络代理错误或空响应。
  // 所以这里用 try/catch 包住 response.json()，避免错误处理本身再崩掉。
  try {
    const body: unknown = await response.json();

    if (isApiErrorBody(body)) {
      return new Error(body.error.message);
    }
  } catch {
    // 解析失败时使用 fallbackMessage。
    //
    // catch 里不需要做额外处理，因为这个 helper 的职责是：
    // “尽量读后端错误，读不到就给默认错误”。
  }

  return new Error(fallbackMessage);
}
```

---

## Step 2: 扩展 token-storage

修改：

```text
apps/web/src/auth/token-storage.ts
```

保留 `getAuthToken`，再增加：

```ts
export function setAuthToken(token: string) {
  // 保存 token 的 key 只应该在这个文件里出现。
  //
  // 这样以后如果想把 auth_token 改成 learn_auth_token，
  // 只需要改这里，不需要全项目搜索替换。
  localStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearAuthToken() {
  // 退出登录、token 失效、用户手动切换账号时，都应该清理 token。
  localStorage.removeItem(AUTH_TOKEN_KEY);
}
```

---

## Step 3: 登录页改用 setAuthToken

修改：

```text
apps/web/src/pages/LoginPage/index.vue
```

增加 import：

```ts
import { setAuthToken } from "../../auth/token-storage";
```

把：

```ts
localStorage.setItem("auth_token", result.data.token);
```

改成：

```ts
setAuthToken(result.data.token);
```

学习重点：

```text
页面组件不应该关心 auth_token 这个具体 key。
页面只表达意图：保存 token。
至于存在哪个 key，是 token-storage 的职责。
```

---

## Step 4: Project 工作台改用 clearAuthToken

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

把 import 改成：

```ts
import { clearAuthToken, getAuthToken } from "../../auth/token-storage";
```

把 `handleLogout` 里的：

```ts
localStorage.removeItem("auth_token");
```

改成：

```ts
clearAuthToken();
```

这里同样是职责分离：

```text
页面负责“退出登录”
token-storage 负责“怎么清理 token”
```

---

## Step 5: auth API 使用 parseApiError

修改：

```text
apps/web/src/api/auth.ts
```

增加 import：

```ts
import { parseApiError } from "./api-error";
```

把：

```ts
if (!response.ok) {
  throw new Error("登录失败，请检查邮箱或密码");
}
```

改成：

```ts
if (!response.ok) {
  throw await parseApiError(response, "登录失败，请检查邮箱或密码");
}
```

注意这里是：

```ts
throw await parseApiError(...)
```

因为 `parseApiError` 是异步函数，它需要先读取响应体里的 JSON。

---

## Step 6: Project API 使用 parseApiError

修改：

```text
apps/web/src/api/projects.ts
```

增加 import：

```ts
import { parseApiError } from "./api-error";
```

把两个 `throw new Error(...)` 分别改成：

```ts
throw await parseApiError(response, "加载 Project 列表失败，请确认你已经登录");
```

和：

```ts
throw await parseApiError(response, "创建 Project 失败");
```

---

## Step 7: Todo API 使用 parseApiError

修改：

```text
apps/web/src/api/todos.ts
```

增加 import：

```ts
import { parseApiError } from "./api-error";
```

把文件里所有：

```ts
throw new Error("...");
```

改成：

```ts
throw await parseApiError(response, "原来的默认错误文案");
```

保留原来的默认错误文案就行。

---

## Step 8: 401 时清理 token

先在 `api-error.ts` 里增加 import：

```ts
import { clearAuthToken } from "../auth/token-storage";
```

然后在 `parseApiError` 函数一开始加：

```ts
if (response.status === 401) {
  // 401 表示当前 token 没有通过后端鉴权。
  //
  // 常见原因：
  // - token 过期
  // - token 被手动改坏
  // - 后端 JWT_SECRET 更换后旧 token 失效
  //
  // 这时继续留着旧 token 只会让用户后续请求继续失败，
  // 所以前端应该主动清理它。
  clearAuthToken();
}
```

这一张先不做“自动跳回登录页”。
下一步我们会再讨论什么时候在 API client 里跳转，什么时候交给页面处理。

---

## Step 9: 跑检查

完成后运行：

```bash
npm run format
npm run typecheck
npm run build
```

你也可以自己做一个手动验证：

1. 打开 `/login`
2. 输入错误密码
3. 看页面错误信息是否来自后端，例如 `Email or password is incorrect`
4. 登录成功进入 `/projects`
5. 打开浏览器 DevTools，手动把 `auth_token` 改成 `bad-token`
6. 点击“加载 Projects”
7. 确认请求失败后 `auth_token` 被清掉

---

## 完成后告诉我

完成后你直接说：

```text
前端错误响应和登录态清理完成了
```

我会继续帮你：

- 跑格式检查
- 跑类型检查
- 跑构建
- 浏览器验证错误密码和坏 token
- 补学习型中文注释
- 更新任务索引
- 给你下一张阶段复盘任务卡
