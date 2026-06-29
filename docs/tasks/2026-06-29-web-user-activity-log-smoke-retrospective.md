# Task: 用户级 Activity Log 前端入口 smoke 和复盘

## 背景

你已经完成了用户级 Activity Log 前端入口：

- 新增 `fetchUserActivityLogs`
- 新增 `useUserActivityLogs`
- 新增 `UserActivityLogPanel`
- 在 ProjectsPage 里展示“我的最近操作”
- 用户可以不先选择 Project，直接查看自己最近的所有操作

这次前端入口调用的是：

```text
GET /activity-logs
```

它和 Project 级 Activity Log 的区别是：

```text
Project 级：只看某一个 Project 的日志
用户级：看当前登录用户自己的所有日志
```

所以这张任务不是继续写代码，而是做一次 smoke 和复盘，确认这个新入口真的能解决“跨 Project 看最近操作”的问题。

---

## 这张任务只练什么

只练三件事：

1. 手动验证“我的最近操作”是否能正常加载
2. 对比用户级 Activity Log 和 Project 级 Activity Log 的分工
3. 选择下一阶段是部署、体验优化，还是 metadata 展示

---

## 任务 1：建议 smoke 路径

建议按这个顺序验证：

```text
1. 打开前端
2. 登录
3. 进入 /projects
4. 找到“我的最近操作”
5. 点击“加载最近操作”
6. 确认能看到跨 Project 操作记录
7. 创建 / 编辑 / 删除 Project 或 Todo
8. 点击“刷新最近操作”
9. 确认用户级日志能看到新操作
10. 确认删除 Project 后，删除相关记录仍然能看到
11. 确认 action 是中文文案
12. 确认时间是格式化显示
```

如果本地数据太少，可以先创建两个 Project，再分别创建 Todo。

这样更容易看出：

```text
用户级 Activity Log 不依赖当前选中的 Project。
```

---

## 任务 2：重点观察

请重点看这些问题：

- “我的最近操作”是否不需要选中 Project 就能加载？
- Project 级 Activity Log 是否仍然只跟当前 Project 相关？
- 用户级 Activity Log 是否能展示 `projectSnapshotName`？
- Project 删除后，用户级日志是否还容易理解？
- 空状态、加载状态、错误状态是否清楚？
- 手动刷新是否够用，还是后续应该自动刷新？

学习点：

```text
同一份 Activity Log 数据，可以服务两个产品视角：

1. Project 内上下文：帮用户理解当前 Project 发生了什么
2. 用户全局上下文：帮用户回看自己最近做了什么
```

---

## 任务 3：创建复盘文档

创建：

```text
docs/reviews/web-user-activity-log-smoke-retrospective.md
```

建议写这些小标题：

```md
# 用户级 Activity Log 前端入口 smoke 和复盘

## 1. 这次我验证了什么

## 2. 用户级 Activity Log 解决了什么问题

## 3. 它和 Project 级 Activity Log 怎么分工

## 4. Project 删除后日志是否更容易查看

## 5. 当前体验还可以继续怎么优化

## 6. 下一阶段我选择什么
```

---

## 任务 4：选择下一阶段

最后一节选一个方向。

### A. 部署上线和线上 smoke

适合练：

- 部署用户级 Activity Log 前端入口
- 在线上验证 Netlify 前端是否能调用 Railway API
- 确认 `GET /activity-logs` 在线上鉴权正常
- 确认线上日志展示和本地一致

我建议优先选 A。

原因是：

```text
这是一个可见的新前端入口，而且它调用了新加的用户级 API。
先上线 smoke，可以尽早确认前后端线上链路没有问题。
```

### B. 用户级 Activity Log 体验优化

适合继续做：

- action filter UI
- 操作后自动刷新用户级日志
- 更细的 empty / error / loading 文案
- 把“刷新最近操作”做得更顺手

### C. Activity Log metadata 展示

适合继续做：

- 展示变更字段
- 展示 Todo 标题快照
- 展示 Project 快照信息
- 让日志从“发生了什么”升级到“具体改了什么”

---

## 验证命令

这张任务只改复盘文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [ ] 创建 `docs/reviews/web-user-activity-log-smoke-retrospective.md`
- [ ] 写清楚 smoke 验证路径
- [ ] 写清楚用户级 Activity Log 解决的问题
- [ ] 写清楚它和 Project 级 Activity Log 的分工
- [ ] 写清楚 Project 删除后日志是否更容易查看
- [ ] 在 A / B / C 中选择下一阶段
- [ ] npm run format:check 通过

完成后告诉我：

```text
用户级 Activity Log 前端入口 smoke 复盘完成了，我选 X
```
