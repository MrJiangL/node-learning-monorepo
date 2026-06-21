# Task: 后端测试工程化：MySQL 集成测试隔离复盘

## 背景

现在 API 测试会访问本地 MySQL。

这和纯函数单元测试不一样：

```text
单元测试：通常只在内存里跑，互相影响小
集成测试：会读写同一个数据库，如果隔离不好，容易互相影响
```

项目里已经有一段很关键的配置：

```ts
// apps/api/vitest.config.ts
fileParallelism: false;
```

这张任务不急着改功能，而是让你理解：

```text
为什么 MySQL 集成测试容易不稳定？
为什么测试要清理数据库？
为什么清理顺序很重要？
为什么 fileParallelism: false 可以提高稳定性？
```

---

## 你会练到什么

- 区分单元测试和集成测试
- 理解共享数据库带来的测试污染
- 理解外键关系下的清理顺序
- 理解 Vitest 文件并发和测试稳定性的关系
- 写一份项目级测试运行说明

---

## 任务 1：阅读 Vitest 配置

打开：

```text
apps/api/vitest.config.ts
```

重点看：

```ts
fileParallelism: false;
```

你要理解：

```text
它不是让单个测试变慢，而是让不同测试文件不要同时访问同一个 MySQL 测试库。
```

---

## 任务 2：阅读测试清理 helper

打开：

```text
apps/api/tests/helpers/api-test-helpers.ts
```

重点看：

```ts
export async function cleanupDatabase() {
  await prisma.todo.deleteMany();
  await prisma.project.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.user.deleteMany();
}
```

思考：

```text
为什么 Todo 要在 Project 前面清？
为什么 Project / Plan / UserSession 要在 User 前面清？
如果反过来清，会发生什么？
```

---

## 任务 3：新增测试隔离说明文档

创建文件：

```text
docs/reviews/mysql-test-isolation.md
```

写入你自己的理解，结构参考：

```markdown
# MySQL 集成测试隔离复盘

## 为什么集成测试更容易互相影响？

...

## 为什么要清理数据库？

...

## 为什么清理顺序要从子表到父表？

...

## 为什么 API 测试要 `fileParallelism: false`？

...

## 以后如果测试变慢，可以怎么优化？

...
```

最后一节你可以先写这几个方向：

```text
1. 给每个测试文件独立数据库
2. 每个测试用 transaction，测试结束 rollback
3. 只让真正访问数据库的测试串行，纯单元测试继续并行
4. 减少不必要的集成测试，把纯业务逻辑留给 service 单元测试
```

---

## 任务 4：运行验证

跑 API 测试：

```bash
npm run test -w @learn/api
```

跑格式检查：

```bash
npm run format:check
```

---

## 完成标准

- [ ] 新增 `docs/reviews/mysql-test-isolation.md`
- [ ] 能解释为什么清理顺序是 Todo -> Project / Plan / UserSession -> User
- [ ] 能解释 `fileParallelism: false` 的作用
- [ ] `npm run test -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
MySQL 测试隔离复盘完成了
```
