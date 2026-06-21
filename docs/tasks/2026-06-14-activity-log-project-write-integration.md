# Task: Activity Log 综合业务模块：接入 Project 写操作

## 背景

你现在已经完成了 Activity Log 的三层基础：

```text
Prisma model
Repository
Service
```

这一张任务开始把 Activity Log 接进真实业务。

先只接 Project，不接 Todo。

原因是：

```text
Project service 当前已经有 create / update / delete。
这些动作都很适合记录日志。

如果 Project 和 Todo 一起接，测试会变得太大。
我们先把一个模块接顺，再复制经验到 Todo。
```

---

## 目标

在 Project 写操作成功后记录 Activity Log：

```text
createProject:
  project.created

updateProject:
  project.updated

deleteProject:
  project.deleted
```

注意这句话：

```text
写操作成功后记录日志。
```

意思是：

```text
不要在权限判断前写日志
不要在 repository.update / repository.delete 失败前写日志
```

否则可能出现：

```text
用户没有权限更新 Project，但系统却记录了一条 project.updated 日志
```

---

## 任务 1：让 ProjectService 可选依赖 ActivityLogService

修改：

```text
apps/api/src/modules/projects/projects.service.ts
```

引入类型：

```ts
import type { ActivityLogService } from "../activity-logs/activity-logs.service.js";
```

把函数签名从：

```ts
export function createProjectService(projectRepository: ProjectRepository) {
```

改成：

```ts
type CreateProjectServiceOptions = {
  activityLogService?: ActivityLogService;
};

export function createProjectService(
  projectRepository: ProjectRepository,
  options: CreateProjectServiceOptions = {}
) {
```

为什么用可选依赖？

```text
当前项目里很多测试都直接 createProjectService(fakeRepository)。

如果强制传 activityLogService，会一次性改很多旧测试。
先设计成可选依赖，可以保持旧行为不变：
- 传了 activityLogService：写日志
- 没传 activityLogService：只做原来的 Project 行为
```

---

## 任务 2：createProject 成功后记录日志

当前代码大概是：

```ts
createProject(input: CreateProjectInput, currentUserId: string) {
  return projectRepository.create(input, currentUserId);
}
```

你要改成 async：

```ts
async createProject(input: CreateProjectInput, currentUserId: string) {
  const project = await projectRepository.create(input, currentUserId);

  await options.activityLogService?.record({
    action: "project.created",
    message: `创建了项目 ${project.name}`,
    metadata: {
      projectName: project.name
    },
    userId: currentUserId,
    projectId: project.id
  });

  return project;
}
```

学习点：

```text
?. 是可选链。

options.activityLogService?.record(...)
意思是：
- 如果 activityLogService 存在，就调用 record
- 如果不存在，就什么都不做

这适合用在“可选依赖”上。
```

---

## 任务 3：updateProject 成功后记录日志

在 `updateProject` 里，已经有：

```text
先 findById 做权限判断
再 projectRepository.update
再 return updatedProject
```

你要在 `updatedProject` 成功后、`return` 前记录日志：

```ts
await options.activityLogService?.record({
  action: "project.updated",
  message: `更新了项目 ${updatedProject.name}`,
  metadata: {
    projectName: updatedProject.name,
    changedFields: Object.keys(input)
  },
  userId: currentUserId,
  projectId: updatedProject.id
});
```

为什么 metadata 里放 `changedFields`？

```text
ActivityLog.message 是给人看的摘要。
metadata 是给系统看的上下文。

changedFields 可以帮助后面做更细的展示，例如：
“更新了 name 和 description”
```

---

## 任务 4：deleteProject 成功后记录日志

`deleteProject` 里要注意：

```text
Project 删除后，ActivityLog.projectId 仍然有外键指向 Project。
```

当前 schema 是：

```prisma
project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
```

这意味着：

```text
如果你先记录日志，再删除 Project，
这条日志会被 Project 的级联删除一起删掉。

如果你先删除 Project，再记录日志，
会因为 projectId 外键不存在而无法创建 ActivityLog。
```

所以这张任务里 deleteProject 暂时只做一个学习判断：

```text
先不要给 project.deleted 写数据库日志。
```

你要在代码里留一个简短注释，说明原因：

```ts
// 当前 ActivityLog 依赖 projectId 外键。
// 删除 Project 会级联删除日志，所以 project.deleted 暂时不写入 ActivityLog。
// 后面如果要保留删除日志，需要重新设计 ActivityLog.projectId 为可空或快照字段。
```

这是非常重要的后端设计点。

不要为了“看起来完成 project.deleted”硬写一条会被删除或会外键失败的日志。

---

## 任务 5：在 routes 里接入真实 ActivityLogService

修改：

```text
apps/api/src/modules/projects/projects.routes.ts
```

新增 import：

```ts
import { createPrismaActivityLogRepository } from "../activity-logs/activity-logs.prisma-repository.js";
import { createActivityLogService } from "../activity-logs/activity-logs.service.js";
```

把：

```ts
const projectService = createProjectService(createPrismaProjectRepository());
```

改成：

```ts
const activityLogService = createActivityLogService(createPrismaActivityLogRepository());
const projectService = createProjectService(createPrismaProjectRepository(), {
  activityLogService
});
```

---

## 任务 6：补 ProjectService 单元测试

修改：

```text
apps/api/tests/unit/projects.service.test.ts
```

你现在的 fake repository 已经很完整。

这次需要再做一个 fake activity log service。

可以这样写：

```ts
import type {
  ActivityLogService,
  RecordActivityLogInput
} from "../../src/modules/activity-logs/activity-logs.service.js";
```

然后：

```ts
function createFakeActivityLogService(): ActivityLogService & {
  recorded: RecordActivityLogInput[];
} {
  const recorded: RecordActivityLogInput[] = [];

  return {
    recorded,
    async record(input) {
      recorded.push(input);

      return {
        id: crypto.randomUUID(),
        action: input.action,
        message: input.message,
        metadata: input.metadata ?? null,
        createdAt: new Date().toISOString(),
        userId: input.userId,
        projectId: input.projectId
      };
    },
    async listProjectLogs() {
      return {
        data: [],
        meta: {
          page: 1,
          pageSize: 10,
          total: 0,
          totalPages: 0
        }
      };
    }
  };
}
```

---

## 任务 7：测试 createProject 会记录日志

新增测试：

```ts
it("创建 Project 成功后记录 project.created 活动日志", async () => {
  const repository = createFakeProjectRepository();
  const activityLogService = createFakeActivityLogService();
  const service = createProjectService(repository, { activityLogService });

  const project = await service.createProject({ name: "Logged project" }, "user-1");

  expect(activityLogService.recorded).toEqual([
    {
      action: "project.created",
      message: "创建了项目 Logged project",
      metadata: {
        projectName: "Logged project"
      },
      userId: "user-1",
      projectId: project.id
    }
  ]);
});
```

---

## 任务 8：测试 updateProject 会记录日志

新增测试：

```ts
it("更新 Project 成功后记录 project.updated 活动日志", async () => {
  const repository = createFakeProjectRepository();
  const activityLogService = createFakeActivityLogService();
  const service = createProjectService(repository, { activityLogService });

  const project = await service.createProject({ name: "Old name" }, "user-1");
  activityLogService.recorded.length = 0;

  await service.updateProject(project.id, { name: "New name" }, "user-1");

  expect(activityLogService.recorded).toEqual([
    {
      action: "project.updated",
      message: "更新了项目 New name",
      metadata: {
        projectName: "New name",
        changedFields: ["name"]
      },
      userId: "user-1",
      projectId: project.id
    }
  ]);
});
```

为什么要写：

```ts
activityLogService.recorded.length = 0;
```

因为前面的 `createProject` 也会记录一条 `project.created`。

这个测试只想关注 update，所以先清空记录。

---

## 任务 9：测试权限失败时不记录日志

新增测试：

```ts
it("更新别人的 Project 失败时不记录 Activity Log", async () => {
  const repository = createFakeProjectRepository();
  const activityLogService = createFakeActivityLogService();
  const service = createProjectService(repository, { activityLogService });

  const project = await service.createProject({ name: "Private project" }, "user-2");
  activityLogService.recorded.length = 0;

  await expect(service.updateProject(project.id, { name: "Hack" }, "user-1")).rejects.toMatchObject(
    {
      statusCode: 404,
      code: "PROJECT_NOT_FOUND"
    }
  );

  expect(activityLogService.recorded).toEqual([]);
});
```

这个测试很关键。

它保护的是：

```text
只有真实成功的业务动作，才应该写 Activity Log。
```

---

## 先不要做

这张任务先不要做：

```text
不要接 Todo
不要新增 GET /activity-logs API
不要改 OpenAPI
不要强行写 project.deleted 日志
```

尤其是最后一条。

`project.deleted` 需要先重新思考数据模型，否则会被外键关系卡住。

---

## 验证命令

先跑 Project service 测试：

```bash
npm run test -w @learn/api -- projects.service.test.ts
```

再跑 Activity Log 相关测试：

```bash
npm run test -w @learn/api -- activity-logs
```

最后跑整体检查：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `createProjectService` 支持可选 `activityLogService`
- [x] `createProject` 成功后记录 `project.created`
- [x] `updateProject` 成功后记录 `project.updated`
- [x] `deleteProject` 暂时不写 `project.deleted`，并有注释说明外键原因
- [x] `projects.routes.ts` 接入真实 ActivityLogService
- [x] Project service 测试补 fake activity log service
- [x] 测试创建 Project 成功后会记录日志
- [x] 测试更新 Project 成功后会记录日志
- [x] 测试更新别人的 Project 失败时不会记录日志
- [x] 测试描述使用中文
- [x] `npm run test -w @learn/api -- projects.service.test.ts` 通过
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 接入 Project 写操作完成了
```
