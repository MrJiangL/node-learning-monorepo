import type { Project } from "@learn/shared";
import type { PrismaProject } from "./projects.prisma-repository.js";

// Prisma 从数据库拿出来的 Date 是 Date 对象。
// 但 HTTP API 返回 JSON 时，Date 会变成字符串。
//
// 所以 repository 在返回 shared 类型前，统一把 Date 转成 ISO string。
// 这样 route/service/test 看到的 Project 形状会更稳定。
export function mapPrismaProjectToProject(project: PrismaProject): Project {
  return {
    id: project.id,
    name: project.name,
    description: project.description,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    userId: project.userId
  };
}
