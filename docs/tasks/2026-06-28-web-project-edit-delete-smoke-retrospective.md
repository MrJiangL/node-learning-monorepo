# Task: Project 编辑删除 smoke 和复盘

## 背景

你已经完成了 Project 编辑和删除前端入口：

- Project API client 支持 PATCH / DELETE
- useProjects 支持保存 / 删除
- ProjectListPanel 支持 inline edit
- ProjectListPanel 支持删除前确认
- 删除当前选中 Project 后清空 selectedProjectId
- Todo / Activity Log 状态会回到 idle

这张任务先不继续加新功能。

先做一次 smoke 和复盘：

```text
Project 编辑 / 删除是否真的让 Project 工作台更完整？
```

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/web-project-edit-delete-smoke-retrospective.md
```

写这些小标题：

```md
# Project 编辑删除 smoke 和复盘

## 1. 这次我验证了什么

## 2. Project 编辑入口解决了什么问题

## 3. Project 删除入口解决了什么问题

## 4. 删除当前选中 Project 后页面状态是否合理

## 5. Activity Log 是否能记录 project.updated / project.deleted

## 6. 下一阶段我选择什么
```

---

## 任务 2：建议 smoke 路径

建议验证：

```text
1. 打开前端
2. 登录
3. 加载 Project
4. 创建一个临时 Project
5. 点击编辑
6. 修改 Project name / description
7. 保存
8. 确认列表展示新名称
9. 选择这个 Project
10. 查看 Activity Log 是否出现“更新 Project”
11. 点击删除
12. 取消删除，确认 Project 仍然存在
13. 再次点击删除并确认
14. 确认 Project 从列表消失
15. 如果删除的是当前选中 Project，确认 Todo / Activity Log 回到未选择状态
```

---

## 任务 3：选择下一阶段

最后一节选一个方向：

### A. 部署上线和线上 smoke

适合练：

- 把 Project 编辑 / 删除部署到 Netlify
- 在线上验证 project.updated / project.deleted
- 用 deployment checklist 收口

### B. 继续业务功能

适合继续做：

- Todo dueDate 展示和编辑
- Project 删除后的 Activity Log 历史查看
- 用户设置页

### C. 体验打磨

适合继续做：

- 删除确认从 `confirm` 改成页面内提示
- 编辑状态样式优化
- 保存中 loading 状态

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/web-project-edit-delete-smoke-retrospective.md
- [x] 写清楚编辑入口验证结果
- [x] 写清楚删除入口验证结果
- [x] 写清楚删除当前选中 Project 后状态是否合理
- [x] 写清楚 Activity Log 是否记录 project.updated / project.deleted
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 复盘文档：docs/reviews/web-project-edit-delete-smoke-retrospective.md
- 下一阶段选择：A. 部署上线和线上 smoke
- 选择理由：
  - Project 编辑 / 删除是用户可见的数据变更功能。
  - 本地测试通过之后，还需要确认 Netlify 前端、Railway API、线上数据库和 Activity Log 在线上链路里真实可用。
  - 这一步可以继续练 deployment checklist、线上 smoke 和 Request ID 排障闭环。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete-online-smoke.md
```
