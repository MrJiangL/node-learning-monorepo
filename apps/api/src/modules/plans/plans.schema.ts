import { z } from "zod";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";

// schema 是“系统边界”的保护层。
//
// 用户传进来的 request.body 默认是不可信的：
// - 可能缺字段
// - 可能类型不对
// - 可能字符串太长
// - 可能只有空格
//
// Zod 会把这些规则写成可执行的校验逻辑。
// 在 routes 里 parse 成功后，后面的 service 就可以更放心地处理数据。
export const createPlanSchema = z.object({
  // trim() 会去掉前后空格。
  // min(1) 确保标题不是空字符串。
  // max(100) 是一个简单的业务限制，避免用户传入特别长的标题。
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),

  // description 是可选字段。
  // 如果用户不传，repository 会把它保存为 null，方便输出格式稳定。
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  // 创建时如果用户不传 difficulty，Zod 会在 parse 后自动补成 medium。
  // 这让后面的 service/repository 收到的是更完整、更干净的 input。
  difficulty: z.enum(["easy", "medium", "hard"]).default("medium")
});

// PATCH /plans/:id 使用的 schema。
//
// PATCH 的语义是“局部更新”，所以所有字段都可以不传。
// 但是：只要某个字段传了，它仍然必须满足对应规则。
export const updatePlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less")
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),

  // 注意这里不要 default("medium")。
  // 对更新接口来说，不传 difficulty 的意思是“不修改原来的 difficulty”，
  // 而不是把它重置成 medium。
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});

// GET /plans 的 query schema。
//
// request.query 和 request.body 一样，都是用户从外部传进来的数据。
// 即使它只是 URL 上的 ?difficulty=easy，也不能直接相信：
// - 用户可能传 difficulty=impossible
// - 用户也可能完全不传 difficulty
// - page/pageSize 看起来是数字，但从 URL 进来时通常是字符串
//
// 这里的 optional() 很关键：
// - /plans?difficulty=easy 合法，表示只看 easy
// - /plans 合法，表示不过滤，返回全部计划
// 如果不写 optional()，Zod 会把“不传 difficulty”当成错误，
// 所以普通的 GET /plans 会变成 400。
export const listPlansQuerySchema = paginationQuerySchema.extend({
  // plans 列表除了分页，还支持按 difficulty 过滤。
  //
  // extend 的意思是：
  // 先复用 paginationQuerySchema 里的 page/pageSize，
  // 再额外加上 plans 自己需要的 difficulty。
  difficulty: z.enum(["easy", "medium", "hard"]).optional()
});
