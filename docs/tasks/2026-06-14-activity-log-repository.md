# Task: Activity Log 综合业务模块：Repository

## 背景

上一张任务已经完成了 Activity Log 的数据模型：

```text
User -> ActivityLog
Project -> ActivityLog
```

这一张任务只做 Repository。

先不要接 routes，也先不要在 Project / Todo 的业务里自动写日志。

原因是：

```text
Activity Log 以后会被很多业务调用。

如果一上来就接 API、service、Project 更新、Todo 删除，问题会混在一起：
- 是 Prisma 查询写错了？
- 是 mapper 转换错了？
- 是权限边界没加？
- 是 route 参数没传对？

所以先把 repository 单独练清楚。
```

---

## 你这张任务要实现什么

实现一个 ActivityLogRepository，提供两个能力：

```text
1. create
   创建一条活动日志

2. findAll
   查询当前用户某个 Project 下的活动日志列表
```

这张任务的重点不是 API，而是：

```text
Prisma model -> shared type
分页查询
JSON metadata
通过 Project.userId 做权限边界
```

---

## 任务 1：创建模块目录

新增目录：

```text
apps/api/src/modules/activity-logs
```

新增文件：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
apps/api/src/modules/activity-logs/activity-logs.mapper.ts
```

---

## 任务 2：定义 Repository 接口

新增：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
```

建议先写成这样：

```ts
import type { ActivityLog, ActivityLogAction, PaginatedResult } from "@learn/shared";

export type CreateActivityLogInput = {
  // action 用 shared 里的联合类型，避免业务代码随便写字符串。
  //
  // 例如只能写 "project.created"，不能写 "project_create"。
  action: ActivityLogAction;

  // message 是给前端或后台管理页面看的摘要文本。
  //
  // 例如：“创建了项目 Learning Node”
  // 它不是用来做严格查询的字段，严格查询应该依赖 action / projectId / userId。
  message: string;

  // metadata 用来放不同 action 的附加信息。
  //
  // 例如：
  // - project.updated 可以放 { oldName, newName }
  // - todo.completed 可以放 { todoId, title }
  //
  // 这里用可选字段，是为了让调用方可以不传 metadata。
  metadata?: Record<string, unknown>;

  // userId 表示“是谁触发了这个动作”。
  //
  // 后面 service 会从 currentUser.id 传进来，
  // 不应该让客户端 request body 自己传。
  userId: string;

  // projectId 表示“这个动作发生在哪个 Project 里”。
  projectId: string;
};

export type ListActivityLogsFilter = {
  // 只查某个 Project 的日志。
  projectId: string;

  // 这个 userId 不是 ActivityLog.userId 的普通筛选条件。
  //
  // 更重要的是：它要用来确认这个 project 属于当前用户。
  // Prisma 查询时应该写 project: { userId: filter.userId }。
  userId: string;

  page: number;
  pageSize: number;
};

export type ActivityLogRepository = {
  create(input: CreateActivityLogInput): Promise<ActivityLog>;
  findAll(filter: ListActivityLogsFilter): Promise<PaginatedResult<ActivityLog>>;
};
```

学习点：

```text
这里 findAll 同时传 projectId 和 userId。

projectId:
  表示你要看哪个项目的日志

userId:
  表示当前登录用户是谁，用来限制只能看自己的项目

后面 API 里会像这样：
GET /projects/:projectId/activity-logs
```

---

## 任务 3：写 mapper

新增：

```text
apps/api/src/modules/activity-logs/activity-logs.mapper.ts
```

你可以参考：

```text
apps/api/src/modules/projects/projects.mapper.ts
apps/api/src/modules/todos/todos.mapper.ts
```

建议结构：

```ts
import type { ActivityLog, ActivityLogAction } from "@learn/shared";
import type { PrismaActivityLog } from "./activity-logs.prisma-repository.js";

export function mapPrismaActivityLogToActivityLog(log: PrismaActivityLog): ActivityLog {
  return {
    id: log.id,
    action: log.action as ActivityLogAction,
    message: log.message,

    // Prisma 的 Json 类型比 Record<string, unknown> 更宽。
    //
    // 这里我们希望 API 返回层看到的是：
    // - 有 metadata：普通对象
    // - 没有 metadata：null
    //
    // 如果你想写得更严谨，可以判断 typeof log.metadata === "object"。
    metadata: log.metadata as Record<string, unknown> | null,

    // Prisma Date -> API string。
    createdAt: log.createdAt.toISOString(),

    userId: log.userId,
    projectId: log.projectId
  };
}
```

注意：

```text
action 在数据库里目前是 String。
shared 里是 ActivityLogAction 联合类型。

所以 mapper 这里需要把 String 转成 ActivityLogAction。
后面如果我们想更严格，可以加 Zod parse 或自定义 guard。
这张任务先保持简单。
```

---

## 任务 4：实现 Prisma Repository

新增：

```text
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

建议结构：

```ts
import type { ActivityLog as PrismaActivityLogModel } from "@prisma/client";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  ListActivityLogsFilter
} from "./activity-logs.repository.js";
import { prisma } from "../../db/prisma.js";
import { mapPrismaActivityLogToActivityLog } from "./activity-logs.mapper.js";

export type PrismaActivityLog = PrismaActivityLogModel;

export function createPrismaActivityLogRepository(): ActivityLogRepository {
  return {
    async create(input: CreateActivityLogInput) {
      // prisma.activityLog 对应 schema.prisma 里的 model ActivityLog。
      //
      // id 目前由应用层生成，因为 schema 里没有 @default(uuid())。
      const log = await prisma.activityLog.create({
        data: {
          id: crypto.randomUUID(),
          action: input.action,
          message: input.message,
          metadata: input.metadata ?? null,
          userId: input.userId,
          projectId: input.projectId
        }
      });

      return mapPrismaActivityLogToActivityLog(log);
    },

    async findAll(filter: ListActivityLogsFilter) {
      const where = {
        projectId: filter.projectId,

        // 这是这张任务最重要的权限边界。
        //
        // 不只查 ActivityLog.projectId，还要确认这个 Project 属于当前用户。
        // 否则用户只要猜到别人的 projectId，就可能看到别人的 activity logs。
        project: {
          userId: filter.userId
        }
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
```

你可以先照着写，再自己理解每一段为什么存在。

这张任务最关键的一行是：

```ts
project: {
  userId: filter.userId;
}
```

它的意思是：

```text
我要查 ActivityLog，
但只允许查“当前用户拥有的 Project”下面的 ActivityLog。
```

---

## 任务 5：写 Repository 测试

新增：

```text
apps/api/tests/unit/activity-logs.prisma-repository.test.ts
```

你可以参考：

```text
apps/api/tests/unit/projects.prisma-repository.test.ts
apps/api/tests/unit/todos.prisma-repository.test.ts
apps/api/tests/helpers/test-data-factory.ts
```

测试描述继续用中文。

建议至少写 3 个测试：

```ts
it("创建一条 Activity Log", async () => {
  // TODO: 创建 user
  // TODO: 创建 project
  // TODO: 调用 repository.create
  // TODO: 断言 action / message / metadata / userId / projectId
});

it("列表只返回当前用户指定 Project 下的 Activity Logs", async () => {
  // TODO: 创建 user A 和 user B
  // TODO: 创建 user A 的 project
  // TODO: 创建 user B 的 project
  // TODO: 分别创建日志
  // TODO: 用 user A + project A 查询
  // TODO: 断言不会返回 user B 的日志
});

it("列表按 createdAt 倒序返回并带分页 meta", async () => {
  // TODO: 创建同一个 project 下的多条日志
  // TODO: page=1&pageSize=2 查询
  // TODO: 断言 data.length 是 2
  // TODO: 断言 meta.total / meta.totalPages 正确
});
```

如果你写不出来完整测试，可以先写第一条。

第二条是权限边界测试，最重要。

---

## 任务 6：可选增强：给测试数据工厂补 helper

如果你觉得测试准备数据太重复，可以给：

```text
apps/api/tests/helpers/test-data-factory.ts
```

增加：

```ts
type CreateActivityLogFactoryInput = {
  userId: string;
  projectId: string;
  action?: ActivityLogAction;
  message?: string;
  metadata?: Record<string, unknown> | null;
};
```

然后实现：

```ts
export const createFactoryActivityLog = async (input: CreateActivityLogFactoryInput) => {
  return prisma.activityLog.create({
    data: {
      id: crypto.randomUUID(),
      userId: input.userId,
      projectId: input.projectId,
      action: input.action ?? "project.created",
      message: input.message ?? "Factory activity log",
      metadata:
        input.metadata === undefined || input.metadata === null
          ? Prisma.JsonNull
          : (input.metadata as Prisma.InputJsonValue)
    }
  });
};
```

这一步是可选的。

如果你今天想更多练 Repository，就可以先不抽 helper。

---

## 验证命令

先跑单个测试：

```bash
npm run test -w @learn/api -- activity-logs.prisma-repository.test.ts
```

再跑整体检查：

```bash
npm run typecheck
npm run format:check
```

如果测试写完了，也可以跑 API 全量测试：

```bash
npm run test -w @learn/api
```

---

## 完成标准

- [x] 新增 `activity-logs.repository.ts`
- [x] 新增 `activity-logs.mapper.ts`
- [x] 新增 `activity-logs.prisma-repository.ts`
- [x] `create` 可以创建 Activity Log
- [x] `findAll` 可以按 projectId 查询
- [x] `findAll` 通过 `project.userId` 限制只能查当前用户自己的 Project
- [x] `createdAt` 在 mapper 里转成 ISO string
- [x] `metadata` 在 mapper 里返回 `Record<string, unknown> | null`
- [x] 测试描述使用中文
- [x] 至少补 1 个 create 测试
- [x] 至少补 1 个权限边界测试
- [x] `npm run test -w @learn/api -- activity-logs.prisma-repository.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log Repository 完成了
```
