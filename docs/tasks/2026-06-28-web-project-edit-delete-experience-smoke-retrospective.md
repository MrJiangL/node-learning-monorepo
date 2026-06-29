# Task: Project 编辑删除体验优化 smoke 和复盘

## 背景

Project 编辑删除体验优化已经完成。

这一轮不是新增业务能力，而是把已有 Project 编辑 / 删除入口从“能用”往“更像产品”推进了一步：

- 删除确认从浏览器 `confirm` 改成页面内确认
- 保存 Project 时有 saving 状态
- 删除 Project 时有 deleting 状态
- 保存失败时保留编辑态和用户输入
- 删除按钮有更明确的危险操作样式
- ProjectListPanel 补了对应组件测试

这张任务先不继续写代码。

先做一次 smoke 和复盘，确认：

```text
体验优化有没有真的降低误操作和失败成本？
```

---

## 任务 1：本地 smoke 路径

建议验证：

```text
1. 打开前端
2. 登录
3. 加载 Project
4. 创建一个临时 Project
5. 点击编辑
6. 修改 Project name / description
7. 点击保存
8. 观察保存过程中是否出现“保存中...”
9. 保存成功后确认退出编辑态
10. 再次点击删除
11. 确认页面内出现“确定删除这个 Project 吗？”
12. 点击取消删除，确认 Project 仍然存在
13. 再次点击删除
14. 点击确认删除
15. 观察删除过程中是否出现“删除中...”
16. 确认 Project 从列表消失
17. 如果删除的是当前选中 Project，确认 Todo / Activity Log 回到未选择状态
```

---

## 任务 2：重点观察保存失败体验

如果方便，可以临时制造一个失败场景，例如：

```text
断开后端服务
或者让 token 失效
或者在浏览器 Network 里模拟离线
```

然后验证：

```text
1. 点击编辑
2. 输入新的 name / description
3. 点击保存
4. 保存失败后仍然停留在编辑态
5. 刚刚输入的内容没有丢
6. 页面能看到错误提示
```

这一步很重要。

因为用户真正感知体验好坏，往往不是在成功路径，而是在失败路径：

```text
失败了，但我没有白填。
```

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-project-edit-delete-experience-smoke-retrospective.md
```

建议写这些小标题：

```md
# Project 编辑删除体验优化 smoke 和复盘

## 1. 这次我验证了什么

## 2. 页面内删除确认比 confirm 好在哪里

## 3. saving / deleting 状态解决了什么问题

## 4. 保存失败保留输入为什么重要

## 5. 当前体验还可以继续怎么优化

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

复盘最后选一个方向。

### A. 部署上线和线上 smoke

适合练：

- 把体验优化部署到 Netlify
- 在线上验证页面内删除确认、saving / deleting 状态
- 确认线上没有新交互回归

### B. 继续业务功能：Todo dueDate 展示和编辑

适合继续补业务完整性：

- Todo 展示 dueDate
- Todo 编辑 dueDate
- 继续练表单输入和 API 更新

### C. 用户级 Activity Log

适合解决现在 Project 删除日志不容易查看的问题：

- 做一个不依赖 selectedProjectId 的用户级 Activity Log
- 可以看到 Project 删除历史
- 继续练列表查询和产品信息架构

---

## 验证命令

这张任务只改文档，所以完成复盘后运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 完成本地 smoke
- [x] 验证页面内删除确认
- [x] 验证取消删除不会误删
- [x] 验证确认删除能删除 Project
- [x] 验证保存中 / 删除中状态
- [x] 验证保存失败保留输入
- [x] 创建 docs/reviews/web-project-edit-delete-experience-smoke-retrospective.md
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 复盘文档：docs/reviews/web-project-edit-delete-experience-smoke-retrospective.md
- 下一阶段选择：A. 部署上线和线上 smoke
- 选择理由：
  - 这轮优化改的是 Project 编辑 / 删除的关键用户交互。
  - 虽然没有改后端 API，但它影响线上真实数据操作体验。
  - 页面内删除确认、saving / deleting 状态、保存失败保留输入，都应该在线上验证一次。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete-experience-online-smoke.md
```
