# Task: Project 编辑删除线上 smoke

## 背景

Project 编辑删除入口已经完成，本地测试、类型检查、格式检查和构建都已经通过。

上一张 smoke 复盘也已经确认：

- Project 编辑入口补齐了创建后修改能力
- Project 删除入口补齐了 Project 生命周期
- 删除当前选中 Project 后，页面状态会回到未选择状态
- Activity Log 应该能记录 `project.updated` / `project.deleted`

现在要做的是线上验证。

这张任务的重点不是继续写新功能，而是确认：

```text
Project 编辑 / 删除这类会改数据的功能，在线上真实环境里也能稳定工作。
```

线上环境目前是：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

---

## 这张任务只练什么

只练线上 smoke 三件事：

1. 部署包含 Project 编辑 / 删除入口的新前端版本
2. 在线上验证 Project 编辑、删除取消、删除确认
3. 在线上验证 Activity Log 和页面状态是否符合预期

先不要继续加：

- 自定义删除确认弹窗
- Project 删除 undo
- Project 级 Activity Log 历史视图
- Todo dueDate 编辑

这些可以留到下一阶段。

---

## 任务 1：部署前检查

部署前先确认本地仍然干净通过：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

如果这些命令已经在刚才的实现任务里通过了，可以不重复跑全部，但至少要知道当前这版代码对应的是通过状态。

然后对照：

```text
docs/reviews/deployment-stability-checklist.md
```

重点看：

- 是否知道本次部署包含哪些变化
- 是否知道前端连接的是哪个 API Base URL
- 是否有可回滚方案
- 是否知道失败时去哪里看日志
- 是否知道如何用 `X-Request-Id` 串联前后端日志

---

## 任务 2：确认 Netlify 部署完成

部署完成后打开线上地址：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

确认：

- 页面能打开
- 能注册或登录
- Project 列表能加载
- Project 列表里能看到“编辑”和“删除”入口

如果看不到编辑 / 删除入口，优先判断：

```text
Netlify 是否还没部署到最新版本？
浏览器是否缓存了旧资源？
当前访问的是否是正确站点？
```

---

## 任务 3：线上编辑 Project smoke

建议创建一个临时 Project，避免误改你真正想保留的数据。

建议流程：

```text
1. 登录线上前端
2. 创建一个临时 Project
3. 选中这个 Project
4. 点击编辑
5. 修改 Project name
6. 修改 Project description
7. 点击保存
8. 确认 Project 列表展示新名称
9. 确认页面没有报错
10. 查看 Activity Log 是否出现“更新 Project”
```

这里最关键的判断是：

```text
不是只要 PATCH 请求成功就算完成。
用户看到的列表状态和 Activity Log 也要跟着更新。
```

如果编辑失败，记录：

- 浏览器 Network 里的请求 URL
- HTTP status
- response body
- response header 里的 `X-Request-Id`
- Railway logs 中同一个 requestId 的日志

---

## 任务 4：线上删除取消 smoke

删除功能一定要先验证取消路径。

建议流程：

```text
1. 找到刚才创建的临时 Project
2. 点击删除
3. 在 confirm 里点取消
4. 确认 Project 仍然在列表里
5. 确认当前选中状态没有异常
6. 确认 Todo / Activity Log 没有被错误清空
```

这一段看似简单，但很重要。

因为删除功能有两条路径：

```text
取消删除 -> 不应该产生任何数据变更
确认删除 -> 才应该真的调用 DELETE
```

如果取消删除也导致 Project 消失，那就是严重问题。

---

## 任务 5：线上删除确认 smoke

确认删除只对临时 Project 操作。

建议流程：

```text
1. 再次点击临时 Project 的删除
2. 在 confirm 里点确认
3. 确认 Project 从列表消失
4. 如果删除的是当前选中 Project，确认右侧 Todo 回到未选择状态
5. 如果删除的是当前选中 Project，确认 Activity Log 回到未选择状态
6. 确认页面没有残留已删除 Project 的数据
```

这里要特别观察：

```text
删除当前选中 Project 后，页面不能继续显示这个 Project 的 Todo / Activity Log。
```

这是前端状态一致性的核心验证点。

---

## 任务 6：Activity Log 验证

编辑 Project 时，当前 Project 还存在，所以应该能在 Activity Log 面板看到类似：

```text
更新 Project
```

或者对应的中文 action 文案。

删除 Project 时，如果删除后页面清空当前选中 Project，那么当前 Project 面板可能不会继续展示这条删除日志。

这是合理的。

因为：

```text
Project 已经被删除
页面已经没有 selectedProjectId
```

如果需要专门看 `project.deleted`，后续可以做“用户级 Activity Log”。

当前线上 smoke 只要求确认：

- 编辑 Project 后能看到更新日志
- 删除 Project 后页面状态合理
- 删除请求没有 500 / 401 / CORS 等线上错误

---

## 任务 7：如果线上失败，怎么查

如果线上失败，先不要猜。

按这个顺序查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到 PATCH /projects/:id 或 DELETE /projects/:id
4. 看 status
5. 看 response body
6. 看 response headers 里的 X-Request-Id
7. 去 Railway logs 搜同一个 requestId
8. 判断是前端参数问题、鉴权问题、后端错误、数据库错误，还是 CORS / 环境变量问题
```

常见情况：

| 现象       | 优先怀疑                                            |
| ---------- | --------------------------------------------------- |
| 401        | token 过期、登录态失效、Authorization header 没带上 |
| 404        | projectId 不存在，或者删除后重复操作                |
| 400        | name / description 不符合后端 schema                |
| 500        | 后端异常，需要用 requestId 查 Railway logs          |
| CORS error | 后端 CORS origin 没包含当前 Netlify 域名            |
| 页面没按钮 | Netlify 没部署到最新版本，或浏览器缓存旧资源        |

---

## 任务 8：创建线上 smoke 复盘

创建：

```text
docs/reviews/web-project-edit-delete-online-smoke.md
```

建议写这些小标题：

```md
# Project 编辑删除线上 smoke

## 1. 这次线上验证了什么

## 2. Project 编辑在线上是否正常

## 3. Project 删除取消是否正常

## 4. Project 删除确认是否正常

## 5. 删除当前选中 Project 后页面状态是否合理

## 6. Activity Log 是否符合预期

## 7. 如果失败，我看到了什么 requestId

## 8. 下一步还要优化什么
```

---

## 验证命令

本地命令建议至少保留这组结果：

```bash
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run format:check
npm run build -w @learn/web
```

线上 smoke 以浏览器实际验证为准。

---

## 完成标准

- [x] Netlify 已部署包含 Project 编辑 / 删除入口的新版本
- [x] 线上能登录并进入 `/projects`
- [x] 线上能创建临时 Project
- [x] 线上能编辑 Project name / description
- [x] 编辑后 Project 列表显示新名称
- [x] 编辑后 Activity Log 符合预期
- [x] 删除取消后 Project 仍然存在
- [x] 删除确认后 Project 从列表消失
- [x] 删除当前选中 Project 后 Todo 回到未选择状态
- [x] 删除当前选中 Project 后 Activity Log 回到未选择状态
- [x] 如失败，记录 `X-Request-Id`
- [x] 创建 docs/reviews/web-project-edit-delete-online-smoke.md

## 完成记录

- 完成时间：2026-06-28
- 线上地址：https://scintillating-pavlova-dc76e0.netlify.app/projects
- 复盘文档：docs/reviews/web-project-edit-delete-online-smoke.md
- 线上 smoke 结果：
  - Project 编辑入口在线上可用。
  - Project 删除取消路径在线上可用。
  - Project 删除确认路径在线上可用。
  - 删除当前选中 Project 后，Todo / Activity Log 状态能回到未选择状态。
  - 本次没有记录到需要排查的 `X-Request-Id`。
- 下一步建议：
  - 进入 Project 编辑删除体验优化。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-project-edit-delete-experience-polish.md
```
