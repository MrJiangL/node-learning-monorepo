# Task: Activity Log 阶段总复盘

## 背景

Activity Log 这条功能线已经走过了一个很完整的闭环。

它不再只是一个后端表，也不只是一个前端面板。

现在它已经覆盖：

- Activity Log 数据模型
- Project / Todo 写入集成
- action / metadata schema
- Project 删除后的快照保留
- Project 级查询 API
- 用户级查询 API
- 数据量和索引解释
- Project 级前端展示
- 用户级前端入口
- 中文 action
- 格式化时间
- metadata 摘要
- changedFields 中文字段名
- 本地 smoke
- 线上 smoke

这张任务不是继续写功能，而是做一次阶段总复盘。

目标是把这段学习沉淀成：

```text
以后你再做“审计日志 / 活动记录 / 操作历史”类功能时，可以复用的方法。
```

---

## 这张任务只练什么

只练三件事：

1. 梳理 Activity Log 从后端到前端的完整路径
2. 总结这条线里真正学到的工程模式
3. 决定下一阶段是继续 Activity Log，还是进入下一组业务功能

---

## 任务 1：创建阶段复盘文档

创建：

```text
docs/reviews/activity-log-stage-retrospective.md
```

建议写这些小标题：

```md
# Activity Log 阶段总复盘

## 1. 这条功能线最终完成了什么

## 2. 后端 Activity Log 是怎么设计的

## 3. 为什么 Project 删除后还需要快照

## 4. action / metadata schema 解决了什么问题

## 5. 查询 API 为什么分 Project 级和用户级

## 6. 前端展示是怎么一步步产品化的

## 7. 线上 smoke 和 Request ID 排障给了我什么经验

## 8. 如果重新做一遍，我会怎么设计

## 9. 当前还可以继续优化什么

## 10. 下一阶段我选择什么
```

---

## 任务 2：建议复盘脉络

可以按这个顺序写：

```text
1. 先记录日志写入：Project / Todo 操作会产生 Activity Log
2. 再记录日志查询：Project 级、用户级两个视角
3. 再记录数据保留：Project 删除后靠 snapshot 读懂历史
4. 再记录 metadata：不只是发生了什么，还要知道具体改了什么
5. 再记录前端展示：message / action / time / metadata / changedFields
6. 最后记录上线验证：本地测试、本地 smoke、线上 smoke
```

学习点：

```text
Activity Log 是一个横切功能。
它会穿过数据模型、业务 service、API、前端 UI、线上排障。
```

---

## 任务 3：重点思考

复盘时重点回答这些问题：

- Activity Log 和普通业务表有什么不同？
- 为什么日志不应该只依赖当前 Project 是否存在？
- 为什么 metadata 需要 schema？
- 为什么 Project 级和用户级查询都需要？
- 为什么前端不能直接展示 JSON metadata？
- 哪些体验优化最有价值？
- 哪些优化现在可以先不做？

---

## 任务 4：选择下一阶段

最后一节选一个方向。

### A. 暂时收束 Activity Log，进入下一组业务功能

适合当前状态。

原因是 Activity Log 已经形成完整闭环，再继续深挖会进入更细的产品打磨。

### B. 继续 Activity Log 深化

适合继续做：

- 展示修改前 / 修改后的值
- 更自然的整句 diff 文案
- Activity Log 筛选 UI
- Activity Log 分页 / 无限滚动

### C. 做一次技术整理

适合继续做：

- 整理 Activity Log 设计文档
- 整理 API examples
- 整理前端展示 helper 设计说明

我建议优先选 A。

原因是：

```text
Activity Log 已经从后端到前端、从本地到线上都闭环了。
现在更值得进入下一组业务功能，继续扩大项目能力边界。
```

---

## 验证命令

这张任务只改复盘文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 `docs/reviews/activity-log-stage-retrospective.md`
- [x] 写清楚 Activity Log 最终完成了什么
- [x] 写清楚后端设计和前端产品化路径
- [x] 写清楚 Project 删除快照、metadata schema、用户级查询的价值
- [x] 写清楚线上 smoke 和排障经验
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-30
- 复盘文档：`docs/reviews/activity-log-stage-retrospective.md`
- 下一阶段选择：A，暂时收束 Activity Log，进入下一组业务功能
- 下一组业务功能：Todo priority 展示和编辑
- 选择原因：
  - Activity Log 已经完成从后端到前端、从本地到线上的完整闭环。
  - 继续深挖会进入更细的产品打磨。
  - Todo priority 能继续练完整业务字段链路，适合作为下一阶段入口。
- 验证结果：
  - `npm run format:check` 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-30-todo-priority-display-edit.md
```
