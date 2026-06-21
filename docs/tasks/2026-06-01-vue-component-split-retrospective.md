# Task: Vue Component Split Retrospective

## 目标

这一张不写功能，专门复盘这两次组件拆分：

```text
ProjectListPanel
TodoPanel
```

你现在已经接触到 Vue 组件协作里非常核心的模式：

```text
父组件 -> props -> 子组件
子组件 -> emit -> 父组件
```

这一张的目标是把它讲清楚：

```text
什么状态放父组件？
什么状态放子组件？
什么时候传 props？
什么时候用 emit？
为什么子组件不直接调用 API？
```

---

## 你会练到什么

- 复盘 `props` 的作用
- 复盘 `emit` 的作用
- 区分业务状态和 UI 局部状态
- 区分展示组件和业务容器组件
- 为下一阶段 composables 做准备

---

## Step 1: 创建复盘文档

创建：

```text
docs/reviews/vue-component-split-retrospective.md
```

写入这个结构：

```md
# Vue Component Split Retrospective

## 1. 我拆出了哪些组件

## 2. props 是什么

## 3. emit 是什么

## 4. ProjectListPanel 的状态归属

## 5. TodoPanel 的状态归属

## 6. 父组件 ProjectsPage 现在负责什么

## 7. 我现在对组件拆分的理解

## 8. 下一阶段我想练什么
```

---

## Step 2: 写“我拆出了哪些组件”

在第 1 节写：

```md
## 1. 我拆出了哪些组件

- `ProjectListPanel`：负责 Project 区域的展示、创建表单、Project 列表和选择按钮。
- `TodoPanel`：负责 Todo 区域的展示、创建表单、编辑框、完成状态按钮和删除按钮。
- `ProjectsPage`：保留业务状态、API 调用、token 读取和路由跳转。
```

---

## Step 3: 解释 props

在第 2 节用你自己的话解释：

```md
## 2. props 是什么

props 是父组件传给子组件的数据。

在这次拆分里：

- `ProjectListPanel` 通过 props 接收 `projectListState` 和 `selectedProjectId`。
- `TodoPanel` 通过 props 接收 `selectedProjectId` 和 `todoListState`。

我的理解：

- 子组件只读 props，不应该直接修改 props。
- 如果子组件想改变父组件的数据，应该 emit 一个事件，让父组件决定怎么改。
```

---

## Step 4: 解释 emit

在第 3 节写：

```md
## 3. emit 是什么

emit 是子组件通知父组件“用户做了某件事”。

在这次拆分里：

- `ProjectListPanel` emit `loadProjects`，父组件去加载 Project。
- `ProjectListPanel` emit `createProject`，父组件去调用创建 Project API。
- `ProjectListPanel` emit `selectProject`，父组件保存选中的 Project 并加载 Todo。
- `TodoPanel` emit `createTodo`，父组件去调用创建 Todo API。
- `TodoPanel` emit `toggleTodo`，父组件去调用更新 Todo API。
- `TodoPanel` emit `saveTodoTitle`，父组件去调用更新 Todo API。
- `TodoPanel` emit `deleteTodo`，父组件去调用删除 Todo API。

我的理解：

- emit 不等于直接修改数据。
- emit 更像是在告诉父组件：“用户点击了按钮，请你处理一下。”
```

---

## Step 5: 分析 ProjectListPanel 的状态归属

在第 4 节写：

```md
## 4. ProjectListPanel 的状态归属

放在子组件里的状态：

- `projectName`
- `projectDescription`

原因：

- 这两个状态只服务于 Project 创建表单。
- 父组件不需要知道用户输入过程，只需要知道最终提交的结果。

放在父组件里的状态：

- `projectListState`
- `selectedProjectId`

原因：

- `projectListState` 来自后端 API，是业务数据。
- `selectedProjectId` 会影响 Todo 列表加载，不只属于 ProjectListPanel。
```

---

## Step 6: 分析 TodoPanel 的状态归属

在第 5 节写：

```md
## 5. TodoPanel 的状态归属

放在子组件里的状态：

- `todoTitle`
- `editingTodoId`
- `editingTodoTitle`

原因：

- `todoTitle` 只服务于 Todo 创建输入框。
- `editingTodoId` 和 `editingTodoTitle` 只影响 TodoPanel 内部编辑 UI。
- 父组件不需要知道用户正在输入什么，只需要知道用户点击保存后的结果。

放在父组件里的状态：

- `todoListState`
- `selectedProjectId`

原因：

- `todoListState` 是后端返回的业务数据。
- `selectedProjectId` 决定 Todo 属于哪个 Project。
```

---

## Step 7: 总结 ProjectsPage 的职责

在第 6 节写：

```md
## 6. 父组件 ProjectsPage 现在负责什么

`ProjectsPage` 现在更像一个业务容器组件。

它负责：

- 读取 token
- 调用 Project API
- 调用 Todo API
- 保存 Project 列表状态
- 保存 Todo 列表状态
- 保存当前选中的 Project id
- 处理退出登录
- 把数据通过 props 传给子组件
- 响应子组件 emit 出来的事件
```

---

## Step 8: 写自己的理解

在第 7 节写 3 到 5 句话。

可以参考：

```md
## 7. 我现在对组件拆分的理解

我现在理解组件拆分不是简单地复制粘贴模板。
拆组件时要先判断状态属于谁。
如果状态会影响多个区域，通常应该留在父组件。
如果状态只影响一个输入框或一个局部 UI，可以放在子组件。
子组件不要直接调用 API，而是通过 emit 把用户意图告诉父组件。
```

---

## Step 9: 选择下一阶段方向

在第 8 节写：

```md
## 8. 下一阶段我想练什么

我选择：A / B

A. composables：把 ProjectsPage 里的业务逻辑抽成 `useProjects` / `useTodos`
B. 前端组件测试：给 ProjectListPanel / TodoPanel 写测试
```

我的建议：

```text
优先选 A：composables
```

原因是你刚拆完组件，下一步最自然就是把父组件里越来越多的业务逻辑也整理出去。

---

## Step 10: 跑格式检查

完成后运行：

```bash
npm run format
npm run format:check
```

---

## 完成后告诉我

完成后你直接说：

```text
Vue 组件拆分复盘完成了
```

我会帮你：

- 检查复盘理解有没有偏差
- 帮你补齐遗漏点
- 更新任务索引
- 根据你的选择创建下一张任务卡
