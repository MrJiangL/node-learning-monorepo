# Task: Activity Log metadata 展示 smoke 和复盘

## 背景

你已经完成了 Activity Log metadata 前端展示。

现在 Project 级 Activity Log 和用户级 Activity Log 都能展示：

- message
- metadata 摘要
- 中文 action
- 格式化时间
- 用户级面板里的 Project 快照名

metadata 摘要让 Activity Log 从：

```text
发生了什么
```

更进一步变成：

```text
具体涉及什么对象、哪些字段发生了变化
```

这张任务要做一次 smoke 和复盘，确认 metadata 摘要真的帮助用户理解日志。

---

## 这张任务只练什么

只练三件事：

1. 手动验证 Project 级 Activity Log 是否展示 metadata 摘要
2. 手动验证用户级 Activity Log 是否展示 metadata 摘要
3. 复盘下一步是上线 smoke、继续做更细的 metadata 展示，还是进入下一组业务功能

---

## 任务 1：建议 smoke 路径

建议按这个顺序验证：

```text
1. 打开前端
2. 登录
3. 进入 /projects
4. 选择一个 Project
5. 创建一个 Todo
6. 确认 Project 级 Activity Log 展示 Todo metadata 摘要
7. 编辑 Todo 标题或 dueDate
8. 确认 Project 级 Activity Log 展示 changedFields
9. 点击“我的最近操作”
10. 确认用户级 Activity Log 也展示 metadata 摘要
11. 编辑 Project 名称或描述
12. 确认 Project metadata 摘要展示 Project 名称和 changedFields
13. 确认没有 metadata 的旧日志不会展示 undefined
```

重点观察：

```text
metadata 摘要应该是辅助信息。
message 仍然是主信息。
```

---

## 任务 2：重点复盘

请重点看这些问题：

- metadata 摘要是否真的让日志更容易理解？
- `变更字段：title、dueDate` 这种展示是否足够清楚？
- Project 级和用户级 Activity Log 的 metadata 展示是否一致？
- 没有 metadata 的历史日志是否正常展示？
- metadata 摘要会不会让单条日志显得太拥挤？

学习点：

```text
metadata 是结构化事实。
前端摘要是用户语言。

不要直接把 JSON 扔给用户，
而是把结构化字段翻译成一句可读的补充说明。
```

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-activity-log-metadata-smoke-retrospective.md
```

建议写：

```md
# Activity Log metadata 展示 smoke 和复盘

## 1. 这次我验证了什么

## 2. metadata 摘要解决了什么问题

## 3. Project 级 Activity Log 展示是否清楚

## 4. 用户级 Activity Log 展示是否清楚

## 5. 没有 metadata 的旧日志是否安全

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

最后一节选一个方向。

### A. Activity Log metadata 展示线上 smoke

适合练：

- 部署 metadata 展示
- 在线上验证 Project 级和用户级日志都能展示 metadata 摘要
- 确认旧日志没有 metadata 时不会出现 `undefined`

我建议优先选 A。

原因是：

```text
metadata 展示是用户可见的新 UI 信息。
本地 smoke 后，应该尽快做一次线上 smoke。
```

### B. metadata 展示继续增强

适合继续做：

- 把 `title` 翻译成“标题”
- 把 `dueDate` 翻译成“截止日期”
- 把 `completed` 翻译成“完成状态”
- 做更接近自然语言的变更摘要

### C. 暂停 Activity Log，进入下一组业务功能

适合在 Activity Log 当前已经够用时选择。

---

## 验证命令

这张任务只改复盘文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/web-activity-log-metadata-smoke-retrospective.md`
- [x] 写清楚 smoke 验证路径
- [x] 写清楚 metadata 摘要解决的问题
- [x] 写清楚 Project 级和用户级展示是否清楚
- [x] 写清楚旧日志没有 metadata 时是否安全
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 复盘文档：`docs/reviews/web-activity-log-metadata-smoke-retrospective.md`
- 下一阶段选择：A，Activity Log metadata 展示线上 smoke
- 选择原因：
  - metadata 摘要是用户可见的新 UI 信息。
  - 本地 smoke 已确认 Project 级和用户级展示都可读。
  - 下一步需要在线上确认真实数据和旧数据都展示安全。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-online-smoke.md
```
