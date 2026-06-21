import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaActivityLogRepository } from "../../src/modules/activity-logs/activity-logs.prisma-repository.js";
import {
  createFactoryActivityLog,
  createFactoryProject,
  createFactoryUser
} from "../helpers/test-data-factory.js";

describe("prisma activity log repository", () => {
  beforeEach(async () => {
    // ActivityLog 同时依赖 User 和 Project。
    //
    // 所以清理顺序要先删 ActivityLog，再删 Todo/Project/User。
    // 如果先删 Project 或 User，数据库外键会阻止删除，或者依赖级联行为让测试意图不够清楚。
    await prisma.activityLog.deleteMany();
    await prisma.todo.deleteMany();
    await prisma.project.deleteMany();
    await prisma.userSession.deleteMany();
    await prisma.user.deleteMany();
  });

  it("创建一条 Activity Log", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-create-owner@example.com"
    });
    const project = await createFactoryProject({
      userId: owner.id,
      name: "Activity Log Project"
    });

    const createdLog = await repository.create({
      action: "project.created",
      message: "创建了项目 Activity Log Project",
      metadata: {
        projectName: "Activity Log Project"
      },
      userId: owner.id,
      projectId: project.id,
      projectSnapshotId: project.id,
      projectSnapshotName: project.name
    });

    const savedLog = await prisma.activityLog.findUnique({
      where: { id: createdLog.id }
    });

    expect(createdLog).toMatchObject({
      action: "project.created",
      message: "创建了项目 Activity Log Project",
      metadata: {
        projectName: "Activity Log Project"
      },
      userId: owner.id,
      projectId: project.id,
      projectSnapshotId: project.id,
      projectSnapshotName: project.name
    });
    expect(typeof createdLog.createdAt).toBe("string");
    expect(savedLog?.action).toBe("project.created");
    expect(savedLog?.projectSnapshotId).toBe(project.id);
    expect(savedLog?.projectSnapshotName).toBe(project.name);
  });

  it("列表只返回当前用户指定 Project 下的 Activity Logs", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-list-owner@example.com"
    });
    const anotherUser = await createFactoryUser({
      email: "activity-log-list-other@example.com"
    });
    const ownerProject = await createFactoryProject({
      userId: owner.id,
      name: "Owner Project"
    });
    const anotherProject = await createFactoryProject({
      userId: anotherUser.id,
      name: "Another Project"
    });

    // 准备两组用户的数据，才能证明权限边界真的生效。
    //
    // 如果 repository.findAll 只按 projectId 查，当前测试可能依然通过。
    // 所以这里查询时会故意使用“别人的 userId + 当前 projectId”再验证返回空列表。
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: ownerProject.id,
      action: "project.created",
      message: "Owner 创建了项目"
    });
    await createFactoryActivityLog({
      userId: anotherUser.id,
      projectId: anotherProject.id,
      action: "project.created",
      message: "Another user 创建了项目"
    });

    const ownerResult = await repository.findAll({
      userId: owner.id,
      projectId: ownerProject.id,
      page: 1,
      pageSize: 10
    });
    const crossUserResult = await repository.findAll({
      userId: anotherUser.id,
      projectId: ownerProject.id,
      page: 1,
      pageSize: 10
    });

    expect(ownerResult.data.map((log) => log.message)).toEqual(["Owner 创建了项目"]);
    expect(ownerResult.data.every((log) => log.projectId === ownerProject.id)).toBe(true);
    expect(ownerResult.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
    expect(crossUserResult.data).toEqual([]);
    expect(crossUserResult.meta.total).toBe(0);
  });

  it("列表按创建时间倒序返回并带分页 meta", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-pagination-owner@example.com"
    });
    const project = await createFactoryProject({
      userId: owner.id,
      name: "Pagination Project"
    });

    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "project.created",
      message: "第一条日志",
      createdAt: new Date("2026-01-01T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.created",
      message: "第二条日志",
      createdAt: new Date("2026-01-02T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "第三条日志",
      createdAt: new Date("2026-01-03T00:00:00.000Z")
    });

    const result = await repository.findAll({
      userId: owner.id,
      projectId: project.id,
      page: 1,
      pageSize: 2
    });

    expect(result.data.map((log) => log.message)).toEqual(["第三条日志", "第二条日志"]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("列表可以按 action 过滤 Activity Logs", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-action-filter-owner@example.com"
    });
    const project = await createFactoryProject({
      userId: owner.id,
      name: "Action Filter Project"
    });

    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "project.created",
      message: "创建了项目"
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.created",
      message: "创建了 Todo"
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "完成了 Todo"
    });

    const result = await repository.findAll({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      page: 1,
      pageSize: 10
    });

    // 这个测试证明 action 过滤是在 repository / 数据库层生效的。
    //
    // 如果 findAll 忘了把 filter.action 放进 Prisma where，
    // 这里就会返回三条日志，而不是只返回 todo.completed。
    expect(result.data.map((log) => log.action)).toEqual(["todo.completed"]);
    expect(result.data.map((log) => log.message)).toEqual(["完成了 Todo"]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
  });

  it("列表可以按 createdAt 时间范围过滤 Activity Logs", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-date-range-owner@example.com"
    });
    const project = await createFactoryProject({
      userId: owner.id,
      name: "Date Range Project"
    });

    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "project.created",
      message: "六月一日的日志",
      createdAt: new Date("2026-06-01T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.created",
      message: "六月十日的日志",
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "六月二十日的日志",
      createdAt: new Date("2026-06-20T00:00:00.000Z")
    });

    const result = await repository.findAll({
      userId: owner.id,
      projectId: project.id,
      createdAfter: "2026-06-05T00:00:00.000Z",
      createdBefore: "2026-06-15T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });

    // 时间范围过滤适合放在 repository 测试里验证。
    //
    // 因为这里可以直接准备固定 createdAt 的数据库数据，
    // 不需要依赖 API 请求发生的真实时间。
    expect(result.data.map((log) => log.message)).toEqual(["六月十日的日志"]);
    expect(result.meta).toEqual({
      page: 1,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
  });

  it("列表可以同时按 action 和 createdAt 时间范围过滤 Activity Logs", async () => {
    const repository = createPrismaActivityLogRepository();
    const owner = await createFactoryUser({
      email: "activity-log-combined-filter-owner@example.com"
    });
    const project = await createFactoryProject({
      userId: owner.id,
      name: "Combined Filter Project"
    });

    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "时间太早的 completed 日志",
      createdAt: new Date("2026-06-01T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "应该返回的日志",
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      message: "时间太晚的 completed 日志",
      createdAt: new Date("2026-06-20T00:00:00.000Z")
    });
    await createFactoryActivityLog({
      userId: owner.id,
      projectId: project.id,
      action: "todo.created",
      message: "action 不匹配的日志",
      createdAt: new Date("2026-06-10T00:00:00.000Z")
    });

    const result = await repository.findAll({
      userId: owner.id,
      projectId: project.id,
      action: "todo.completed",
      createdAfter: "2026-06-05T00:00:00.000Z",
      createdBefore: "2026-06-15T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });

    // 这条测试同时准备了三类“不应该返回”的数据：
    // - action 对，但时间太早
    // - action 对，但时间太晚
    // - 时间对，但 action 不匹配
    //
    // 所以它能证明 action 和 createdAt 两个过滤条件是同时生效的。
    expect(result.data.map((log) => log.message)).toEqual(["应该返回的日志"]);
    expect(result.meta.total).toBe(1);
  });
});
