# Activity Log 综合业务模块复盘

ActivityLog 为什么要关联 User？

你这样查的时候可以查到是那个用户操作的 操作记录，如果不关联都混乱在一起

ActivityLog 为什么要关联 Project？
这样可以记录 知道这个动作是触发在那个项目里

metadata 为什么用 Json？
不同 action 的补充信息不同，所以用 JSON 保持弹性

为什么 project.deleted 不能像 todo.deleted 一样直接写 ActivityLog？
ActivityLog.projectId 是强外键。
如果 先写 Project.deleted 在删除Project ActivityLog 会被Project 的onDelete:Cascade 一起删除

如果先删除 Project 再写 Project.deleted: ProjectId 已经不存在，外键会阻止写入

所以想要长期保留 Project.deleted，需要重新设计模型：例如 ProjectId 可空，或者保存 ProjectName/projectSnapshot

ProjectService / TodoService 为什么依赖 ActivityLogService？
ProjectService / TodoService 是业务层。
它们只需要知道“记录一条活动日志”，不应该知道日志怎么写进数据库。

为什么不是直接依赖 PrismaActivityLogRepository？
ActivityLogService 包住了 ActivityLogRepository，
以后如果日志要改成后台任务、Redis 队列、或者失败降级，
ProjectService / TodoService 不需要直接改 Prisma 细节。

activity-logs.prisma-repository.test.ts
activity-logs.service.test.ts
projects.service.test.ts
todos.service.test.ts
activity-logs.test.ts
docs.test.ts

Repository 测试：
保护 Prisma 查询、mapper、分页 meta、project.userId 权限边界

Service 测试：
保护业务参数怎么传给 repository / activityLogService

Integration 测试：
保护 HTTP 路由、requireAuth、真实 app 注册、真实数据库写入和查询

Docs 测试：
保护 OpenAPI 契约不要漏掉核心 schema 和 path

## 当前设计的不足

1. `ActivityLog.action` 在数据库里还是普通 `String`。

这意味着数据库层还不能阻止非法 action。
TypeScript 可以限制业务代码，但如果有人直接写数据库，仍然可能出现 `project.create`、`todo.done` 这种不统一的值。

2. `project.deleted` 现在不能长期保留。

因为 `ActivityLog.projectId` 是强外键，并且 Project 删除时会触发级联删除。
所以如果要做真正的审计日志，就不能只依赖当前 Project 外键，需要保存删除前的快照信息。

3. 日志写入失败现在会影响主业务。

现在 ProjectService / TodoService 是：

```text
主业务写入成功 -> await activityLogService.record -> 返回结果
```

如果日志写入失败，主业务接口也可能失败。
这在学习阶段可以接受，但真实业务里通常要思考：日志失败是否应该阻断用户操作。

4. 查询别人 Project 的 Activity Log 当前返回 200 空数组。

这个行为不一定错，但需要有意识地选择。
如果希望隐藏资源是否存在，返回空数组可以接受。
如果希望语义更明确，也可以由 service 先判断 Project 归属，不属于当前用户就返回 404。

5. `metadata` 没有按 action 做更严格的结构校验。

现在 `metadata` 是 `Record<string, unknown>`，很灵活，但也意味着不同 action 的字段规范靠人工约定。
后面可以用 Zod 给不同 action 设计不同 metadata schema。

## 下一阶段选择

我选 A：审计日志设计优化。

原因是：Activity Log 现在已经能写、能查、能进 OpenAPI，但它还不够像真正的审计日志。
最明显的问题就是 `project.deleted` 不能可靠保留。

如果现在直接做 B：日志后台任务化，只是把“当前不够稳的数据模型”搬到后台队列里。
如果现在做 C：前端 Activity Timeline，能看到页面效果，但后端核心设计问题还没解决。

所以我更建议先做 A：

```text
先把 Activity Log 的数据模型设计扎稳，
再考虑日志后台任务化，
最后再做前端时间线展示。
```

下一阶段我想重点理解：

```text
1. 删除 Project 时怎么保留日志
2. ActivityLog 要不要保存 project 快照
3. action 是否应该从 String 变成更强的约束
4. 查询日志时，权限边界应该基于 Project 关系，还是基于日志快照
```
