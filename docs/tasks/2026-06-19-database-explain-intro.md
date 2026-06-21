# Task: EXPLAIN 入门：看 MySQL 是否使用了 Activity Log 索引

## 背景

你已经学了两件事：

```text
1. 索引应该从真实查询模式反推
2. 复合索引要看最左前缀规则
```

下一步要开始看数据库自己的判断：

```text
MySQL 查询这张表时，到底可能用哪个索引？
```

这个工具叫：

```sql
EXPLAIN
```

你可以先把它理解成：

```text
不真正关心查出来的数据，而是让数据库告诉你“我打算怎么查”。
```

---

## 这张任务只练什么

只练：

```text
1. 写一个本地脚本跑 EXPLAIN
2. 看懂 possible_keys / key / rows / Extra 这几个字段
3. 记录 MySQL 对 Activity Log 查询的索引选择
```

暂时不做：

```text
删除索引
性能压测
慢查询日志
线上调优
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. EXPLAIN 是干嘛的
2. possible_keys 和 key 有什么区别
3. rows 大概代表什么
4. 为什么不能只靠猜测决定删索引
```

---

## 任务 1：添加 npm 脚本

修改：

```text
apps/api/package.json
```

在 `scripts` 里添加：

```json
"db:explain:activity-logs": "tsx src/scripts/explain-activity-log-query.ts"
```

位置可以放在 `redis:ping` 附近。

---

## 任务 2：创建 EXPLAIN 脚本

创建：

```text
apps/api/src/scripts/explain-activity-log-query.ts
```

写入下面代码。

注意：你可以手敲，不一定复制。重点是理解注释。

```ts
import { prisma } from "../db/prisma.js";

// EXPLAIN 不需要真的查出业务数据。
// 它只让 MySQL 分析“如果执行这条 SQL，我可能会怎么查”。
//
// 这里使用固定字符串作为参数：
// - 即使数据库里没有这个 userId / projectSnapshotId，也仍然可以看到查询计划
// - 参数通过 Prisma tagged template 传入，不要自己拼 SQL 字符串
const sampleUserId = "explain-user-id";
const sampleProjectSnapshotId = "explain-project-id";

type ExplainRow = {
  id: number;
  select_type: string;
  table: string;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: bigint | number;
  Extra: string | null;
};

async function main() {
  // 这条 SQL 对应 ActivityLogRepository.findAll 的核心查询形状：
  // - userId：权限边界
  // - projectSnapshotId：Project 删除后仍可按快照查历史日志
  // - createdAt：列表倒序
  //
  // EXPLAIN 前面加 SELECT，表示“分析这条 SELECT 的执行计划”。
  const rows = await prisma.$queryRaw<ExplainRow[]>`
    EXPLAIN
    SELECT
      id,
      action,
      message,
      createdAt,
      userId,
      projectSnapshotId
    FROM ActivityLog
    WHERE userId = ${sampleUserId}
      AND projectSnapshotId = ${sampleProjectSnapshotId}
    ORDER BY createdAt DESC
    LIMIT 10
  `;

  console.table(rows);

  // 你重点看：
  // - possible_keys：MySQL 觉得“可能能用”的索引
  // - key：MySQL 最后实际选择的索引
  // - rows：MySQL 估计要扫描多少行
  // - Extra：是否出现 Using filesort / Using where 等额外动作
}

try {
  await main();
} finally {
  // 脚本结束时断开 Prisma 连接。
  // 如果不 disconnect，Node 进程可能因为数据库连接还开着而不退出。
  await prisma.$disconnect();
}
```

---

## 任务 3：运行脚本

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
```

你应该会看到类似表格输出。

重点不是每一列都看懂，先找这几列：

```text
possible_keys
key
rows
Extra
```

如果 `key` 里出现类似下面的名字，说明 MySQL 选择了你刚补的复合索引：

```text
ActivityLog_userId_projectSnapshotId_createdAt_idx
```

如果没有出现，也先不要紧张。优化器会根据数据量、统计信息、查询条件来选择索引。

---

## 任务 4：写学习笔记

创建：

```text
docs/reviews/database-explain-intro-notes.md
```

写下面几个小标题：

```md
# EXPLAIN 入门笔记

## 1. EXPLAIN 是干嘛的

## 2. possible_keys / key 分别是什么意思

## 3. 这次 ActivityLog 查询用了哪个索引

## 4. rows / Extra 我现在怎么看

## 5. 我现在还不懂的地方
```

每节 2-4 句即可。

---

## 验证命令

运行：

```bash
npm run db:explain:activity-logs -w @learn/api
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 添加 `db:explain:activity-logs` npm script
- [x] 创建 `apps/api/src/scripts/explain-activity-log-query.ts`
- [x] 跑通 `npm run db:explain:activity-logs -w @learn/api`
- [x] 创建 `docs/reviews/database-explain-intro-notes.md`
- [x] 记录 `possible_keys` / `key` / `rows` / `Extra`
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
EXPLAIN 入门完成了
```
