# Todo priority smoke 和复盘

## 1. 这次我验证了什么

这次 smoke 验证的是 Todo priority 这个新业务字段是否真的完成了端到端闭环。

验证范围包括：

- 创建 Todo 时可以选择 priority
- Todo 列表可以展示 priority 中文文案
- 编辑 Todo 时可以回填并修改 priority
- 保存后 Todo 列表可以刷新到最新 priority
- 不手动选择 priority 时默认是 `medium / 中`
- Activity Log metadata 里能把 `priority` 展示成 `优先级`

这不是一个很大的产品功能，但它是一个标准的“业务字段打通”练习：

```text
数据库字段
  -> API 输入校验
  -> API 返回类型
  -> 前端表单状态
  -> 前端展示文案
  -> Activity Log 可读性
```

这条链路跑通后，后面再做更多 Todo 字段会顺很多。

## 2. 创建 Todo 时，优先级默认值是否符合预期

符合预期。

创建 Todo 时，如果不手动修改优先级下拉框，前端默认选择 `medium`，页面展示为：

```text
优先级：中
```

后端和数据库也有同样的兜底：

- API 允许 `priority` 不传
- repository 会使用 `input.priority ?? "medium"`
- 数据库字段本身也有 `DEFAULT 'medium'`

这三个地方看起来有一点重复，但对当前学习阶段是好事。

它们分别保护不同边界：

| 层级       | 保护的问题                       |
| ---------- | -------------------------------- |
| 前端表单   | 用户正常创建时有直观默认值       |
| 后端写入   | API 调用方不传 priority 也能成功 |
| 数据库默认 | 其他写入路径遗漏时仍然有默认值   |

## 3. 编辑 Todo 后，页面展示是否立即刷新

符合预期。

编辑 Todo priority 后，保存会走：

```text
TodoPanel emit saveTodo
  -> ProjectsPage handleSaveTodo
  -> useTodos.saveTodo
  -> PATCH /todos/:id
  -> loadTodos(projectId)
```

保存成功后重新加载 Todo 列表，所以页面展示会回到数据库最新状态。

这个设计比“前端手动改数组里的某一项”更稳。

因为当前项目还在学习阶段，优先选择：

```text
写操作成功后重新读取服务端状态
```

这样更容易避免前端乐观更新带来的状态不一致。

## 4. API 返回的 priority 和页面展示是否一致

一致。

API 返回的是机器友好的枚举字符串：

```text
low / medium / high
```

页面展示的是用户友好的中文文案：

```text
低 / 中 / 高
```

这个分层是合理的：

- API 保持稳定、短小、适合程序处理
- UI 负责翻译成用户能理解的语言

这里的学习点是：

```text
不要把中文展示文案存进数据库。
数据库存业务值，前端做展示映射。
```

## 5. Activity Log 是否能看懂 priority 变更

能看懂。

Todo priority 更新后，Activity Log 的 `changedFields` 里会出现：

```text
priority
```

前端 metadata helper 会把它翻译成：

```text
优先级
```

这样用户看到的是：

```text
变更字段：优先级
```

而不是：

```text
变更字段：priority
```

这说明前面 Activity Log metadata 展示增强的设计是可扩展的。

新增字段时，只要补充一个映射，就能让日志继续保持产品语言。

## 6. 下一阶段我选择什么

下一阶段选择：

```text
A. Todo priority 线上 smoke
```

选择原因：

- 这次改动包含数据库 migration。
- 本地 smoke 已经确认功能链路可以工作。
- 线上环境还需要确认 Railway MySQL 已经有 `Todo.priority` 列。
- Netlify 前端也需要确认已经部署到包含 priority UI 的版本。

所以先做线上 smoke，比马上做 priority 排序 / 筛选更稳。

## 7. 下一步要特别注意什么

这次线上 smoke 最需要注意的是 migration。

如果线上后端已经部署了新代码，但线上数据库还没有执行 migration，可能会出现：

```text
The column `priority` does not exist in the current database.
```

这种错误通常表现为：

- 创建 Todo 返回 500
- Todo 列表加载返回 500
- Railway logs 里出现 Prisma column missing 错误

所以线上 smoke 前要确认：

```text
后端部署成功
数据库 migration 已应用
前端部署成功
```

这三个条件都满足后，再验证页面行为。
