# Task: 并发更新实验：观察 lost update

## 背景

数据库索引阶段已经收束。下一阶段进入：

```text
事务、并发边界、数据库锁、幂等和重试
```

第一步先不急着上锁，也不急着写复杂 transaction。

我们先观察一个真实后端常见问题：

```text
两个流程都先读旧值，然后各自基于旧值写回，最后其中一次更新被覆盖。
```

这个问题叫 lost update，中文可以理解成“丢失更新”。

---

## 这张任务只练什么

只练一个实验：

```text
用一个脚本模拟两次并发更新同一个 Job.attempts，观察最终 attempts 为什么不是 2。
```

这张任务暂时不修复问题，只观察问题。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 read -> calculate -> write 在并发下可能不安全。
2. lost update 是怎么发生的。
3. 为什么“代码看起来顺序正确”不代表并发下也正确。
4. 下一步为什么要学习 atomic update / transaction / lock。
```

---

## 任务 1：创建实验脚本

创建：

```text
apps/api/src/scripts/concurrent-lost-update-lab.ts
```

写入下面代码：

```ts
import { prisma } from "../db/prisma.js";

const jobId = "lost-update-lab-job";

async function main() {
  // 先准备一条固定 Job。
  // 固定 id 的好处是：这个脚本可以重复运行，每次都操作同一条实验数据。
  await prisma.job.upsert({
    where: { id: jobId },
    update: {
      attempts: 0,
      status: "pending",
      type: "lost-update-lab",
      payload: {
        seed: true
      }
    },
    create: {
      id: jobId,
      attempts: 0,
      maxAttempts: 3,
      status: "pending",
      type: "lost-update-lab",
      payload: {
        seed: true
      }
    }
  });

  // 模拟两个 worker 几乎同时读取同一条 Job。
  // 它们都读到了 attempts = 0。
  const [firstRead, secondRead] = await Promise.all([
    prisma.job.findUniqueOrThrow({ where: { id: jobId } }),
    prisma.job.findUniqueOrThrow({ where: { id: jobId } })
  ]);

  console.log("First read attempts:", firstRead.attempts);
  console.log("Second read attempts:", secondRead.attempts);

  // 两个流程都基于自己读到的旧值 + 1。
  // 注意：这里不是数据库原子递增，而是在应用层先算好新值。
  const firstNextAttempts = firstRead.attempts + 1;
  const secondNextAttempts = secondRead.attempts + 1;

  await Promise.all([
    prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: firstNextAttempts
      }
    }),
    prisma.job.update({
      where: { id: jobId },
      data: {
        attempts: secondNextAttempts
      }
    })
  ]);

  const finalJob = await prisma.job.findUniqueOrThrow({
    where: { id: jobId }
  });

  console.log("Final attempts:", finalJob.attempts);
  console.log("Expected if both increments were preserved: 2");
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
"db:lab:lost-update": "tsx src/scripts/concurrent-lost-update-lab.ts"
```

---

## 任务 3：运行实验

运行：

```bash
npm run db:lab:lost-update -w @learn/api
```

你大概率会看到类似输出：

```text
First read attempts: 0
Second read attempts: 0
Final attempts: 1
Expected if both increments were preserved: 2
```

如果最终是 1，说明其中一次更新被覆盖了。

---

## 任务 4：写实验复盘

创建：

```text
docs/reviews/concurrent-lost-update-lab.md
```

写下面这些小标题：

```md
# 并发更新实验：lost update

## 1. 我运行脚本看到了什么

## 2. 为什么两个流程都读到了 attempts = 0

## 3. 为什么最终 attempts 不是 2

## 4. 这个问题和 transaction / lock 有什么关系

## 5. 我现在的理解
```

第 5 节可以先写：

```text
read -> calculate -> write 这种流程在单线程理解里很直观，但在并发下可能会用旧值覆盖新值。
下一步需要学习数据库原子更新、transaction 或锁来保护这种更新。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:lab:lost-update -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `apps/api/src/scripts/concurrent-lost-update-lab.ts`
- [x] 添加 `db:lab:lost-update` npm script
- [x] 运行脚本能看到两次读取和最终 attempts
- [x] 创建 `docs/reviews/concurrent-lost-update-lab.md`
- [x] 写清楚为什么最终 attempts 可能是 1 而不是 2
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
并发更新 lost update 实验完成了
```
