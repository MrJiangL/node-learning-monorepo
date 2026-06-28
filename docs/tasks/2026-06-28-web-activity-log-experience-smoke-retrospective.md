# Task: Activity Log 体验优化 smoke 和复盘

## 背景

你已经完成了 Activity Log 体验优化：

- action 从英文枚举变成中文文案
- createdAt 从 ISO 字符串变成更容易读的本地时间
- `<time datetime>` 仍保留原始 ISO 值
- 补了 helper 测试和组件测试

这张任务先不要继续加新功能。

先做一次轻量复盘：

```text
Activity Log 现在是不是更像给用户看的动态流？
```

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/web-activity-log-experience-smoke-retrospective.md
```

写这些小标题：

```md
# Activity Log 体验优化 smoke 和复盘

## 1. 这次我优化了什么

## 2. 中文 action 解决了什么问题

## 3. 时间格式化解决了什么问题

## 4. 为什么 datetime 仍然保留原始 ISO

## 5. 当前 Activity Log 还缺什么

## 6. 下一阶段我选择什么
```

---

## 任务 2：建议 smoke 路径

建议验证：

```text
1. 登录前端
2. 选择一个 Project
3. 创建 Todo
4. 查看 Activity Log
5. 确认 action 显示“创建 Todo”
6. 标记 Todo 完成
7. 确认 action 显示“完成 Todo”
8. 确认时间不再是 2026-xx-xxTxx:xx:xx.000Z
```

---

## 任务 3：选择下一阶段

最后一节选一个方向：

### A. 继续业务功能

适合继续做：

- Project 编辑 / 删除前端入口
- Todo dueDate 展示和编辑
- 用户设置页

### B. 部署上线和线上 smoke

适合练：

- 把 Activity Log 前端展示部署到 Netlify
- 按 deployment checklist 验证
- 线上 smoke 后复盘

### C. 继续 Activity Log 进阶

适合继续做：

- action 筛选
- 分页 UI
- 按日志类型加标签颜色
- 解析 metadata 做更细描述

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/web-activity-log-experience-smoke-retrospective.md
- [x] 写清楚中文 action 的价值
- [x] 写清楚时间格式化的价值
- [x] 写清楚为什么保留 datetime 原始值
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 复盘文档：docs/reviews/web-activity-log-experience-smoke-retrospective.md
- 下一阶段选择：B，部署上线和线上 smoke
- 选择原因：
  - Activity Log 已经完成“能展示”和“更好读”两层前端体验。
  - 下一步更值得用部署稳定性 checklist 验证这个真实前端功能在线上是否可用。
  - 线上 smoke 能确认 Netlify 前端、Railway API、CORS、token、数据库和 Activity Log 展示链路是否整体正常。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-activity-log-online-smoke.md
```
