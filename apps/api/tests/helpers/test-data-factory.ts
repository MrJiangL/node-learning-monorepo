import { Prisma } from "@prisma/client";
import type { ActivityLogAction } from "@learn/shared";
import { prisma } from "../../src/db/prisma.js";
import { hashPassword } from "../../src/modules/auth/password.js";

type CreateUserFactoryInput = {
  email?: string;
  password?: string;
  name?: string;
};

type CreateProjectFactoryInput = {
  userId: string;
  name?: string;
  description?: string | null;
};

type CreateTodoFactoryInput = {
  projectId: string;
  title?: string;
  description?: string | null;
  completed?: boolean;
  dueDate?: Date | null;
};

type CreateActivityLogFactoryInput = {
  userId: string;
  projectId: string;
  projectSnapshotId?: string;
  projectSnapshotName?: string | null;
  action?: ActivityLogAction;
  message?: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
};

// 测试数据需要尽量避免互相撞车。
//
// 比如 User.email 在数据库里通常是唯一的。
// 如果两个测试都创建 test@example.com，就可能因为唯一约束导致失败。
//
// 所以这里用时间戳和随机数生成一个足够唯一的后缀。
const uniqueSuffix = () => `${Date.now()}-${Math.random().toString(16).slice(2)}`;

// createFactoryUser 直接通过 Prisma 创建用户。
//
// 它适合用在“当前测试不关心注册流程，只需要数据库里已经有一个用户”的场景。
// 如果测试目标是 POST /auth/register，那就不应该用这个 helper 绕过注册接口。
export const createFactoryUser = async (input: CreateUserFactoryInput = {}) => {
  const password = input.password ?? "Password123!";

  return prisma.user.create({
    data: {
      // 当前 Prisma schema 里的 id 没有 @default(uuid())。
      //
      // 所以只要我们绕过 service / repository，直接用 Prisma 创建测试数据，
      // 就必须像业务代码一样主动提供 id。
      id: crypto.randomUUID(),
      email: input.email ?? `factory-user-${uniqueSuffix()}@example.com`,
      name: input.name ?? "Factory User",
      passwordHash: await hashPassword(password)
    }
  });
};

// createFactoryProject 直接创建属于某个 user 的 Project。
//
// 注意：这里要求调用方传 userId。
// 这样测试读起来会更明确：这个 project 到底属于哪个用户。
export const createFactoryProject = async (input: CreateProjectFactoryInput) => {
  return prisma.project.create({
    data: {
      // Project id 也由应用层生成，factory 要模拟同一条规则。
      id: crypto.randomUUID(),
      userId: input.userId,
      name: input.name ?? "Factory Project",
      description: input.description ?? null
    }
  });
};

// createFactoryTodo 直接创建属于某个 project 的 Todo。
//
// 它适合用在列表、更新、删除这类测试里：
// 这些测试的重点不是“如何创建 todo”，而是“已有 todo 后，接口行为是否正确”。
export const createFactoryTodo = async (input: CreateTodoFactoryInput) => {
  return prisma.todo.create({
    data: {
      // Todo id 同样不是数据库默认生成。
      id: crypto.randomUUID(),
      projectId: input.projectId,
      title: input.title ?? "Factory Todo",
      description: input.description ?? null,
      completed: input.completed ?? false,
      dueDate: input.dueDate ?? null
    }
  });
};

export const createFactoryActivityLog = async (input: CreateActivityLogFactoryInput) => {
  return prisma.activityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      // ActivityLog.projectId 可能在 Project 删除后被 SetNull。
      //
      // 测试数据工厂默认把快照 id/name 设置成当前 Project 的 id/name。
      // 如果某个测试要模拟“日志还在，但 Project 关系已经断开”，可以显式覆盖这两个字段。
      projectSnapshotId: input.projectSnapshotId ?? input.projectId,
      projectSnapshotName: input.projectSnapshotName ?? null,
      action: input.action ?? "project.created",
      message: input.message ?? "Factory activity log",
      metadata:
        input.metadata === undefined || input.metadata === null
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue),
      createdAt: input.createdAt
    }
  });
};
