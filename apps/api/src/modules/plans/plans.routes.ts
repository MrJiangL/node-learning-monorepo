import { Router } from "express";
import { asyncHandler } from "../../http/async-handler.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import { mapZodErrorToAppError } from "../../http/validation-error.js";
import { requireAuth } from "../../middleware/require-auth.js";
import { createPrismaPlanRepository } from "./plans.prisma-repository.js";
import { createPlanSchema, listPlansQuerySchema, updatePlanSchema } from "./plans.schema.js";
import { createPlanService } from "./plans.service.js";

export function createPlansRouter() {
  const plansRouter = Router();

  // 这里使用 Prisma repository，让 plans API 读写 MySQL 数据库。
  //
  // route 仍然只依赖 PlanRepository 接口，不关心底层是内存数组还是数据库。
  // 这就是前面一直保留 repository/service 分层的价值：
  // 换存储实现时，上面的路由处理流程不用大改。
  const planService = createPlanService(createPrismaPlanRepository());

  // 这个 router 被 app.ts 挂载到 /plans。
  // 所以这里会保护所有 /plans 子路由：
  // - GET /plans
  // - POST /plans
  // - GET /plans/:id
  //
  // 能执行到下面具体路由时，requireAuth 已经把当前用户放到了 request.user。
  plansRouter.use(requireAuth);

  // GET /plans
  //
  // 路由层负责把 HTTP 请求转成 service 调用，再把 service 结果转成 HTTP 响应。
  // 它不应该知道数据怎么存，也不应该写太多业务规则。
  plansRouter.get(
    "/",
    asyncHandler(async (request, response) => {
      try {
        // query 参数来自 URL，不来自 JSON body。
        // 例如 /plans?difficulty=easy 会进入 request.query。
        //
        // Express 给我们的 request.query 类型比较宽泛，
        // 所以先交给 Zod 做运行时校验，再把校验后的 query 传给 service。
        const query = listPlansQuerySchema.parse(request.query);

        // request.user!.id 是当前登录用户。
        //
        // 这里的 ! 表示告诉 TypeScript：requireAuth 已经保证 user 存在。
        // service 会强制把查询限制在这个用户自己的计划里。
        const result = await planService.listPlans(query, request.user!.id);

        // 列表接口通常把“真正的数据”放在 data，
        // 把“描述这批数据的信息”放在 meta。
        response.json({ success: true, data: result.data, meta: result.meta });
      } catch (error) {
        mapZodErrorToAppError(error, "query");
      }
    })
  );

  // POST /plans
  //
  // 一次典型的创建请求流程：
  // 1. Express 通过 express.json() 把 JSON 请求体放到 request.body。
  // 2. Zod 校验 request.body，成功后得到类型更可靠的 input。
  // 3. service 使用当前登录用户 id 处理业务逻辑。
  // 4. repository 生成并保存 Plan。
  // 5. route 返回 201 Created。
  plansRouter.post(
    "/",
    asyncHandler(async (request, response) => {
      try {
        const input = createPlanSchema.parse(request.body);

        // 归属用户只能来自 request.user，不能来自 request.body。
        // 这样客户端即使传了 userId，也不会影响计划归属。
        const plan = await planService.createPlan(input, request.user!.id);

        response.status(HTTP_STATUS.CREATED).json({ success: true, data: plan });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  plansRouter.get(
    "/:id",
    asyncHandler(async (request, response) => {
      const plan = await planService.getPlan(request.params.id as string, request.user!.id);
      response.json({ success: true, data: plan });
    })
  );

  plansRouter.patch(
    "/:id",
    asyncHandler(async (request, response) => {
      try {
        // PATCH 同时需要 URL 参数和请求体：
        // - request.params.id 决定更新哪一条计划
        // - request.body 决定更新哪些字段
        const input = updatePlanSchema.parse(request.body);
        const plan = await planService.updatePlan(
          request.params.id as string,
          input,
          request.user!.id
        );

        response.json({ success: true, data: plan });
      } catch (error) {
        mapZodErrorToAppError(error, "body");
      }
    })
  );

  plansRouter.delete(
    "/:id",
    asyncHandler(async (request, response) => {
      await planService.deletePlan(request.params.id as string, request.user!.id);

      // 204 No Content 表示“请求成功，但响应体为空”。
      // 删除接口常用 204，因为客户端通常只需要知道删除成功，不需要再拿一份旧资源。
      response.status(HTTP_STATUS.NO_CONTENT).send();
    })
  );

  return plansRouter;
}
