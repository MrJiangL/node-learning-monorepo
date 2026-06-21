# Task: Control Request Logger Test Noise

## 目标

现在 `requestLogger` 已经能记录每个请求：

```text
GET /plans 200 3ms
POST /auth/login 200 35ms
```

但你应该也注意到了：跑测试时输出会变得很长。

这张任务要让日志支持一个简单配置：

```text
测试环境默认不打印请求日志，开发环境继续打印。
```

这不是为了“隐藏问题”，而是为了让测试输出更聚焦。

---

## 你会练到什么

- 如何让 middleware 接收配置。
- 如何区分测试环境和开发环境。
- 为什么测试输出太吵会影响调试。
- 如何测试“没有打印日志”这种反向行为。

---

## Step 1: 给 requestLogger 增加开关

打开：

```text
apps/api/src/middleware/request-logger.ts
```

把现在的固定 logger 改成工厂函数：

```ts
import type { RequestHandler } from "express";

export type RequestLoggerOptions = {
  enabled: boolean;
};

export function createRequestLogger(options: RequestLoggerOptions): RequestHandler {
  return (request, response, next) => {
    if (!options.enabled) {
      next();
      return;
    }

    const startTime = Date.now();

    response.on("finish", () => {
      const durationMs = Date.now() - startTime;
      console.log(
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`
      );
    });

    next();
  };
}
```

学习点：

- 固定 middleware 适合简单场景。
- 工厂函数适合需要传配置的 middleware。
- `enabled=false` 时要立刻 `next()`，不要阻塞请求。

---

## Step 2: 在 env.ts 增加 NODE_ENV

打开：

```text
apps/api/src/config/env.ts
```

在 schema 里加入：

```ts
NODE_ENV: z.enum(["development", "test", "production"]).default("development");
```

学习点：

- `NODE_ENV` 常用来区分运行环境。
- 测试环境可以关闭 noisy log。
- 开发环境可以继续打印请求日志。

---

## Step 3: 在 app.ts 使用配置

打开：

```text
apps/api/src/app.ts
```

把 import 改成：

```ts
import { env } from "./config/env.js";
import { createRequestLogger } from "./middleware/request-logger.js";
```

注册 middleware 时：

```ts
app.use(
  createRequestLogger({
    enabled: env.NODE_ENV !== "test"
  })
);
```

学习点：

- 业务路由不需要知道日志开关。
- app 组装层负责把 env 配置传给 middleware。

---

## Step 4: 更新测试

打开：

```text
apps/api/tests/integration/health.test.ts
```

现在默认测试环境应该不打印日志。

可以把原来的日志测试改成：

```ts
it("does not log requests in test environment", async () => {
  const app = createApp();
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  try {
    await request(app).get("/health").expect(200);

    expect(logSpy).not.toHaveBeenCalled();
  } finally {
    logSpy.mockRestore();
  }
});
```

如果你还想保留“logger 打印格式”的测试，可以单独测试 middleware 工厂，或者以后再补。

这张任务先保持简单。

---

## Step 5: 跑测试

先跑：

```bash
npm run test -w @learn/api -- tests/integration/health.test.ts
```

再跑完整验证：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

---

## 完成标准

完成后告诉我：

```text
请求日志噪音控制完成了
```

我会帮你检查：

1. 测试环境是否默认不打印请求日志。
2. 开发环境是否仍然可以打印。
3. middleware 是否没有阻塞请求。
4. env 测试是否需要补 `NODE_ENV`。
5. 全量测试、类型检查、格式检查、构建、smoke 是否通过。

---

## 这张任务最重要的一句话

```text
日志要有用，也要可控。
```

开发时日志帮助你观察系统；测试时过多日志会淹没有价值的失败信息。
