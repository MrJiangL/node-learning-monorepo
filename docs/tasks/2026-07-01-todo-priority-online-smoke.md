# Task: Todo priority 线上 smoke

## 背景

Todo priority 展示和编辑已经完成，并且本地 smoke 复盘已经完成。

你在复盘里选择了：

```text
A. Todo priority 线上 smoke
```

所以这张任务要验证：

```text
Todo priority 在线上真实环境里也能创建、展示、编辑和记录日志。
```

线上环境仍然是：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

这次要特别注意：

```text
本次包含数据库 migration。
```

也就是线上 MySQL 需要有 `Todo.priority` 这一列。

---

## 这张任务只练什么

只练线上验证：

1. 部署包含 Todo priority 的后端版本
2. 确认线上数据库 migration 已应用
3. 部署包含 Todo priority UI 的前端版本
4. 在线上创建 high priority Todo
5. 在线上编辑 high -> low
6. 在线上验证默认 priority 是 medium / 中
7. 在线上验证 Activity Log 能展示 `优先级`
8. 如失败，用 `X-Request-Id` 查 Railway logs

先不要继续加：

- priority 排序
- priority 筛选
- 彩色优先级标签
- 批量修改 priority

---

## 任务 1：部署前检查

部署前先确认本地验证已经通过：

```bash
npm run test -w @learn/api
npm run typecheck -w @learn/api
npm run build -w @learn/api
npm run test -w @learn/web
npm run typecheck -w @learn/web
npm run build -w @learn/web
npm run format:check
```

重点确认本次改动包含：

```text
prisma/migrations/20260630090000_add_todo_priority/migration.sql
```

这说明它不是纯前端部署。

---

## 任务 2：部署后端并应用 migration

先部署 Railway API。

部署后确认：

- Railway build 成功
- API 服务启动成功
- Prisma Client 是新生成后的版本
- Railway MySQL 已经应用 `add_todo_priority` migration

如果你的 Railway 部署流程不会自动执行 migration，就需要按你当前项目流程手动执行 migration。

本地对应命令是：

```bash
npm run prisma:migrate -w @learn/api
```

线上不要随手照抄本地数据库命令。

线上执行前要确认连接的是 Railway MySQL，而不是本地 MySQL。

---

## 任务 3：部署前端到 Netlify

按你当前 Netlify 流程部署前端。

线上地址：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

部署后确认：

- Netlify deployment 成功
- `/projects` 页面能打开
- 浏览器 Network 里的 JS / CSS 没有 404
- API 请求仍然打到 Railway 后端

如果页面看不到 priority 下拉框，优先怀疑：

```text
Netlify 没部署到最新 bundle
浏览器缓存了旧 JS
访问的不是正确站点
```

---

## 任务 4：线上 high priority 创建 smoke

打开：

```text
https://scintillating-pavlova-dc76e0.netlify.app/projects
```

流程：

```text
1. 登录测试账号
2. 进入 /projects
3. 选择一个 Project
4. 创建一个 Todo
5. title 填：High priority online smoke todo
6. priority 选择：高
7. 点击创建
```

预期：

- 创建成功
- Todo 列表出现该 Todo
- Todo item 显示 `优先级：高`
- Network 中 `POST /projects/:projectId/todos` 返回 201
- response data 中包含 `priority: "high"`

---

## 任务 5：线上 priority 编辑 smoke

流程：

```text
1. 点击刚才 Todo 的“编辑”
2. priority 从 高 改成 低
3. 点击保存
```

预期：

- 保存成功
- Todo 列表刷新
- Todo item 显示 `优先级：低`
- Network 中 `PATCH /todos/:id` 返回 200
- response data 中包含 `priority: "low"`

---

## 任务 6：线上默认 priority smoke

流程：

```text
1. 创建另一个 Todo
2. 不手动修改 priority 下拉框
3. 点击创建
```

预期：

- 创建成功
- Todo item 显示 `优先级：中`
- API response 中包含 `priority: "medium"`

这一步验证的是默认值链路：

```text
前端默认 medium
后端默认 medium
数据库默认 medium
```

---

## 任务 7：线上 Activity Log smoke

在同一个 Project 下查看 Activity Log。

预期：

- 创建 Todo 后出现 `创建 Todo`
- 编辑 priority 后出现 `更新 Todo`
- metadata 中变更字段显示 `优先级`
- 不应该直接显示 `priority`

如果当前 Project 级日志没刷新，可以：

- 重新选择 Project
- 点击加载 Activity Log
- 或刷新页面后再进入 Project

也可以点击“我的最近操作”，确认用户级 Activity Log 里同样能看懂 priority 变更。

---

## 任务 8：如果线上失败，怎么查

### 创建 Todo 返回 500

优先查 Railway logs。

如果看到类似：

```text
The column `priority` does not exist in the current database.
```

说明线上数据库 migration 没应用。

### 页面没有 priority 下拉框

优先查：

- Netlify 是否部署了最新版本
- 浏览器是否缓存旧 JS
- 当前访问地址是否正确

### 保存后 priority 没变

优先查浏览器 Network：

```text
PATCH /todos/:id
```

确认 request payload 是否包含：

```json
{
  "priority": "low"
}
```

### API 请求失败

按这个顺序查：

```text
1. 打开浏览器 DevTools
2. 切到 Network
3. 找到失败请求
4. 看 status code
5. 看 response body
6. 看 response headers 里的 X-Request-Id
7. 去 Railway logs 搜同一个 requestId
```

常见判断：

| 现象                  | 优先怀疑                         |
| --------------------- | -------------------------------- |
| 看不到 priority UI    | Netlify 旧版本或浏览器缓存       |
| 创建 Todo 500         | Railway MySQL 没应用 migration   |
| Todo 列表加载 500     | Prisma 查询到线上缺失字段        |
| 保存后 priority 没变  | PATCH payload 不对或列表未刷新   |
| Activity Log 没有中文 | 前端 bundle 旧，或日志不是新产生 |
| 401                   | 登录态过期或 token 未携带        |

---

## 任务 9：创建线上 smoke 复盘文档

创建：

```text
docs/reviews/todo-priority-online-smoke.md
```

建议写：

```md
# Todo priority 线上 smoke

## 1. 这次线上验证了什么

## 2. 后端部署和 migration 是否正常

## 3. priority 创建在线上是否正常

## 4. priority 编辑在线上是否正常

## 5. 默认 priority 在线上是否正常

## 6. Activity Log 是否符合预期

## 7. 如果失败，我看到了什么 requestId

## 8. 下一步选择什么
```

---

## 完成标准

- [ ] 部署前本地验证通过
- [ ] Railway API 部署成功
- [ ] Railway MySQL 已应用 priority migration
- [ ] Netlify 前端部署成功
- [ ] 线上创建 high priority Todo 成功
- [ ] 线上编辑 high -> low 成功
- [ ] 线上默认创建显示 medium / 中
- [ ] 线上 Activity Log 显示 `优先级`
- [ ] 创建 `docs/reviews/todo-priority-online-smoke.md`
- [ ] 已选择下一阶段

完成后告诉我：

```text
Todo priority 线上 smoke 完成了
```
