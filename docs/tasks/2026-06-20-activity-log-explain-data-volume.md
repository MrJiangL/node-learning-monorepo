# Task: Activity Log EXPLAIN 数据量实验

## 背景

你刚刚做了一个索引保留决策：

```text
A. 暂时保留，继续观察
```

现在的问题是：

```text
本地数据太少，MySQL 很可能觉得旧索引已经足够便宜。
```

所以这张任务要做一个更接近真实场景的实验：写一个 seed 脚本，往 Activity Log 里插入一批测试数据，然后再次运行 EXPLAIN。

---

## 这张任务只练什么

只练三个点：

```text
1. 用 Prisma 写一个只服务于本地实验的 seed 脚本。
2. 让 EXPLAIN 查询面对更多 Activity Log 数据。
3. 对比数据量变大后 MySQL 的 possible_keys / key / rows 有没有变化。
```

这张任务不改 API，不改前端，不新增业务接口。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么小数据量下 EXPLAIN 的结果不一定代表真实生产表现。
2. seed 脚本和 migration 的区别是什么。
3. 为什么实验数据要可重复、可清理。
4. 数据量变化后，如何继续看 possible_keys / key / rows / Extra。
```

---

## 任务 1：创建 seed 脚本

创建：

```text
apps/api/src/scripts/seed-activity-log-explain-data.ts
```

写入下面代码：

```ts
import { prisma } from "../db/prisma.js";

const sampleUserId = "explain-user-id";
const sampleProjectSnapshotId = "explain-project-id";
const sampleProjectName = "EXPLAIN 数据量实验 Project";

const actions = [
  "project.created",
  "project.updated",
  "todo.created",
  "todo.updated",
  "todo.completed"
];

async function main() {
  // upsert 的意思是：
  // - 如果这条 user 已经存在，就更新它
  // - 如果不存在，就创建它
  //
  // 这里使用固定 id，是为了让 explain 脚本可以稳定查询同一批实验数据。
  const user = await prisma.user.upsert({
    where: { id: sampleUserId },
    update: {
      email: "explain@example.com",
      name: "EXPLAIN Seed User"
    },
    create: {
      id: sampleUserId,
      email: "explain@example.com",
      passwordHash: "explain-seed-password-hash",
      name: "EXPLAIN Seed User"
    }
  });

  // Project 也使用固定 id。
  // ActivityLog 现在有 projectSnapshotId，即使 Project 将来被删除，日志也还能保留快照 id。
  const project = await prisma.project.upsert({
    where: { id: sampleProjectSnapshotId },
    update: {
      name: sampleProjectName,
      description: "只用于本地 EXPLAIN 数据量实验"
    },
    create: {
      id: sampleProjectSnapshotId,
      name: sampleProjectName,
      description: "只用于本地 EXPLAIN 数据量实验",
      userId: user.id
    }
  });

  // 为了让 seed 脚本可重复运行，先删除同一批实验数据。
  // 注意：这里只删除固定 userId + projectSnapshotId 下的数据，不会清空整张 ActivityLog 表。
  await prisma.activityLog.deleteMany({
    where: {
      userId: user.id,
      projectSnapshotId: project.id
    }
  });

  const now = Date.now();

  const logs = Array.from({ length: 500 }, (_, index) => {
    const action = actions[index % actions.length];

    return {
      id: crypto.randomUUID(),
      action,
      message: `EXPLAIN seed log #${index + 1}: ${action}`,
      metadata: {
        seed: true,
        index
      },
      createdAt: new Date(now - index * 1000),
      userId: user.id,
      projectId: project.id,
      projectSnapshotId: project.id,
      projectSnapshotName: project.name
    };
  });

  await prisma.activityLog.createMany({
    data: logs
  });

  console.log(`Seeded ${logs.length} ActivityLog rows for EXPLAIN.`);
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
"db:seed:activity-log-explain": "tsx src/scripts/seed-activity-log-explain-data.ts"
```

你可以放在 `db:explain:activity-logs` 附近。

---

## 任务 3：运行 seed

运行：

```bash
npm run db:seed:activity-log-explain -w @learn/api
```

期望看到类似输出：

```text
Seeded 500 ActivityLog rows for EXPLAIN.
```

---

## 任务 4：再次运行 EXPLAIN

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

重点看带 action 的那段：

```text
ActivityLog query with action filter
```

记录：

```text
possible_keys
key
rows
Extra
```

---

## 任务 5：写实验复盘

创建：

```text
docs/reviews/activity-log-explain-data-volume.md
```

写下面这些小标题：

```md
# Activity Log EXPLAIN 数据量实验

## 1. 我 seed 了多少数据

## 2. seed 脚本为什么使用固定 userId 和 projectSnapshotId

## 3. 数据量变大后的 EXPLAIN 结果

## 4. MySQL 最终选择了哪个 key

## 5. rows / Extra 有没有变化

## 6. 我的理解
```

第 6 节可以先用自己的话写：

```text
EXPLAIN 不是看“我希望数据库用哪个索引”，而是看 MySQL 根据当前数据和统计信息实际准备怎么查。
```

---

## 验证命令

按顺序运行：

```bash
npm run db:seed:activity-log-explain -w @learn/api
npm run db:explain:activity-logs -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `apps/api/src/scripts/seed-activity-log-explain-data.ts`
- [x] 添加 `db:seed:activity-log-explain` npm script
- [x] seed 脚本能插入 500 条 ActivityLog 实验数据
- [x] EXPLAIN 能基于这批固定数据运行
- [x] 创建 `docs/reviews/activity-log-explain-data-volume.md`
- [x] 写下数据量变大后 key / rows / Extra 的变化
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log EXPLAIN 数据量实验完成了
```
