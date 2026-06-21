import { z } from "zod";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";

export const createTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Todo title is required")
    .max(100, "Todo title must be 100 characters or less"),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),
  dueDate: z.string().optional()
});

export const updateTodoSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Todo title is required")
    .max(100, "Todo title must be 100 characters or less")
    .optional(),
  description: z
    .string()
    .trim()
    .max(1000, "Description must be 1000 characters or less")
    .optional(),
  dueDate: z.string().nullable().optional(),
  completed: z.boolean().optional()
});

const dateStringSchema = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "Invalid date"
});

// Todo 列表目前支持：
// - 通用分页参数：page / pageSize
// - 通用排序参数：sortBy / sortOrder
// - Todo 自己的过滤参数：completed
//
// 先复用 paginationQuerySchema，再用 extend() 追加 Todo 专属 query。
// 这样 plans / projects / todos 可以共享分页规则，同时每个资源还能扩展自己的过滤条件。
export const listTodosQuerySchema = paginationQuerySchema.extend({
  // URL query string 里没有真正的 boolean，只有字符串。
  //
  // 所以这里明确只接受：
  // - completed=true
  // - completed=false
  //
  // 不直接使用 z.coerce.boolean()，是因为 Boolean("false") 在 JavaScript 里是 true。
  // 这个坑会导致 ?completed=false 被错误解析成 true。
  completed: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),

  // dueAfter / dueBefore 也来自 URL query string。
  //
  // 这里先只校验“这个字符串能不能被 Date.parse 解析”。
  // 真正转成 Date 的动作放在 Prisma repository 里，因为那里才需要拼数据库查询条件。
  dueAfter: dateStringSchema.optional(),
  dueBefore: dateStringSchema.optional(),

  // title 是可选搜索关键字。
  //
  // trim() 会把 "  report  " 变成 "report"。
  // min(1) 可以拒绝 title=   这种空搜索。
  // max(100) 和 createTodoSchema 的 title 最大长度保持一致。
  title: z.string().trim().min(1).max(100).optional()
});
