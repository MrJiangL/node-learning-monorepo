import { prisma } from "../db/prisma.js";

const jobId = "lost-update-lab-job";

async function main() {
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

  const finalJob = await prisma.job.findUniqueOrThrow({ where: { id: jobId } });

  console.log("Final attempts:", finalJob.attempts);
  console.log("Expected if both increments were preserved: 2");
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
