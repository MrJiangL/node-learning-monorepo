# Task: Activity Log 综合模块阶段复盘

## 背景

Activity Log 这一段你已经做了很多真实后端能力：

```text
1. 数据模型设计
2. Repository / Service 分层
3. 接入 Project / Todo 写操作
4. 查询 API
5. OpenAPI 文档
6. Project 删除日志快照
7. action / metadata schema 契约
8. project.deleted 删除事件
9. action 过滤
10. createdAt 时间范围过滤
```

这已经不是一个小练习了。

它很接近真实业务里的“审计日志 / 操作记录 / activity feed”模块。

这张任务不急着写新功能，先做复盘。

---

## 复盘目标

你需要写一份复盘文档：

```text
docs/reviews/activity-log-final-retrospective.md
```

注意：

```text
复盘文档放 docs/reviews。
任务卡才放 docs/tasks。
```

---

## 建议结构

你可以按下面结构写。

不用写得很长，但每一节都要写你自己的理解。

---

## 1. Activity Log 这个模块解决什么问题

请回答：

```text
Activity Log 和普通业务表有什么区别？
为什么它更像“历史事实记录”？
```

你可以提到：

```text
Project / Todo 是当前业务状态。
ActivityLog 是过去发生过什么。
```

---

## 2. 为什么需要 projectSnapshotId / projectSnapshotName

请解释：

```text
为什么不能只存 projectId？
Project 删除后，如果日志还要保留，会发生什么？
```

你可以画出这个关系：

```text
projectId:
  当前关系，可以因为 Project 删除而变成 null

projectSnapshotId:
  历史事实，不能丢

projectSnapshotName:
  历史展示信息，不能只依赖还活着的 Project
```

---

## 3. 为什么 ActivityLogService 不自己查 Project

请解释这一点：

```text
谁手里已经有 Project，谁就负责传 projectSnapshotId / projectSnapshotName。
ActivityLogService 只负责记录日志，不负责猜业务上下文。
```

可以结合：

```text
ProjectService.createProject
ProjectService.updateProject
ProjectService.deleteProject
TodoService.createTodo
TodoService.updateTodo
TodoService.deleteTodo
```

---

## 4. metadata schema 解决了什么问题

请回答：

```text
为什么 metadata: Record<string, unknown> 太宽？
为什么 action 和 metadata 应该一起设计？
为什么 TypeScript 类型不能替代 Zod 运行时校验？
```

你可以举例：

```text
todo.completed 必须有 todoId / title / changedFields。
如果少了 title，前端展示日志时就可能出问题。
```

---

## 5. 查询链路是怎么走的

请写清楚这条链：

```text
query string
  -> Zod schema
  -> route
  -> service input
  -> repository filter
  -> Prisma where
```

并举两个例子：

```text
action=todo.completed
createdAfter=2026-06-01T00:00:00.000Z
```

---

## 6. 你现在对测试的理解

这节重点写你的真实感受。

你可以按这个格式写：

```text
Service 单元测试：
  我理解它主要测参数有没有正确传给协作者。

Repository 测试：
  我理解它主要测数据库查询条件是否真的生效。

API 集成测试：
  我理解它主要测 HTTP -> middleware -> route -> service -> database 的完整链路。
```

也可以写：

```text
我现在还不会自己写测试，但我能看懂哪些测试在保护哪种问题：
...
```

这是真实复盘，不需要装会。

---

## 7. 这阶段你最容易混乱的点

至少写 3 个。

比如：

```text
1. projectId 和 projectSnapshotId 的区别
2. TypeScript 类型和 Zod 校验的区别
3. route schema / service input / repository filter 的边界
4. API 集成测试和 repository 测试该测什么
5. Prisma Date 查询里的 gte / lte
```

---

## 8. 下一阶段你想补什么

写你的选择和原因。

我建议你从下面选：

```text
A. 继续后端：文件上传 / 导入导出 / 报表统计
B. 强化测试：我带你系统学 service / repository / integration 测试
C. 回到前端：把 Activity Log 做成 Vue 页面
D. 工程化：CI / seed / dev scripts / 本地开发体验
```

你可以选一个，也可以写你自己的选择。

---

## 完成标准

- [x] 创建 `docs/reviews/activity-log-final-retrospective.md`
- [x] 写清楚 Activity Log 和业务表的区别
- [x] 写清楚 project snapshot 的意义
- [x] 写清楚 ActivityLogService 为什么不自己查 Project
- [x] 写清楚 metadata schema 的意义
- [x] 写清楚查询链路
- [x] 写出你对三类测试的理解
- [x] 写出至少 3 个混乱点
- [x] 写出下一阶段选择

完成后告诉我：

```text
Activity Log 最终复盘完成了
```
