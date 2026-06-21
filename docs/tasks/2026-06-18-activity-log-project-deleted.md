# Task: Activity Log 接入 Project 删除日志

## 背景

前两张任务已经把基础铺好了：

```text
1. ActivityLog 保存 projectSnapshotId / projectSnapshotName
2. ActivityLog.projectId 删除后会变成 null
3. ActivityLog 查询使用 userId + projectSnapshotId
4. ActivityLog metadata 已经按 action 建立 Zod 契约
```

现在可以把之前一直暂缓的 `project.deleted` 接回来了。

---

## 这张任务要做什么

删除 Project 时记录一条活动日志：

```ts
action: "project.deleted";
message: `删除了项目 ${project.name}`;
metadata: {
  projectName: project.name;
}
```

关键点：

```text
日志要在删除 Project 之前写入。
```

为什么？

```text
写日志时 projectId 仍然能关联到真实 Project。
Project 删除后，数据库会通过 ON DELETE SET NULL
把 ActivityLog.projectId 自动置为 null。

但 projectSnapshotId / projectSnapshotName 会保留下来。
```

这就是审计日志常见的设计：

```text
当前关系可以断开，历史事实必须保留。
```

---

## 任务 1：更新 ProjectService.deleteProject

修改：

```text
apps/api/src/modules/projects/projects.service.ts
```

在确认 Project 属于当前用户之后、真正 delete 之前，记录日志：

```ts
await options.activityLogService?.record({
  action: "project.deleted",
  message: `删除了项目 ${project.name}`,
  metadata: {
    projectName: project.name
  },
  userId: currentUserId,
  projectId: project.id,
  projectSnapshotId: project.id,
  projectSnapshotName: project.name
});
```

注意：

```text
这里用的是删除前查到的 project。
不是 deletedProject。
```

原因：

```text
删除前的 project 是权限判断和快照来源。
它一定还存在，也一定属于当前用户。
```

---

## 任务 2：删除旧注释

`deleteProject` 里现在有一段旧注释，大意是：

```text
当前 ActivityLog 依赖 projectId 外键，所以暂时不写 project.deleted。
```

这段注释已经过期了。

把它删掉或改成新的解释：

```text
现在 ActivityLog.projectId 是可空外键。
删除 Project 后，数据库会把日志里的 projectId 置空；
projectSnapshotId/projectSnapshotName 会保留历史事实。
```

---

## 任务 3：补 ProjectService 单元测试

修改：

```text
apps/api/tests/unit/projects.service.test.ts
```

新增测试：

```ts
it("删除 Project 成功前会记录 project.deleted 活动日志", async () => {
  // 你来实现
});
```

断言重点：

```text
1. action 是 project.deleted
2. metadata.projectName 是删除前的 Project 名称
3. projectSnapshotId 是被删除的 Project id
4. projectSnapshotName 是被删除的 Project name
```

再补一个失败场景：

```ts
it("删除别人的 Project 失败时不会记录 Activity Log", async () => {
  // 你来实现
});
```

断言重点：

```text
权限失败时 activityLogService.recorded 仍然是 []
```

---

## 任务 4：补 API 集成测试

修改：

```text
apps/api/tests/integration/activity-logs.test.ts
```

新增测试：

```ts
it("Project 删除后仍然可以通过快照查询到 project.deleted 日志", async () => {
  // 你来实现
});
```

推荐流程：

```text
1. 注册登录
2. 创建 Project
3. DELETE /projects/:projectId
4. GET /projects/:projectId/activity-logs
5. 断言返回里包含 project.deleted
6. 断言 project.deleted 那条日志：
   - projectId 是 null
   - projectSnapshotId 是原 project.id
   - projectSnapshotName 是原 project.name
```

你可以参考：

```text
activity-logs.test.ts 里已有的“当前用户可以查看自己 Project 下的活动记录”
```

学习点：

```text
这个测试不是为了测 DELETE 本身。
它真正证明的是：
Project 被删除后，ActivityLog 仍然能作为历史事实被查出来。
```

---

## 任务 5：确认 metadata schema

检查：

```text
apps/api/src/modules/activity-logs/activity-log-metadata.schema.ts
```

确认已经支持：

```ts
"project.deleted": projectCreatedMetadataSchema
```

或等价 schema：

```ts
z.object({
  projectName: z.string().min(1)
});
```

---

## 验证命令

先跑 ProjectService：

```bash
npm run test -w @learn/api -- projects.service.test.ts
```

再跑 Activity Log 集成测试：

```bash
npm run test -w @learn/api -- activity-logs
```

最后跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] `ProjectService.deleteProject` 记录 `project.deleted`
- [x] 删除日志发生在 `projectRepository.delete` 之前
- [x] 删除日志包含 `projectSnapshotId`
- [x] 删除日志包含 `projectSnapshotName`
- [x] 过期注释已删除或改成新解释
- [x] 删除成功的 ProjectService 单元测试通过
- [x] 删除别人 Project 失败时不记录日志
- [x] Project 删除后的 Activity Log 集成测试通过
- [x] 集成测试断言 `project.deleted.projectId === null`
- [x] 集成测试断言 snapshot 字段仍然存在
- [x] `npm run test -w @learn/api -- projects.service.test.ts` 通过
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log Project 删除事件完成了
```
