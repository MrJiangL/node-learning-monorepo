import { Prisma, type ActivityLog as PrismaActivityLogModel } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { mapPrismaActivityLogToActivityLog } from "./activity-logs.mapper.js";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  ListActivityLogsFilter
} from "./activity-logs.repository.js";

export type PrismaActivityLog = PrismaActivityLogModel;

function toPrismaMetadata(metadata: CreateActivityLogInput["metadata"]) {
  // Prisma 7 对 JSON null 分得更细：
  // - JavaScript null 不一定等于数据库 JSON null
  // - Prisma.JsonNull 明确表示“把 JSON 字段写成 null”
  //
  // 所以这里不要直接写 metadata ?? null。
  return metadata === undefined ? Prisma.JsonNull : (metadata as Prisma.InputJsonValue);
}

export function createPrismaActivityLogRepository(): ActivityLogRepository {
  return {
    async create(input: CreateActivityLogInput) {
      // prisma.activityLog 对应 schema.prisma 里的 model ActivityLog。
      //
      // id 目前由应用层生成，因为 schema 里没有 @default(uuid())。
      // action 也要显式写入，否则这条日志就失去了“发生了什么”的核心语义。
      const log = await prisma.activityLog.create({
        data: {
          id: crypto.randomUUID(),
          action: input.action,
          userId: input.userId,
          metadata: toPrismaMetadata(input.metadata),
          message: input.message,
          projectId: input.projectId,
          projectSnapshotId: input.projectSnapshotId,
          projectSnapshotName: input.projectSnapshotName ?? null
        }
      });

      return mapPrismaActivityLogToActivityLog(log);
    },

    async findAll(filter: ListActivityLogsFilter) {
      const createdAt =
        filter.createdAfter || filter.createdBefore
          ? {
              // gte = greater than or equal，大于等于。
              // createdAfter 有值时，只返回这个时间点之后创建的日志。
              gte: filter.createdAfter ? new Date(filter.createdAfter) : undefined,

              // lte = less than or equal，小于等于。
              // createdBefore 有值时，只返回这个时间点之前创建的日志。
              lte: filter.createdBefore ? new Date(filter.createdBefore) : undefined
            }
          : undefined;

      const where = {
        // 这是这张任务最重要的查询边界。
        //
        // Project 删除后，ActivityLog.projectId 会被数据库设置成 null，
        // 因为 schema 里使用的是 onDelete: SetNull。
        //
        // 所以这里不能再依赖 projectId 或 project 关系来查日志。
        // 要使用写日志时额外保存的快照字段 projectSnapshotId。
        //
        // userId 也必须保留：它是“当前用户只能看自己的日志”的权限边界。
        userId: filter.userId,
        projectSnapshotId: filter.projectId,
        action: filter.action,
        createdAt
      };

      const skip = (filter.page - 1) * filter.pageSize;

      const [logs, total] = await Promise.all([
        prisma.activityLog.findMany({
          where,
          skip,
          take: filter.pageSize,
          orderBy: {
            createdAt: "desc"
          }
        }),
        prisma.activityLog.count({ where })
      ]);

      return {
        data: logs.map(mapPrismaActivityLogToActivityLog),
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total,
          totalPages: Math.ceil(total / filter.pageSize)
        }
      };
    }
  };
}
