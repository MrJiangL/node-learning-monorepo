# Task: Todo dueDate 展示和编辑

## 背景

Project 编辑 / 删除主链路已经完成，并且体验优化也已经通过线上 smoke。

现在前端 Project 工作台已经比较完整：

- Project 创建
- Project 编辑
- Project 删除
- Todo 创建
- Todo 标题编辑
- Todo 完成状态切换
- Todo 删除
- Activity Log 展示

下一步回到 Todo。

后端和 shared 类型里其实已经支持 Todo `dueDate`：

```ts
export type Todo = {
  id: string;
  projectId: string;
  title: string;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
};
```

而且 `UpdateTodoInput` 也支持：

```ts
dueDate?: string | null;
```

但前端现在 TodoPanel 主要展示：

```text
title
completed
```

还没有把 dueDate 展示和编辑接到 UI。

这张任务就补这个能力。

---

## 这张任务只练什么

只练三件事：

1. Todo 列表展示 dueDate
2. Todo 编辑表单支持修改 dueDate
3. Todo 编辑表单支持清空 dueDate

先不要做：

- dueDate 筛选
- dueDate 排序
- 逾期高亮
- 日历组件
- 用户级 Activity Log
- 后端 API 修改

这张任务的边界是：

```text
把已有后端字段接到前端展示和编辑。
```

---

## 任务 1：阅读现有 Todo 前端结构

先看：

```text
apps/web/src/api/todos.ts
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
apps/web/src/pages/ProjectsPage/index.vue
```

先回答自己：

- `Todo` 类型里 dueDate 是什么形状？
- `updateTodo` API client 是否已经能传 dueDate？
- `useTodos.saveTodoTitle` 为什么现在名字只叫 saveTodoTitle？
- TodoPanel 当前编辑态只维护了哪些字段？
- dueDate 应该在哪里格式化展示？

---

## 任务 2：展示 Todo dueDate

修改：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
```

在非编辑态展示 dueDate。

建议展示规则：

```text
todo.dueDate 有值 -> 截止：2026/06/28
todo.dueDate 为 null -> 暂无截止日期
```

第一版可以写一个本地 helper：

```ts
function formatTodoDueDate(dueDate: string | null): string {
  if (!dueDate) {
    return "暂无截止日期";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(dueDate));
}
```

注意：

```text
后端返回的 dueDate 可能是 ISO 字符串。
前端展示时不要直接把原始 ISO 字符串扔给用户看。
```

---

## 任务 3：编辑 Todo 时带上 dueDate

当前 TodoPanel 里编辑 Todo 只编辑 title：

```ts
const editingTodoTitle = ref("");
```

可以增加：

```ts
const editingTodoDueDate = ref("");
```

点击编辑时：

```ts
editingTodoDueDate.value = todo.dueDate ? todo.dueDate.slice(0, 10) : "";
```

因为 `<input type="date">` 需要的是：

```text
YYYY-MM-DD
```

保存时 emit：

```ts
emit("saveTodo", todoId, {
  title,
  dueDate: editingTodoDueDate.value || null
});
```

这里有一个很重要的语义：

```text
undefined 表示不更新 dueDate
null 表示明确清空 dueDate
```

这张任务里用户在编辑表单里清空日期，应当传：

```ts
dueDate: null;
```

---

## 任务 4：重命名 saveTodoTitle 为 saveTodo

现在前端只保存 title，所以名字叫：

```ts
saveTodoTitle;
```

接入 dueDate 后，建议改成：

```ts
saveTodo;
```

涉及：

```text
apps/web/src/pages/ProjectsPage/composables/useTodos.ts
apps/web/src/pages/ProjectsPage/index.vue
apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
```

学习点：

```text
函数名字要跟职责同步演进。
```

如果函数已经保存 title + dueDate，再叫 saveTodoTitle 就会误导后面的维护者。

---

## 任务 5：补测试

至少补：

```text
apps/web/src/pages/ProjectsPage/components/TodoPanel/__tests__/TodoPanel.test.ts
apps/web/src/pages/ProjectsPage/composables/__tests__/useTodos.test.ts
```

建议覆盖：

1. Todo 有 dueDate 时展示格式化日期
2. Todo 没有 dueDate 时展示“暂无截止日期”
3. 点击编辑时 date input 填入 `YYYY-MM-DD`
4. 保存编辑时 emit `saveTodo`，包含 title 和 dueDate
5. 清空 date input 后保存，emit `dueDate: null`
6. `useTodos.saveTodo` 会调用 `updateTodo(todoId, token, { title, dueDate })`

---

## 任务 6：接入 Activity Log 刷新

修改：

```text
apps/web/src/pages/ProjectsPage/index.vue
```

原来保存 Todo title 后会刷新 Activity Log。

改成保存 title + dueDate 后，仍然要刷新：

```ts
async function handleSaveTodo(todoId, input) {
  await saveTodo(selectedProjectId.value, todoId, input);
  await loadActivityLogs(selectedProjectId.value);
}
```

后端 Activity Log 已经记录 `todo.updated`，所以 dueDate 更新也应该能带来更新日志。

---

## 验证命令

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

---

## 完成标准

- [x] Todo 列表展示 dueDate
- [x] dueDate 有值时展示格式化日期
- [x] dueDate 为空时展示“暂无截止日期”
- [x] Todo 编辑表单支持 date input
- [x] 保存 Todo 时能更新 title + dueDate
- [x] 清空 date input 后保存会传 `dueDate: null`
- [x] `saveTodoTitle` 重命名为 `saveTodo`
- [x] 保存 Todo 后仍然刷新 Activity Log
- [x] 补 TodoPanel 测试
- [x] 补 useTodos 测试
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-28
- 更新组件：
  - apps/web/src/pages/ProjectsPage/components/TodoPanel/index.vue
  - apps/web/src/pages/ProjectsPage/components/TodoPanel/**tests**/TodoPanel.test.ts
- 更新 composable：
  - apps/web/src/pages/ProjectsPage/composables/useTodos.ts
  - apps/web/src/pages/ProjectsPage/composables/**tests**/useTodos.test.ts
- 更新页面：
  - apps/web/src/pages/ProjectsPage/index.vue
- 核心行为：
  - Todo 列表展示 dueDate。
  - dueDate 有值时展示为 `截止：YYYY/MM/DD`。
  - dueDate 为空时展示“暂无截止日期”。
  - Todo 编辑表单增加 `input[type="date"]`。
  - 点击编辑时会把后端 ISO dueDate 转成 `YYYY-MM-DD` 填入日期输入框。
  - 保存 Todo 时会 emit `saveTodo`，包含 `title` 和 `dueDate`。
  - 清空日期后保存会传 `dueDate: null`，表示明确清空截止日期。
  - `saveTodoTitle` 重命名为 `saveTodo`，让函数名和职责一致。
  - 保存 Todo 后仍然刷新 Activity Log。
- 验证结果：
  - npm run test -w @learn/web 通过，14 个测试文件、67 个测试
  - npm run typecheck -w @learn/web 通过
  - npm run format:check 通过
  - npm run build -w @learn/web 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-todo-due-date-smoke-retrospective.md
```
