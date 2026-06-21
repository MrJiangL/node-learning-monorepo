import { z } from "zod";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";

// 创建 Project 时，客户端只能提交 name / description。
//
// userId 不允许出现在 body 里，因为项目归属必须来自当前登录用户。
// 也就是说：谁带着 token 请求 POST /projects，这个项目就属于谁。
export const createProjectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less"),

  description: z.string().trim().max(1000, "Description must be 1000 characters or less").optional()
});

const initialTodoSchema = z.object({
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

export const createProjectWithTodosSchema = createProjectSchema.extend({
  // 这张任务先要求至少 1 条初始 Todo。
  //
  // 这样你能明确看到 transaction 的价值：
  // Project 和 Todo 是一次业务动作里的多次数据库写入。
  todos: z.array(initialTodoSchema).min(1, "At least one todo is required").max(10)
});

// GET /projects 的 query schema。
//
// Project 列表目前只需要分页和排序参数，所以直接复用 paginationQuerySchema。
export const listProjectsQuerySchema = paginationQuerySchema;

export const updateProjectSchema = z.object({
  // name 是可选字段，但只要传了，就不能是空字符串。
  //
  // .trim() 会把 "  New name  " 变成 "New name"。
  // .min(1) 会拒绝 "   " 这种只有空格的输入。
  name: z
    .string()
    .trim()
    .min(1, "Project name is required")
    .max(100, "Project name must be 100 characters or less")
    .optional(),

  // 这张任务先保持 description 和 createProjectSchema 一致：
  // - 不传：保持原值
  // - 传字符串：更新描述
  //
  // 暂时不支持 description=null 清空描述。
  description: z.string().trim().max(1000, "Description must be 1000 characters or less").optional()
});
