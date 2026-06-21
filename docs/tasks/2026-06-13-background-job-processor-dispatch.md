# Task: 后台任务进阶：processor 按任务 type 分发处理逻辑

## 背景

上一张任务里，`POST /jobs/process-next` 已经能触发 worker：

```text
API route -> processNextJob -> processor -> completed
```

但现在的 `learningJobProcessor` 是一个“空 processor”：

```ts
const learningJobProcessor = async () => {
  // 什么都不做
};
```

这能帮助你理解 worker 流程，但还不像真实后台任务。

真实项目里，一个队列里通常会有不同类型的任务：

```text
send-email
generate-report
sync-user-profile
resize-image
```

所以这张任务要练：

```text
processor 根据 job.type 分发到不同处理逻辑
```

---

## 任务 1：创建 job processors 文件

新建：

```text
apps/api/src/jobs/job-processors.ts
```

内容可以先这样写：

```ts
import type { Job } from "./job.js";

export const processJobByType = async (job: Job<unknown>) => {
  switch (job.type) {
    case "send-email": {
      // 学习阶段先不真的发邮件。
      //
      // 真实项目里这里通常会调用邮件服务：
      // - SendGrid
      // - AWS SES
      // - Resend
      //
      // 现在只要没有 throw，worker 就会认为处理成功。
      return;
    }

    case "generate-report": {
      // 学习阶段先不真的生成报表。
      //
      // 真实项目里这里可能会：
      // - 查询数据库
      // - 生成 CSV / PDF
      // - 上传到对象存储
      //
      // 这里暂时只保留分支，让你先理解 type dispatch。
      return;
    }

    default: {
      // 不认识的 job type 不能假装成功。
      //
      // 如果这里直接 return，worker 会把未知任务标记成 completed，
      // 这会掩盖配置错误或调用方传错 type 的问题。
      throw new Error(`Unsupported job type: ${job.type}`);
    }
  }
};
```

学习点：

```text
processor 里 throw，不代表 API 崩溃。

因为 processNextJob 会 catch processor 的错误，
然后根据 attempts / maxAttempts 决定：
- 回到 pending 等待重试
- 或者变成 failed
```

---

## 任务 2：让 jobs route 使用 `processJobByType`

修改：

```text
apps/api/src/jobs/jobs.routes.ts
```

删除本地的：

```ts
const learningJobProcessor = async () => {
  // ...
};
```

改为引入：

```ts
import { processJobByType } from "./job-processors.js";
```

然后把：

```ts
const job = await processNextJob(queue, learningJobProcessor);
```

改成：

```ts
const job = await processNextJob(queue, processJobByType);
```

学习点：

```text
route 负责 HTTP。
worker 负责任务状态流转。
processor 负责业务处理。

这三个职责拆开之后，后面你加邮件、报表、图片处理，都不会把 route 写乱。
```

---

## 任务 3：补成功分发测试

修改：

```text
apps/api/tests/integration/jobs.test.ts
```

现在已有：

```text
POST /jobs/process-next 可以把 pending job 处理成 completed
```

你可以保留它，因为它刚好覆盖 `send-email` 这个已支持 type。

但请确认测试里创建的 job type 是：

```ts
type: "send-email";
```

---

## 任务 4：补未知 type 测试

继续在：

```text
apps/api/tests/integration/jobs.test.ts
```

新增一个中文测试：

```text
POST /jobs/process-next 遇到未知 type 时把任务标记为 failed
```

测试思路：

```ts
it("POST /jobs/process-next 遇到未知 type 时把任务标记为 failed", async () => {
  const app = createJobsTestApp();

  const createResponse = await request(app).post("/jobs").send({
    type: "unknown-job",
    payload: {},
    maxAttempts: 1
  });

  const response = await request(app).post("/jobs/process-next");

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    id: createResponse.body.data.id,
    type: "unknown-job",
    status: "failed",
    attempts: 1,
    maxAttempts: 1
  });
});
```

为什么 `maxAttempts: 1`：

```text
这样 processor 第一次失败时，就会立刻达到最大尝试次数。
所以任务会从 pending 直接变成 failed。

如果 maxAttempts 是默认 3，第一次失败后状态会回到 pending，
因为它还有重试机会。
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run test -w @learn/api -- tests/unit/job-worker.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 新增 `job-processors.ts`
- [x] `processJobByType` 支持 `send-email`
- [x] `processJobByType` 支持 `generate-report`
- [x] 未知 `job.type` 会 throw
- [x] `POST /jobs/process-next` 使用 `processJobByType`
- [x] 未知 type + `maxAttempts: 1` 会让任务变成 `failed`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/integration/jobs.test.ts` 通过
- [x] `npm run test -w @learn/api -- tests/unit/job-worker.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
processor 按 type 分发完成了
```
