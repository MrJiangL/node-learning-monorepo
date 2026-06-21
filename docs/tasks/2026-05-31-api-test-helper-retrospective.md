# Task: API Test Helper Retrospective

## 目标

这一小阶段你做了三件测试工程化任务：

- 抽取 API test helper
- `todos.test.ts` 复用 helper
- `projects.test.ts` 复用 helper
- `plans.test.ts` 复用 helper

现在做一个很短的复盘。

这张任务不写代码，目的是让你确认自己理解：

- helper 应该抽什么。
- helper 不应该抽什么。
- 为什么集成测试 helper 仍然走真实 HTTP API。

---

## Step 1: 新建复盘文档

创建：

```text
docs/reviews/api-test-helper-retrospective.md
```

写入：

````md
# API 测试 helper 小阶段复盘

## 1. 这次抽出了哪些 helper？

```text
我抽出了：
```
````

## 2. 为什么 registerAndLogin 要走真实 auth/register 和 auth/login？

```text
原因：
```

## 3. 为什么 createProject / createTodo 走 HTTP API，而不是直接 prisma.create？

```text
原因：
```

## 4. cleanupDatabase 为什么要先删 Todo，再删 Project / Plan，最后删 User？

```text
原因：
```

## 5. helper 抽取后，测试文件更容易读了吗？

```text
我的感受：
```

## 6. 下一阶段我准备好了接前端吗？

```text
我的判断：
```

````

---

## Step 2: 完成后的口令

完成后告诉我：

```text
API 测试 helper 复盘完成了
````

我会帮你：

1. 看你的理解有没有偏差。
2. 补导师评估。
3. 更新学习进度。
4. 给你创建前端接入阶段的第一张任务卡。
