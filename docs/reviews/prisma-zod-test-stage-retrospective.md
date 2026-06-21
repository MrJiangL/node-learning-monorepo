# Prisma + Zod + 测试设计强化阶段复盘

## 1. Zod 输入边界

### 我现在能分清 optional 和 nullable 吗？

写你的理解：

```text
optional 表示：可以不传值
nullable 表示：null的传值
```

我什么时候会用 transform？

例如：需要类型转换的时候会用到，比如 处理时间 还有字符串 true false的转换

我为什么不应该直接用 z.coerce.boolean() 处理 "false"？
原因：因为 JavaScript 里： Boolean("false") === true ，所以需要我们自己处理

where 是做什么的？
where 用来：根据一些 条件来查询数据

include 是做什么的？
include 用来：查询数据的时候吧关联的表的数据也一起查出来

为什么查询 project 时要带上 userId？
原因：每个人的数据都是独立的需要指定用户来查询 自己的数据

transaction 解决什么问题？
transaction 解决：我需要创建 主表的数据的时候 同时创建子表的数据的时候会用 transaction

为什么 transaction 里面要用 tx，而不是外层 prisma？
原因：你不用的话意味你的动作都不属于 transaction ，而是新的 prisma

测试设计
这块我没着重练习，所以导致我没认真的去查看

下一阶段选择
你这边对我这的回答 进行帮我选择 A B C，你看下

---

## 导师评估

### 总体判断

这一阶段你不是“完全掌握”，但已经进入了一个很重要的状态：

```text
你开始能用自己的话解释后端边界、数据库查询和事务，而不是只会照着代码改。
```

这说明你已经从“跟着写 CRUD”往“理解后端为什么这样写”前进了一步。

当前我给你的阶段判断是：

```text
Node 后端学习进度：约 72% 到 75%
Express + Prisma API 能力：初级后端可训练阶段
测试设计能力：刚入门，需要继续专项训练
```

### 你理解得比较好的地方

#### 1. Zod 的输入边界

你的理解基本正确：

```text
optional 表示可以不传。
nullable 表示可以明确传 null。
```

可以再补精确一点：

```text
optional -> undefined -> 客户端没有提供这个字段
nullable -> null -> 客户端明确提供了空值
```

这在 `PATCH` 接口里非常重要：

```text
不传 description：不修改
传 description: null：清空
```

你对 `transform` 的理解也对：它适合做输入到业务值的转换，例如：

```text
"true" -> true
"false" -> false
"   " -> null
"  report  " -> "report"
```

你也记住了 `Boolean("false") === true`，这个点很关键。

#### 2. Prisma 查询关系

你对 `where` 和 `include` 的理解是对的：

```text
where 负责筛选数据。
include 负责把关联数据一起查出来。
```

你也能说出为什么查 Project 要带 `userId`：

```text
每个人的数据独立，只能查自己的数据。
```

这其实已经是权限边界的核心思路了。

更工程化一点的表达是：

```text
把 userId 放进 where，可以让数据库查询本身成为权限边界的一部分。
```

#### 3. Transaction

你对 transaction 的理解是部分正确的：

```text
创建主表数据时，同时创建子表数据，会用 transaction。
```

再补完整一点：

```text
transaction 解决的是多步写入的一致性问题。
它不是只用于主表 + 子表，也可以用于任何“必须一起成功或一起失败”的多次数据库写入。
```

你对 `tx` 的理解是正确的：

```text
不用 tx，就不属于当前 transaction。
```

下一步你需要继续记住：

```text
transaction 回调里 throw error，Prisma 会回滚这个 transaction 里已经通过 tx 完成的写入。
```

### 你现在最需要补的地方

你自己写了：

```text
测试设计这块我没着重练习，所以导致我没认真的去查看
```

这句话很准确。

现在你的问题不是“不知道测试语法”，而是：

```text
你还不太习惯先问：这个测试到底保护哪个行为？
```

比如 `completed=false` 那个练习，测试真正保护的是：

```text
false 是有效值，不能被当成没传。
```

这类测试数量不多，但价值很高。

### 下一阶段我帮你选择：A

我建议下一阶段选择：

```text
A. 继续后端工程化：错误处理、配置、日志、测试稳定性、API 结构整理
```

原因：

1. 你现在 API 功能已经不少了，直接进前端会很有成就感，但测试和工程组织还不够稳。
2. 你当前最明显的短板是测试设计和测试准备代码重复。
3. 先做一小轮后端工程化，可以让你后面接前端时更顺，不会一边写页面一边怀疑 API。

但 A 不会无限拉长。

建议节奏是：

```text
先做 3 到 5 张后端工程化任务卡，然后进入前端接入。
```

下一阶段第一张任务卡建议从：

```text
测试 helper 抽取
```

开始。

因为你现在很多测试里都重复写：

```text
registerAndLogin
authHeader
createProject
createTodo
beforeEach 清理数据库
```

把这些抽出来以后，你写测试时会更专注在“行为本身”，而不是每次重新搭测试脚手架。
