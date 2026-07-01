# Task: Activity Log metadata 展示增强 smoke 和复盘

## 背景

Activity Log metadata 展示增强已经完成。

这次优化把 changedFields 里的开发者字段名翻译成了用户能读懂的中文文案：

```text
title -> 标题
dueDate -> 截止日期
completed -> 完成状态
name -> 名称
description -> 描述
```

现在 Activity Log 可以从：

```text
Todo：学习 dueDate；变更字段：title、dueDate
```

变成：

```text
Todo：学习 dueDate；变更字段：标题、截止日期
```

这张任务要做一次 smoke 和复盘，确认中文字段名真的让日志更容易读。

---

## 这张任务只练什么

只练三件事：

1. 手动验证 changedFields 是否显示中文字段名
2. 手动验证未知字段是否安全保留原样
3. 复盘下一步是上线 smoke，还是进入下一组业务功能

---

## 任务 1：建议 smoke 路径

建议按这个顺序验证：

```text
1. 打开前端
2. 登录
3. 进入 /projects
4. 选择一个 Project
5. 编辑 Todo 标题
6. 确认 Activity Log 显示“变更字段：标题”
7. 编辑 Todo dueDate
8. 确认 Activity Log 显示“变更字段：截止日期”
9. 标记 Todo 完成
10. 确认 Activity Log 显示“变更字段：完成状态”
11. 编辑 Project 名称或描述
12. 确认 Activity Log 显示“变更字段：名称、描述”
13. 打开“我的最近操作”
14. 确认用户级 Activity Log 里也显示中文字段名
```

重点观察：

```text
中文字段名应该降低理解成本，
但 metadata 摘要仍然只是辅助信息。
```

---

## 任务 2：复盘体验变化

请重点看这些问题：

- `标题 / 截止日期 / 完成状态` 是否比 `title / dueDate / completed` 更自然？
- Project 级和用户级 Activity Log 是否展示一致？
- 中文字段名会不会让日志过长？
- 还有哪些字段需要补映射？
- 未知字段保留原样是否可以接受？

学习点：

```text
字段名是工程契约。
字段文案是产品语言。

前端展示层经常要做这种“小翻译”，
它不改变数据，只改变用户理解数据的方式。
```

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-activity-log-metadata-display-polish-smoke-retrospective.md
```

建议写：

```md
# Activity Log metadata 展示增强 smoke 和复盘

## 1. 这次我验证了什么

## 2. 中文字段名是否更容易理解

## 3. Project 级和用户级展示是否一致

## 4. 未知字段保留原样是否合理

## 5. 当前 Activity Log 是否已经够用

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

最后一节选一个方向。

### A. Activity Log metadata 展示增强线上 smoke

适合练：

- 部署字段名中文化
- 在线上验证 Project 级和用户级 Activity Log 都显示中文字段名
- 确认旧日志仍然安全

我建议优先选 A。

原因是：

```text
这次仍然是用户可见的 UI 文案变化。
本地 smoke 后，最好继续做一次线上 smoke。
```

### B. Activity Log 阶段总复盘

适合练：

- 汇总 Activity Log 从后端到前端的完整路径
- 梳理数据模型、写入、查询、前端展示、线上 smoke
- 决定 Activity Log 是否暂时收束

### C. 进入下一组业务功能

适合在你觉得 Activity Log 当前已经够用时选择。

---

## 验证命令

这张任务只改复盘文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/web-activity-log-metadata-display-polish-smoke-retrospective.md`
- [x] 写清楚 smoke 验证路径
- [x] 写清楚中文字段名是否更容易理解
- [x] 写清楚 Project 级和用户级展示是否一致
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 复盘文档：`docs/reviews/web-activity-log-metadata-display-polish-smoke-retrospective.md`
- 下一阶段选择：A，Activity Log metadata 展示增强线上 smoke
- 选择原因：
  - 这次增强是用户可见的 UI 文案变化。
  - 本地 smoke 已经确认中文字段名更自然。
  - 下一步需要确认 Netlify 最新 bundle 在线上也展示中文字段名。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-web-activity-log-metadata-display-polish-online-smoke.md
```
