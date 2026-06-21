# Task: Activity Log 综合业务模块：阶段复盘

## 背景

Activity Log 这一阶段已经把一个完整业务模块走通了：

```text
数据模型
Repository
Service
接入 Project 写操作
接入 Todo 写操作
查询 API
OpenAPI 文档
测试覆盖
```

这张任务不写功能代码。

目标是把你真正学到的东西整理出来。

复盘正文请写到：

```text
docs/reviews/2026-06-17-activity-log-retrospective.md
```

注意：

```text
任务卡放 docs/tasks
真正的复盘正文放 docs/reviews
```

---

## 任务 1：创建复盘文档

新增：

```text
docs/reviews/2026-06-17-activity-log-retrospective.md
```

建议标题：

```md
# Activity Log 综合业务模块复盘
```

---

## 任务 2：复盘数据模型设计

写一段你自己的理解：

```text
ActivityLog 为什么要关联 User？
ActivityLog 为什么要关联 Project？
metadata 为什么用 Json？
```

你可以围绕这些点写：

```text
userId:
  记录是谁触发了动作

projectId:
  记录动作发生在哪个项目里

metadata:
  不同 action 的补充信息不同，所以用 Json 保持弹性
```

---

## 任务 3：复盘 project.deleted 为什么没写

这一段很重要。

请你解释：

```text
为什么 project.deleted 不能像 todo.deleted 一样直接写 ActivityLog？
```

参考答案方向：

```text
ActivityLog.projectId 是强外键。

如果先写 project.deleted 再删除 Project：
  ActivityLog 会被 Project 的 onDelete: Cascade 一起删除

如果先删除 Project 再写 project.deleted：
  projectId 已经不存在，外键会阻止写入

所以要想长期保留 project.deleted，需要重新设计模型：
  例如 projectId 可空，或者保存 projectName/projectSnapshot
```

---

## 任务 4：复盘 Service 依赖另一个 Service

写清楚你对这个结构的理解：

```text
ProjectService / TodoService 为什么依赖 ActivityLogService？
为什么不是直接依赖 PrismaActivityLogRepository？
```

可以写：

```text
ProjectService / TodoService 是业务层。
它们只需要知道“记录一条活动日志”，不应该知道日志怎么写进数据库。

ActivityLogService 包住了 ActivityLogRepository，
以后如果日志要改成后台任务、Redis 队列、或者失败降级，
ProjectService / TodoService 不需要直接改 Prisma 细节。
```

---

## 任务 5：复盘测试分层

整理这几类测试分别保护什么：

```text
activity-logs.prisma-repository.test.ts
activity-logs.service.test.ts
projects.service.test.ts
todos.service.test.ts
activity-logs.test.ts
docs.test.ts
```

建议格式：

```md
## 测试分层

Repository 测试：
保护 Prisma 查询、mapper、分页 meta、project.userId 权限边界

Service 测试：
保护业务参数怎么传给 repository / activityLogService

Integration 测试：
保护 HTTP 路由、requireAuth、真实 app 注册、真实数据库写入和查询

Docs 测试：
保护 OpenAPI 契约不要漏掉核心 schema 和 path
```

---

## 任务 6：复盘当前设计的不足

至少写 3 条。

可以从这里选：

```text
1. ActivityLog.action 在数据库里还是 String，不是 enum
2. project.deleted 不能长期保留
3. 日志写入失败现在会影响主业务
4. 查询日志时，别人的 Project 返回 200 空数组，而不是 404
5. ActivityLog metadata 没有按 action 做更严格的 schema
6. OpenAPI 还是手写 JSON，维护成本较高
```

---

## 任务 7：写下一阶段选择

最后写你想优先深入哪个方向：

```text
A. 审计日志设计优化
   重点：project.deleted 长期保留、project snapshot、action enum

B. 日志后台任务化
   重点：主业务成功后把日志丢进 job，避免日志失败影响主业务

C. 前端 Activity Timeline
   重点：Vue 页面展示项目动态流，熟悉真实前端接 API
```

你可以直接写：

```text
我选 A / B / C，因为...
```

---

## 验证命令

复盘文档本身不需要跑业务测试。

但你写完后请跑格式检查：

```bash
npm run format:check
```

如果格式失败：

```bash
npx prettier --write docs/reviews/2026-06-17-activity-log-retrospective.md
```

---

## 完成标准

- [x] 新增 `docs/reviews/2026-06-17-activity-log-retrospective.md`
- [x] 复盘 ActivityLog 数据模型
- [x] 解释 project.deleted 为什么暂时不写
- [x] 解释 Service 依赖 ActivityLogService 的意义
- [x] 复盘 Repository / Service / Integration / Docs 测试分层
- [x] 至少写 3 条当前设计不足
- [x] 写出下一阶段选择 A / B / C
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 阶段复盘完成了
```
