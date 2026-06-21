# Task: 幂等入门：用 idempotency key 防止重复创建 Job

## 背景

你已经学过：

```text
1. lost update：并发读旧值再写回会丢失更新。
2. atomic increment：适合单字段原子递增。
3. transaction：适合多步骤写入一致性。
4. SELECT FOR UPDATE：适合保护复杂并发读写。
```

下一步学习另一个后端高频问题：幂等。

幂等的核心问题是：

```text
同一个请求因为网络重试、用户重复点击、队列重复投递，被执行了两次。
后端怎样保证它不会创建两份业务数据？
```

---

## 这张任务只练什么

先不改真实 API，只写一个脚本观察问题：

```text
同一个 idempotency key 重复提交时，应该返回同一条 Job，而不是创建两条 Job。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 幂等和并发锁不是同一个问题。
2. idempotency key 是什么。
3. 为什么重试请求不能盲目创建新数据。
4. 为什么幂等通常需要唯一约束或唯一业务键。
```

---

## 任务 1：先写复盘文档

创建：

```text
docs/reviews/idempotency-key-intro.md
```

写下面这些小标题：

```md
# 幂等入门：idempotency key

## 1. 什么是幂等

## 2. 什么场景会出现重复请求

## 3. idempotency key 解决什么问题

## 4. 它和 transaction / lock 的区别

## 5. 我理解中的实现思路
```

---

## 任务 2：写你当前理解

第 1 节可以写：

```text
幂等是指同一个业务请求执行一次和执行多次，最终业务结果应该一致。
```

第 2 节可以写：

```text
重复请求可能来自用户重复点击、前端超时重试、队列重复投递、服务间调用重试。
```

第 3 节可以写：

```text
idempotency key 是客户端或调用方为一次业务操作生成的唯一标识。
后端收到重复的 key 时，应该识别这是同一次业务操作，而不是创建新的业务数据。
```

---

## 任务 3：写它和 transaction / lock 的区别

可以这样写：

```text
transaction 解决一组数据库操作要么一起成功、要么一起失败。
lock 解决多个并发流程同时修改同一份数据的竞争。
idempotency key 解决同一个业务请求被重复执行的问题。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/idempotency-key-intro.md`
- [x] 写清楚什么是幂等
- [x] 写清楚哪些场景会出现重复请求
- [x] 写清楚 idempotency key 解决什么问题
- [x] 写清楚它和 transaction / lock 的区别
- [x] `npm run format:check` 通过

完成后告诉我：

```text
幂等 idempotency key 入门完成了
```
