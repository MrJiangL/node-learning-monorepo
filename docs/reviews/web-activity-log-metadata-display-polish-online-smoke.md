# Activity Log metadata 展示增强线上 smoke

## 1. 这次部署验证了什么

这次线上 smoke 验证的是 Activity Log metadata 展示增强是否已经在真实线上环境生效。

这次验证的重点不是 metadata 摘要是否存在，而是：

```text
changedFields 里的已知字段名是否已经从英文变成中文。
```

也就是确认线上页面能从：

```text
变更字段：title、dueDate、completed
```

展示为：

```text
变更字段：标题、截止日期、完成状态
```

这条链路覆盖：

```text
Netlify 最新前端 bundle
  -> Railway API
    -> Railway MySQL 真实 Activity Log 数据
```

线上 smoke 完成后，可以认为 metadata 展示增强已经形成完整闭环：

```text
前端实现
  -> 自动化测试
    -> 本地 smoke
      -> 线上 smoke
```

## 2. Project 级 Activity Log 是否显示中文字段名

Project 级 Activity Log 已经验证可以显示中文字段名。

这让 Project 内的日志更贴近用户操作语言。

例如：

```text
Todo：学习 dueDate；变更字段：标题、截止日期
Project：学习项目；变更字段：名称、描述
```

相比英文原字段名，中文字段名更容易和页面表单对应起来。

用户不需要知道：

```text
title / dueDate / completed / name / description
```

分别是什么技术字段。

他只需要读：

```text
标题 / 截止日期 / 完成状态 / 名称 / 描述
```

这就是这次增强的产品价值。

## 3. 用户级 Activity Log 是否显示中文字段名

用户级 Activity Log 也已经验证可以显示中文字段名。

这很重要。

因为用户级 Activity Log 是跨 Project 的全局视角，本来就更需要清晰的上下文。

当前用户级面板里同时有：

- Project 快照名
- metadata 摘要
- 中文字段名
- 中文 action
- 格式化时间

这让用户能更自然地回答：

```text
我在哪个 Project 里改了什么？
```

例如：

```text
Project：学习项目
Todo：学习 dueDate；变更字段：标题、截止日期
```

这比只显示技术字段更接近真实产品体验。

## 4. 是否还出现已知英文字段名

线上 smoke 已完成，没有记录到已知字段名仍然以英文展示的问题。

当前已知字段应该被翻译为：

```text
title -> 标题
dueDate -> 截止日期
completed -> 完成状态
name -> 名称
description -> 描述
```

如果未来仍然看到英文，有两种可能：

1. 这是未知字段，按当前策略保留原样。
2. 这是新加入的已知业务字段，但还没补进前端映射表。

当前策略是合理的：

```text
已知字段翻译成中文。
未知字段保留原样。
```

这样既提升常见字段体验，又不会因为新字段出现而打断展示。

## 5. 如果失败，我看到了什么 requestId

这次线上 smoke 已完成，没有记录需要排查的失败 requestId。

如果后续线上出现异常，可以按这个顺序查：

- 如果请求失败，看响应头里的 `X-Request-Id`
- 用 requestId 去 Railway logs 定位后端请求
- 如果请求成功但展示不对，看 Network response 里的 `metadata.changedFields`
- 对照前端字段映射表确认是否缺少某个字段

这类问题大多不是后端错误，而是展示层映射规则需要扩展。

## 6. 下一步还要优化什么

下一步建议做：

```text
Activity Log 阶段总复盘
```

原因是 Activity Log 到这里已经走完了非常完整的一条产品工程链路：

- 数据模型
- 写入集成
- 查询 API
- Project 删除快照
- action / metadata schema
- 索引和性能解释
- Project 级前端展示
- 用户级前端入口
- 体验优化
- metadata 展示
- metadata 展示增强
- 多次本地 smoke 和线上 smoke

这时候继续加功能前，应该先做一次阶段总复盘。

复盘的目标不是“庆祝一下”，而是把这条线沉淀成你以后能复用的工程方法：

```text
一个业务审计 / 活动日志功能，
从后端设计到前端产品化，应该怎么一步步落地。
```
