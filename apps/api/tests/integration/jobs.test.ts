import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";
import { prisma } from "../../src/db/prisma.js";
import { createMemoryJobQueue } from "../../src/jobs/memory-job-queue.js";

const createJobsTestApp = () => {
  // jobs API 这组测试关注的是 HTTP 行为。
  //
  // 但 jobQueue 本身是内存队列，如果所有测试共用同一个队列，
  // 前一个测试创建的 pending job 会影响后一个测试。
  //
  // 所以这里每次创建 app 时都传入一个新的内存队列，
  // 让每个测试都从“空队列”开始，测试结果更稳定。
  return createApp({
    jobQueue: createMemoryJobQueue()
  });
};

describe("jobs router", () => {
  it("POST /jobs 可以创建 pending job", async () => {
    const app = createJobsTestApp();

    const response = await request(app)
      .post("/jobs")
      .send({
        type: "send-email",
        payload: {
          to: "user@example.com"
        },
        maxAttempts: 2
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      type: "send-email",
      payload: {
        to: "user@example.com"
      },
      status: "pending",
      attempts: 0,
      maxAttempts: 2
    });

    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.createdAt).toEqual(expect.any(String));
    expect(response.body.data.updatedAt).toEqual(expect.any(String));
  });

  it("POST /jobs 校验 type 不能为空", async () => {
    const app = createJobsTestApp();

    const response = await request(app)
      .post("/jobs")
      .send({
        type: "",
        payload: {
          to: "user@example.com"
        }
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Job type is required"
      }
    });
  });

  it("GET /jobs 可以返回任务列表", async () => {
    const app = createJobsTestApp();

    const createResponse = await request(app)
      .post("/jobs")
      .send({
        type: "generate-report",
        payload: {
          reportType: "weekly"
        }
      });

    const response = await request(app).get("/jobs");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: createResponse.body.data.id,
          type: "generate-report",
          status: "pending"
        })
      ])
    );
  });

  it("POST /jobs/process-next 没有 pending job 时返回 null", async () => {
    const app = createJobsTestApp();

    const response = await request(app).post("/jobs/process-next");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: null
    });
  });

  it("POST /jobs/process-next 可以把 pending job 处理成 completed", async () => {
    const app = createJobsTestApp();

    // 先通过 API 创建一个 pending job。
    // 这样测试的是完整 HTTP 行为，而不是直接调用 queue.enqueue。
    const createResponse = await request(app)
      .post("/jobs")
      .send({
        type: "send-email",
        payload: {
          to: "user@example.com"
        }
      });

    const response = await request(app).post("/jobs/process-next");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: createResponse.body.data.id,
      type: "send-email",
      status: "completed",
      attempts: 0
    });
    expect(response.body.data.logs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "Job created" }),
        expect.objectContaining({ message: "Job processing started" }),
        expect.objectContaining({ message: "Job completed" })
      ])
    );
  });

  it("POST /jobs/process-next 遇到未知 type 时把任务标记为 failed", async () => {
    const app = createJobsTestApp();

    const createResponse = await request(app).post("/jobs").send({
      type: "unknown-job",
      payload: {},
      maxAttempts: 1
    });

    const response = await request(app).post("/jobs/process-next");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      id: createResponse.body.data.id,
      type: "unknown-job",
      status: "failed",
      attempts: 1,
      maxAttempts: 1
    });
  });

  it("createApp 默认使用 Prisma job repository 创建任务", async () => {
    // 这个测试会走真实默认装配，也就是 PrismaJobRepository。
    //
    // 因为它会写入 MySQL，所以先清理 JobLog，再清理 Job：
    // JobLog 是子表，Job 是父表，按这个顺序删除可以避开外键约束。
    await prisma.jobLog.deleteMany();
    await prisma.job.deleteMany();

    // 这个测试故意不传 jobQueue。
    // 它验证的是 app 的默认依赖装配：
    // createApp() -> jobs router -> 默认 jobQueue -> PrismaJobRepository。
    const app = createApp();

    const response = await request(app)
      .post("/jobs")
      .send({
        type: "send-email",
        payload: {
          to: "user@example.com"
        }
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data).toMatchObject({
      type: "send-email",
      status: "pending"
    });

    const jobInDatabase = await prisma.job.findUnique({
      where: {
        id: response.body.data.id
      }
    });

    expect(jobInDatabase).toMatchObject({
      id: response.body.data.id,
      type: "send-email",
      status: "pending"
    });
  });
  it("POST /jobs 使用相同 idempotencyKey 会返回同一个 job", async () => {
    const app = createJobsTestApp();

    const firstResponse = await request(app)
      .post("/jobs")
      .send({
        type: "send-email",
        payload: {
          to: "user@example.com"
        },
        idempotencyKey: "same-job-api-request"
      });

    const secondResponse = await request(app)
      .post("/jobs")
      .send({
        type: "send-email",
        payload: {
          to: "another@example.com"
        },
        idempotencyKey: "same-job-api-request"
      });

    expect(firstResponse.status).toBe(201);
    expect(secondResponse.status).toBe(201);
    expect(secondResponse.body.data.id).toBe(firstResponse.body.data.id);
    expect(secondResponse.body.data.payload).toEqual({
      to: "user@example.com"
    });
    expect(secondResponse.body.data.idempotencyKey).toBe("same-job-api-request");
  });
});
