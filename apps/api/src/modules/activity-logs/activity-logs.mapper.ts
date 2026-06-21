import type { ActivityLog, ActivityLogAction } from "@learn/shared";
import type { PrismaActivityLog } from "./activity-logs.prisma-repository.js";

export function mapPrismaActivityLogToActivityLog(log: PrismaActivityLog): ActivityLog {
  return {
    id: log.id,
    action: log.action as ActivityLogAction,
    message: log.message,

    // Prisma 的 Json 字段读出来时类型比较宽，可能是对象、数组、字符串、数字等。
    //
    // 我们这个业务约定 metadata 保存“对象形态的附加信息”。
    // 例如 { todoId, title }，所以在 shared 类型里收窄成 Record<string, unknown> | null。
    metadata: log.metadata as Record<string, unknown> | null,

    // 数据库里是 DateTime，Prisma 返回 Date 对象。
    // API / shared 类型里统一用 ISO string，前端拿到后更容易直接展示或再格式化。
    createdAt: log.createdAt.toISOString(),
    userId: log.userId,
    projectId: log.projectId,
    projectSnapshotId: log.projectSnapshotId,
    projectSnapshotName: log.projectSnapshotName
  };
}
