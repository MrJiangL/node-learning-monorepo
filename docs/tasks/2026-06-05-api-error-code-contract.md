# Task: 后端工程化：API 错误码契约和测试 helper

## 背景

现在项目里已经有统一错误响应：

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REFRESH_TOKEN",
    "message": "Invalid refresh token"
  }
}
```

但目前错误码还是散落在 service / middleware / tests 里手写字符串。

这张任务不做大功能，而是做一个很典型的后端工程化练习：把“稳定的错误码契约”集中管理，并让测试 helper 更好用。

---

## 目标

新增一个统一错误码文件：

```text
apps/api/src/errors/error-code.ts
```

把常见错误码集中到这里：

```ts
export const ERROR_CODE = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
```

然后逐步把 auth 相关代码从手写字符串改成 `ERROR_CODE.xxx`。

---

## 你会练到什么

- 后端 API 契约为什么要稳定
- 为什么错误码适合集中管理
- `as const` 和联合类型的用法
- service / middleware / test 如何共享同一套错误码
- 测试 helper 如何减少重复断言

---

## 任务 1：新增错误码文件

创建文件：

```text
apps/api/src/errors/error-code.ts
```

写入：

```ts
// 错误码是 API 契约的一部分。
//
// 前端、测试、文档都可能依赖这些字符串。
// 如果它们散落在各个 service / middleware 里，后面拼错或改名会很难发现。
export const ERROR_CODE = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR"
} as const;

// 这里得到的是一个字符串字面量联合类型：
//
// "AUTH_REQUIRED" | "INVALID_TOKEN" | ...
//
// 后面如果 AppError 的 code 使用 ErrorCode，
// TypeScript 就能帮我们发现拼写错误。
export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
```

---

## 任务 2：让 AppError 使用 ErrorCode

修改：

```text
apps/api/src/errors/app-error.ts
```

改成：

```ts
import type { ErrorCode } from "./error-code.js";

// AppError 是我们自己定义的“可预期业务错误”。
//
// 普通 Error 只有 message，不知道应该返回 400、401 还是 404。
// 所以这里额外保存：
// - statusCode：HTTP 状态码
// - code：给前端或调用方看的稳定错误码
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: ErrorCode;

  constructor(statusCode: number, code: ErrorCode, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

---

## 任务 3：先改 auth 相关错误码

修改这些文件：

```text
apps/api/src/modules/auth/auth.service.ts
apps/api/src/middleware/require-auth.ts
```

把手写字符串改成：

```ts
ERROR_CODE.INVALID_CREDENTIALS;
ERROR_CODE.INVALID_REFRESH_TOKEN;
ERROR_CODE.AUTH_REQUIRED;
ERROR_CODE.INVALID_TOKEN;
```

注意：这张任务先只改 auth 相关代码，不要一次性全项目替换。

---

## 任务 4：补一个测试 helper

修改：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

新增：

```ts
export function expectApiError(
  response: { status: number; body: { error?: { code?: string } } },
  status: number,
  code: string
) {
  // 这个 helper 只封装重复断言，不隐藏测试意图。
  //
  // 测试里仍然能清楚看到：
  // - 期望哪个 HTTP status
  // - 期望哪个业务错误码
  expect(response.status).toBe(status);
  expect(response.body.error?.code).toBe(code);
}
```

然后在 `auth.test.ts` 里挑 2-3 个错误测试使用它。

例如：

```ts
expectApiError(response, 401, ERROR_CODE.INVALID_REFRESH_TOKEN);
```

---

## 任务 5：运行验证

先跑 auth 测试：

```bash
npm run test -w @learn/api -- auth.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] 新增 `apps/api/src/errors/error-code.ts`
- [ ] `AppError.code` 使用 `ErrorCode`
- [ ] auth 相关错误码不再手写字符串
- [ ] `auth.test.ts` 至少 2 个错误断言使用 `expectApiError`
- [ ] `npm run test -w @learn/api -- auth.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
错误码契约完成了
```
