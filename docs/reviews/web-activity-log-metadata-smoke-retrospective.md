# Activity Log metadata 展示 smoke 和复盘

## 1. 这次我验证了什么

这次 smoke 验证的是 Activity Log metadata 前端展示是否具备第一版产品价值。

验证重点不是接口是否能返回 Activity Log，而是：

```text
前端能不能把 metadata 里的结构化信息，
翻译成用户能读懂的一行补充说明。
```

这次验证覆盖：

- Project 级 Activity Log 展示 metadata 摘要
- 用户级 Activity Log 展示 metadata 摘要
- Todo 创建 / 更新相关日志能展示 Todo 标题
- Project 更新相关日志能展示 Project 名称
- 更新类日志能展示 changedFields
- 没有 metadata 的旧日志不会展示 `undefined`

这说明 metadata 展示已经从“代码 helper”走到了“页面可读信息”。

## 2. metadata 摘要解决了什么问题

metadata 摘要解决的是：

```text
用户不只知道发生了什么，还能知道这件事具体涉及什么。
```

只有 message 和 action 时，用户能看到：

```text
更新了 Todo
更新 Todo
```

但这还不够具体。

加入 metadata 摘要后，可以看到：

```text
Todo：学习 metadata；变更字段：title、dueDate
```

这让日志多了一层上下文：

- 是哪个 Todo
- 是哪个 Project
- 哪些字段发生了变化

这里的关键不是展示更多数据，而是展示更有解释力的数据。

## 3. Project 级 Activity Log 展示是否清楚

Project 级 Activity Log 的 metadata 展示是清楚的。

它服务的是当前 Project 的上下文。

所以用户在看 Project 级日志时，最重要的是知道：

- 当前 Project 下哪个 Todo 发生了变化
- 这次变化涉及哪些字段
- Project 自身是否被更新

当前第一版摘要能覆盖这些问题：

```text
Todo：学习 metadata
Todo：学习 dueDate；变更字段：title、dueDate
Project：学习项目；变更字段：name、description
```

message 仍然是主信息，metadata 摘要是补充说明。

这个层级是合理的。

## 4. 用户级 Activity Log 展示是否清楚

用户级 Activity Log 的 metadata 展示也清楚。

用户级日志本来就比 Project 级日志更容易“失去上下文”，因为它会混合多个 Project 的操作。

所以用户级面板里现在有两层辅助信息：

```text
Project 快照名：这条日志属于哪个 Project
metadata 摘要：这条日志具体涉及哪个 Todo / 哪些字段
```

这两个信息不是重复的。

例如：

```text
Project：学习项目
Todo：学习 metadata；变更字段：title、dueDate
```

前者告诉用户“在哪个 Project”，后者告诉用户“具体改了什么对象”。

这让用户级 Activity Log 更像一个真正可读的最近动态列表。

## 5. 没有 metadata 的旧日志是否安全

没有 metadata 的旧日志是安全的。

当前前端 helper 的策略是：

```text
metadata 缺失或形状不符合预期时，返回 null。
```

组件只在有摘要时展示：

```text
v-if="formatActivityLogMetadata(log)"
```

所以旧日志不会出现：

```text
undefined
[object Object]
null
```

这是一个很重要的兼容策略。

因为真实产品里经常会出现历史数据结构不如新代码完整的情况。

前端展示层必须防御式读取，而不是假设所有历史数据都完美。

## 6. 下一阶段我选择什么

下一阶段选择：

```text
A. Activity Log metadata 展示线上 smoke
```

选择原因：

- metadata 摘要是用户可见的新 UI 信息。
- 本地 smoke 已经确认 Project 级和用户级展示都可读。
- 下一步需要在线上确认真实数据、旧数据和部署后的 bundle 都表现正常。
- 尤其要确认旧日志没有 metadata 时，线上不会出现 `undefined`。

这一步完成后，metadata 展示就形成完整闭环：

```text
前端实现
  -> 自动化测试
    -> 本地 smoke
      -> 线上 smoke
```
