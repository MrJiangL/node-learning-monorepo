# Task: Activity Log 查询支持时间范围过滤

## 背景

上一张任务你已经完成了：

```http
GET /projects/:projectId/activity-logs?action=todo.completed
```

现在 Activity Log 查询已经支持按事件类型过滤。

下一步补一个后端列表接口非常常见的能力：

```http
GET /projects/:projectId/activity-logs?createdAfter=2026-06-01T00:00:00.000Z&createdBefore=2026-06-30T23:59:59.999Z
```

这张任务只做时间范围过滤，不做 UI。

---

## 学习目标

完成后你应该能说清楚：

```text
1. query string 里的时间为什么先是 string
2. Zod 适合在哪里校验 ISO datetime
3. service 为什么只传过滤条件，不自己过滤数组
4. Prisma where 里的 gte / lte 分别是什么意思
5. action 过滤和时间过滤如何组合
```

---

## 目标行为

支持两个可选 query：

```text
createdAfter:
  只返回 createdAt >= createdAfter 的日志

createdBefore:
  只返回 createdAt <= createdBefore 的日志
```

它们都可以单独使用：

```http
GET /projects/:projectId/activity-logs?createdAfter=2026-06-01T00:00:00.000Z
GET /projects/:projectId/activity-logs?createdBefore=2026-06-30T23:59:59.999Z
```

也可以和 action 组合：

```http
GET /projects/:projectId/activity-logs?action=todo.completed&createdAfter=2026-06-01T00:00:00.000Z
```

---

## 任务 1：扩展 query schema

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.schema.ts
```

在 `listActivityLogsQuerySchema` 里增加：

```ts
createdAfter: z.string().datetime().optional(),
createdBefore: z.string().datetime().optional()
```

加注释：

```ts
// createdAfter / createdBefore 来自 URL query，所以入口处先是 string。
//
// z.string().datetime() 只负责确认它是合法 ISO datetime。
// 真正交给 Prisma 查询时，再在 repository 里转成 Date。
```

---

## 任务 2：扩展 service input

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.service.ts
```

给 `ListProjectActivityLogsInput` 增加：

```ts
createdAfter?: string;
createdBefore?: string;
```

并传给 repository：

```ts
createdAfter: input.createdAfter,
createdBefore: input.createdBefore,
```

---

## 任务 3：扩展 repository filter

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.repository.ts
```

给 `ListActivityLogsFilter` 增加：

```ts
createdAfter?: string;
createdBefore?: string;
```

注释可以写：

```ts
// repository 接收 string，是为了让 service 不关心 Prisma Date 查询细节。
// 具体转换成 Date 的动作放在 Prisma repository 里。
```

---

## 任务 4：更新 Prisma repository where

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.prisma-repository.ts
```

在 `findAll` 里构造 createdAt 条件：

```ts
const createdAt =
  filter.createdAfter || filter.createdBefore
    ? {
        gte: filter.createdAfter ? new Date(filter.createdAfter) : undefined,
        lte: filter.createdBefore ? new Date(filter.createdBefore) : undefined
      }
    : undefined;
```

然后 where：

```ts
const where = {
  userId: filter.userId,
  projectSnapshotId: filter.projectId,
  action: filter.action,
  createdAt
};
```

学习点：

```text
gte = greater than or equal，大于等于
lte = less than or equal，小于等于
```

---

## 任务 5：更新 route

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.routes.ts
```

调用 service 时继续传：

```ts
createdAfter: query.createdAfter,
createdBefore: query.createdBefore,
```

---

## 任务 6：补测试

### Service 单元测试

修改：

```text
apps/api/tests/unit/activity-logs.service.test.ts
```

新增：

```ts
it("查询 Project 活动记录时会把时间范围过滤条件交给 repository.findAll", async () => {
  // 你来实现
});
```

### Prisma repository 测试

修改：

```text
apps/api/tests/unit/activity-logs.prisma-repository.test.ts
```

新增：

```ts
it("列表可以按 createdAt 时间范围过滤 Activity Logs", async () => {
  // 你来实现
});
```

建议准备三条数据：

```text
2026-06-01
2026-06-10
2026-06-20
```

查询：

```text
createdAfter = 2026-06-05
createdBefore = 2026-06-15
```

只应该返回 `2026-06-10` 那条。

### API 集成测试

修改：

```text
apps/api/tests/integration/activity-logs.test.ts
```

新增：

```ts
it("createdAfter 参数非法时返回校验错误", async () => {
  // 你来实现
});
```

这张任务可以先只补非法参数集成测试。

原因：

```text
API 真实时间数据由数据库生成，不太好稳定控制 createdAt。
真正的时间范围行为在 Prisma repository 测试里更容易精确验证。
```

---

## 验证命令

先跑 Activity Log 相关测试：

```bash
npm run test -w @learn/api -- activity-logs
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] query schema 支持 `createdAfter`
- [x] query schema 支持 `createdBefore`
- [x] `createdAfter/createdBefore` 使用 Zod datetime 校验
- [x] route 把时间范围传给 service
- [x] service input 支持时间范围
- [x] repository filter 支持时间范围
- [x] Prisma repository 使用 `createdAt.gte/lte`
- [x] service 单元测试覆盖时间范围参数传递
- [x] Prisma repository 测试覆盖时间范围过滤
- [x] API 集成测试覆盖非法 datetime
- [x] `npm run test -w @learn/api -- activity-logs` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log 时间范围过滤完成了
```
