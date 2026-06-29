# Todo dueDate smoke 和复盘

## 1. 这次我验证了什么

这次 smoke 复盘验证的是 Todo `dueDate` 展示和编辑是否已经形成一个完整的前端闭环。

这轮不是新增后端能力。

后端和 shared 类型里本来就已经有：

```text
Todo.dueDate: string | null
UpdateTodoInput.dueDate?: string | null
```

这次真正补齐的是前端用户路径：

```text
Todo 列表展示 dueDate
  -> 编辑 Todo 时展示 date input
    -> 保存 title + dueDate
      -> PATCH /todos/:id
        -> 重新加载 Todo 列表
          -> 刷新 Activity Log
```

本次重点验证了这些行为：

- 新 Todo 没有截止日期时，前端展示“暂无截止日期”
- Todo 有 dueDate 时，前端展示格式化后的“截止：YYYY/MM/DD”
- 点击编辑时，后端返回的 ISO dueDate 能转换成 `YYYY-MM-DD` 填进 date input
- 修改 dueDate 后保存，Todo 列表能展示新日期
- 清空 date input 后保存，Todo 能回到“暂无截止日期”
- 保存 Todo 后，Activity Log 仍然能出现 Todo 更新记录

这一轮完成后，Todo 不再只是：

```text
标题 + 完成状态
```

而是开始接近一个真实任务管理工具：

```text
标题 + 完成状态 + 截止日期
```

这是一个小字段，但产品意义很大。

## 2. dueDate 展示解决了什么问题

dueDate 展示解决的是 Todo 的“时间上下文”问题。

在没有 dueDate 之前，Todo 只能表达：

```text
我要做什么？
做完了吗？
```

但它不能表达：

```text
什么时候要做完？
```

这会让 Todo 更像普通清单，而不是任务管理。

加上 dueDate 后，用户在列表里能直接判断：

- 这个 Todo 有没有截止日期
- 截止日期是哪一天
- 哪些 Todo 需要优先处理

当前第一版展示规则很简单：

```text
有 dueDate -> 截止：2026/06/28
无 dueDate -> 暂无截止日期
```

这个规则是合理的。

因为它避免了两个问题：

1. 不把后端 ISO 字符串直接丢给用户
2. 不让空日期在 UI 上表现成空白

空白 UI 很容易让用户困惑：

```text
是没有数据？
是还没加载？
还是页面坏了？
```

显示“暂无截止日期”则更明确。

## 3. date input 编辑体验是否合理

当前用 `<input type="date">` 作为第一版编辑体验是合理的。

它的优点是：

- 不需要引入复杂日历组件
- 浏览器原生支持日期选择
- 输入格式天然是 `YYYY-MM-DD`
- 和后端更新接口的字符串字段容易衔接

这里最关键的转换是：

```text
后端返回 ISO 字符串
  -> 前端编辑态取前 10 位
    -> YYYY-MM-DD
      -> 填进 input[type="date"]
```

也就是：

```ts
todo.dueDate ? todo.dueDate.slice(0, 10) : "";
```

这个处理是实用的。

因为 date input 不接受完整 ISO 字符串：

```text
2026-06-28T00:00:00.000Z
```

它需要的是：

```text
2026-06-28
```

这一层转换看起来小，但很典型：

```text
API 数据形状
  !=
表单控件需要的数据形状
  !=
用户最终看到的数据形状
```

前端经常要在这三者之间做翻译。

## 4. 清空 dueDate 为什么要传 null

清空 dueDate 时传 `null`，是这次最重要的语义点。

在 PATCH 更新里：

```ts
dueDate: undefined;
```

和：

```ts
dueDate: null;
```

含义不一样。

`undefined` 更像是：

```text
这次请求没有提到 dueDate，所以不要动它。
```

`null` 更像是：

```text
这次请求明确要求把 dueDate 清空。
```

所以当用户在 date input 里清空日期时，前端不能简单地“不传 dueDate”。

否则后端可能会理解为：

```text
不要更新 dueDate。
```

正确做法是：

```ts
dueDate: editingTodoDueDate.value || null;
```

这样用户清空输入时，会明确传：

```ts
dueDate: null;
```

这就是前端表单和后端 PATCH 语义之间的合同。

这个点掌握好之后，以后做很多可清空字段都会用到：

- description
- avatar
- dueDate
- optional setting
- nullable relation

## 5. Activity Log 是否符合预期

Activity Log 符合当前阶段预期。

保存 Todo dueDate 本质上仍然是更新 Todo：

```text
PATCH /todos/:id
```

所以后端应该记录：

```text
todo.updated
```

前端页面在保存 Todo 后仍然调用：

```text
loadActivityLogs(selectedProjectId)
```

这说明 dueDate 更新没有绕过原来的 Activity Log 刷新链路。

当前阶段先不要求 Activity Log 精细展示：

```text
把 dueDate 从 A 改成 B
```

或者：

```text
清空了截止日期
```

现在能展示“更新 Todo”已经足够。

更细的 metadata 展示可以留到后续 Activity Log 进阶。

这里的取舍是对的：

```text
先保证行为被记录。
再考虑记录展示得多精细。
```

## 6. 下一阶段我选择什么

我建议下一阶段选择：

```text
A. 部署上线和线上 smoke
```

原因是 Todo dueDate 已经进入用户可见的数据流：

```text
用户能看到 dueDate
用户能修改 dueDate
用户能清空 dueDate
Activity Log 会记录 Todo 更新
```

这种功能不适合只停在本地测试和本地 smoke。

更稳的节奏是：

```text
本地 dueDate 功能完成
  -> 本地测试 / typecheck / build 通过
  -> 部署到 Netlify
  -> 在线上创建临时 Todo
  -> 设置 dueDate
  -> 验证展示格式
  -> 清空 dueDate
  -> 验证 null 清空语义
  -> 验证 Activity Log
```

如果线上失败，再用前面已经练过的方式查：

```text
浏览器 Network
  -> PATCH /todos/:id
    -> X-Request-Id
      -> Railway logs
```

选 B“用户级 Activity Log”也很有价值，但它是新模块。

选 C“dueDate 进阶体验”也可以，但它更像继续打磨。

当前最合理的顺序是：

```text
先把 dueDate 这次新增的基础能力部署验证。
再继续做用户级 Activity Log 或 dueDate 进阶。
```

所以下一张任务建议进入：

```text
docs/tasks/2026-06-29-web-todo-due-date-online-smoke.md
```
