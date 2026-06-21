# Task: Prisma + Zod + Test Design Stage Retrospective

## 目标

这一张不是写新功能，而是做阶段复盘。

你刚完成了一个小强化阶段：

```text
Prisma + Zod + 测试设计强化
```

这个阶段包含：

- Zod 输入边界：`optional / nullable / transform / coerce`
- Prisma 查询关系：`where / include / relation / count`
- Prisma transaction 回滚：`tx / throw / rollback`
- 测试设计：`red-green / 行为测试 / completed=false 边界`

现在需要把你真正理解了什么、还卡在哪里写下来。

这一步很重要，因为它会决定下一阶段怎么走。

---

## Step 1: 新建复盘文档

创建：

```text
docs/reviews/prisma-zod-test-stage-retrospective.md
```

写入下面这个结构。

你不需要写得很长，但每个问题都要用自己的话回答。

````md
# Prisma + Zod + 测试设计强化阶段复盘

## 1. Zod 输入边界

### 我现在能分清 optional 和 nullable 吗？

写你的理解：

```text
optional 表示：
nullable 表示：
```
````

### 我什么时候会用 transform？

写一个你自己的例子：

```text
例如：
```

### 我为什么不应该直接用 z.coerce.boolean() 处理 "false"？

写你的理解：

```text
原因：
```

---

## 2. Prisma 查询关系

### where 是做什么的？

写你的理解：

```text
where 用来：
```

### include 是做什么的？

写你的理解：

```text
include 用来：
```

### 为什么查询 project 时要带上 userId？

写你的理解：

```text
原因：
```

---

## 3. Prisma transaction

### transaction 解决什么问题？

写你的理解：

```text
transaction 解决：
```

### 为什么 transaction 里面要用 tx，而不是外层 prisma？

写你的理解：

```text
原因：
```

### 如果中途 throw error，数据库会发生什么？

写你的理解：

```text
会发生：
```

---

## 4. 测试设计

### 这次 red-green 练习里，哪个测试最有价值？

从下面选一个，并写原因：

```text
我觉得最有价值的是：
原因：
```

### completed=false 为什么容易测漏？

写你的理解：

```text
原因：
```

### 我现在怎么看“测试完成了”？

写你的理解：

```text
我认为测试完成不是指测试数量很多，而是：
```

---

## 5. 下一阶段选择

我更想下一阶段：

```text
A. 继续后端工程化：错误处理、配置、日志、测试稳定性、API 结构整理
B. 开始前端接入：React/Next.js 调用当前 API，做登录、Project/Todo 页面
C. 继续数据库深化：索引、复杂查询、事务、迁移、seed、测试数据库隔离
```

我的选择：

```text
我选：
原因：
```

````

---

## Step 2: 完成后的口令

完成后告诉我：

```text
Prisma Zod 测试阶段复盘完成了
````

我会帮你：

1. 看你的理解有没有偏差。
2. 帮你补导师评估。
3. 更新当前学习进度。
4. 根据你的选择创建下一阶段任务卡。
