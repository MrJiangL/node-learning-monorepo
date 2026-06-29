# Task: Todo dueDate 线上 smoke

## 背景

Todo dueDate 展示和编辑已经完成，并且已经做过本地 smoke 和复盘。

当前前端已经支持：

- Todo 没有 dueDate 时展示“暂无截止日期”
- Todo 有 dueDate 时展示“截止：YYYY/MM/DD”
- 编辑 Todo 时可以选择 dueDate
- 清空 date input 后保存会传 `dueDate: null`
- 保存 Todo 后仍然刷新 Activity Log

现在要做线上 smoke。

这张任务的重点不是继续写代码，而是确认：

```text
Todo dueDate 在线上真实环境里也能展示、更新和清空。
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

1. 部署包含 Todo dueDate 的前端版本
2. 在线上验证 dueDate 展示
3. 在线上验证 dueDate 更新
4. 在线上验证 dueDate 清空
5. 在线上验证 Activity Log 仍然记录 Todo 更新
6. 如失败，用 `X-Request-Id` 查 Railway logs

先不要继续加：

- dueDate 筛选
- dueDate 排序
- 逾期高亮
- 用户级 Activity Log

---

## 任务 1：部署前检查

部署前确认本地验证已经通过：

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

- 本次部署内容是 Todo dueDate 展示和编辑
- Netlify 使用的是正确 API Base URL
- Railway API 已经有 Todo dueDate 后端能力
- 如果失败，知道从浏览器 Network 找 `X-Request-Id`

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
- 选择 Project 后 Todo 列表能加载
- Todo item 上能看到 dueDate 展示文案

如果 Todo 仍然只显示 title / completed，看不到 dueDate 文案，优先怀疑：

```text
Netlify 没部署到最新版本
浏览器缓存旧资源
访问的不是正确站点
```

---

## 任务 3：线上 dueDate 展示 smoke

建议创建一个临时 Todo。

流程：

```text
1. 登录线上前端
2. 选择一个 Project
3. 创建一个临时 Todo
4. 确认新 Todo 显示“暂无截止日期”
```

这个验证看起来简单，但很重要。

因为它确认：

```text
dueDate: null
```

在线上不会展示成空白、`null`、`undefined` 或原始异常文案。

---

## 任务 4：线上 dueDate 更新 smoke

流程：

```text
1. 点击临时 Todo 的编辑
2. 修改 Todo title
3. 选择一个 dueDate
4. 点击保存
5. 确认 Todo 展示“截止：YYYY/MM/DD”
6. 确认 Activity Log 出现 Todo 更新记录
```

注意：

```text
input[type="date"] 里选的是 YYYY-MM-DD。
列表展示的是格式化后的 YYYY/MM/DD。
```

这两个格式不同是正常的。

一个是表单控件格式，一个是用户展示格式。

---

## 任务 5：线上 dueDate 清空 smoke

流程：

```text
1. 再次点击临时 Todo 的编辑
2. 清空 date input
3. 点击保存
4. 确认 Todo 展示“暂无截止日期”
5. 确认 Activity Log 再次出现 Todo 更新记录
```

这一步重点验证：

```text
dueDate: null
```

是否真的在线上清空了数据库里的 dueDate。

如果清空后仍然显示旧日期，优先怀疑：

```text
前端没有传 null
后端没有正确处理 null
前端列表没有重新加载
浏览器看到的是旧状态
```

---

## 任务 6：如果线上失败，怎么查

如果线上更新或清空 dueDate 失败，按这个顺序查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到 PATCH /todos/:id
4. 看 request payload 是否包含 dueDate
5. 看 status code
6. 看 response body
7. 看 response headers 里的 X-Request-Id
8. 去 Railway logs 搜同一个 requestId
```

常见判断：

| 现象              | 优先怀疑                                     |
| ----------------- | -------------------------------------------- |
| 看不到 dueDate UI | Netlify 版本未更新或缓存旧资源               |
| 保存后日期没变    | PATCH payload 不对，或列表未刷新             |
| 清空后旧日期还在  | 没有传 `dueDate: null`，或后端 null 处理异常 |
| 401               | 登录态过期或 Authorization header 没带上     |
| 404               | Todo 已被删除或 todoId 不存在                |
| 500               | 后端异常，用 `X-Request-Id` 查 Railway logs  |

---

## 任务 7：创建线上 smoke 复盘

创建：

```text
docs/reviews/web-todo-due-date-online-smoke.md
```

建议写这些小标题：

```md
# Todo dueDate 线上 smoke

## 1. 这次线上验证了什么

## 2. dueDate 展示在线上是否正常

## 3. dueDate 更新在线上是否正常

## 4. dueDate 清空在线上是否正常

## 5. Activity Log 是否符合预期

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

- [x] Netlify 已部署包含 Todo dueDate 的前端版本
- [x] 线上能登录并进入 `/projects`
- [x] 线上 Todo 无 dueDate 时展示“暂无截止日期”
- [x] 线上 Todo 有 dueDate 时展示“截止：YYYY/MM/DD”
- [x] 线上能编辑 Todo dueDate
- [x] 线上能清空 Todo dueDate
- [x] dueDate 更新后 Activity Log 符合预期
- [x] 如失败，记录 `X-Request-Id`
- [x] 创建 docs/reviews/web-todo-due-date-online-smoke.md

## 完成记录

- 完成时间：2026-06-29
- 线上地址：https://scintillating-pavlova-dc76e0.netlify.app/projects
- 复盘文档：docs/reviews/web-todo-due-date-online-smoke.md
- 线上 smoke 结果：
  - Todo dueDate 展示在线上正常。
  - Todo dueDate 更新在线上正常。
  - Todo dueDate 清空在线上正常。
  - Activity Log 符合当前阶段预期。
  - 本次没有记录到需要排查的 `X-Request-Id`。
- 下一步建议：
  - 进入用户级 Activity Log 查询 API。
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-29-user-activity-log-query-api.md
```
