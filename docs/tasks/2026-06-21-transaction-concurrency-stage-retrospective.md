# Task: 事务和并发阶段复盘

## 背景

你已经完成了这一组并发和一致性练习：

```text
1. lost update：两个流程读旧值再写回，最终丢失一次更新。
2. atomic increment：用数据库原子递增修复单字段计数。
3. transaction：多步骤写入失败时整体回滚。
4. SELECT FOR UPDATE：用行锁保护复杂读写竞争。
5. idempotency key：防止同一个业务请求重复创建数据。
```

这张任务做阶段复盘，把这些概念放到一张图里。

---

## 这张任务只练什么

只练总结和区分：

```text
1. atomic increment / transaction / lock / idempotency key 分别解决什么问题。
2. 它们分别不适合解决什么问题。
3. 真实后端里遇到问题时怎么选。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. lost update 是怎么发生的。
2. atomic increment 适合什么场景。
3. transaction 保护什么边界。
4. SELECT FOR UPDATE 为什么会让其他流程等待。
5. idempotency key 为什么和 lock 不是一回事。
```

---

## 任务 1：创建阶段复盘

创建：

```text
docs/reviews/transaction-concurrency-stage-retrospective.md
```

写下面这些小标题：

```md
# 事务和并发阶段复盘

## 1. 这一阶段我做了什么

## 2. 我怎么理解 lost update

## 3. atomic increment 解决什么问题

## 4. transaction 解决什么问题

## 5. SELECT FOR UPDATE 解决什么问题

## 6. idempotency key 解决什么问题

## 7. 它们之间的区别

## 8. 我还不太确定的地方

## 9. 下一阶段我想学什么
```

---

## 任务 2：写核心区别

第 7 节可以写：

```text
atomic increment：解决单字段计数类并发更新。
transaction：解决多个数据库操作要么一起成功、要么一起失败。
SELECT FOR UPDATE：解决复杂读写流程里，同一行数据被多个 transaction 同时修改的问题。
idempotency key：解决同一个业务请求被重复提交或重复投递的问题。
```

---

## 任务 3：写真实选择思路

可以补这一段：

```text
如果只是 attempts + 1，我优先考虑 atomic increment。
如果是 Job update + JobLog create，要一起成功或失败，我考虑 transaction。
如果必须先读一行、判断状态、再更新，而且多个 worker 会抢同一行，我考虑 SELECT FOR UPDATE。
如果是同一个创建请求可能重复发送，我考虑 idempotency key。
```

---

## 任务 4：写下一阶段选择

第 9 节写你的选择。

我建议下一阶段进入：

```text
后端工程化阶段收束：从功能实现转向部署、监控、CI 或生产化设计。
```

也可以选择继续深入：

```text
1. 部署和环境配置
2. CI / GitHub Actions
3. 日志、监控、健康检查
4. 更完整的前后端产品体验
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/transaction-concurrency-stage-retrospective.md`
- [x] 写清楚 lost update
- [x] 写清楚 atomic increment
- [x] 写清楚 transaction
- [x] 写清楚 SELECT FOR UPDATE
- [x] 写清楚 idempotency key
- [x] 写出下一阶段选择
- [x] `npm run format:check` 通过

完成后告诉我：

```text
事务和并发阶段复盘完成了
```
