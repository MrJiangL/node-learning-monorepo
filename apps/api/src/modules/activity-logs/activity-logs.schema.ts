import { z } from "zod";
import { paginationQuerySchema } from "../../http/pagination-query-schema.js";

export const activityLogActionSchema = z.enum([
  "project.created",
  "project.updated",
  "project.deleted",
  "todo.created",
  "todo.updated",
  "todo.completed",
  "todo.deleted"
]);

export const listActivityLogsQuerySchema = paginationQuerySchema.extend({
  // action 是可选过滤条件。
  //
  // 不传 action 时，表示查询这个 Project 下的全部日志。
  // 传了 action 时，只返回对应类型的日志。
  action: activityLogActionSchema.optional(),

  // createdAfter / createdBefore 来自 URL query，所以入口处先是 string。
  //
  // z.string().datetime() 只负责确认它是合法 ISO datetime。
  // 真正交给 Prisma 查询时，再在 repository 里转成 Date。
  createdAfter: z.string().datetime().optional(),
  createdBefore: z.string().datetime().optional()
});
