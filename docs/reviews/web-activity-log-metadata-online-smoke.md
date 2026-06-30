# Activity Log metadata 展示线上 smoke

## 1. 这次部署验证了什么

这次线上 smoke 验证的是 Activity Log metadata 摘要是否已经在线上真实环境可用。

这条链路覆盖：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL 里的真实 Activity Log 数据
```

这次验证的重点不是 Activity Log 能不能加载，因为这个能力前面已经验证过。

这次重点是：

```text
真实线上数据里的 metadata，
能不能被前端安全地翻译成用户可读摘要。
```

线上 smoke 完成后，可以认为 metadata 前端展示已经完成了线上闭环：

```text
前端实现
  -> 自动化测试
    -> 本地 smoke
      -> 线上 smoke
```

## 2. Project 级 Activity Log metadata 是否正常

Project 级 Activity Log metadata 展示已经完成线上验证。

它解决的是当前 Project 内的上下文解释问题。

用户在 Project 级日志里能更清楚地看到：

- 哪个 Todo 被创建或更新
- 哪些字段发生了变化
- Project 自身是否发生更新

例如：

```text
Todo：学习 metadata；变更字段：title、dueDate
Project：学习项目；变更字段：name、description
```

这样日志不再只是“有一条更新”，而是能说明“这条更新具体涉及什么”。

## 3. 用户级 Activity Log metadata 是否正常

用户级 Activity Log metadata 展示也完成线上验证。

用户级面板本来是跨 Project 的最近动态，所以它需要两层上下文：

```text
Project 快照名：这条日志属于哪个 Project
metadata 摘要：这条日志具体涉及哪个 Todo / 哪些字段
```

这两层信息一起出现时，用户能更容易回答：

```text
我刚才在哪个 Project 里改了什么？
```

这说明用户级 Activity Log 已经从“操作记录列表”更接近“可读的最近动态”。

## 4. 旧日志没有 metadata 时是否安全

旧日志没有 metadata 时是安全的。

当前前端 helper 的策略是：

```text
metadata 缺失或形状不符合预期时，返回 null。
```

组件只在有摘要时展示 metadata。

所以旧日志不会展示：

```text
undefined
[object Object]
null
```

这个兼容策略非常重要。

因为线上真实数据库里经常同时存在新旧两种数据：

- 新日志：metadata 完整
- 旧日志：metadata 为空或字段不完整

前端不能假设所有数据都符合最新结构。

## 5. 如果失败，我看到了什么 requestId

这次线上 smoke 已完成，没有记录需要排查的失败 requestId。

如果后续线上 metadata 展示出现异常，可以按这个顺序查：

- 浏览器 Network 看 `GET /activity-logs` 或 Project 级 Activity Log 响应
- 找到异常日志的 `action` 和 `metadata`
- 如果请求失败，看响应头里的 `X-Request-Id`
- 用 requestId 去 Railway logs 定位后端请求

常见问题判断：

- 有日志但没 metadata 摘要：可能 metadata 缺失，或形状不符合前端 helper 预期
- 页面出现 `undefined`：说明某个展示路径没有做防御式读取
- 请求失败：按 `401` / `404` / `500` 状态码继续查

## 6. 下一步还要优化什么

下一步建议做：

```text
Activity Log metadata 展示增强
```

当前第一版 metadata 摘要已经安全可用，但展示仍然偏开发者字段。

例如：

```text
变更字段：title、dueDate、completed
```

这对开发者很清楚，但对真实用户还可以更自然。

下一步可以把字段翻译成用户语言：

```text
title -> 标题
dueDate -> 截止日期
completed ->完成状态
name -> 名称
description -> 描述
```

这样日志会从：

```text
Todo：学习 metadata；变更字段：title、dueDate
```

优化为：

```text
Todo：学习 metadata；变更字段：标题、截止日期
```

这是一个小改动，但能明显提升 Activity Log 的产品感。
