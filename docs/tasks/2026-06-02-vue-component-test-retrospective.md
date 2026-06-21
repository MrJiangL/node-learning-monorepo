# Task: Vue Component Test Retrospective

## 目标

这一张复盘刚完成的前端组件测试。

你现在已经有两个组件测试文件：

```text
apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
```

目标是让你能解释：

```text
组件测试到底在测什么
为什么传 props
为什么断言 emit
为什么不请求后端
DOM 查询应该怎么写才稳定
```

---

## Step 1: 创建复盘文档

创建文件：

```text
docs/reviews/vue-component-test-retrospective.md
```

---

## Step 2: 写测试对象

写入：

```md
# Vue Component Test Retrospective

## 这次测了哪些组件？

ProjectListPanel 测了：

- TODO

TodoPanel 测了：

- TODO
```

提示：

```text
ProjectListPanel 测了 Project 列表渲染和 createProject emit。
TodoPanel 测了 createTodo emit 和 toggleTodo emit。
```

---

## Step 3: 解释 mount

继续写：

```md
## mount 是什么？

TODO: 用自己的话解释。

## 为什么 mount 时要传 props？

TODO: 用自己的话解释。
```

提示：

```text
mount 可以把 Vue 组件渲染成一个测试里的 wrapper。
props 就像父组件传给子组件的数据。
```

---

## Step 4: 解释 DOM 查询

继续写：

```md
## DOM 查询

### wrapper.text() 在测什么？

TODO

### wrapper.get('input[name="projectName"]') 在测什么？

TODO

### 为什么按按钮文字找，比 nth-of-type 更稳定？

TODO
```

提示：

```text
测试越接近用户看到和操作的东西，通常越容易理解。
nth-of-type 依赖按钮位置，组件多加一个按钮就可能坏。
```

---

## Step 5: 解释事件断言

继续写：

```md
## emitted

### wrapper.emitted("createProject") 在测什么？

TODO

### 为什么组件测试只断言 emit，而不是断言 API 调用？

TODO
```

提示：

```text
ProjectListPanel / TodoPanel 是子组件。
它们的责任是把用户操作转换成事件。
真正调用 API 的逻辑在 composable。
```

---

## Step 6: 运行验证

写完后运行：

```bash
npm run format
npm run format:check
npm run test -w @learn/web
```

---

## 完成后告诉我

完成后直接说：

```text
Vue 组件测试复盘完成了
```

我会帮你检查理解，并安排下一张 `useProjects / useTodos` composable 测试任务。
