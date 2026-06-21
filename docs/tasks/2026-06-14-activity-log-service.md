# Task: Activity Log 综合业务模块：Service

## 背景

上一张任务你已经完成了 ActivityLogRepository：

```text
create:
  写入一条日志

findAll:
  查询当前用户某个 Project 下的日志，并通过 project.userId 做权限边界
```

这一张任务开始写 Service。

Service 层的作用是：

```text
把“业务语义”包在 repository 外面。
```

Repository 关心的是：

```text
怎么存
怎么查
怎么分页
怎么把 Prisma 数据映射成 shared 类型
```

Service 更关心的是：

```text
业务上什么时候叫“记录项目创建日志”
业务上什么时候叫“查询项目活动记录”
调用方应该传什么，不应该传什么
```

这张任务先不接 API，也先不接 Project / Todo 写操作。

原因是：

```text
你先把 service 的单元测试写明白。
下一张再把 Project / Todo 的 create/update/delete 动作接进来。
```

---

## 任务 1：新增 service 文件

新增：

```text
apps/api/src/modules/activity-logs/activity-logs.service.ts
```

建议结构：

```ts
import type { ActivityLog, ActivityLogAction, PaginatedResult } from "@learn/shared";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  ListActivityLogsFilter
} from "./activity-logs.repository.js";

export type RecordActivityLogInput = {
  action: ActivityLogAction;
  message: string;
  metadata?: Record<string, unknown>;
  userId: string;
  projectId: string;
};

export type ListProjectActivityLogsInput = {
  userId: string;
  projectId: string;
  page: number;
  pageSize: number;
};

export type ActivityLogService = {
  record(input: RecordActivityLogInput): Promise<ActivityLog>;
  listProjectLogs(input: ListProjectActivityLogsInput): Promise<PaginatedResult<ActivityLog>>;
};

export function createActivityLogService(repository: ActivityLogRepository): ActivityLogService {
  return {
    async record(input: RecordActivityLogInput) {
      // Service 这一层目前只是把业务输入转给 repository。
      //
      // 你可能会觉得“这不是多包了一层吗？”
      // 是的，现在看起来很薄，但它后面会变得有价值：
      // - 统一生成 message
      // - 统一补 metadata
      // - 统一处理哪些 action 允许记录
      // - 统一决定日志失败时要不要影响主业务
      const createInput: CreateActivityLogInput = {
        action: input.action,
        message: input.message,
        metadata: input.metadata,
        userId: input.userId,
        projectId: input.projectId
      };

      return repository.create(createInput);
    },

    async listProjectLogs(input: ListProjectActivityLogsInput) {
      // listProjectLogs 这个名字比 findAll 更有业务含义。
      //
      // findAll 是 repository 语言：查很多条。
      // listProjectLogs 是 service 语言：查看某个项目的活动记录。
      const filter: ListActivityLogsFilter = {
        userId: input.userId,
        projectId: input.projectId,
        page: input.page,
        pageSize: input.pageSize
      };

      return repository.findAll(filter);
    }
  };
}
```

---

## 任务 2：写 fake repository 测试

新增：

```text
apps/api/tests/unit/activity-logs.service.test.ts
```

这张任务不要用 Prisma。

你要用 fake repository。

为什么？

```text
Service 单元测试要关注“service 有没有正确调用 repository”。

如果 service 测试也连数据库：
- 测试会更慢
- 数据准备更多
- 失败时更难判断是 service 错，还是 Prisma repository 错

Repository 已经有自己的 Prisma 测试了。
Service 测试就用 fake。
```

---

## 任务 3：准备 fake repository

测试文件里可以先写：

```ts
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
        projectId: input.projectId
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
```

注意：

```text
vi.fn 可以让你断言：
repository.create 有没有被调用？
调用时参数是什么？
调用了几次？
```

这就是 service 测试常见的“协作者断言”。

---

## 任务 4：测试 record

建议测试：

```ts
it("记录 Activity Log 时把业务输入交给 repository.create", async () => {
  const repository = createFakeRepository();
  const service = createActivityLogService(repository);

  const result = await service.record({
    action: "todo.completed",
    message: "完成了 Todo",
    metadata: {
      todoId: "todo-1"
    },
    userId: "user-1",
    projectId: "project-1"
  });

  expect(repository.create).toHaveBeenCalledWith({
    action: "todo.completed",
    message: "完成了 Todo",
    metadata: {
      todoId: "todo-1"
    },
    userId: "user-1",
    projectId: "project-1"
  });
  expect(result).toMatchObject({
    action: "todo.completed",
    message: "完成了 Todo",
    userId: "user-1",
    projectId: "project-1"
  });
});
```

---

## 任务 5：测试 listProjectLogs

建议测试：

```ts
it("查询 Project 活动记录时把分页和权限参数交给 repository.findAll", async () => {
  const repository = createFakeRepository();
  const service = createActivityLogService(repository);

  const result = await service.listProjectLogs({
    userId: "user-1",
    projectId: "project-1",
    page: 2,
    pageSize: 10
  });

  expect(repository.findAll).toHaveBeenCalledWith({
    userId: "user-1",
    projectId: "project-1",
    page: 2,
    pageSize: 10
  });
  expect(result.meta).toEqual({
    page: 2,
    pageSize: 10,
    total: 1,
    totalPages: 1
  });
});
```

---

## 任务 6：先不要做的事

这张任务先不要：

```text
不要新增 routes
不要改 app.ts
不要把日志接进 Project / Todo service
不要写 OpenAPI
```

原因是：

```text
Service 单元测试先单独练清楚。
下一张任务再练“业务接入点在哪里放日志”。
```

---

## 验证命令

先跑单个 service 测试：

```bash
npm run test -w @learn/api -- activity-logs.service.test.ts
```

再跑整体检查：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 新增 `activity-logs.service.ts`
- [x] 定义 `RecordActivityLogInput`
- [x] 定义 `ListProjectActivityLogsInput`
- [x] `record` 调用 `repository.create`
- [x] `listProjectLogs` 调用 `repository.findAll`
- [x] 新增 `activity-logs.service.test.ts`
- [x] service 测试使用 fake repository，不连接 Prisma
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- activity-logs.service.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log Service 完成了
```
