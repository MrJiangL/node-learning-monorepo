# Task: 用 atomic increment 修复 lost update

## 背景

上一张任务里，你已经复现了 lost update：

```text
First read attempts: 0
Second read attempts: 0
Final attempts: 1
Expected if both increments were preserved: 2
```

问题出在这里：

```text
应用层先读 attempts。
应用层自己计算 attempts + 1。
再把计算结果写回数据库。
```

两个流程都读到 0，所以两个流程都写回 1。

这一张任务先不用 transaction，也不用 lock，而是用数据库的 atomic increment 修复它。

---

## 这张任务只练什么

只练一个点：

```text
让数据库自己执行 attempts = attempts + 1，而不是应用层先读旧值再计算。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. atomic increment 是什么。
2. 为什么它能避免 read -> calculate -> write 的覆盖问题。
3. 它和 transaction / lock 的关系是什么。
4. 什么场景适合优先用 atomic update。
```

---

## 任务 1：创建 atomic increment 实验脚本

创建：

```text
apps/api/src/scripts/concurrent-atomic-increment-lab.ts
```

写入下面代码：

```ts
import { prisma } from "../db/prisma.js";

const jobId = "atomic-increment-lab-job";

async function main() {
  await prisma.job.upsert({
    where: { id: jobId },
    update: {
      attempts: 0,
      status: "pending",
      type: "atomic-increment-lab",
      payload: {
        seed: true
      }
    },
    create: {
      id: jobId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      type: "atomic-increment-lab",
      payload: {
        seed: true
      }
    }
  });

  // 这里不再先读取 attempts，然后在应用层计算 attempts + 1。
  //
  // increment 是数据库原子更新：
  // 每一次 update 都让数据库自己执行 attempts = attempts + 1。
  // 即使两个 update 并发发生，也不会都基于同一个旧值写回。
  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: {
          increment: 1
        }
      }
    }),
    prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: {
          increment: 1
        }
      }
    })
  ]);

  const finalJob = await prisma.job.findUniqueOrThrow({
    where: { id: jobId }
  });

  console.log("Final attempts:", finalJob.attempts);
  console.log("Expected after two atomic increments: 2");
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
"db:lab:atomic-increment": "tsx src/scripts/concurrent-atomic-increment-lab.ts"
```

---

## 任务 3：运行对比

先运行旧脚本：

```bash
npm run db:lab:lost-update -w @learn/api
```

你会看到：

```text
Final attempts: 1
Expected if both increments were preserved: 2
```

再运行新脚本：

```bash
npm run db:lab:atomic-increment -w @learn/api
```

你应该看到：

```text
Final attempts: 2
Expected after two atomic increments: 2
```

---

## 任务 4：写实验复盘

创建：

```text
docs/reviews/atomic-increment-fix-lost-update.md
```

写下面这些小标题：

```md
# 用 atomic increment 修复 lost update

## 1. lost update 脚本的结果

## 2. atomic increment 脚本的结果

## 3. 为什么 increment 可以修复这个问题

## 4. atomic increment 适合什么场景

## 5. 它不能替代哪些 transaction 场景
```

第 5 节可以先写：

```text
atomic increment 适合单字段计数类更新。
如果一个业务流程需要同时修改多张表，或者需要先检查条件再写入多个结果，就还是需要 transaction 或锁。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:lab:lost-update -w @learn/api
npm run db:lab:atomic-increment -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `apps/api/src/scripts/concurrent-atomic-increment-lab.ts`
- [x] 添加 `db:lab:atomic-increment` npm script
- [x] 旧脚本仍然能看到 `Final attempts: 1`
- [x] 新脚本能看到 `Final attempts: 2`
- [x] 创建 `docs/reviews/atomic-increment-fix-lost-update.md`
- [x] 写清楚 atomic increment 为什么能修复 lost update
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
atomic increment 修复 lost update 完成了
```
