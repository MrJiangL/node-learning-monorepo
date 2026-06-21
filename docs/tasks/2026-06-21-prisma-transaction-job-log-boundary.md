# Task: Prisma transaction 一致性边界实验

## 背景

你已经用 atomic increment 修复了单字段并发递增问题。

但真实业务里经常不是只改一个字段，而是多步写入：

```text
1. Job.attempts + 1
2. 创建一条 JobLog
3. 根据 attempts 判断 Job 是否 failed
```

如果中间某一步失败，前面已经写入的内容要不要回滚？

这就是 transaction 要解决的问题。

---

## 这张任务只练什么

只练一个实验：

```text
对比“不使用 transaction”和“使用 transaction”时，中途抛错后数据库状态有什么区别。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. atomic increment 解决的是单字段原子更新。
2. transaction 解决的是多步骤写入一致性。
3. 为什么一个流程里既更新 Job，又创建 JobLog 时，需要事务边界。
4. transaction 不是专门解决所有并发问题的万能药。
```

---

## 任务 1：创建 transaction 实验脚本

创建：

```text
apps/api/src/scripts/transaction-job-log-boundary-lab.ts
```

写入下面代码：

```ts
import { prisma } from "../db/prisma.js";

const jobId = "transaction-boundary-lab-job";

async function resetJob() {
  await prisma.jobLog.deleteMany({
    where: { jobId }
  });

  await prisma.job.upsert({
    where: { id: jobId },
    update: {
      attempts: 0,
      status: "pending",
      type: "transaction-boundary-lab",
      payload: {
        seed: true
      }
    },
    create: {
      id: jobId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      type: "transaction-boundary-lab",
      payload: {
        seed: true
      }
    }
  });
}

async function printJobState(label: string) {
  const job = await prisma.job.findUniqueOrThrow({
    where: { id: jobId },
    include: { logs: true }
  });

  console.log(label, {
    attempts: job.attempts,
    logCount: job.logs.length
  });
}

async function unsafeUpdateWithoutTransaction() {
  await resetJob();

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: {
          increment: 1
        }
      }
    });

    // 模拟 attempts 已经更新成功，但写 JobLog 前业务出错。
    throw new Error("Simulated failure before creating JobLog");
  } catch (error) {
    console.log("Unsafe flow failed:", (error as Error).message);
  }

  await printJobState("After unsafe flow");
}

async function safeUpdateWithTransaction() {
  await resetJob();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.job.update({
        where: { id: jobId },
        data: {
          attempts: {
            increment: 1
          }
        }
      });

      // 这次错误发生在 transaction 里面。
      // Prisma 会回滚 transaction 内已经完成的写入。
      throw new Error("Simulated failure inside transaction");
    });
  } catch (error) {
    console.log("Transaction flow failed:", (error as Error).message);
  }

  await printJobState("After transaction flow");
}

async function main() {
  await unsafeUpdateWithoutTransaction();
  await safeUpdateWithTransaction();
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
"db:lab:transaction-boundary": "tsx src/scripts/transaction-job-log-boundary-lab.ts"
```

---

## 任务 3：运行实验

运行：

```bash
npm run db:lab:transaction-boundary -w @learn/api
```

期望看到类似输出：

```text
Unsafe flow failed: Simulated failure before creating JobLog
After unsafe flow { attempts: 1, logCount: 0 }
Transaction flow failed: Simulated failure inside transaction
After transaction flow { attempts: 0, logCount: 0 }
```

这个对比很重要：

```text
不使用 transaction：前面的 update 已经落库。
使用 transaction：transaction 里的 update 被回滚。
```

---

## 任务 4：写实验复盘

创建：

```text
docs/reviews/prisma-transaction-job-log-boundary.md
```

写下面这些小标题：

```md
# Prisma transaction 一致性边界实验

## 1. 不使用 transaction 的结果

## 2. 使用 transaction 的结果

## 3. 为什么 unsafe flow 会留下 attempts = 1

## 4. 为什么 transaction flow 会回滚 attempts

## 5. transaction 和 atomic increment 的区别
```

第 5 节可以先写：

```text
atomic increment 解决单字段并发递增。
transaction 解决多个数据库写操作要么一起成功、要么一起失败的问题。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:lab:transaction-boundary -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `apps/api/src/scripts/transaction-job-log-boundary-lab.ts`
- [x] 添加 `db:lab:transaction-boundary` npm script
- [x] 不使用 transaction 时能看到 `attempts: 1`
- [x] 使用 transaction 时能看到 `attempts: 0`
- [x] 创建 `docs/reviews/prisma-transaction-job-log-boundary.md`
- [x] 写清楚 transaction 和 atomic increment 的区别
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Prisma transaction 一致性边界实验完成了
```
