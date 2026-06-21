import type { Plan as PrismaPlan } from "@prisma/client";
import type { Plan } from "@learn/shared";

// mapper 专门负责“数据库模型 -> API 模型”的转换。
//
// Prisma 从 SQLite 取出来的 createdAt/updatedAt 是 Date 对象，
// 但 HTTP JSON 响应里没有真正的 Date 类型，通常返回 ISO 字符串。
//
// 把转换集中在 mapper 里有两个好处：
// 1. repository 不会到处重复 .toISOString()。
// 2. 如果以后数据库字段名或 API 字段名变化，只需要优先看这里。
export function mapPrismaPlanToPlan(plan: PrismaPlan): Plan {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description,
    status: plan.status as Plan["status"],
    difficulty: plan.difficulty as Plan["difficulty"],
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    userId: plan.userId
  };
}
