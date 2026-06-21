# Task: 数据库索引阶段总复盘

## 背景

你已经连续完成了一组数据库索引和 EXPLAIN 练习：

```text
1. 从 Activity Log 查询反推复合索引。
2. 判断旧索引是否冗余。
3. 用 EXPLAIN 看 MySQL 实际选择哪个索引。
4. 对比 action 查询下的索引选择。
5. 添加 action 复合索引并做实验。
6. 用 seed 数据观察数据量变化后的 EXPLAIN。
7. 用 FORCE INDEX 验证复合索引能否消除 Using filesort。
8. 做 action 复合索引最终判断。
```

这张任务不是继续写代码，而是把这阶段真正学到的东西收束一下。

---

## 这张任务只练什么

只练复盘表达：

```text
1. 把索引、EXPLAIN、FORCE INDEX、filesort 串起来。
2. 写清楚自己现在能看懂哪些字段。
3. 写清楚哪些地方还不确定。
4. 判断下一阶段要不要进入事务和并发。
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. 复合索引为什么要从查询形状反推。
2. possible_keys 和 key 的区别。
3. rows 和 Extra 怎么辅助判断。
4. Using filesort 代表什么。
5. 为什么 FORCE INDEX 适合实验，但不适合随便写进业务代码。
6. 为什么真实项目里的索引决策要结合读写成本。
```

---

## 任务 1：创建总复盘

创建：

```text
docs/reviews/database-index-stage-retrospective.md
```

写下面这些小标题：

```md
# 数据库索引阶段总复盘

## 1. 这一阶段我做了什么

## 2. 我现在怎么理解复合索引

## 3. 我现在怎么阅读 EXPLAIN

## 4. 我怎么理解 possible_keys / key / rows / Extra

## 5. 我怎么理解 Using filesort

## 6. 我怎么理解 FORCE INDEX

## 7. 我对 Activity Log action 复合索引的最终判断

## 8. 我还不太确定的地方

## 9. 下一阶段我准备学什么
```

---

## 任务 2：写“我现在怎么阅读 EXPLAIN”

你可以这样写：

```text
我现在看 EXPLAIN 不只看 key。
我会先看 possible_keys 了解候选索引，再看 key 了解实际使用的索引。
然后看 rows 估算扫描量，最后看 Extra 了解是否还有 Using where、Using filesort、Backward index scan 等额外动作。
```

---

## 任务 3：写“Using filesort”

你可以这样写：

```text
Using filesort 表示 MySQL 不能完全依赖当前索引顺序完成排序，需要额外排序。
它不一定代表查询一定很慢，但如果参与排序的数据很多，就可能成为性能问题。
```

---

## 任务 4：写“FORCE INDEX”

你可以这样写：

```text
FORCE INDEX 适合用来做实验，观察某个索引如果被使用，会得到怎样的执行计划。
但是它不应该随便写进业务代码，因为数据分布会变化，强制索引可能让未来的查询变慢。
```

---

## 任务 5：写下一阶段选择

第 9 节写：

```text
下一阶段我准备进入事务和并发边界。
因为我已经学过 Prisma transaction 的基础用法，现在可以继续学习并发更新、数据库锁、幂等和一致性问题。
```

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/database-index-stage-retrospective.md`
- [x] 写清楚复合索引的理解
- [x] 写清楚 EXPLAIN 的阅读顺序
- [x] 写清楚 possible_keys / key / rows / Extra
- [x] 写清楚 Using filesort
- [x] 写清楚 FORCE INDEX
- [x] 写出 Activity Log action 复合索引的最终判断
- [x] 写出下一阶段准备学习事务和并发
- [x] `npm run format:check` 通过

完成后告诉我：

```text
数据库索引阶段总复盘完成了
```
