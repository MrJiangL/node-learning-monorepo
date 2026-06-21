# Task: 测试强化 2：Repository 测试读写练习

## 背景

上一张你练的是 Service 单元测试。

Service 测试重点是：

```text
service 有没有把参数传给协作者
service 有没有在权限失败时提前停下
service 有没有调用或不调用某个 repository 方法
```

这张开始练 Repository 测试。

Repository 测试重点变成：

```text
真实数据库查询条件有没有生效
```

---

## 这张任务只练什么

只练：

```text
Repository 测试 = 准备数据库数据 + 调 repository + 断言查询结果
```

暂时不碰：

```text
HTTP API
Express route
middleware
前端
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. Repository 测试为什么要连真实数据库
2. 为什么测试前要 cleanupDatabase / deleteMany
3. test-data-factory 是做什么的
4. 为什么要准备“应该返回”和“不应该返回”的数据
5. Repository 测试和 Service 测试的区别
```

---

## 任务 1：阅读现有 Repository 测试

打开：

```text
apps/api/tests/unit/activity-logs.prisma-repository.test.ts
```

重点读这两个测试：

```text
1. 列表可以按 action 过滤 Activity Logs
2. 列表可以按 createdAt 时间范围过滤 Activity Logs
```

你只要回答：

```text
这些测试分别准备了哪些数据？
哪些数据应该返回？
哪些数据不应该返回？
```

---

## 任务 2：写一段阅读笔记

创建：

```text
docs/reviews/repository-test-notes.md
```

写下面几个小标题：

```md
# Repository 测试阅读笔记

## 1. Repository 测试为什么要连真实数据库

## 2. beforeEach 里清理数据库的目的

## 3. createFactoryUser / createFactoryProject / createFactoryActivityLog 是做什么的

## 4. 为什么要准备不应该返回的数据

## 5. 我现在还不懂的地方
```

每节 2-4 句就行。

---

## 任务 3：补一个小的 Repository 测试

修改：

```text
apps/api/tests/unit/activity-logs.prisma-repository.test.ts
```

新增测试：

```ts
it("列表可以同时按 action 和 createdAt 时间范围过滤 Activity Logs", async () => {
  // 你来实现
});
```

建议准备 4 条日志：

```text
1. todo.completed + 2026-06-01 -> 不应该返回，时间太早
2. todo.completed + 2026-06-10 -> 应该返回
3. todo.completed + 2026-06-20 -> 不应该返回，时间太晚
4. todo.created + 2026-06-10 -> 不应该返回，action 不匹配
```

查询条件：

```ts
const result = await repository.findAll({
  userId: owner.id,
  projectId: project.id,
  action: "todo.completed",
  createdAfter: "2026-06-05T00:00:00.000Z",
  createdBefore: "2026-06-15T23:59:59.999Z",
  page: 1,
  pageSize: 10
});
```

断言：

```ts
expect(result.data.map((log) => log.message)).toEqual(["应该返回的日志"]);
expect(result.meta.total).toBe(1);
```

这条测试的意义：

```text
它证明 Prisma where 里的 action 和 createdAt 是“同时生效”的。
不是只按 action，也不是只按时间。
```

---

## 验证命令

先跑这个测试文件：

```bash
npm run test -w @learn/api -- activity-logs.prisma-repository.test.ts
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/repository-test-notes.md`
- [x] 写清楚 Repository 测试为什么连真实数据库
- [x] 写清楚 beforeEach 清理数据库的目的
- [x] 写清楚 test-data-factory 的作用
- [x] 写清楚为什么要准备不应该返回的数据
- [x] 补充 action + 时间范围组合过滤 repository 测试
- [x] `npm run test -w @learn/api -- activity-logs.prisma-repository.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Repository 测试读写练习完成了
```
