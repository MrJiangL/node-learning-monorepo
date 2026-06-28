# Activity Log 前端展示 smoke 和复盘

## 1. 这次我验证了什么

这次复盘验证的是 Activity Log 前端展示这条用户路径是否已经具备第一版产品价值。

当前实现已经完成：

- 新增 `fetchActivityLogs(projectId, token)`
- 新增 `useActivityLogs`
- 新增 `ActivityLogPanel`
- 选中 Project 后加载 Activity Log
- 创建 / 更新 / 完成 / 删除 Todo 后刷新 Activity Log
- 覆盖 idle / loading / empty / error / success 状态
- 补了 API client、composable、component 测试

这次复盘里的 smoke 路径是：

```text
1. 打开前端
2. 登录
3. 加载 Project
4. 选择一个 Project
5. 确认 Activity Log 面板出现
6. 创建 Todo
7. 确认出现 todo.created
8. 标记 Todo 完成
9. 确认出现 todo.completed
10. 修改 Todo 标题
11. 确认出现 todo.updated
12. 删除 Todo
13. 确认出现 todo.deleted
```

这里要诚实地区分两件事：

- 代码层面已经通过测试、类型检查、格式检查和 build。
- 如果要确认线上体验，还需要部署后在浏览器里按这条 smoke 路径再走一遍。

所以这次复盘的结论是：

    Activity Log 前端展示的第一版代码链路已经打通。
    真正上线前还需要一次浏览器 smoke。

## 2. Activity Log 面板解决了什么问题

Activity Log 面板解决的是：

    用户能不能看到一个 Project 最近发生了什么。

之前用户只能看到当前状态：

- 当前有哪些 Project
- 当前 Project 下有哪些 Todo
- Todo 当前是否完成

但用户看不到变化过程。

比如：

- 这个 Todo 是刚创建的吗？
- 这个 Todo 是什么时候被完成的？
- 这个 Todo 标题是不是被改过？
- 这个 Project 最近有没有发生操作？

Activity Log 面板把后端已经记录下来的动作展示出来，让 Project 页面从“状态面板”变成“状态 + 历史”。

这是一种很典型的产品体验增强：

```text
业务操作本身是功能。
业务操作留下来的历史，是解释和追踪。
```

第一版 Activity Log 面板至少已经能让用户知道：

    这个 Project 不是静态的，它有一条发生过的事件流。

## 3. 创建 Project / Todo 后日志表现是否符合预期

创建 Project / Todo 后，Activity Log 应该展示对应的创建动作。

当前后端已经支持：

```text
project.created
todo.created
```

前端现在的展示方式是：

- 显示 `message`
- 显示 `action`
- 显示原始 `createdAt`

这对第一版来说是符合预期的。

其中 `message` 对用户最有价值。

比如：

```text
创建了 Todo：学习 Activity Log
```

这比单独显示：

```text
todo.created
```

更接近用户能理解的语言。

所以我现在的判断是：

    第一版可以保留 action，但用户主要应该读 message。

后续如果做体验优化，`action` 更适合被展示成中文标签，而不是原样展示给用户。

例如：

```text
todo.created -> 创建 Todo
project.created -> 创建 Project
```

## 4. 更新 / 完成 / 删除 Todo 后日志表现是否符合预期

Todo 的更新、完成和删除对应这些 action：

```text
todo.updated
todo.completed
todo.deleted
```

当前页面在这些操作成功后会刷新 Activity Log：

- 创建 Todo 后刷新
- 切换 completed 后刷新
- 保存 Todo 标题后刷新
- 删除 Todo 后刷新

这个行为是合理的。

因为 Activity Log 是“当前 Project 发生过什么”的派生数据。

当 Todo 操作成功后，后端会写入新日志，前端需要重新加载日志，才能让用户看到最新事件。

这里有一个很重要的边界：

```text
Todo 操作成功后，才刷新 Activity Log。
Todo 操作失败时，不应该假装日志已经刷新成功。
```

当前实现里，页面是先 `await` Todo 操作，再 `await loadActivityLogs(...)`，这个顺序是对的。

后续可以继续优化：

- 如果刷新日志失败，不要影响 Todo 操作本身成功的事实。
- 可以在 Activity Log 面板里显示“操作成功，但刷新活动记录失败，请重试”。

但第一版先保持简单是合理的。

## 5. idle / loading / empty / error 状态是否清楚

当前 Activity Log 面板已经覆盖了几个关键状态。

### idle

未选择 Project 时显示：

```text
先选择一个 Project，再查看活动记录。
```

这个提示是清楚的。

它告诉用户为什么现在没有日志，而不是让页面空着。

### loading

加载时显示：

```text
正在加载活动记录...
```

这个状态能避免用户误以为页面卡住。

### empty

没有日志时显示：

```text
这个 Project 还没有活动记录。
```

这个状态对新 Project 很重要。

否则用户会分不清：

- 是没有日志
- 还是加载失败
- 还是组件没渲染出来

### error

错误时显示错误信息和重试按钮。

这是必要的。

因为 Activity Log 是一个附加面板，加载失败时用户至少应该能手动重试。

当前状态覆盖是合格的。

下一步更值得优化的是文案细节，而不是状态种类。

## 6. 当前 Activity Log 展示还缺什么

当前第一版能展示日志，但还比较“开发者视角”。

主要缺这些体验优化：

### action 还是英文技术枚举

现在会展示：

```text
todo.created
todo.completed
todo.updated
todo.deleted
```

这对开发者很清楚，但对普通用户不够自然。

后续应该映射成中文：

```text
todo.created -> 创建 Todo
todo.completed -> 完成 Todo
todo.updated -> 更新 Todo
todo.deleted -> 删除 Todo
```

### createdAt 还是原始 ISO 字符串

现在展示的是：

```text
2026-06-28T11:30:00.000Z
```

这适合调试，不适合产品界面。

后续可以格式化成：

```text
2026-06-28 19:30
```

或者更进一步：

```text
刚刚
3 分钟前
昨天 19:30
```

第一版不做复杂时间格式化是对的，但下一步可以先做简单本地格式。

### message 和 action 的层级还可以更清楚

现在 message、action、createdAt 都展示出来，但视觉层级还比较基础。

后续可以让：

- message 做主标题
- 中文 action 做标签
- createdAt 做弱化的辅助信息

### 日志类型没有视觉区分

后续可以按 action 类型做小标签：

- Project
- Todo
- Created
- Updated
- Deleted

但这不是第一版必须做的。

当前阶段最值得做的优化是：

```text
action 中文化 + createdAt 简单格式化
```

这两个改动成本不高，但会明显提升产品感。

## 7. 下一阶段我选择什么

我选择 A：优化 Activity Log 体验。

原因是：

Activity Log 前端展示第一版已经打通了。

但它现在更像“把后端数据原样展示出来”，还不是一个足够产品化的用户界面。

现在继续做一点小优化很划算：

- 把 action 映射成中文
- 把 createdAt 格式化
- 调整日志展示层级
- 让 Activity Log 更像给用户看的动态流，而不是给开发者看的 JSON 摘要

这一步不会大幅扩大功能范围，也不会引入复杂分页、筛选、无限滚动。

它更像是在第一版功能后做一次“产品化打磨”。

所以我下一阶段选择：

```text
A：优化 Activity Log 体验
```

这会把项目从：

```text
能看到活动记录
```

推进到：

```text
用户更容易读懂活动记录。
```
