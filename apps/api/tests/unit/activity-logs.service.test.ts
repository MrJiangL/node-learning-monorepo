import type { ActivityLog, PaginatedResult } from "@learn/shared";
import { describe, expect, it, vi } from "vitest";
import { createActivityLogService } from "../../src/modules/activity-logs/activity-logs.service.js";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  ListActivityLogsFilter
} from "../../src/modules/activity-logs/activity-logs.repository.js";

function createFakeActivityLog(overrides: Partial<ActivityLog> = {}): ActivityLog {
  return {
    id: "activity-log-1",
    action: "project.created",
    message: "创建了项目",
    metadata: null,
    createdAt: "2026-06-14T00:00:00.000Z",
    userId: "user-1",
    projectId: "project-1",
    projectSnapshotId: "project-1",
    projectSnapshotName: "Test project",
    ...overrides
  };
}

function createFakeRepository(): ActivityLogRepository {
  return {
    create: vi.fn(async (input: CreateActivityLogInput) =>
      createFakeActivityLog({
        action: input.action,
        message: input.message,
        metadata: input.metadata ?? null,
        userId: input.userId,
        projectId: input.projectId,
        projectSnapshotId: input.projectSnapshotId,
        projectSnapshotName: input.projectSnapshotName ?? null
      })
    ),
    findAll: vi.fn(
      async (filter: ListActivityLogsFilter): Promise<PaginatedResult<ActivityLog>> => {
        return {
          data: [
            createFakeActivityLog({
              userId: filter.userId,
              projectId: filter.projectId
            })
          ],
          meta: {
            page: filter.page,
            pageSize: filter.pageSize,
            total: 1,
            totalPages: 1
          }
        };
      }
    )
  };
}

describe("activity log service", () => {
  it("记录 Activity Log 时把业务输入交给 repository.create", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    const result = await service.record({
      action: "todo.completed",
      message: "完成了 Todo",
      metadata: {
        todoId: "todo-1",
        title: "写 Activity Log 测试",
        changedFields: ["completed"]
      },
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Project snapshot"
    });

    // 这个断言是在保护“service 调用协作者的方式”。
    //
    // 如果以后有人在 service 里忘了传 metadata，
    // 或者把 userId / projectId 写反，这个测试会马上失败。
    expect(repository.create).toHaveBeenCalledWith({
      action: "todo.completed",
      message: "完成了 Todo",
      metadata: {
        todoId: "todo-1",
        title: "写 Activity Log 测试",
        changedFields: ["completed"]
      },
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Project snapshot"
    });
    expect(result).toMatchObject({
      action: "todo.completed",
      message: "完成了 Todo",
      metadata: {
        todoId: "todo-1",
        title: "写 Activity Log 测试",
        changedFields: ["completed"]
      },
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Project snapshot"
    });
  });

  it("记录 Activity Log 时会按 action 校验并保存合法 metadata", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    await service.record({
      action: "project.updated",
      message: "更新了项目 Backend depth",
      metadata: {
        projectName: "Backend depth",
        changedFields: ["name"]
      },
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Backend depth"
    });

    expect(repository.create).toHaveBeenCalledWith({
      action: "project.updated",
      message: "更新了项目 Backend depth",
      metadata: {
        projectName: "Backend depth",
        changedFields: ["name"]
      },
      userId: "user-1",
      projectId: "project-1",
      projectSnapshotId: "project-1",
      projectSnapshotName: "Backend depth"
    });
  });

  it("metadata 不符合当前 action 契约时不会写入 Activity Log", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    await expect(
      service.record({
        action: "todo.created",
        message: "创建了 Todo",
        metadata: {
          todoId: "todo-1"
        },
        userId: "user-1",
        projectId: "project-1",
        projectSnapshotId: "project-1",
        projectSnapshotName: "Project snapshot"
      })
    ).rejects.toThrow();

    // metadata 校验失败时，service 应该在调用 repository.create 前就停下来。
    //
    // 这能防止错误格式的 ActivityLog 被写入数据库，
    // 也能让问题尽早暴露在测试或开发环境里。
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("查询 Project 活动记录时把分页和权限参数交给 repository.findAll", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    const result = await service.listProjectLogs({
      userId: "user-1",
      projectId: "project-1",
      page: 2,
      pageSize: 10
    });

    // 这里重点不是测试 Prisma 查询。
    //
    // Prisma 查询已经在 activity-logs.prisma-repository.test.ts 里测过。
    // Service 单元测试只确认：service 有没有把权限和分页参数完整交给 repository。
    expect(repository.findAll).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      action: undefined,
      createdAfter: undefined,
      createdBefore: undefined,
      page: 2,
      pageSize: 10
    });
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 10,
      total: 1,
      totalPages: 1
    });
    expect(result.data[0]).toMatchObject({
      userId: "user-1",
      projectId: "project-1"
    });
  });

  it("查询 Project 活动记录时会把 action 过滤条件交给 repository.findAll", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    await service.listProjectLogs({
      userId: "user-1",
      projectId: "project-1",
      action: "todo.completed",
      page: 1,
      pageSize: 10
    });

    // Service 不应该自己过滤数组，也不应该知道 Prisma 怎么写 where。
    //
    // 它只负责把 route 层解析好的 action 参数继续交给 repository。
    // 真正的数据过滤由 repository / 数据库完成。
    expect(repository.findAll).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      action: "todo.completed",
      createdAfter: undefined,
      createdBefore: undefined,
      page: 1,
      pageSize: 10
    });
  });

  it("查询 Project 活动记录时会把时间范围过滤条件交给 repository.findAll", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    await service.listProjectLogs({
      userId: "user-1",
      projectId: "project-1",
      createdAfter: "2026-06-05T00:00:00.000Z",
      createdBefore: "2026-06-15T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });

    // 这个测试专门保护“参数传递链路”。
    //
    // route 层即使正确解析了 createdAfter / createdBefore，
    // 如果 service 忘了继续传给 repository，数据库查询也不会真的过滤时间。
    expect(repository.findAll).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      action: undefined,
      createdAfter: "2026-06-05T00:00:00.000Z",
      createdBefore: "2026-06-15T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });
  });

  it("查询 Project 活动记录时会把 action 和时间范围过滤条件一起交给 repository.findAll", async () => {
    const repository = createFakeRepository();
    const service = createActivityLogService(repository);

    await service.listProjectLogs({
      userId: "user-1",
      projectId: "project-1",
      action: "todo.completed",
      createdAfter: "2026-06-01T00:00:00.000Z",
      createdBefore: "2026-06-30T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });

    // 这条测试把 action + 时间范围放在一起，是为了证明：
    // service 不会因为过滤条件变多就漏传某一个字段。
    //
    // 真正的过滤逻辑仍然不在 service 里做；
    // service 只负责把 route 已经解析好的条件交给 repository。
    expect(repository.findAll).toHaveBeenCalledWith({
      userId: "user-1",
      projectId: "project-1",
      action: "todo.completed",
      createdAfter: "2026-06-01T00:00:00.000Z",
      createdBefore: "2026-06-30T23:59:59.999Z",
      page: 1,
      pageSize: 10
    });
  });
});
