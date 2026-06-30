# Task: 用户级 Activity Log 体验优化 smoke 和复盘

## 背景

你已经完成了用户级 Activity Log 体验优化。

这次优化的核心不是新增接口，而是让“我的最近操作”更顺手：

- 初始进入 `/projects` 不强制请求 `GET /activity-logs`
- 用户手动加载过“我的最近操作”后，再进行 Project / Todo 操作会自动刷新
- idle / empty / error 文案更清楚
- `useUserActivityLogs` 有了明确的 `hasLoadedUserActivityLogs` 语义
- 补了 composable、component、ProjectsPage 页面级测试

现在这张任务要做一次 smoke 和复盘。

---

## 这张任务只练什么

只练三件事：

1. 手动确认“不会首屏自动加载”
2. 手动确认“加载过以后会自动刷新”
3. 复盘这个入口下一步要继续体验优化、上线 smoke，还是进入 metadata 展示

---

## 任务 1：建议 smoke 路径

建议按这个顺序验证：

```text
1. 打开前端
2. 登录
3. 进入 /projects
4. 先不要点击“加载最近操作”
5. 打开 Network，确认没有自动发起 GET /activity-logs
6. 点击“加载最近操作”
7. 确认 GET /activity-logs 正常返回
8. 创建一个 Project 或 Todo
9. 确认“我的最近操作”会自动刷新
10. 编辑一个 Project 或 Todo
11. 确认“我的最近操作”会自动刷新
12. 删除一个 Project 或 Todo
13. 确认“我的最近操作”会自动刷新
14. 确认 idle / empty / error 文案更清楚
```

重点观察：

```text
自动刷新只应该发生在用户已经加载过“我的最近操作”之后。
```

---

## 任务 2：复盘体验边界

请重点想这几个问题：

- 初始不自动加载是否合理？
- 用户加载过以后自动刷新是否自然？
- 自动刷新失败时是否会干扰主操作？
- 用户能否理解“我的最近操作”和 Project 级 Activity Log 的区别？
- 空状态是否能引导用户创建 Project 或 Todo？
- 错误状态是否能引导用户重试？

学习点：

```text
一个附加面板不一定要抢首屏请求。
但当用户主动打开过它之后，它就应该跟随当前页面变化。
```

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-user-activity-log-experience-smoke-retrospective.md
```

建议写这些小标题：

```md
# 用户级 Activity Log 体验优化 smoke 和复盘

## 1. 这次我验证了什么

## 2. 初始不自动加载是否合理

## 3. 加载过以后自动刷新是否自然

## 4. 文案优化是否更清楚

## 5. 当前还剩哪些体验问题

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

最后一节选一个方向。

### A. 用户级 Activity Log 体验优化线上 smoke

适合练：

- 部署这次体验优化
- 在线上确认不会首屏自动请求
- 在线上确认加载过以后自动刷新
- 确认 Netlify + Railway 链路仍然正常

我建议优先选 A。

原因是：

```text
这次改的是线上用户能直接感知的交互行为。
本地 smoke 后，最好尽快做一次线上 smoke。
```

### B. Activity Log metadata 展示

适合继续做：

- 展示变更字段
- 展示 Todo 标题快照
- 展示 dueDate / completed 等变化
- 让日志从“发生了什么”升级为“具体改了什么”

### C. 暂停 Activity Log，进入下一组业务功能

适合在你觉得 Activity Log 当前已经够用时选择。

---

## 验证命令

这张任务只改复盘文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/web-user-activity-log-experience-smoke-retrospective.md`
- [x] 写清楚 smoke 验证路径
- [x] 写清楚初始不自动加载是否合理
- [x] 写清楚加载过以后自动刷新是否自然
- [x] 写清楚文案优化是否更清楚
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 复盘文档：`docs/reviews/web-user-activity-log-experience-smoke-retrospective.md`
- 下一阶段选择：A，用户级 Activity Log 体验优化线上 smoke
- 选择原因：
  - 这次改的是用户能直接感知的交互行为。
  - 本地 smoke 已经确认请求时机和自动刷新边界。
  - 下一步需要确认 Netlify 前端部署后仍然符合这些行为。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-user-activity-log-experience-online-smoke.md
```
