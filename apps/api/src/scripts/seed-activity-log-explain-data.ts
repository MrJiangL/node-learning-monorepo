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

  await prisma.activityLog.deleteMany({
    where: {
      userId: user.id,
      projectSnapshotId: project.id
    }
  });

  const now = Date.now();

  const logs = Array.from({ length: 500 }, (_, index) => {
    // TypeScript 只能看到“通过下标访问数组可能得到 undefined”。
    // 即使 index % actions.length 在运行时一定落在数组范围内，
    // 类型系统仍然会把 action 推断成 string | undefined。
    //
    // 这里给一个兜底值，是为了明确告诉 TypeScript：
    // 传给 ActivityLog.action 的一定是 string。
    const action = actions[index % actions.length] ?? "todo.created";

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
