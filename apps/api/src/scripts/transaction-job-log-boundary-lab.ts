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
