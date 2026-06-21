import { Router } from "express";
import type { RedisClientType } from "redis";
import {
  deleteProjectListCacheByUserId,
  getCachedProjectList
} from "../../cache/project-list-cache.js";
import { asyncHandler } from "../../http/async-handler.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { mapZodErrorToAppError } from "../../http/validation-error.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaProjectRepository } from "./projects.prisma-repository.js";
import {
  createProjectSchema,
  createProjectWithTodosSchema,
  listProjectsQuerySchema,
  updateProjectSchema
} from "./projects.schema.js";
import { createProjectService } from "./projects.service.js";
import { createActivityLogService } from "../activity-logs/activity-logs.service.js";
import { createPrismaActivityLogRepository } from "../activity-logs/activity-logs.prisma-repository.js";

type CreateProjectsRouterOptions = {
  redisClient?: RedisClientType;
};

export function createProjectsRouter(options: CreateProjectsRouterOptions = {}) {
  const projectsRouter = Router();
  const activityLogService = createActivityLogService(createPrismaActivityLogRepository());

  const projectService = createProjectService(createPrismaProjectRepository(), {
    activityLogService
  });

  // /projects 是登录后才能访问的资源。
  //
  // 这里会保护下面所有子路由：
  // - GET /projects
  // - POST /projects
  projectsRouter.use(requireAuth);

  projectsRouter.get(
    "/",
    asyncHandler(async (request, response) => {
      try {
        // requireAuth 成功后，request.user 一定存在。
        // 这里用 request.user!.id，把当前用户 id 交给 service。
        const query = listProjectsQuerySchema.parse(request.query);
        const currentUserId = request.user!.id;

        // GET /projects 是列表查询，适合读缓存。
        //
        // filter 里必须包含 currentUserId：
        // - 缓存 key 需要 userId
        // - 数据库查询也必须按当前用户过滤
        //
        // 如果没有传 redisClient，就保持原来的行为，直接查询数据库。
        const result = options.redisClient
          ? await getCachedProjectList(
              options.redisClient,
              { ...query, userId: currentUserId },
              () => projectService.listProjects(query, currentUserId)
            )
          : await projectService.listProjects(query, currentUserId);

        response.json({ success: true, data: result.data, meta: result.meta });
      } catch (error) {
        mapZodErrorToAppError(error, "query");
      }
    })
  );

  projectsRouter.post(
    "/",
    asyncHandler(async (request, response) => {
      try {
        // body 是外部输入，必须先过 Zod。
        // parse 成功后，input 才是我们愿意交给 service 的数据。
        const input = createProjectSchema.parse(request.body);

        // createProject 会访问数据库，所以必须 await。
        //
        // 如果这里忘记 await，response 里拿到的是 Promise，
        // 不是创建后的 Project 数据。
        const currentUserId = request.user!.id;
        const project = await projectService.createProject(input, currentUserId);

        // 创建 Project 后，当前用户的 Project 列表缓存都可能变旧。
        //
        // 例如第一页缓存里还没有刚创建的新 Project。
        // 所以创建成功后要清理当前用户的列表缓存。
        if (options.redisClient) {
          await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
        }

        // POST 创建成功时使用 201 Created。
        response.status(HTTP_STATUS.CREATED).json({ success: true, data: project });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  projectsRouter.post(
    "/with-todos",
    asyncHandler(async (request, response) => {
      try {
        // 这个接口的 body 比 POST /projects 多一个 todos 数组。
        //
        // route 层只做两件事：
        // 1. 用 Zod 校验外部输入
        // 2. 把通过校验的数据交给 service
        //
        // transaction 的细节不放在 route 里，避免 HTTP 层和数据库实现耦合。
        const input = createProjectWithTodosSchema.parse(request.body);
        const result = await projectService.createProjectWithTodos(input, request.user!.id);

        response.status(HTTP_STATUS.CREATED).json({ success: true, data: result });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  projectsRouter.get(
    "/:id",
    asyncHandler(async (request, response) => {
      // request.params.id 来自 URL 里的 :id。
      //
      // route 层只负责把 HTTP 参数取出来。
      // “这个 Project 是否属于当前用户”的判断放在 service 里。
      const project = await projectService.getProjectById(
        request.params.id as string,
        request.user!.id
      );

      response.json({ success: true, data: project });
    })
  );

  projectsRouter.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      const currentUserId = request.user!.id;

      await projectService.deleteProject(request.params.id as string, currentUserId);

      // 删除 Project 后，列表缓存里可能还残留已经被删除的项目。
      //
      // 注意：即使最终返回 204，没有响应体，也仍然可以在 send() 前做清缓存这种副作用。
      if (options.redisClient) {
        await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
      }

      // 204 No Content 表示请求成功，但响应体为空。
      // 所以这里不要返回 { success: true } 这样的 JSON。
      response.status(HTTP_STATUS.NO_CONTENT).send();
    })
  );

  projectsRouter.patch(
    "/:id",
    asyncHandler(async (request, response) => {
      try {
        // PATCH /projects/:id 是局部更新接口。
        //
        // body 仍然是外部输入，所以先用 updateProjectSchema 校验。
        // 校验通过后，service 会继续做“当前用户是否拥有这个 Project”的权限判断。
        const input = updateProjectSchema.parse(request.body);
        const currentUserId = request.user!.id;
        const project = await projectService.updateProject(
          request.params.id as string,
          input,
          currentUserId
        );

        // 更新 Project 后，列表缓存里的 name / description 可能已经过期。
        // 只有 updateProject 成功返回后，才清理缓存。
        if (options.redisClient) {
          await deleteProjectListCacheByUserId(options.redisClient, currentUserId);
        }

        response.json({ success: true, data: project });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  return projectsRouter;
}
