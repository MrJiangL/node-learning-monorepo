# Task: 错误码契约扩展：全项目 AppError 迁移

## 背景

上一张任务你已经新增了：

```text
apps/api/src/errors/error-code.ts
```

并且让 `AppError.code` 使用了 `ErrorCode` 类型。

这一步很关键，因为它把错误码从“随手写字符串”变成了“API 契约”。

但目前还有一些 service / middleware / tests 仍然在手写错误码字符串，比如：

```text
PLAN_NOT_FOUND
PROJECT_NOT_FOUND
TODO_NOT_FOUND
VALIDATION_ERROR
RATE_LIMITED
NOT_FOUND
INTERNAL_SERVER_ERROR
```

这张任务要做的是：把错误码契约从 auth 扩展到全项目。

---

## 你会练到什么

- 如何渐进式迁移工程契约，而不是一次性大改失控
- 为什么 `as const` 能让 TypeScript 保留字符串字面量类型
- 为什么 `AppError.code: ErrorCode` 能反向发现项目里遗漏的错误码
- 如何用搜索驱动重构
- 如何判断哪些字符串该变成常量，哪些普通文案不需要改

---

## 任务 1：阅读错误码类型

打开：

```text
apps/api/src/errors/error-code.ts
```

确认里面有：

```ts
export const ERROR_CODE = {
  AUTH_REQUIRED: "AUTH_REQUIRED",
  INVALID_TOKEN: "INVALID_TOKEN",
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  INVALID_REFRESH_TOKEN: "INVALID_REFRESH_TOKEN",
  USER_EMAIL_EXISTS: "USER_EMAIL_EXISTS",
  PLAN_NOT_FOUND: "PLAN_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  TODO_NOT_FOUND: "TODO_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR"
} as const;

export type ErrorCode = (typeof ERROR_CODE)[keyof typeof ERROR_CODE];
```

你需要在本文档底部写一个小复盘：

```markdown
## 我的理解

### `as const` 是什么？

...

### `(typeof ERROR_CODE)[keyof typeof ERROR_CODE]` 是什么？

...
```

不用写很长，用自己的话写清楚就行。

---

## 任务 2：用 rg 搜索还在手写的错误码

运行：

```bash
rg '"(PLAN_NOT_FOUND|PROJECT_NOT_FOUND|TODO_NOT_FOUND|VALIDATION_ERROR|RATE_LIMITED|NOT_FOUND|INTERNAL_SERVER_ERROR)"' apps/api/src apps/api/tests -n
```

你会看到一些源码和测试还在手写字符串。

注意：这张任务只改“错误码字符串”，不要改普通 message，例如：

```text
Invalid refresh token
Unexpected server error
```

这些是给人看的文案，不是稳定错误码。

---

## 任务 3：迁移 src 里的错误码

修改这些文件中传给 `AppError` 或响应体 `error.code` 的字符串：

```text
apps/api/src/modules/plans/plans.service.ts
apps/api/src/modules/projects/projects.service.ts
apps/api/src/modules/todos/todos.service.ts
apps/api/src/http/validation-error.ts
apps/api/src/middleware/rate-limit.ts
apps/api/src/middleware/not-found.ts
apps/api/src/middleware/error-handler.ts
```

示例：

```ts
import { ERROR_CODE } from "../../errors/error-code.js";

throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan not found");
```

如果文件层级不同，import 路径要对应调整：

```ts
import { ERROR_CODE } from "../errors/error-code.js";
```

---

## 任务 4：迁移测试里的错误码断言

至少挑这些测试文件，把明显重复的错误码断言改成 `ERROR_CODE.xxx`：

```text
apps/api/tests/integration/plans.test.ts
apps/api/tests/integration/projects.test.ts
apps/api/tests/integration/todos.test.ts
apps/api/tests/unit/validation-error.test.ts
apps/api/tests/unit/rate-limit.test.ts
```

你可以直接这样写：

```ts
expect(response.body.error.code).toBe(ERROR_CODE.VALIDATION_ERROR);
```

也可以在 integration 测试里使用 helper：

```ts
expectApiError(response, 400, ERROR_CODE.VALIDATION_ERROR);
```

这张任务不要求你把所有测试都改成 helper，重点是理解错误码来源统一。

---

## 任务 5：运行验证

先跑类型检查：

```bash
npm run typecheck -w @learn/api
```

再跑 API 测试：

```bash
npm run test -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] `src` 里 `AppError` 和错误响应不再手写已纳入契约的错误码
- [ ] 主要测试文件开始使用 `ERROR_CODE.xxx`
- [ ] 你写了 `as const` 和 `ErrorCode` 的理解
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run test -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
错误码全项目迁移完成了
```
