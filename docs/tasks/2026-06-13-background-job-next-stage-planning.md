# Task: 后台任务下一阶段规划：内存队列、数据库队列还是 BullMQ

## 背景

你已经完成了后台任务模块的第一阶段：

```text
queue
worker
processor
retry
API
logs
测试隔离
```

现在要决定下一阶段怎么继续。

目前你的队列是内存队列：

```text
优点：简单、适合学习、测试快
缺点：服务重启数据丢失、多进程不共享、不能真正用于生产
```

下一阶段有 3 条路线：

```text
A. 继续内存队列，把架构理解打深
B. 用 MySQL 做数据库队列
C. 引入 BullMQ / Redis 做专业队列
```

这张任务不是写代码，而是做技术选择。

---

## 任务 1：对比 3 种方案

新建：

```text
docs/reviews/background-job-next-stage.md
```

写 3 小节：

```md
## 1. 继续内存队列

## 2. 用 MySQL 做数据库队列

## 3. 用 BullMQ / Redis 做专业队列
```

每一节回答：

```text
它适合什么场景？
它有什么优点？
它有什么缺点？
对我现在学习 Node 后端有什么价值？
```

---

## 任务 2：写出你的选择

新增小节：

```md
## 4. 我下一步选择什么
```

你可以选一个：

```text
A. 继续内存队列
B. MySQL 数据库队列
C. BullMQ / Redis 队列
```

我的建议：

```text
优先选 B：MySQL 数据库队列。
```

原因：

```text
你现在已经学过 Prisma / MySQL / transaction / repository。
用 MySQL 做队列，可以把这些知识和后台任务串起来。

BullMQ 很重要，但它会引入更多 Redis 队列概念。
你已经对 Redis 缓存有基础，但在当前阶段，MySQL 队列更能帮助你把“后端数据建模 + 状态流转 + 事务”练扎实。
```

---

## 任务 3：回答 3 个问题

写：

```md
## 5. 我现在的疑问
```

回答这 3 个问题：

```text
1. 为什么生产环境不能只用内存队列？
2. 数据库队列和普通 CRUD 最大区别是什么？
3. BullMQ 比 MySQL 队列强在哪里？
```

不会完全答也没关系，先写你的理解。你写完后我会帮你修正。

---

## 完成标准

- [x] 新建 `docs/reviews/background-job-next-stage.md`
- [x] 对比内存队列
- [x] 对比 MySQL 数据库队列
- [x] 对比 BullMQ / Redis 队列
- [x] 写出下一步选择
- [x] 回答 3 个问题

完成后告诉我：

```text
后台任务下一阶段规划完成了
```
