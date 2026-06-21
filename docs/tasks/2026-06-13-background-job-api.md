# Task: 后台任务进阶：接入 API 创建任务

## 背景

你已经有了内存队列和 worker：

```text
enqueue 创建任务
processNextJob 处理任务
失败时 attempts + 1
没到上限回到 pending
到上限变 failed
```

现在要让后台任务从“内部代码练习”变成“可以通过 API 创建”。

这张任务先做最小 API：

```text
POST /jobs
GET /jobs
```

先不做真正发邮件，也不做 worker 自动循环。我们只让客户端能创建任务、查看队列。

---

## 任务 1：创建全局内存队列实例

新建：

```text
apps/api/src/jobs/job-queue-instance.ts
```

内容：

```ts
import { createMemoryJobQueue } from "./memory-job-queue.js";

// 学习阶段先用进程内存保存任务。
//
// 注意：真实生产环境不能依赖这种内存队列。
// 因为服务重启后，内存里的 jobs 会全部丢失。
export const jobQueue = createMemoryJobQueue();
```

---

## 任务 2：创建 jobs schema

新建：

```text
apps/api/src/jobs/jobs.schema.ts
```

定义：

```ts
import { z } from "zod";

export const createJobSchema = z.object({
  type: z.string().trim().min(1, "Job type is required").max(100),
  payload: z.record(z.string(), z.unknown()).default({}),
  maxAttempts: z.number().int().min(1).max(10).optional()
});
```

学习点：

```text
payload 这里先允许任意对象。
真实项目里不同 type 通常会有不同 payload schema。
```

---

## 任务 3：创建 jobs routes

新建：

```text
apps/api/src/jobs/jobs.routes.ts
```

实现：

```ts
import { Router } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { HTTP_STATUS } from "../http/http-status.js";
import { mapZodErrorToAppError } from "../http/validation-error.js";
import { createJobSchema } from "./jobs.schema.js";
import { jobQueue } from "./job-queue-instance.js";

export const createJobsRouter = () => {
  const jobsRouter = Router();

  jobsRouter.post(
    "/",
    asyncHandler(async (request, response) => {
      try {
        const input = createJobSchema.parse(request.body);

        const job = jobQueue.enqueue(input);

        response.status(HTTP_STATUS.CREATED).json({
          success: true,
          data: job
        });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  jobsRouter.get(
    "/",
    asyncHandler(async (_request, response) => {
      response.json({
        success: true,
        data: jobQueue.list()
      });
    })
  );

  return jobsRouter;
};
```

请补中文注释说明：

```text
POST /jobs 是创建任务，不是立刻处理任务。
GET /jobs 是查看当前内存队列快照。
```

---

## 任务 4：挂载路由

修改：

```text
apps/api/src/app.ts
```

把 jobs router 挂到：

```text
/jobs
```

你可以参考其他 router 的写法。

---

## 任务 5：补 API 测试

新建：

```text
apps/api/tests/integration/jobs.test.ts
```

至少写 3 个测试，描述用中文：

```text
POST /jobs 可以创建 pending job
POST /jobs 校验 type 不能为空
GET /jobs 可以返回任务列表
```

测试命令：

```bash
npm run test -w @learn/api -- tests/integration/jobs.test.ts
```

---

## 完成标准

- [x] 新增 `job-queue-instance.ts`
- [x] 新增 `jobs.schema.ts`
- [x] 新增 `jobs.routes.ts`
- [x] `POST /jobs` 可以创建 pending job
- [x] `POST /jobs` 返回 201
- [x] `POST /jobs` 会校验 type
- [x] `GET /jobs` 返回当前任务列表
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/integration/jobs.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务 API 创建完成了
```
