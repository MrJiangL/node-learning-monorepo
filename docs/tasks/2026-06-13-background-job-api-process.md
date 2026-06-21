# Task: 后台任务进阶：API 触发 worker 处理任务

## 背景

你现在已经有了：

```text
POST /jobs 创建任务
GET /jobs 查看任务列表
processNextJob 处理一个 pending job
```

但目前 API 只能“创建任务”，还不能“触发处理任务”。

这张任务要把 worker 接到 API 上：

```text
POST /jobs/process-next
```

它的语义是：

```text
从队列里取出第一个 pending job
交给 processor 处理
成功后变成 completed
没有 pending job 时返回 data: null
```

注意：这仍然不是生产级队列。

真实项目通常会让后台 worker 独立运行，而不是靠 HTTP 手动触发。  
但学习阶段先用 API 触发，可以让你清楚看到 queue、worker、processor 三者怎么协作。

---

## 任务 1：在 jobs routes 里引入 worker

修改：

```text
apps/api/src/jobs/jobs.routes.ts
```

新增 import：

```ts
import { processNextJob } from "./job-worker.js";
```

学习点：

```text
jobQueue 负责保存任务。
processNextJob 负责状态流转。
processor 负责真正执行任务。

API route 不应该自己手写 pending -> processing -> completed。
因为这段规则已经封装在 processNextJob 里了。
```

---

## 任务 2：创建一个学习用 processor

先在 `jobs.routes.ts` 里写一个最简单的 processor：

```ts
const learningJobProcessor = async () => {
  // 学习阶段先不做真实业务。
  //
  // 真实项目里这里可能会：
  // - 发送邮件
  // - 生成报表
  // - 调用第三方 API
  // - 处理图片或文件
  //
  // 现在这个 processor 什么都不做，只要它没有 throw，
  // processNextJob 就会认为任务处理成功，并把 job 标记为 completed。
};
```

为什么先这样写：

```text
我们这张任务先练“worker 接入 API 的流程”。
失败重试、不同 type 对应不同 processor，后面再拆任务练。
```

---

## 任务 3：新增 `POST /jobs/process-next`

在 `createJobsRouter` 里新增路由：

```ts
jobsRouter.post(
  "/process-next",
  asyncHandler(async (_request, response) => {
    // processNextJob 每次只处理一个 pending job。
    //
    // 如果队列里没有 pending job，它会返回 null。
    // 这里不要把 null 当成错误，因为“暂时没有任务”是后台队列的正常状态。
    const job = await processNextJob(jobQueue, learningJobProcessor);

    response.json({
      success: true,
      data: job
    });
  })
);
```

学习点：

```text
这里用 200，不用 201。

因为这个接口不是创建一个新资源，而是在触发一次处理动作。
如果真的创建了 job，才用 201。
```

---

## 任务 4：补 API 测试

修改：

```text
apps/api/tests/integration/jobs.test.ts
```

至少补 2 个测试，描述继续用中文：

```text
POST /jobs/process-next 没有 pending job 时返回 null
POST /jobs/process-next 可以把 pending job 处理成 completed
```

第一个测试可以这样思考：

```ts
it("POST /jobs/process-next 没有 pending job 时返回 null", async () => {
  const app = createApp();

  const response = await request(app).post("/jobs/process-next");

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    success: true,
    data: null
  });
});
```

第二个测试可以这样思考：

```ts
it("POST /jobs/process-next 可以把 pending job 处理成 completed", async () => {
  const app = createApp();

  // 先通过 API 创建一个 pending job。
  // 这样测试的是完整 HTTP 行为，而不是直接调用 queue.enqueue。
  const createResponse = await request(app)
    .post("/jobs")
    .send({
      type: "send-email",
      payload: {
        to: "user@example.com"
      }
    });

  const response = await request(app).post("/jobs/process-next");

  expect(response.status).toBe(200);
  expect(response.body.success).toBe(true);
  expect(response.body.data).toMatchObject({
    id: createResponse.body.data.id,
    type: "send-email",
    status: "completed",
    attempts: 0
  });
});
```

注意：

```text
如果你发现“没有 pending job”那个测试偶尔失败，
先不要慌。

原因很可能是当前 jobQueue 是全局内存单例，不同测试之间可能共享队列数据。
这也是后端测试里很常见的“测试隔离”问题。

如果遇到这个问题，先告诉我，我们下一步就顺手把 queue 做成可注入依赖。
```

---

## 验证命令

```bash
npm run test -w @learn/api -- tests/integration/jobs.test.ts
npm run typecheck -w @learn/api
npm run format:check
```

---

## 完成标准

- [x] 新增 `POST /jobs/process-next`
- [x] API route 调用 `processNextJob(jobQueue, learningJobProcessor)`
- [x] 没有 pending job 时返回 `{ success: true, data: null }`
- [x] 有 pending job 时可以处理成 `completed`
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- tests/integration/jobs.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
后台任务 API 触发 worker 完成了
```
