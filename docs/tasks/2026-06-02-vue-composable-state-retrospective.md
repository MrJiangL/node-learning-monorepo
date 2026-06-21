# Task: Vue Composable State Retrospective

## 目标

你已经连续完成了几步前端拆分：

```text
ProjectListPanel
TodoPanel
useProjects
useTodos
ProjectListPanel / TodoPanel 组件测试
```

这一张不写新功能，专门做复盘。

目标是让你能用自己的话解释：

```text
什么状态应该放在页面组件
什么状态应该放在 composable
什么状态应该放在子组件
组件测试为什么主要测 props 和 emit
```

如果这几个边界想清楚，后面继续做前端会轻松很多。

---

## 你会练到什么

- Vue 页面拆分后的职责边界
- `props down, events up` 的实际含义
- composable 和 component 的区别
- 为什么测试子组件时不测 API
- 如何判断一段逻辑应该往哪里放

---

## Step 1: 创建复盘文档

创建文件：

```text
docs/reviews/vue-composable-state-retrospective.md
```

---

## Step 2: 写“当前结构图”

在文档里写：

```md
# Vue Composable State Retrospective

## 当前结构

ProjectsPage 现在负责：

- TODO: 写出页面组件现在负责的事情

ProjectListPanel 现在负责：

- TODO: 写出 ProjectListPanel 现在负责的事情

TodoPanel 现在负责：

- TODO: 写出 TodoPanel 现在负责的事情

useProjects 现在负责：

- TODO: 写出 useProjects 现在负责的事情

useTodos 现在负责：

- TODO: 写出 useTodos 现在负责的事情
```

提示：

```text
页面组件通常负责“把几块东西接起来”。
子组件通常负责“展示 + 收集用户输入 + emit 事件”。
composable 通常负责“可复用状态 + 业务动作”。
```

---

## Step 3: 回答页面状态问题

继续写：

```md
## 页面状态

### selectedProjectId 为什么还留在 ProjectsPage？

TODO: 用自己的话解释。

### 如果把 selectedProjectId 放进 useTodos，会有什么问题？

TODO: 用自己的话解释。
```

提示：

```text
selectedProjectId 不只是 Todo 的状态。
它同时影响 ProjectListPanel 的“已选择”按钮状态，
也影响 TodoPanel 是否显示创建表单。
```

---

## Step 4: 回答 composable 问题

继续写：

```md
## Composable

### useProjects 为什么适合管理 projectListState？

TODO: 用自己的话解释。

### useTodos 为什么每个动作都需要 projectId？

TODO: 用自己的话解释。

### 创建、更新、删除 Todo 后为什么重新 loadTodos？

TODO: 用自己的话解释。
```

提示：

```text
useProjects / useTodos 的重点不是“少写几行代码”。
重点是把 API 请求、token 检查、错误状态、重新加载列表放在同一个业务模块里。
```

---

## Step 5: 回答组件测试问题

继续写：

```md
## 组件测试

### ProjectListPanel 测试为什么不请求后端？

TODO: 用自己的话解释。

### TodoPanel 测试为什么断言 emit，而不是断言数据库变化？

TODO: 用自己的话解释。

### wrapper.text() 和 wrapper.emitted() 分别在验证什么？

TODO: 用自己的话解释。
```

提示：

```text
组件测试关注组件自己的责任。
API 请求和数据库变化属于 composable、service 或后端测试的责任。
```

---

## Step 6: 写一个判断规则

最后写一个你自己的判断规则：

```md
## 我的判断规则

以后我遇到一段 Vue 逻辑时，可以这样判断放哪里：

1. 如果这段逻辑是 TODO，就放在 TODO。
2. 如果这段逻辑是 TODO，就放在 TODO。
3. 如果这段逻辑是 TODO，就放在 TODO。
```

你可以参考这个方向，但要用自己的话写：

```text
只影响一个子组件内部 UI 的状态，放子组件。
跨多个子组件共享的页面选择状态，放页面。
和某个业务资源 API 强相关的状态和动作，放 composable。
```

---

## Step 7: 自测

这张不需要写代码测试。

但你写完文档后跑一下格式化：

```bash
npm run format
npm run format:check
```

---

## 完成后告诉我

你完成后直接说：

```text
Vue composable 状态复盘完成了
```

我会帮你：

```text
看你的理解有没有偏差
补充容易混淆的点
更新任务索引
给下一张任务卡
```
