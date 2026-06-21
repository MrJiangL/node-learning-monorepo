# Task: MySQL 数据库队列：把 worker loop 接入 server 启动流程

## 背景

上一张任务你已经实现了：

```text
startJobWorkerLoop()
```

它能做这件事：

```text
每隔 intervalMs 自动调用 processNextJob()
```

但现在它还只是一个独立函数，`npm run dev` 启动 API 时并不会自动启动 worker。

这张任务要把它接到真正的服务入口：

```text
apps/api/src/server.ts
```

不过我们不要让 worker 默认偷偷启动。

原因是：

```text
本地开发时，数据库里可能有你手动创建的 pending job。
如果 API 一启动就自动处理它们，你可能还没来得及观察状态变化。
```

所以这张任务使用环境变量显式开启：

```text
JOB_WORKER_ENABLED=true
```

---

## 任务 1：给 env 增加 worker 配置

修改：

```text
apps/api/src/config/env.ts
```

给 `envSchema` 增加两个字段：

```ts
JOB_WORKER_ENABLED: z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true"),

JOB_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(1000)
```

为什么 `JOB_WORKER_ENABLED` 不用 `z.coerce.boolean()`？

```text
因为 JavaScript 里 Boolean("false") 是 true。

也就是说，如果你用 coerce.boolean，
"false" 这个字符串反而可能被转成 true。

所以这里用 enum(["true", "false"]) 明确限制输入，
再手动 transform 成 boolean。
```

学习点：

```text
环境变量永远是字符串。

所以任何 boolean / number 配置，
都需要你自己定义清楚转换规则。
```

---

## 任务 2：补 env 测试

修改：

```text
apps/api/tests/unit/env.test.ts
```

补两个测试：

```ts
it("parses worker config from environment variables", () => {
  const env = parseEnv({
    JWT_SECRET: "local-test-secret-123",
    JOB_WORKER_ENABLED: "true",
    JOB_WORKER_INTERVAL_MS: "500"
  });

  expect(env.JOB_WORKER_ENABLED).toBe(true);
  expect(env.JOB_WORKER_INTERVAL_MS).toBe(500);
});
```

再补一个默认值测试：

```ts
it("uses safe worker defaults when worker config is missing", () => {
  const env = parseEnv({
    JWT_SECRET: "local-test-secret-123"
  });

  expect(env.JOB_WORKER_ENABLED).toBe(false);
  expect(env.JOB_WORKER_INTERVAL_MS).toBe(1000);
});
```

为什么默认 `false`？

```text
因为后台任务会改变数据库状态。

默认不开启，更适合学习和本地调试。
等你明确想启动 worker 时，再在 .env 里打开。
```

---

## 任务 3：在 server.ts 中按配置启动 worker

修改：

```text
apps/api/src/server.ts
```

需要引入：

```ts
import { jobQueue } from "./jobs/job-queue-instance.js";
import { processJobByType } from "./jobs/job-processors.js";
import { startJobWorkerLoop } from "./jobs/job-worker-loop.js";
```

然后在 `app.listen` 附近启动：

```ts
const jobWorkerLoop = env.JOB_WORKER_ENABLED
  ? startJobWorkerLoop({
      repository: jobQueue,
      processor: processJobByType,
      intervalMs: env.JOB_WORKER_INTERVAL_MS
    })
  : null;
```

再给它加一段学习注释：

```ts
// worker loop 和 HTTP server 是同一个 Node 进程里的两个工作：
// - HTTP server 负责响应请求
// - worker loop 负责定时处理 pending job
//
// 学习阶段这样放在一起比较直观。
// 真实大型项目里，worker 通常会拆成独立进程或独立服务。
```

---

## 任务 4：服务关闭时 stop worker

继续修改：

```text
apps/api/src/server.ts
```

把 `app.listen(...)` 保存成变量：

```ts
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
```

然后加一个 shutdown 函数：

```ts
const shutdown = () => {
  jobWorkerLoop?.stop();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
```

学习点：

```text
SIGINT:
  通常来自 Ctrl+C

SIGTERM:
  通常来自部署平台或进程管理器要求服务退出
```

为什么退出前要 `jobWorkerLoop?.stop()`？

```text
后台定时器也属于资源。

服务关闭时应该明确停止它，
否则你会很难判断进程到底为什么还没退出。
```

---

## 任务 5：手动验证方式

这张任务有一部分是 server 启动行为，单元测试不太适合直接 import `server.ts`。

你可以这样手动验证：

```bash
JOB_WORKER_ENABLED=true JOB_WORKER_INTERVAL_MS=500 npm run dev -w @learn/api
```

然后另开一个终端创建 job：

```bash
curl -X POST http://localhost:3001/jobs \
  -H "Content-Type: application/json" \
  -d '{"type":"send-email","payload":{"to":"user@example.com"}}'
```

稍等后查看：

```bash
curl http://localhost:3001/jobs
```

你应该能看到任务状态从：

```text
pending
```

变成：

```text
completed
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/unit/env.test.ts
npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] `env.ts` 增加 `JOB_WORKER_ENABLED`
- [x] `env.ts` 增加 `JOB_WORKER_INTERVAL_MS`
- [x] env 测试覆盖 worker 配置解析
- [x] env 测试覆盖 worker 默认值
- [x] `server.ts` 根据 env 决定是否启动 worker loop
- [x] `server.ts` 把 `jobQueue` / `processJobByType` 接给 `startJobWorkerLoop`
- [x] `server.ts` 在 SIGINT / SIGTERM 时 stop worker loop
- [x] `npm run test -w @learn/api -- tests/unit/env.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker-loop.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
worker server 启动接入完成了
```
