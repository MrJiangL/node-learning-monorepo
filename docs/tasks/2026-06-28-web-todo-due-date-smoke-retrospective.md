# Task: Todo dueDate smoke 和复盘

## 背景

Todo dueDate 展示和编辑已经完成。

这一轮把后端已有的 Todo `dueDate` 字段接到了前端：

- Todo 列表能展示截止日期
- 没有截止日期时展示“暂无截止日期”
- Todo 编辑表单能修改 dueDate
- Todo 编辑表单能清空 dueDate
- 保存 Todo 后仍然刷新 Activity Log

这张任务先不继续写新功能。

先做一次 smoke 和复盘，确认：

```text
Todo dueDate 是否真的让 Todo 更接近真实任务管理？
```

---

## 任务 1：本地 smoke 路径

建议验证：

```text
1. 打开前端
2. 登录
3. 加载 Project
4. 选择一个 Project
5. 创建一个临时 Todo
6. 确认新 Todo 显示“暂无截止日期”
7. 点击 Todo 编辑
8. 修改 title
9. 选择一个 dueDate
10. 点击保存
11. 确认 Todo 展示“截止：YYYY/MM/DD”
12. 确认 Activity Log 出现 Todo 更新记录
13. 再次点击 Todo 编辑
14. 清空 date input
15. 点击保存
16. 确认 Todo 又显示“暂无截止日期”
17. 确认 Activity Log 再次出现 Todo 更新记录
```

---

## 任务 2：重点观察 dueDate 的语义

这次要特别确认：

```text
date input 为空
```

保存时代表：

```ts
dueDate: null;
```

也就是明确清空截止日期。

这和：

```ts
dueDate: undefined;
```

不同。

`undefined` 更像是：

```text
这次不更新 dueDate。
```

`null` 更像是：

```text
请把 dueDate 清掉。
```

这就是前端表单和后端 PATCH 语义之间很重要的一层约定。

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-todo-due-date-smoke-retrospective.md
```

建议写这些小标题：

```md
# Todo dueDate smoke 和复盘

## 1. 这次我验证了什么

## 2. dueDate 展示解决了什么问题

## 3. date input 编辑体验是否合理

## 4. 清空 dueDate 为什么要传 null

## 5. Activity Log 是否符合预期

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

复盘最后选一个方向。

### A. 部署上线和线上 smoke

适合练：

- 把 Todo dueDate 部署到 Netlify
- 在线上验证 dueDate 展示、更新、清空
- 验证 Activity Log 在线上仍然正常

### B. 用户级 Activity Log

适合补信息架构：

- 不依赖 selectedProjectId 查看用户所有操作
- 可以看到 Project 删除历史
- 可以看到跨 Project 的 Todo 更新记录

### C. Todo dueDate 进阶体验

适合继续打磨 Todo：

- 逾期 Todo 高亮
- 按 dueDate 排序
- dueDate 筛选

---

## 验证命令

这张任务只改文档，所以完成复盘后运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 完成本地 smoke
- [x] 验证 dueDate 有值时展示格式化日期
- [x] 验证 dueDate 为空时展示“暂无截止日期”
- [x] 验证编辑 Todo 可以修改 dueDate
- [x] 验证清空 date input 后保存会清空 dueDate
- [x] 验证 Activity Log 出现 Todo 更新记录
- [x] 创建 docs/reviews/web-todo-due-date-smoke-retrospective.md
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-29
- 复盘文档：docs/reviews/web-todo-due-date-smoke-retrospective.md
- 下一阶段选择：A. 部署上线和线上 smoke
- 选择理由：
  - Todo dueDate 已经进入用户可见的数据流。
  - 用户能展示、修改、清空 dueDate。
  - dueDate 更新仍然会触发 Activity Log。
  - 本地通过后，应该先验证 Netlify 前端、Railway API 和线上数据库链路。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-web-todo-due-date-online-smoke.md
```
