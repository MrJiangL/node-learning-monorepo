# Task: 数据库索引取舍：判断旧索引是否冗余

## 背景

上一张任务你给 `ActivityLog` 补了这个复合索引：

```prisma
@@index([userId, projectSnapshotId, createdAt])
```

现在 `ActivityLog` 里同时存在这些索引：

```prisma
@@index([userId, createdAt])
@@index([projectId, createdAt])
@@index([action])
@@index([projectSnapshotId, createdAt])
@@index([userId, projectSnapshotId, createdAt])
```

下一步不是马上删除旧索引，而是先学会判断：

```text
一个索引到底是不是冗余？
```

这个判断不能只看“字段有没有重复”，还要看：

```text
1. 真实查询有没有用到它
2. 复合索引的字段顺序是什么
3. MySQL 的最左前缀规则能不能覆盖它
```

---

## 这张任务只练什么

只练索引分析和学习笔记：

```text
1. 看懂最左前缀规则
2. 分析 ActivityLog 当前 5 个索引分别服务什么查询
3. 判断哪些索引暂时保留，哪些以后可能可以删除
4. 写一份索引取舍笔记
```

暂时不改 schema、不删索引、不创建 migration。

---

## 学习目标

完成后你应该能说清楚：

```text
1. 为什么 [userId, projectSnapshotId, createdAt] 不等于三个单字段索引
2. 为什么 [userId, projectSnapshotId, createdAt] 不能直接替代 [projectSnapshotId, createdAt]
3. 为什么判断索引冗余要看真实查询
4. 为什么这张任务先不删索引
```

---

## 任务 1：阅读当前 ActivityLog 索引

打开：

```text
prisma/schema.prisma
```

找到：

```prisma
model ActivityLog {
  // ...

  @@index([userId, createdAt])
  @@index([projectId, createdAt])
  @@index([action])
  @@index([projectSnapshotId, createdAt])
  @@index([userId, projectSnapshotId, createdAt])
}
```

你先不用改，只要把它们分成两类：

```text
可能正在服务当前查询的索引
可能是历史遗留或未来预留的索引
```

---

## 任务 2：理解最左前缀规则

对于这个索引：

```prisma
@@index([userId, projectSnapshotId, createdAt])
```

你可以粗略理解成数据库按这个顺序建目录：

```text
先按 userId 排
再在同一个 userId 里面按 projectSnapshotId 排
再在同一个 projectSnapshotId 里面按 createdAt 排
```

所以它适合这些查询：

```text
where userId = ?
where userId = ? and projectSnapshotId = ?
where userId = ? and projectSnapshotId = ? and createdAt between ? and ?
```

但它不适合直接替代这种查询：

```text
where projectSnapshotId = ?
```

原因是：

```text
projectSnapshotId 不是这个复合索引的第一个字段。
```

这就是“最左前缀”的核心感觉。

---

## 任务 3：写索引分析表

创建：

```text
docs/reviews/database-index-tradeoff-notes.md
```

先写这个表：

```md
# 数据库索引取舍笔记

## 1. 当前 ActivityLog 索引分析

| 索引                                              | 可能服务的查询                       | 暂时判断                |
| ------------------------------------------------- | ------------------------------------ | ----------------------- |
| `@@index([userId, createdAt])`                    | 查询某个用户的全部日志，并按时间排序 | 暂时保留 / 可能未来有用 |
| `@@index([projectId, createdAt])`                 | 旧的按 projectId 查询日志            | 需要继续确认            |
| `@@index([action])`                               | 按 action 做统计或过滤               | 暂时保留                |
| `@@index([projectSnapshotId, createdAt])`         | 不带 userId 时按 Project 快照查日志  | 需要继续确认            |
| `@@index([userId, projectSnapshotId, createdAt])` | 当前 Project Activity Log 列表查询   | 保留                    |
```

这里先不要追求完全正确，重点是训练“每个索引服务什么查询”的思路。

---

## 任务 4：回答三个问题

继续在同一个笔记里写：

```md
## 2. 什么是最左前缀规则

## 3. 为什么新复合索引不能直接替代所有旧索引

## 4. 我觉得哪些索引以后可能可以删除
```

每节 2-4 句即可。

---

## 验证命令

这张任务只改文档，所以跑：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/database-index-tradeoff-notes.md`
- [x] 写出当前 ActivityLog 索引分析表
- [x] 写清楚最左前缀规则的大概意思
- [x] 写清楚为什么新复合索引不能直接替代所有旧索引
- [x] 写出你认为以后可能可以删除的索引
- [x] `npm run format:check` 通过

完成后告诉我：

```text
数据库索引取舍完成了
```
