# Task: Add Request Logging Middleware

## 目标

现在你已经完成了：

```text
Express API -> MySQL -> 注册登录 -> JWT 鉴权 -> 权限测试 -> API smoke 脚本
```

下一步我们要开始补真实后端项目里很常见的一块能力：

```text
请求日志 request logging
```

你要做一个 Express middleware，让每次请求结束后输出类似这样的日志：

```text
GET /health 200 5ms
POST /auth/login 200 31ms
GET /plans 401 2ms
```

这张任务主要学习：

- Express middleware 的执行顺序。
- 如何统计一次请求耗时。
- 为什么要监听 `response.on("finish")`。
- 日志应该放在“业务代码外面”，不要散落在每个 route 里。
- 如何给 middleware 写一个简单集成测试。

---

## Step 1: 新建 request logger middleware

新建文件：

```text
apps/api/src/middleware/request-logger.ts
```

写入：

```ts
import type { RequestHandler } from "express";

export const requestLogger: RequestHandler = (request, response, next) => {
  // Date.now() 记录当前时间戳，单位是毫秒。
  //
  // 这里是在请求刚进入 middleware 时记录开始时间。
  // 等响应结束后，再用新的 Date.now() 减去 startTime，
  // 就能得到这次请求总共花了多久。
  const startTime = Date.now();

  // response 的 finish 事件会在响应真正发送完成后触发。
  //
  // 为什么不在 next() 后面直接 console.log？
  // 因为 next() 只是把请求交给下一个 middleware / route，
  // 并不代表响应已经完成。
  response.on("finish", () => {
    const durationMs = Date.now() - startTime;

    // originalUrl 包含完整路径和 query string。
    // 例如：/plans?page=1&pageSize=10
    //
    // statusCode 是最终响应状态码。
    // 例如：200、201、400、401、404、500。
    console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`);
  });

  // middleware 如果不调用 next()，请求就会卡在这里。
  //
  // 这行表示：日志 middleware 只是旁路观察请求，
  // 不负责终止请求，也不负责返回响应。
  next();
};
```

学习点：

- middleware 可以做横切逻辑，比如日志、鉴权、错误处理。
- `response.on("finish")` 适合做“请求结束后”的记录。
- 日志里先记录最小有用信息：method、url、status、duration。

---

## Step 2: 在 app.ts 注册 middleware

打开：

```text
apps/api/src/app.ts
```

找到类似：

```ts
app.use(express.json());
```

把 `requestLogger` 放在正常路由之前。

示例：

```ts
import { requestLogger } from "./middleware/request-logger.js";

export function createApp() {
  const app = express();

  // requestLogger 要尽量靠前注册。
  //
  // 这样它可以覆盖后面的所有业务路由：
  // - /health
  // - /auth/register
  // - /auth/login
  // - /plans
  app.use(requestLogger);

  app.use(express.json());

  return app;
}
```

注意：

- 它应该在正常路由之前。
- 它不一定要在 `express.json()` 之前，但放前面可以覆盖更多请求。
- 它不能放在 `errorHandler` 后面，否则很多请求已经结束了。

---

## Step 3: 手动验证日志

启动服务：

```bash
npm run dev
```

另开一个终端请求：

```bash
curl http://localhost:3001/health
```

你应该能在服务终端看到类似：

```text
GET /health 200 3ms
```

再试一个未登录接口：

```bash
curl http://localhost:3001/plans
```

应该能看到类似：

```text
GET /plans 401 2ms
```

学习点：

- 日志不只记录成功请求，也记录失败请求。
- 401/404/500 这些错误状态码对排查问题很重要。

---

## Step 4: 写一个最小集成测试

打开：

```text
apps/api/tests/integration/health.test.ts
```

可以新增一个测试，用 `console.log` spy 验证 middleware 被调用。

示例：

```ts
it("logs requests after the response finishes", async () => {
  const app = createApp();

  // vi.spyOn 可以临时监听某个函数有没有被调用。
  //
  // 这里我们监听 console.log，因为 requestLogger 会把请求日志写到 console.log。
  // mockImplementation(() => {}) 是为了测试时不真的把日志打印到终端。
  const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});

  try {
    await request(app).get("/health").expect(200);

    // expect.stringMatching 用正则检查字符串格式。
    //
    // 这里不直接断言具体耗时，因为 duration 每次运行都可能不同。
    // 所以只检查它是不是形如：
    // GET /health 200 3ms
    expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/^GET \/health 200 \d+ms$/));
  } finally {
    // 测试结束后一定要恢复 console.log。
    //
    // 如果不 restore，后面的测试可能也会受到这个 spy 影响。
    logSpy.mockRestore();
  }
});
```

你可能需要把 import 改成：

```ts
import { describe, expect, it, vi } from "vitest";
```

学习点：

- 测试日志这类副作用时，可以用 spy。
- 耗时不稳定，所以不要断言具体数字。
- `finally` 可以保证测试失败时也恢复 mock。

---

## Step 5: 思考一个小问题

你实现完后，想一下：

```text
为什么 requestLogger 不应该写在每个 route 里面？
```

答案方向：

- 每个 route 都写会重复。
- 容易漏掉新路由。
- 日志是横切能力，middleware 更适合。
- 以后要改日志格式，只改一个文件。

---

## 完成标准

你完成后告诉我：

```text
请求日志 middleware 完成了
```

我会帮你检查：

1. 日志 middleware 是否覆盖所有请求。
2. 测试是否稳定，不依赖具体毫秒数。
3. `console.log` spy 是否恢复。
4. `npm run test` 是否通过。
5. `npm run typecheck` 是否通过。
6. `npm run format:check` 是否通过。
7. `npm run build` 是否通过。

---

## 这张任务最重要的一句话

```text
middleware 适合处理横切能力：日志、鉴权、错误处理。
```

你已经写过鉴权 middleware。

现在再写日志 middleware，Express 的 middleware 模型会更清楚。
