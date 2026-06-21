# Task: 测试强化 1：Service 单元测试读写练习

## 背景

你现在后端主逻辑已经能写不少了，但测试用例经常写不出来。

这很正常。

测试不是“多写几个 expect”这么简单，它其实是在回答：

```text
这一层代码负责什么？
这一层不负责什么？
它应该调用谁？
它不应该调用谁？
失败时应该停在哪？
```

这张任务不加新业务，只练 Service 单元测试。

---

## 这张任务只练什么

只练：

```text
Service 单元测试 = 测协作者调用 + 业务分支
```

暂时不碰：

```text
Prisma repository 测试
API integration 测试
前端测试
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 service 单元测试通常不直接连数据库
2. fake repository 是什么
3. recorded / deletedIds / updatedCalls 这种数组在测试里有什么用
4. 为什么权限失败时要断言 repository.delete 没被调用
5. 怎么判断一个测试是在测 service，而不是测 Prisma
```

---

## 任务 1：阅读现有 ProjectService 测试

打开：

```text
apps/api/tests/unit/projects.service.test.ts
```

重点读这几个测试：

```text
1. 不能删除别人的 Project 时，不会调用 repository.delete
2. 删除 Project 成功前会记录 project.deleted 活动日志
3. 删除 Project 时会在 repository.delete 之前记录 Activity Log
```

读的时候你只要回答一个问题：

```text
这个测试在证明 service 做了什么判断？
```

---

## 任务 2：写一段阅读笔记

创建：

```text
docs/reviews/service-unit-test-notes.md
```

写下面几个小标题：

```md
# Service 单元测试阅读笔记

## 1. fake repository 是什么

## 2. 为什么 service 测试不直接查数据库

## 3. recorded / deletedIds / updatedCalls 是做什么的

## 4. 权限失败时为什么要断言没有调用 delete/update

## 5. 我现在还不懂的地方
```

每节写 2-4 句就行。

不要写长文。

---

## 任务 3：补一个很小的 service 测试

修改：

```text
apps/api/tests/unit/activity-logs.service.test.ts
```

新增测试：

```ts
it("查询 Project 活动记录时会把 action 和时间范围过滤条件一起交给 repository.findAll", async () => {
  // 你来实现
});
```

测试输入：

```ts
await service.listProjectLogs({
  userId: "user-1",
  projectId: "project-1",
  action: "todo.completed",
  createdAfter: "2026-06-01T00:00:00.000Z",
  createdBefore: "2026-06-30T23:59:59.999Z",
  page: 1,
  pageSize: 10
});
```

断言：

```ts
expect(repository.findAll).toHaveBeenCalledWith({
  userId: "user-1",
  projectId: "project-1",
  action: "todo.completed",
  createdAfter: "2026-06-01T00:00:00.000Z",
  createdBefore: "2026-06-30T23:59:59.999Z",
  page: 1,
  pageSize: 10
});
```

这条测试很小，但它很典型：

```text
service 不自己过滤数据。
service 只把业务过滤条件传给 repository。
```

---

## 验证命令

先跑这个测试文件：

```bash
npm run test -w @learn/api -- activity-logs.service.test.ts
```

再跑：

```bash
npm run typecheck
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/service-unit-test-notes.md`
- [x] 写清楚 fake repository 的作用
- [x] 写清楚 service 测试为什么不直接连数据库
- [x] 写清楚 recorded / deletedIds / updatedCalls 的作用
- [x] 写清楚权限失败时为什么断言没有调用写操作
- [x] 补充 action + 时间范围组合传参测试
- [x] `npm run test -w @learn/api -- activity-logs.service.test.ts` 通过
- [x] `npm run typecheck` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Service 单元测试读写练习完成了
```
