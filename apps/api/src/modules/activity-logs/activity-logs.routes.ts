import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { mapZodErrorToAppError } from "../../http/validation-error.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaActivityLogRepository } from "./activity-logs.prisma-repository.js";
import { listActivityLogsQuerySchema } from "./activity-logs.schema.js";
import { createActivityLogService } from "./activity-logs.service.js";

export function createActivityLogsRouter() {
  const router = Router();
  const activityLogService = createActivityLogService(createPrismaActivityLogRepository());

  router.get(
    "/projects/:projectId/activity-logs",
    requireAuth,
    asyncHandler(async (request, response) => {
      try {
        // query string 也是外部输入，所以这里和 request.body 一样要先过 Zod。
        //
        // listActivityLogsQuerySchema 会解析：
        // - page / pageSize：分页参数
        // - action：可选的事件类型过滤条件
        // - createdAfter / createdBefore：可选的创建时间范围过滤条件
        const query = listActivityLogsQuerySchema.parse(request.query);
        const result = await activityLogService.listProjectLogs({
          userId: request.user!.id,
          projectId: request.params.projectId as string,
          action: query.action,
          createdAfter: query.createdAfter,
          createdBefore: query.createdBefore,
          page: query.page,
          pageSize: query.pageSize
        });

        response.json({
          success: true,
          data: result.data,
          meta: result.meta
        });
      } catch (error) {
        mapZodErrorToAppError(error, "query");
      }
    })
  );

  return router;
}
