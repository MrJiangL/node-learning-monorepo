# Task: Backend CRUD Retrospective

## 目标

这张任务是一次阶段复盘，不是新增接口。

你现在已经完成了 Express + Prisma 后端里很核心的一轮能力：

```text
Plan CRUD
Project CRUD
Todo CRUD
User register / login
JWT auth
权限边界
Zod validation
Repository / Service / Route 分层
分页 / 排序 / 过滤 / 搜索
Transaction
Rate limit
Smoke script
```

现在需要把这些知识整理成一张“我到底学会了什么”的复盘。

---

## Step 1: 新建复盘文档

创建：

```text
docs/reviews/backend-crud-retrospective.md
```

写入这个结构：

```md
# 后端 CRUD 阶段复盘

## 我现在能独立解释的内容

- ...

## 我现在能半独立实现的内容

- ...

## 我还容易混乱的内容

- ...

## 一个请求从进入 Express 到返回响应的流程

1. ...
2. ...
3. ...

## 新增一个 API 时我应该怎么拆

1. shared 类型
2. Zod schema
3. repository
4. service
5. route
6. tests
7. smoke

## 我对 Repository / Service / Route 的理解

...

## 下一阶段我想优先补的能力

- ...
```

---

## Step 2: 用自己的话解释分层

重点回答：

```text
route 负责什么？
service 负责什么？
repository 负责什么？
shared package 负责什么？
```

不要追求很官方，先用你能理解的话写。

---

## Step 3: 写一个完整请求流程

任选一个接口，例如：

```text
PATCH /todos/:id
```

写清楚它经过：

```text
requireAuth
updateTodoSchema
todoService.updateTodo
requireOwnedTodo
todoRepository.update
response.json
```

---

## Step 4: 写你的疑问

最后写：

```md
## 我想问的问题

1. ...
2. ...
3. ...
```

这些疑问很重要，因为下一阶段选什么，应该基于你哪里还不稳。

---

## 完成后你告诉我

你完成后直接发：

```text
后端 CRUD 阶段复盘完成了
```

我会帮你：

- 修正理解偏差。
- 补更准确的表达。
- 基于你的疑问，推荐下一阶段路线。
