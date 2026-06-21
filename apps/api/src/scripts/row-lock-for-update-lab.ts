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
