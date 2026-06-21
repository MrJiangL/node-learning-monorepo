import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { mapZodErrorToAppError } from "../../http/validation-error.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaProjectRepository } from "../projects/projects.prisma-repository.js";
import { createPrismaTodoRepository } from "./todos.prisma-repository.js";
import { createTodoSchema, listTodosQuerySchema, updateTodoSchema } from "./todos.schema.js";
import { createTodoService } from "./todos.service.js";
import { createPrismaActivityLogRepository } from "../activity-logs/activity-logs.prisma-repository.js";
import { createActivityLogService } from "../activity-logs/activity-logs.service.js";

export function createTodosRouter() {
  const todoRouter = Router();

  const activityLogService = createActivityLogService(createPrismaActivityLogRepository());
  const todoService = createTodoService(
    createPrismaTodoRepository(),
    createPrismaProjectRepository(),
    { activityLogService }
  );

  todoRouter.get(
    "/projects/:projectId/todos",
    requireAuth,
    asyncHandler(async (request, response) => {
      try {
        // query string 来自 URL，例如 ?page=2&pageSize=10。
        //
        // Express 读到的 query 默认是字符串，所以 schema 里用 z.coerce.number()
        // 把 "2" 转成数字 2。解析失败时交给 mapZodErrorToAppError 统一转换。
        const query = listTodosQuerySchema.parse(request.query);
        const result = await todoService.listTodos(
          request.params.projectId as string,
          query,
          request.user!.id
        );

        response.json({ success: true, data: result.data, meta: result.meta });
      } catch (error) {
        mapZodErrorToAppError(error, "query");
      }
    })
  );

  todoRouter.post(
    "/projects/:projectId/todos",
    requireAuth,
    asyncHandler(async (request, response) => {
      try {
        const input = createTodoSchema.parse(request.body);
        const todo = await todoService.createTodo(
          request.params.projectId as string,
          input,
          request.user!.id
        );

        response.status(HTTP_STATUS.CREATED).json({ success: true, data: todo });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  todoRouter.patch(
    "/todos/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      try {
        const input = updateTodoSchema.parse(request.body);
        const todo = await todoService.updateTodo(
          request.params.id as string,
          input,
          request.user!.id
        );

        response.json({ success: true, data: todo });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  todoRouter.delete(
    "/todos/:id",
    requireAuth,
    asyncHandler(async (request, response) => {
      await todoService.deleteTodo(request.params.id as string, request.user!.id);

      // 删除成功后返回 204 No Content。
      //
      // 204 表示“请求成功，但响应体为空”。
      // 所以这里不要 response.json({ success: true })。
      response.status(HTTP_STATUS.NO_CONTENT).send();
    })
  );

  return todoRouter;
}
