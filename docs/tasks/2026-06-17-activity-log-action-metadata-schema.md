# Task: Activity Log action / metadata schema 强化

## 背景

你现在的 Activity Log 已经能记录：

```text
谁做了什么
发生在哪个 Project
当时的 Project 快照是什么
```

但还有一个隐藏问题：

```ts
metadata?: Record<string, unknown>;
```

这个类型太宽了。

它的意思是：

```text
metadata 可以是任意对象。
里面有什么字段，TypeScript 和运行时都不清楚。
```

短期能跑，长期会有两个问题：

```text
1. 不同 action 的 metadata 可能乱写
2. 前端展示 Activity Log 时不知道该信任哪些字段
```

这张任务要做的是：

```text
给 ActivityLog action 和 metadata 建立一层运行时契约。
```

这也是 Zod 很适合发挥作用的地方。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 TypeScript 类型不能替代运行时校验
2. 为什么 action 和 metadata 应该一起设计
3. Zod schema 放在 service 层还是 route 层有什么区别
4. 怎么测试“传错 metadata 时，不会写入错误日志”
```

---

## 目标设计

不同 action 允许不同 metadata：

```ts
project.created:
  { projectName: string }

project.updated:
  { projectName: string; changedFields: string[] }

todo.created:
  { todoId: string; title: string }

todo.updated:
  { todoId: string; title: string; changedFields: string[] }

todo.completed:
  { todoId: string; title: string; changedFields: string[] }

todo.deleted:
  { todoId: string; title: string }
```

注意：

```text
这张任务先不处理 project.deleted。
project.deleted 会放到下一张任务，因为它涉及删除流程和日志保留验证。
```

---

## 任务 1：创建 metadata schema 文件

创建：

```text
apps/api/src/modules/activity-logs/activity-log-metadata.schema.ts
```

建议结构：

```ts
import { z } from "zod";
import type { ActivityLogAction } from "@learn/shared";

const projectCreatedMetadataSchema = z.object({
  // projectName 是日志展示需要的项目名称。
  //
  // 这里用 string().min(1)，是为了避免写入空名称快照。
  projectName: z.string().min(1)
});

const projectUpdatedMetadataSchema = z.object({
  projectName: z.string().min(1),

  // changedFields 用来记录这次 PATCH 改了哪些字段。
  //
  // 它不是给数据库查询用的核心字段，而是给日志详情展示用的上下文。
  changedFields: z.array(z.string().min(1))
});

const todoMetadataSchema = z.object({
  todoId: z.string().min(1),
  title: z.string().min(1)
});

const todoUpdatedMetadataSchema = todoMetadataSchema.extend({
  changedFields: z.array(z.string().min(1))
});

const metadataSchemaByAction = {
  "project.created": projectCreatedMetadataSchema,
  "project.updated": projectUpdatedMetadataSchema,
  "todo.created": todoMetadataSchema,
  "todo.updated": todoUpdatedMetadataSchema,
  "todo.completed": todoUpdatedMetadataSchema,
  "todo.deleted": todoMetadataSchema
} satisfies Record<ActivityLogAction, z.ZodType<Record<string, unknown>>>;
```

然后导出一个函数：

```ts
export function parseActivityLogMetadata(
  action: ActivityLogAction,
  metadata: Record<string, unknown> | undefined
) {
  const schema = metadataSchemaByAction[action];

  return schema.parse(metadata ?? {});
}
```

学习点：

```text
这里不用 route schema。
因为 ActivityLog 不是客户端直接提交的资源，而是后端 service 内部生成的业务事件。
所以校验应该放在 ActivityLogService.record 里。
```

---

## 任务 2：在 ActivityLogService.record 中使用 schema

修改：

```text
apps/api/src/modules/activity-logs/activity-logs.service.ts
```

在组装 `createInput` 前先解析：

```ts
const metadata = parseActivityLogMetadata(input.action, input.metadata);
```

然后写入：

```ts
metadata,
```

注意注释重点：

```text
这里不是为了防前端乱传。
而是为了防我们自己的业务代码以后写错日志格式。
```

---

## 任务 3：补 ActivityLogService 单元测试

修改：

```text
apps/api/tests/unit/activity-logs.service.test.ts
```

增加两个测试。

第一个：合法 metadata 可以写入。

```ts
it("记录 Activity Log 时会按 action 校验并保存合法 metadata", async () => {
  // 你来实现
});
```

第二个：metadata 缺字段时会拒绝。

```ts
it("metadata 不符合当前 action 契约时不会写入 Activity Log", async () => {
  // 你来实现
});
```

测试重点：

```text
1. 传 action: "todo.created"
2. metadata 少传 title
3. expect service.record(...).rejects.toThrow()
4. expect(repository.create).not.toHaveBeenCalled()
```

---

## 任务 4：确认现有调用方全部符合契约

检查这些文件：

```text
apps/api/src/modules/projects/projects.service.ts
apps/api/src/modules/todos/todos.service.ts
```

确认每个 `activityLogService.record` 的 metadata 都符合上面的 schema。

你可以用这个思路看：

```text
action 是 project.updated
  metadata 必须有 projectName + changedFields

action 是 todo.deleted
  metadata 必须有 todoId + title
```

---

## 验证命令

先跑 ActivityLogService 单元测试：

```bash
npm run test -w @learn/api -- activity-logs.service.test.ts
```

再跑 Project / Todo service，确认调用方没有被新 schema 打断：

```bash
npm run test -w @learn/api -- projects.service.test.ts todos.service.test.ts
```

最后跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `activity-log-metadata.schema.ts`
- [x] 为每个已存在的 `ActivityLogAction` 定义 metadata schema
- [x] `ActivityLogService.record` 写入前校验 metadata
- [x] 合法 metadata 测试通过
- [x] 非法 metadata 不会调用 `repository.create`
- [x] ProjectService 的日志 metadata 符合 schema
- [x] TodoService 的日志 metadata 符合 schema
- [x] `npm run test -w @learn/api -- activity-logs.service.test.ts` 通过
- [x] `npm run test -w @learn/api -- projects.service.test.ts todos.service.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Activity Log metadata schema 强化完成了
```
