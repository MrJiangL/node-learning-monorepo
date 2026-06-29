# Todo dueDate 线上 smoke

## 1. 这次线上验证了什么

这次线上 smoke 验证的是 Todo dueDate 展示和编辑是否已经真实跑在线上。

本地功能完成之后，dueDate 已经进入前端数据流：

```text
TodoPanel
  -> input[type="date"]
    -> saveTodo
      -> PATCH /todos/:id
        -> Railway API
          -> Railway MySQL
            -> Todo 列表重新加载
              -> Activity Log 刷新
```

这次线上验证确认的是这条链路在 Netlify + Railway 环境里也能跑通。

验证重点包括：

- Todo 没有 dueDate 时，线上展示“暂无截止日期”
- Todo 有 dueDate 时，线上展示“截止：YYYY/MM/DD”
- 线上可以编辑 Todo dueDate
- 线上可以清空 Todo dueDate
- Todo 更新后 Activity Log 仍然符合预期
- 本次没有出现需要追踪的线上错误

这一步很重要。

因为 dueDate 不是纯 UI 假字段，它会真正写入数据库。

所以它必须在线上验证：

```text
前端表单值
  -> PATCH payload
    -> 后端 UpdateTodoInput
      -> Prisma dueDate
        -> 再返回给前端展示
```

本次线上 smoke 完成后，Todo 已经从“标题 + 完成状态”升级成更接近真实任务管理的形态。

## 2. dueDate 展示在线上是否正常

dueDate 展示在线上正常。

当前展示规则是：

```text
dueDate 为 null -> 暂无截止日期
dueDate 有值 -> 截止：YYYY/MM/DD
```

这个规则在线上是合理的。

它避免了两个常见问题：

1. 空 dueDate 展示成空白，让用户不知道是没有日期还是页面没加载
2. 有 dueDate 时直接展示 ISO 字符串，让页面变得偏调试风格

现在用户看到的是更自然的文案：

```text
暂无截止日期
截止：2026/06/29
```

这说明前端对 API 数据做了展示层转换，而不是把后端原始字符串直接扔给用户。

这个分层是对的：

```text
后端负责返回稳定数据
前端负责转换成用户能读懂的展示文案
```

## 3. dueDate 更新在线上是否正常

dueDate 更新在线上正常。

线上编辑 Todo 时，date input 使用的是浏览器原生日期输入：

```text
YYYY-MM-DD
```

保存后，前端把它作为 `dueDate` 传给：

```text
PATCH /todos/:id
```

然后重新加载 Todo 列表。

列表展示时再转换为：

```text
截止：YYYY/MM/DD
```

这里有一个很好的学习点：

```text
表单控件格式和展示格式可以不同。
```

date input 需要：

```text
2026-06-29
```

用户展示可以是：

```text
截止：2026/06/29
```

这不是矛盾，而是两个不同层面的格式：

- 表单层：适合机器和控件
- 展示层：适合用户阅读

本次线上 smoke 说明这两个格式转换没有在线上出问题。

## 4. dueDate 清空在线上是否正常

dueDate 清空在线上正常。

这次最关键的语义是：

```ts
dueDate: null;
```

它表示：

```text
明确清空截止日期。
```

这和：

```ts
dueDate: undefined;
```

不是一回事。

`undefined` 更像：

```text
这次不更新 dueDate。
```

`null` 才是：

```text
请把 dueDate 清掉。
```

线上 smoke 能确认清空 date input 后，Todo 回到“暂无截止日期”，说明这条链路是通的：

```text
date input 清空
  -> 前端传 dueDate: null
    -> 后端更新数据库 dueDate 为 null
      -> 前端重新加载后展示“暂无截止日期”
```

这一步非常值得保留在复盘里。

因为 `undefined` / `null` 的区别以后还会反复出现在：

- 可清空描述
- 可清空头像
- 可选日期
- 可选关联关系
- 用户设置项

## 5. Activity Log 是否符合预期

Activity Log 符合当前阶段预期。

dueDate 更新本质上仍然是 Todo 更新：

```text
PATCH /todos/:id
```

所以 Activity Log 记录为：

```text
todo.updated
```

当前前端展示为“更新 Todo”已经够用。

这一阶段不要求 Activity Log 精细到：

```text
把截止日期从 A 改成 B
```

或者：

```text
清空了截止日期
```

原因是那会进入 metadata 展示设计，需要决定：

- 是否展示 oldValue / newValue
- 不同 action 的 metadata 怎么渲染
- 日期字段怎么格式化
- 空值怎么表达

这些是后续 Activity Log 进阶可以做的事情。

当前阶段先保证：

```text
Todo dueDate 更新会留下操作痕迹。
```

这个目标已经达成。

## 6. 如果失败，我看到了什么 requestId

本次线上 smoke 没有记录到需要排查的失败请求。

所以没有需要追踪的 `X-Request-Id`。

如果后续线上 dueDate 更新或清空失败，仍然按这个路径查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到 PATCH /todos/:id
4. 看 request payload 是否包含 dueDate
5. 看 status code
6. 看 response body
7. 看 response headers 里的 X-Request-Id
8. 去 Railway logs 搜同一个 requestId
```

这次没有 requestId 要记录，是好结果。

但排障路径仍然要写下来，因为 dueDate 这类字段最常见的问题往往藏在 payload 里：

```text
到底是没有传 dueDate？
传了空字符串？
传了 null？
还是传了错误格式？
```

浏览器 Network 是第一现场。

## 7. 下一步还要优化什么

Todo dueDate 这条线现在已经完成了一个小闭环：

```text
前端实现
  -> 本地测试
  -> 本地 smoke 复盘
  -> 线上 smoke
```

下一步我不建议马上继续做 dueDate 排序、筛选或逾期高亮。

这些当然有价值，但现在项目里有一个更明显的产品空洞：

```text
Activity Log 只能在选中 Project 后看。
```

这会带来几个问题：

- Project 删除后，用户不容易看到 `project.deleted`
- 用户想看最近所有操作，需要一个个 Project 切换
- Todo 更新、Project 更新、删除等行为无法从用户视角串起来
- Activity Log 明明已经记录了很多事件，但前端入口仍然偏局部

所以我建议下一阶段进入：

```text
用户级 Activity Log 查询 API
```

注意，这里我建议先做 API，不是马上做前端 UI。

原因是当前后端 Activity Log 查询还是 Project 维度：

```text
GET /projects/:projectId/activity-logs
```

如果要做用户级 Activity Log，需要先有类似：

```text
GET /activity-logs
```

它基于当前登录用户查询所有日志，并继续支持：

- page / pageSize
- action
- createdAfter / createdBefore

等 API 稳定后，再做前端“用户级 Activity Log 面板”会更顺。

下一张任务建议进入：

```text
docs/tasks/2026-06-29-user-activity-log-query-api.md
```
