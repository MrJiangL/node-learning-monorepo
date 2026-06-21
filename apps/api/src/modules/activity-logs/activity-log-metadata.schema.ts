import type { ActivityLogAction } from "@learn/shared";
import { z } from "zod";

const projectCreatedMetadataSchema = z.object({
  // projectName 是日志展示需要的项目名称。
  //
  // 这里用 string().min(1)，是为了避免写入空名称快照。
  projectName: z.string().min(1)
});

const projectUpdatedMetadataSchema = z.object({
  projectName: z.string().min(1),

  // changedFields 用来记录这次 PATCH 改了哪些字段。
  //
  // 它不是给数据库查询用的核心字段，而是给日志详情展示用的上下文。
  changedFields: z.array(z.string().min(1))
});

const todoMetadataSchema = z.object({
  todoId: z.string().min(1),
  title: z.string().min(1)
});

const todoUpdatedMetadataSchema = todoMetadataSchema.extend({
  changedFields: z.array(z.string().min(1))
});

const metadataSchemaByAction = {
  "project.created": projectCreatedMetadataSchema,
  "project.updated": projectUpdatedMetadataSchema,
  // project.deleted 和 project.created 暂时共用同一种 metadata 形状。
  //
  // 因为这两个事件展示时都只需要知道 Project 当时叫什么名字。
  "project.deleted": projectCreatedMetadataSchema,
  "todo.created": todoMetadataSchema,
  "todo.updated": todoUpdatedMetadataSchema,
  "todo.completed": todoUpdatedMetadataSchema,
  "todo.deleted": todoMetadataSchema
} satisfies Record<ActivityLogAction, z.ZodType<Record<string, unknown>>>;

export function parseActivityLogMetadata(
  action: ActivityLogAction,
  metadata: Record<string, unknown> | undefined
) {
  const schema = metadataSchemaByAction[action];

  return schema.parse(metadata ?? {});
}
