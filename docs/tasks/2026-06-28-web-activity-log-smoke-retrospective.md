# Task: Activity Log 前端展示 smoke 和复盘

## 背景

你已经完成了 Activity Log 前端展示：

- 新增 Activity Log API client
- 新增 `useActivityLogs`
- 新增 `ActivityLogPanel`
- Project 选中后加载活动记录
- Todo 操作后刷新活动记录
- 补了 API / composable / component 测试

现在先不要继续加筛选、分页、时间格式化。

这张任务要做一次轻量 smoke 和复盘：

    Activity Log 真的能帮助用户理解 Project 发生过什么吗？

---

## 这张任务只练什么

只练三件事：

1. 本地或线上手动走一遍 Activity Log 用户路径
2. 记录哪些动作会产生日志
3. 复盘下一步应该继续业务功能，还是优化 Activity Log 体验

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/web-activity-log-smoke-retrospective.md
```

写这些小标题：

```md
# Activity Log 前端展示 smoke 和复盘

## 1. 这次我验证了什么

## 2. Activity Log 面板解决了什么问题

## 3. 创建 Project / Todo 后日志表现是否符合预期

## 4. 更新 / 完成 / 删除 Todo 后日志表现是否符合预期

## 5. idle / loading / empty / error 状态是否清楚

## 6. 当前 Activity Log 展示还缺什么

## 7. 下一阶段我选择什么
```

---

## 任务 2：建议 smoke 路径

建议按这个顺序验证：

```text
1. 打开前端
2. 登录
3. 加载 Project
4. 选择一个 Project
5. 确认 Activity Log 面板出现
6. 创建一个 Todo
7. 确认 Activity Log 里出现 todo.created
8. 标记 Todo 完成
9. 确认 Activity Log 里出现 todo.completed
10. 修改 Todo 标题
11. 确认 Activity Log 里出现 todo.updated
12. 删除 Todo
13. 确认 Activity Log 里出现 todo.deleted
```

如果本地没有数据，可以先创建一个新的 Project 和 Todo。

---

## 任务 3：复盘展示边界

请重点观察：

- 未选择 Project 时提示是否清楚
- 没有日志时是否清楚
- 加载失败时是否能重试
- 日志 message 是否比 action 更适合用户阅读
- `todo.completed` 这种 action 是否更适合给开发者看
- createdAt 原始 ISO 字符串是否需要后续优化

学习点：

```text
第一版先展示原始数据。
复盘后再决定哪些数据要产品化展示。
```

---

## 任务 4：选择下一阶段

最后一节选一个方向：

### A. 优化 Activity Log 体验

适合继续做：

- action 映射成中文
- createdAt 格式化
- 空状态更友好
- 日志按类型加小标签

### B. 继续业务功能

适合继续做：

- Project 编辑 / 删除前端入口
- Todo dueDate 展示和编辑
- 用户设置页

### C. 部署上线和线上 smoke

适合练：

- 把 Activity Log 前端展示部署到 Netlify
- 按 deployment checklist 验证
- 线上 smoke 后复盘

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/web-activity-log-smoke-retrospective.md
- [x] 写清楚 smoke 验证路径
- [x] 写清楚 Activity Log 面板解决的问题
- [x] 写清楚当前展示体验还缺什么
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 复盘文档：docs/reviews/web-activity-log-smoke-retrospective.md
- 下一阶段选择：A，优化 Activity Log 体验
- 选择原因：
  - Activity Log 前端展示第一版已经打通。
  - 当前展示仍偏开发者视角，`action` 是英文枚举，`createdAt` 是原始 ISO 字符串。
  - 下一步做 action 中文化和时间格式化，成本不高但能明显提升产品感。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-activity-log-experience-polish.md
```
