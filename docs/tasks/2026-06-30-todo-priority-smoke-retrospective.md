# Task: Todo priority smoke 和复盘

## 背景

Todo priority 展示和编辑已经完成。

当前已经打通：

- 数据库字段：`Todo.priority`
- shared 类型：`TodoPriority`
- API 创建和更新
- 前端创建表单
- 前端编辑表单
- Todo 列表中文展示
- Activity Log changedFields 中文展示

下一步不急着加排序 / 筛选，先做一次 smoke 和复盘。

这一步的价值是确认：

```text
真实页面 + 真实 API + 真实数据库
```

是否真的按预期协同工作。

---

## Smoke 路径

### 1. 打开前端

本地前端：

```bash
npm run dev -w @learn/web
```

本地后端：

```bash
npm run dev -w @learn/api
```

打开：

```text
http://localhost:5173/projects
```

### 2. 登录测试账号

使用你当前本地已有的测试账号登录。

如果你不确定账号，可以先用注册页新建一个本地测试账号。

### 3. 选择一个 Project

进入 `/projects` 后：

- 如果已有 Project，选择一个
- 如果没有 Project，先创建一个

### 4. 创建 high priority Todo

创建 Todo：

```text
title: High priority smoke todo
priority: 高
```

预期：

- 创建成功
- Todo 列表出现该 Todo
- 列表中显示 `优先级：高`

### 5. 编辑为 low priority

点击该 Todo 的“编辑”：

```text
priority: 低
```

保存后预期：

- Todo 仍然存在
- 列表显示 `优先级：低`

### 6. 创建默认 priority Todo

再创建一条 Todo，不手动修改优先级下拉框。

预期：

- 创建成功
- 默认显示 `优先级：中`

### 7. 检查 Activity Log

如果页面当前 Project 的 Activity Log 面板已经加载：

- 创建 Todo 应该出现 `创建 Todo`
- 修改 priority 应该出现 `更新 Todo`
- metadata 里变更字段应该显示 `优先级`

如果当前面板没有自动加载，可以点击加载或重新选择 Project。

---

## 复盘要回答的问题

完成 smoke 后，记录到：

```text
docs/reviews/todo-priority-smoke-retrospective.md
```

建议回答：

1. 创建 Todo 时，优先级默认值是否符合预期？
2. 编辑 Todo 后，页面展示是否立即刷新？
3. API 返回的 priority 和页面展示是否一致？
4. Activity Log 是否能看懂 priority 变更？
5. 这个字段下一步更适合做排序、筛选，还是先进入下一组业务功能？

---

## 我建议你 smoke 后选择

我建议选 A。

### A. Todo priority 线上 smoke

先部署并在线上验证 priority。

适合当前节奏，因为这次改动包含数据库 migration。

### B. Todo priority 排序 / 筛选

继续增强 priority 的产品能力。

适合确认线上没问题之后再做。

### C. 进入下一组业务功能

暂时不继续扩 Todo，换一个业务模块。

适合你想保持功能面推进速度时选择。

---

## 完成标准

- [x] 本地创建 high priority Todo 成功
- [x] 本地编辑 high -> low 成功
- [x] 默认创建 Todo 显示 medium / 中
- [x] Activity Log 能看懂 priority 变更
- [x] 已写复盘记录
- [x] 已选择下一阶段

完成后告诉我：

```text
Todo priority smoke 复盘完成了，我选 A
```

---

## 完成记录

- 完成时间：2026-07-01
- 复盘文档：`docs/reviews/todo-priority-smoke-retrospective.md`
- 本地 smoke 结论：
  - high priority Todo 可以创建并展示为 `优先级：高`
  - 编辑 high -> low 后，列表可以刷新并展示为 `优先级：低`
  - 不手动选择优先级时，默认展示为 `优先级：中`
  - Activity Log 可以读懂 priority 变更，`priority` 字段显示为 `优先级`
- 下一阶段选择：
  - A. Todo priority 线上 smoke
- 选择原因：
  - 这次改动包含数据库 migration、后端 API 和前端 UI。
  - 本地 smoke 已经确认功能链路可用。
  - 下一步应该先确认线上 Netlify / Railway / MySQL 的真实链路也可用，再考虑 priority 排序或筛选。

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-07-01-todo-priority-online-smoke.md
```
