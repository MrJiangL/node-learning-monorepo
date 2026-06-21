import type { CreatePlanInput, UpdatePlanInput } from "@learn/shared";
import { AppError } from "../../errors/app-error.js";
import { HTTP_STATUS } from "../../http/http-status.js";
import type { ListPlansFilter, PlanRepository } from "./plans.repository.js";
import { ERROR_CODE } from "../../errors/error-code.js";

// Service 是“业务逻辑层”。
//
// 目前逻辑还很薄，只是转发给 repository。
// 但这是有意保留的结构：以后要加“标题不能重复”“完成计划”“只能看自己的计划”
// 这类业务规则时，都应该优先放在 service，而不是塞到 route 里。
export function createPlanService(planRepository: PlanRepository) {
  return {
    createPlan(input: CreatePlanInput, currentUserId: string) {
      // currentUserId 来自 requireAuth 放到 req.user 上的当前登录用户。
      // 创建计划时，归属用户由服务端决定，不能让客户端自己传 userId。
      return planRepository.create(input, currentUserId);
    },

    listPlans(filter: ListPlansFilter, currentUserId: string) {
      // 无论 query 里有没有传 userId，最终都强制覆盖成当前登录用户 id。
      // 这就是列表接口的数据隔离边界。
      return planRepository.findAll({ ...filter, userId: currentUserId });
    },

    async getPlan(id: string, currentUserId: string) {
      const plan = await planRepository.findById(id);

      if (!plan || plan.userId !== currentUserId) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan was not found");
      }

      return plan;
    },

    async updatePlan(id: string, input: UpdatePlanInput, currentUserId: string) {
      // 更新前先查一次并校验归属。
      //
      // 不能先 update 再判断 userId，否则会出现一个严重问题：
      // 用户虽然最后拿到 404，但别人的数据已经被改掉了。
      const existingPlan = await planRepository.findById(id);

      if (!existingPlan || existingPlan.userId !== currentUserId) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan was not found");
      }

      const plan = await planRepository.update(id, input);

      if (!plan) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan was not found");
      }

      return plan;
    },

    async deletePlan(id: string, currentUserId: string) {
      // 删除和更新一样，必须先校验归属，再执行删除。
      // 否则用户可能删除别人的计划。
      const existingPlan = await planRepository.findById(id);

      if (!existingPlan || existingPlan.userId !== currentUserId) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan was not found");
      }

      const deleted = await planRepository.delete(id);

      // repository 用 boolean 表示删除是否发生。
      // service 把 false 翻译成业务语义：要删除的计划不存在。
      if (!deleted) {
        throw new AppError(HTTP_STATUS.NOT_FOUND, ERROR_CODE.PLAN_NOT_FOUND, "Plan was not found");
      }
    }
  };
}
