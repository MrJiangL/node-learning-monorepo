# Task: Zod Validation Error Helper

## 目标

现在 route 里有很多重复代码：

```ts
if (error instanceof ZodError) {
  throw new AppError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid request body");
}

throw error;
```

这一张任务把它抽成一个 helper，让 plans / projects / todos 的校验错误处理更统一。

你要练的是：

- 把重复异常处理逻辑抽成函数。
- 保留错误响应格式不变。
- 保持 route 只负责 HTTP 流程。
- 用中文 `it(...)` 描述测试意图。

---

## Step 1: 创建 validation error helper

创建文件：

```text
apps/api/src/http/validation-error.ts
```

写入：

```ts
import { ZodError } from "zod";
import { AppError } from "../errors/app-error.js";

type ValidationSource = "body" | "query";

export function mapZodErrorToAppError(error: unknown, source: ValidationSource): never {
  if (error instanceof ZodError) {
    // ZodError.issues 里可能有多条错误。
    //
    // 学习阶段先返回第一条错误 message，
    // 这样响应简单，前端也容易显示。
    const fallbackMessage = source === "query" ? "Invalid query string" : "Invalid request body";
    const message = error.issues[0]?.message ?? fallbackMessage;

    throw new AppError(400, "VALIDATION_ERROR", message);
  }

  // 这个 helper 只处理 ZodError。
  //
  // 如果是数据库错误、业务错误或未知错误，继续往外抛，
  // 交给 errorHandler 做统一处理。
  throw error;
}
```

学习点：

- 参数类型用 `unknown`，因为 catch 到的错误不一定是 Error。
- 返回类型 `never` 表示这个函数不会正常返回，只会 throw。
- `source` 用来区分 body/query，从而给不同 fallback message。

---

## Step 2: 给 helper 写单元测试

创建文件：

```text
apps/api/tests/unit/validation-error.test.ts
```

写入：

```ts
import { z } from "zod";
import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { mapZodErrorToAppError } from "../../src/http/validation-error.js";

describe("validation error helper", () => {
  it("把 Zod body 错误转换成 AppError", () => {
    const schema = z.object({
      title: z.string().min(1, "Title is required")
    });

    const result = schema.safeParse({
      title: ""
    });

    if (result.success) {
      throw new Error("这个测试需要 safeParse 失败");
    }

    expect(() => mapZodErrorToAppError(result.error, "body")).toThrow(AppError);

    try {
      mapZodErrorToAppError(result.error, "body");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Title is required"
      });
    }
  });

  it("把 Zod query 错误转换成 AppError", () => {
    const schema = z.object({
      page: z.coerce.number().int().min(1, "Page must be at least 1")
    });

    const result = schema.safeParse({
      page: "0"
    });

    if (result.success) {
      throw new Error("这个测试需要 safeParse 失败");
    }

    try {
      mapZodErrorToAppError(result.error, "query");
    } catch (error) {
      expect(error).toMatchObject({
        statusCode: 400,
        code: "VALIDATION_ERROR",
        message: "Page must be at least 1"
      });
    }
  });

  it("非 ZodError 会继续抛出原错误", () => {
    const originalError = new Error("Database failed");

    expect(() => mapZodErrorToAppError(originalError, "body")).toThrow(originalError);
  });
});
```

---

## Step 3: 更新 plans routes

打开：

```text
apps/api/src/modules/plans/plans.routes.ts
```

删掉：

```ts
import { ZodError } from "zod";
import { AppError } from "../../errors/app-error.js";
```

新增：

```ts
import { mapZodErrorToAppError } from "../../http/validation-error.js";
```

把 query catch 从：

```ts
if (error instanceof ZodError) {
  throw new AppError(400, "VALIDATION_ERROR", error.issues[0]?.message ?? "Invalid query string");
}

throw error;
```

改成：

```ts
mapZodErrorToAppError(error, "query");
```

把 body catch 改成：

```ts
mapZodErrorToAppError(error, "body");
```

注意：

```text
GET /plans 用 query。
POST /plans 和 PATCH /plans/:id 用 body。
```

---

## Step 4: 更新 projects routes

打开：

```text
apps/api/src/modules/projects/projects.routes.ts
```

同样删掉 `ZodError` 和 `AppError` 导入，新增：

```ts
import { mapZodErrorToAppError } from "../../http/validation-error.js";
```

把两个 body catch 都改成：

```ts
mapZodErrorToAppError(error, "body");
```

---

## Step 5: 更新 todos routes

打开：

```text
apps/api/src/modules/todos/todos.routes.ts
```

同样删掉 `ZodError` 和 `AppError` 导入，新增：

```ts
import { mapZodErrorToAppError } from "../../http/validation-error.js";
```

三个 catch 分别是：

```ts
// GET /projects/:projectId/todos
mapZodErrorToAppError(error, "query");

// POST /projects/:projectId/todos
mapZodErrorToAppError(error, "body");

// PATCH /todos/:id
mapZodErrorToAppError(error, "body");
```

---

## Step 6: 跑测试

先跑本任务相关测试：

```bash
npm run test -w @learn/api -- tests/unit/validation-error.test.ts tests/integration/plans.test.ts tests/integration/projects.test.ts tests/integration/todos.test.ts
```

再跑类型检查：

```bash
npm run typecheck
```

如果都过，再跑全量：

```bash
npm run test
npm run format:check
npm run build
```

完成后告诉我：

```text
Zod 错误 helper 完成了
```

然后我会继续帮你：

- 跑完整验证。
- 检查是否还有重复的 `error instanceof ZodError`。
- 补更细的中文注释。
- 更新任务索引。
- 给下一张任务卡。
