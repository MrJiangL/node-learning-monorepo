# 用户级 Activity Log 前端入口 smoke 和复盘

## 1. 这次我验证了什么

这次验证的是用户级 Activity Log 前端入口是否已经具备第一版产品价值。

这条路径的重点不是某一个 Project 内的日志，而是：

```text
当前登录用户能不能在一个全局入口里看到自己的最近操作。
```

本次 smoke 路径覆盖：

```text
1. 打开前端
2. 登录
3. 进入 /projects
4. 找到“我的最近操作”
5. 点击“加载最近操作”
6. 确认能看到最近操作记录
7. 创建 / 编辑 / 删除 Project 或 Todo
8. 点击“刷新最近操作”
9. 确认用户级日志能看到新操作
10. 确认 action 是中文文案
11. 确认时间是格式化显示
```

这说明用户级 Activity Log 前端入口已经从代码实现进入了可用体验验证阶段。

## 2. 用户级 Activity Log 解决了什么问题

用户级 Activity Log 解决的是：

```text
用户不用先选中某个 Project，也能回看自己最近做了什么。
```

之前的 Project 级 Activity Log 更像是“局部历史”：

- 选中一个 Project
- 看这个 Project 发生过什么
- 适合排查某个 Project 内的 Todo / Project 操作

用户级 Activity Log 则更像是“全局最近动态”：

- 当前用户最近创建了什么
- 最近编辑了什么
- 最近删除了什么
- 哪些操作属于哪个 Project

这对真实产品很重要。

因为用户很多时候不是从“我要查某个 Project”开始的，而是从：

```text
我刚才做了什么？
我是不是删错了？
我改的是哪个 Project？
```

开始的。

用户级入口正好补上了这个视角。

## 3. 它和 Project 级 Activity Log 怎么分工

这两个入口不是重复功能，而是两个不同层级的观察方式。

```text
Project 级 Activity Log
  -> 回答：这个 Project 发生了什么？

用户级 Activity Log
  -> 回答：我最近做了什么？
```

Project 级入口适合放在 Project 详情上下文里。

它的价值是聚焦：

- 当前 Project 的创建、更新、删除
- 当前 Project 下 Todo 的创建、更新、完成、删除
- 用户不需要被其他 Project 的日志干扰

用户级入口适合放在更全局的位置。

它的价值是汇总：

- 跨 Project 的最近操作
- 不依赖当前选中的 Project
- 即使用户忘了操作发生在哪个 Project，也可以从最近操作里找回线索

所以后续产品上可以继续保留两个入口：

```text
Project 页面内：Project 级日志
Projects 页面全局区域：用户级最近操作
```

## 4. Project 删除后日志是否更容易查看

用户级 Activity Log 对 Project 删除场景尤其有价值。

原因是 Project 一旦被删除，用户就无法再通过“选中这个 Project”来进入 Project 级 Activity Log。

这时用户级 Activity Log 仍然可以作为保底入口：

- 看到删除操作本身
- 看到日志里的 Project 快照名
- 理解这条日志原本属于哪个 Project

这也是之前后端补 `projectSnapshotName` 的意义。

删除后的数据体验不能只依赖当前实体，因为当前实体已经不存在了。

更稳的设计是：

```text
业务实体可以删除。
审计 / 活动日志应该保留足够的快照信息。
```

当前用户级 Activity Log 已经让这个方向更清楚了。

## 5. 当前体验还可以继续怎么优化

当前第一版已经可用，但还有几个明显的体验优化方向。

### 自动刷新

现在用户级日志需要手动点击“刷新最近操作”。

第一版这样做是合理的，因为范围小、状态简单。

后续可以考虑：

- Project 创建成功后自动刷新用户级日志
- Todo 创建 / 编辑 / 删除成功后自动刷新用户级日志
- 自动刷新失败时只提示日志刷新失败，不影响主操作成功

### 筛选能力

当日志越来越多后，用户可能只想看某类操作。

例如：

- 只看 Project 操作
- 只看 Todo 操作
- 只看删除操作

这适合后续做 action filter UI。

### metadata 展示

当前主要展示 `message`、action 中文文案、时间和 Project 快照名。

后续可以继续展示更多上下文：

- Todo 标题快照
- 修改前 / 修改后的字段
- dueDate 变化
- completed 状态变化

这会让日志从“发生过某件事”升级到“具体发生了什么变化”。

## 6. 下一阶段我选择什么

下一阶段选择：

```text
A. 部署上线和线上 smoke
```

选择原因：

- 用户级 Activity Log 前端入口已经完成本地 smoke。
- 这是一个可见的新前端入口。
- 它调用的是新加的用户级 API：`GET /activity-logs`。
- 下一步最重要的是验证线上链路是否稳定。

线上 smoke 要确认的是整条链路：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
      -> 用户级 Activity Log 数据
```

如果这条链路在线上通过，再继续做体验优化会更踏实。
