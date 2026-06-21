import { z } from "zod";

// 这个 schema 只负责“分页参数”。
//
// 注意它不关心业务资源是什么：
// - Plans 可以分页
// - Todos 可以分页
// - 以后 Projects 也可以分页
//
// 把它放在 src/http，是因为 page/pageSize 来自 HTTP query string，
// 属于 API 边界的通用输入规则。
export const paginationQuerySchema = z.object({
  // URL query 参数天然是字符串。
  //
  // 例如 ?page=2 到 Express 里通常是 "2"。
  // z.coerce.number() 会先尝试把字符串转成数字，再继续校验 int/min/default。
  page: z.coerce.number().int().min(1).default(1),

  // pageSize 限制最大 50。
  //
  // 这是一个基础保护，避免用户通过 ?pageSize=999999 一次拉太多数据。
  pageSize: z.coerce.number().int().min(1).max(50).default(10),

  // sortBy 表示按哪个字段排序。
  //
  // 这张任务先只允许 createdAt。
  // 这样可以先练通“排序参数传递”这条链路，不急着支持太多字段。
  sortBy: z.enum(["createdAt"]).default("createdAt"),

  // sortOrder 表示升序还是降序。
  //
  // asc：旧数据在前
  // desc：新数据在前
  sortOrder: z.enum(["asc", "desc"]).default("asc")
});
