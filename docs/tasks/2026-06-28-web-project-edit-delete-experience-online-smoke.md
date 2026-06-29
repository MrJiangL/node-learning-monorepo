# Task: Project 编辑删除体验优化线上 smoke

## 背景

Project 编辑删除体验优化已经完成，并且已经做过本地 smoke 和复盘。

这一轮优化包括：

- 删除确认从浏览器 `confirm` 改成页面内确认
- 保存 Project 时显示“保存中...”
- 删除 Project 时显示“删除中...”
- 保存失败时保留编辑态和用户输入
- 删除按钮和确认删除按钮使用危险操作样式

现在要做线上 smoke。

这张任务的重点不是继续写代码，而是验证：

```text
体验优化后的 Project 编辑 / 删除交互，在线上真实环境里也能正常工作。
```

线上环境仍然是：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

---

## 这张任务只练什么

只练线上验证：

1. 确认 Netlify 已部署最新前端版本
2. 在线上验证页面内删除确认
3. 在线上验证取消删除不会误删
4. 在线上验证确认删除能删除 Project
5. 在线上观察保存中 / 删除中状态
6. 如失败，用 `X-Request-Id` 查 Railway logs

先不要继续加：

- Todo dueDate
- 用户级 Activity Log
- Project 删除 undo
- 自定义 modal

---

## 任务 1：部署前检查

部署前确认这组命令已经通过：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

然后对照：

```text
docs/reviews/deployment-stability-checklist.md
```

重点确认：

- 本次部署内容是 Project 编辑 / 删除体验优化
- Netlify 连接的是正确 Railway API
- 如果失败，知道从浏览器 Network 找 `X-Request-Id`
- 如果线上交互不符合预期，知道如何判断是不是旧版本缓存

---

## 任务 2：确认线上版本已更新

打开：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

确认：

- 能登录
- 能进入 `/projects`
- Project 列表能加载
- Project item 上仍然有“编辑”和“删除”
- 点击“删除”后出现页面内确认区，而不是浏览器原生 confirm

如果仍然出现浏览器 confirm，优先怀疑：

```text
Netlify 没部署到最新版本
浏览器缓存旧资源
当前访问的不是正确站点
```

---

## 任务 3：线上编辑体验 smoke

建议创建一个临时 Project。

流程：

```text
1. 登录线上前端
2. 创建一个临时 Project
3. 点击编辑
4. 修改 Project name / description
5. 点击保存
6. 观察是否出现“保存中...”
7. 保存成功后确认退出编辑态
8. 确认 Project 列表展示新名称
9. 确认 Activity Log 符合预期
```

注意：

```text
如果网络很快，“保存中...”可能一闪而过。
这不一定是 bug。
```

如果想更明显观察 loading，可以在浏览器 DevTools Network 里调成 Slow 3G。

---

## 任务 4：线上删除取消 smoke

流程：

```text
1. 找到临时 Project
2. 点击删除
3. 确认页面内出现“确定删除这个 Project 吗？”
4. 点击取消删除
5. 确认确认区消失
6. 确认 Project 仍然存在
7. 确认 Todo / Activity Log 没有被错误清空
```

这里重点看：

```text
取消删除必须是纯 UI 状态变化，不能造成数据变更。
```

---

## 任务 5：线上删除确认 smoke

流程：

```text
1. 再次点击临时 Project 的删除
2. 点击确认删除
3. 观察是否出现“删除中...”
4. 确认 Project 从列表消失
5. 如果删除的是当前选中 Project，确认 Todo 回到未选择状态
6. 如果删除的是当前选中 Project，确认 Activity Log 回到未选择状态
```

同样，如果网络很快，“删除中...”可能一闪而过。

如果要稳定观察，可以使用 DevTools Network throttling。

---

## 任务 6：如果线上失败，怎么查

如果编辑或删除失败，按这个顺序查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到 PATCH /projects/:id 或 DELETE /projects/:id
4. 看 status code
5. 看 response body
6. 看 response headers 里的 X-Request-Id
7. 去 Railway logs 搜同一个 requestId
8. 判断是前端参数、鉴权、后端异常、数据库异常，还是部署版本问题
```

常见判断：

| 现象             | 优先怀疑                                    |
| ---------------- | ------------------------------------------- |
| 页面还是 confirm | 前端线上版本未更新或缓存旧资源              |
| 没有“保存中...”  | 请求太快，先用 Network throttling 观察      |
| 401              | 登录态过期或 Authorization header 没带上    |
| 404              | Project 已被删除或 projectId 不存在         |
| 500              | 后端异常，用 `X-Request-Id` 查 Railway logs |
| CORS error       | 后端 CORS origin 没包含当前 Netlify 域名    |

---

## 任务 7：创建线上 smoke 复盘

创建：

```text
docs/reviews/web-project-edit-delete-experience-online-smoke.md
```

建议写这些小标题：

```md
# Project 编辑删除体验优化线上 smoke

## 1. 这次线上验证了什么

## 2. 页面内删除确认在线上是否正常

## 3. 取消删除在线上是否正常

## 4. 确认删除在线上是否正常

## 5. 保存中 / 删除中状态是否符合预期

## 6. 如果失败，我看到了什么 requestId

## 7. 下一步还要优化什么
```

---

## 验证命令

本地保留这组结果：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

线上 smoke 以浏览器实际验证为准。

---

## 完成标准

- [x] Netlify 已部署体验优化后的前端版本
- [x] 线上能登录并进入 `/projects`
- [x] 点击删除后出现页面内确认区
- [x] 取消删除后 Project 仍然存在
- [x] 确认删除后 Project 从列表消失
- [x] 编辑保存后 Project 名称 / 描述更新
- [x] 保存中 / 删除中状态符合预期
- [x] 删除当前选中 Project 后 Todo / Activity Log 状态合理
- [x] 如失败，记录 `X-Request-Id`
- [x] 创建 docs/reviews/web-project-edit-delete-experience-online-smoke.md

## 完成记录

- 完成时间：2026-06-28
- 线上地址：https://scintillating-pavlova-dc76e0.netlify.app/projects
- 复盘文档：docs/reviews/web-project-edit-delete-experience-online-smoke.md
- 线上 smoke 结果：
  - 页面内删除确认在线上可用。
  - 取消删除不会误删 Project。
  - 确认删除能删除 Project。
  - 编辑保存后 Project 名称 / 描述能更新。
  - 保存中 / 删除中状态符合当前阶段预期。
  - 删除当前选中 Project 后，Todo / Activity Log 状态合理。
  - 本次没有记录到需要排查的 `X-Request-Id`。
- 下一步建议：
  - 进入 Todo dueDate 展示和编辑。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-todo-due-date-display-edit.md
```
