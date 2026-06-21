import { Router } from "express";
import { asyncHandler } from "../http/async-handler.js";
import { HTTP_STATUS } from "../http/http-status.js";
import { mapZodErrorToAppError } from "../http/validation-error.js";
import { createJobSchema } from "./jobs.schema.js";
import { jobQueue } from "./job-queue-instance.js";
import { processNextJob } from "./job-worker.js";
import { processJobByType } from "./job-processors.js";
import type { JobRepository } from "./job.repository.js";

export type CreateJobsRouterOptions = {
  queue?: JobRepository;
};

export const createJobsRouter = (options: CreateJobsRouterOptions = {}) => {
  const jobsRouter = Router();
  const queue = options.queue ?? jobQueue;

  jobsRouter.post(
    "/",
    asyncHandler(async (request, response) => {
      try {
        const input = createJobSchema.parse(request.body);

        // POST /jobs 只负责创建任务并放进队列。
        //
        // 这里不会立刻处理任务。
        // 真正执行任务的是 worker，也就是后面的 processNextJob。
        const job = await queue.create(input);

        response.status(HTTP_STATUS.CREATED).json({
          success: true,
          data: job
        });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  jobsRouter.get(
    "/",
    asyncHandler(async (_request, response) => {
      // GET /jobs 返回的是当前任务列表。
      //
      // 现在路由只依赖 JobRepository.list()，不关心任务来自内存还是 MySQL。
      response.json({
        success: true,
        data: await queue.list()
      });
    })
  );

  jobsRouter.post(
    "/process-next",
    asyncHandler(async (_request, response) => {
      // processNextJob 每次只处理一个 pending job。
      //
      // 如果队列里没有 pending job，它会返回 null。
      // 这里不要把 null 当成错误，因为“暂时没有任务”是后台队列的正常状态。
      const job = await processNextJob(queue, processJobByType);

      response.json({
        success: true,
        data: job
      });
    })
  );

  return jobsRouter;
};
