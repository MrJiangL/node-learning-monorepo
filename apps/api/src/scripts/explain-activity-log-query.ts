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
  id: bigint | number;
  select_type: string;
  table: string;
  partitions: string | null;
  type: string;
  possible_keys: string | null;
  key: string | null;
  key_len: string | null;
  ref: string | null;
  rows: bigint | number;
  filtered: number;
  Extra: string | null;
};

async function main() {
  // 这条 SQL 对应 ActivityLogRepository.findAll 的核心查询形状：
  // - userId：权限边界
  // - projectSnapshotId：Project 删除后仍可按快照查历史日志
  // - createdAt：列表倒序
  //
  // 注意 SELECT 字段列表的最后一项后面不能加逗号。
  // SQL 和 JS 对象不一样，最后多一个逗号会导致 MySQL 1064 语法错误。
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
  console.log("ActivityLog query without action filter");
  console.table(rows);

  // 你重点看：
  // - possible_keys：MySQL 觉得“可能能用”的索引
  // - key：MySQL 最后实际选择的索引
  // - rows：MySQL 估计要扫描多少行
  // - Extra：是否出现 Using filesort / Using where 等额外动作

  const sampleAction = "todo.completed";

  const rowsWithAction = await prisma.$queryRaw<ExplainRow[]>`
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
    AND action = ${sampleAction}
  ORDER BY createdAt DESC
  LIMIT 10
`;

  console.log("ActivityLog query with action filter");
  console.table(rowsWithAction);
  // FORCE INDEX 是实验工具：
  // - 它可以让我们观察“如果 MySQL 使用这个索引，会得到什么执行计划”
  // - 但不要因为一次实验就把 FORCE INDEX 写进业务 API
  // - 真实项目里要结合数据量、慢查询、线上表现再决定
  const rowsWithForcedCompositeIndex = await prisma.$queryRaw<ExplainRow[]>`
  EXPLAIN
  SELECT
    id,
    action,
    message,
    createdAt,
    userId,
    projectSnapshotId
  FROM ActivityLog FORCE INDEX (ActivityLog_userId_projectSnapshotId_action_createdAt_idx)
  WHERE userId = ${sampleUserId}
    AND projectSnapshotId = ${sampleProjectSnapshotId}
    AND action = ${sampleAction}
  ORDER BY createdAt DESC
  LIMIT 10
`;

  console.log("ActivityLog query with forced composite action index");
  console.table(rowsWithForcedCompositeIndex);
}

try {
  await main();
} finally {
  // 脚本结束时断开 Prisma 连接。
  // 如果不 disconnect，Node 进程可能因为数据库连接还开着而不退出。
  await prisma.$disconnect();
}
