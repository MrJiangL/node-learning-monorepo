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
