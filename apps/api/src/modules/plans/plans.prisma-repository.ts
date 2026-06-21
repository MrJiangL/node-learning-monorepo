import type { CreatePlanInput, Plan, UpdatePlanInput } from "@learn/shared";
import { prisma } from "../../db/prisma.js";
import type { ListPlansFilter, PlanRepository } from "./plans.repository.js";
import { mapPrismaPlanToPlan } from "./plans.mapper.js";

export function createPrismaPlanRepository(): PlanRepository {
  return {
    async create(input: CreatePlanInput, userId: string): Promise<Plan> {
      // prisma.plan 对应 schema.prisma 里的 model Plan。
      //
      // create() 会往 Plan 表插入一行数据。
      // data 里的字段名必须和 Prisma model 字段名一致。
      const plan = await prisma.plan.create({
        data: {
          // id/status/difficulty 默认值仍然由后端控制，
          // 不让客户端随便传系统字段。
          id: crypto.randomUUID(),
          title: input.title,
          description: input.description ?? null,
          status: "active",
          difficulty: input.difficulty ?? "medium",

          // userId 来自 requireAuth 解析出的当前登录用户。
          // 这里不要从 request.body 里取 userId，否则用户可以伪造“别人的用户 id”。
          userId
        }
      });

      return mapPrismaPlanToPlan(plan);
    },

    async findAll(filter: ListPlansFilter) {
      // where 是 Prisma 的查询条件对象。
      //
      // 这里用对象展开语法按条件拼 where：
      // - 有 difficulty：加上 { difficulty: ... }
      // - 有 userId：加上 { userId: ... }
      // - 两个都有：两个条件同时生效，Prisma 会查“属于这个用户且符合这个难度”的计划
      //
      // 这一步是在为登录鉴权做铺垫：
      // 以后 userId 不会来自 query，而会来自 JWT 解析出的当前登录用户。
      const where = {
        ...(filter.difficulty ? { difficulty: filter.difficulty } : {}),
        ...(filter.userId ? { userId: filter.userId } : {})
      };

      // Prisma 分页使用 skip/take：
      // - skip：跳过多少条
      // - take：取多少条
      //
      // page 从 1 开始，但 skip 从 0 开始算。
      const skip = (filter.page - 1) * filter.pageSize;

      // findMany 和 count 都要用同一个 where。
      //
      // findMany 负责拿“当前页的数据”。
      // count 负责算“过滤后的总数”，这样 meta.total 才准确。
      //
      // Promise.all 可以让两个数据库查询并行执行。
      const [plans, total] = await Promise.all([
        prisma.plan.findMany({
          where,
          skip,
          take: filter.pageSize,

          // 数据库如果不指定排序，返回顺序不应该被依赖。
          // 分页尤其需要稳定排序，否则 page=1/page=2 可能不稳定。
          //
          // [filter.sortBy] 是动态 key。
          // 当前 sortBy 只能是 createdAt，所以这里会生成：
          // { createdAt: "asc" } 或 { createdAt: "desc" }
          orderBy: { [filter.sortBy]: filter.sortOrder }
        }),
        prisma.plan.count({ where })
      ]);

      return {
        data: plans.map(mapPrismaPlanToPlan),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total,
          totalPages: Math.ceil(total / filter.pageSize)
        }
      };
    },

    async findById(id: string): Promise<Plan | null> {
      // findUnique 用来按唯一字段查一条数据。
      // schema.prisma 里 id 是 @id，所以可以写 where: { id }。
      const plan = await prisma.plan.findUnique({ where: { id } });

      if (!plan) {
        return null;
      }

      return mapPrismaPlanToPlan(plan);
    },

    async update(id: string, input: UpdatePlanInput): Promise<Plan | null> {
      // Prisma 的 update 找不到记录时会抛异常。
      // 但我们的 repository 接口约定是：找不到时返回 null。
      // 所以这里先查一次，把“不存在”转换成 null。
      const plan = await prisma.plan.findUnique({ where: { id } });

      if (!plan) {
        return null;
      }

      // PATCH 的 input 只包含用户要修改的字段。
      // Prisma update 的 data 也支持局部字段更新，
      // 没传的字段不会被修改。
      const updatedPlan = await prisma.plan.update({
        where: { id },
        data: input
      });

      return mapPrismaPlanToPlan(updatedPlan);
    },

    async delete(id: string): Promise<boolean> {
      // 和 update 一样，Prisma delete 找不到记录时会抛异常。
      // repository 层不负责 HTTP 404，所以先查再删：
      // - 找不到：返回 false
      // - 找到并删除：返回 true
      const plan = await prisma.plan.findUnique({ where: { id } });

      if (!plan) {
        return false;
      }

      await prisma.plan.delete({ where: { id } });
      return true;
    }
  };
}
