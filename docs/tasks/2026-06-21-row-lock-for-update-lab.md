# Task: 数据库锁实验：SELECT FOR UPDATE

## 背景

你已经学了两个概念：

```text
atomic increment：适合单字段原子递增。
transaction：适合多步骤写入要么一起成功、要么一起失败。
```

但还有一种问题：

```text
我必须先读取一行数据，基于这一行数据做判断，然后再更新它。
```

如果多个流程同时读同一行，就可能互相竞争。

这时可以学习数据库行锁：`SELECT ... FOR UPDATE`。

---

## 这张任务只练什么

只练观察数据库锁：

```text
两个 transaction 同时尝试锁同一条 Job。
第一个 transaction 拿到锁后等待一会儿。
第二个 transaction 会等第一个释放锁后才能继续。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. SELECT FOR UPDATE 是什么。
2. 为什么它必须放在 transaction 里面才有意义。
3. 行锁和 atomic increment 的区别。
4. 行锁为什么不能乱用，锁持有太久会拖慢并发。
```

---

## 任务 1：创建行锁实验脚本

创建：

```text
apps/api/src/scripts/row-lock-for-update-lab.ts
```

写入下面代码：

```ts
import { prisma } from "../db/prisma.js";

const jobId = "row-lock-lab-job";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetJob() {
  await prisma.job.upsert({
    where: { id: jobId },
    update: {
      attempts: 0,
      status: "pending",
      type: "row-lock-lab",
      payload: {
        seed: true
      }
    },
    create: {
      id: jobId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      type: "row-lock-lab",
      payload: {
        seed: true
      }
    }
  });
}

async function runLockedWorker(name: string, holdMs: number) {
  const startedAt = Date.now();

  await prisma.$transaction(async (tx) => {
    console.log(`${name}: trying to lock row`);

    // SELECT ... FOR UPDATE 会在 transaction 内锁住这条记录。
    // 其他 transaction 如果也想锁同一行，需要等待当前 transaction 结束。
    await tx.$queryRaw`
      SELECT id
      FROM Job
      WHERE id = ${jobId}
      FOR UPDATE
    `;

    console.log(`${name}: locked row after ${Date.now() - startedAt}ms`);

    await sleep(holdMs);

    await tx.job.update({
      where: { id: jobId },
      data: {
        attempts: {
          increment: 1
        }
      }
    });

    console.log(`${name}: updated attempts`);
  });
}

async function main() {
  await resetJob();

  await Promise.all([runLockedWorker("worker-1", 1000), runLockedWorker("worker-2", 0)]);

  const finalJob = await prisma.job.findUniqueOrThrow({
    where: { id: jobId }
  });

  console.log("Final attempts:", finalJob.attempts);
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
```

---

## 任务 2：添加 npm script

修改：

```text
apps/api/package.json
```

在 scripts 里添加：

```json
"db:lab:row-lock": "tsx src/scripts/row-lock-for-update-lab.ts"
```

---

## 任务 3：运行实验

运行：

```bash
npm run db:lab:row-lock -w @learn/api
```

你可能会看到类似输出：

```text
worker-1: trying to lock row
worker-2: trying to lock row
worker-1: locked row after 10ms
worker-1: updated attempts
worker-2: locked row after 1015ms
worker-2: updated attempts
Final attempts: 2
```

重点观察：

```text
第二个 worker 不是马上拿到锁，而是等第一个 transaction 结束后才继续。
```

---

## 任务 4：写实验复盘

创建：

```text
docs/reviews/row-lock-for-update-lab.md
```

写下面这些小标题：

```md
# 数据库锁实验：SELECT FOR UPDATE

## 1. 我运行脚本看到了什么

## 2. 为什么第二个 worker 会等待

## 3. SELECT FOR UPDATE 为什么要放在 transaction 里

## 4. 行锁和 atomic increment 的区别

## 5. 行锁的风险是什么
```

第 5 节可以先写：

```text
行锁可以保护复杂的并发读写，但锁持有时间越长，其他请求等待越久。
所以锁要尽量短，只包住必须保护的数据库操作。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:lab:row-lock -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `apps/api/src/scripts/row-lock-for-update-lab.ts`
- [x] 添加 `db:lab:row-lock` npm script
- [x] 运行脚本能看到第二个 worker 等待锁
- [x] 最终 `Final attempts: 2`
- [x] 创建 `docs/reviews/row-lock-for-update-lab.md`
- [x] 写清楚 SELECT FOR UPDATE 和 transaction 的关系
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
数据库锁 SELECT FOR UPDATE 实验完成了
```
