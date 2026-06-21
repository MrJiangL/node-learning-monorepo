# Difficulty 字段 TDD 练习

这个练习会把你刚学的 Zod 用到正式接口里。

目标：给学习计划增加一个字段：

```ts
difficulty: "easy" | "medium" | "hard";
```

规则：

- 创建计划时可以传 `difficulty`。
- 如果不传，默认是 `"medium"`。
- 只能传 `"easy"`、`"medium"`、`"hard"`。
- 传 `"impossible"` 这类值时，接口返回 400。
- 创建成功后，响应体里的 `data` 要包含 `difficulty`。

## 第一步：看失败测试

运行：

```bash
cd /Users/jianglin/project/node/node-learning-monorepo
npm run lab:difficulty -w @learn/api
```

你现在应该看到失败。这是 TDD 的 RED 阶段。

## 第二步：读测试

测试在这里：

[apps/api/labs/difficulty-feature.test.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/labs/difficulty-feature.test.ts)

先读测试，不要急着改代码。你要先看懂这三个行为：

- 不传 difficulty 时，默认是 `medium`。
- 传 `hard` 时，响应里保留 `hard`。
- 传 `impossible` 时，返回 `VALIDATION_ERROR`。

## 第三步：你需要修改哪些文件

你会改这几个文件：

- [packages/shared/src/index.ts](/Users/jianglin/project/node/node-learning-monorepo/packages/shared/src/index.ts)
- [apps/api/src/modules/plans/plans.schema.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/plans/plans.schema.ts)
- [apps/api/src/modules/plans/plans.repository.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/plans/plans.repository.ts)

你可能会查看这个文件，但通常不用改：

- [apps/api/src/modules/plans/plans.service.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/plans/plans.service.ts)

## 第四步：实现提示

先想类型。

`packages/shared/src/index.ts` 里现在有：

```ts
export type PlanStatus = "active" | "completed";
```

你可以仿照它增加一个难度类型：

```ts
export type PlanDifficulty = "easy" | "medium" | "hard";
```

然后让 `Plan` 多一个字段：

```ts
difficulty: PlanDifficulty;
```

创建输入也需要允许传难度：

```ts
difficulty?: PlanDifficulty;
```

再想 Zod。

`plans.schema.ts` 里需要校验 difficulty。你刚刚练过 enum，所以这里应该想到：

```ts
z.enum(["easy", "medium", "hard"]);
```

但它是可选字段，并且有默认值。你可以查一下 Zod 的 `.default(...)`，或者先尝试你觉得合理的写法。

最后想 repository。

内存 repository 创建 Plan 时，现在只生成了：

```ts
id;
title;
description;
status;
createdAt;
updatedAt;
```

你需要让它也生成：

```ts
difficulty;
```

如果输入里没传，就用 `"medium"`。

## 第五步：完成标准

先让练习测试通过：

```bash
npm run lab:difficulty -w @learn/api
```

然后确认正式项目没坏：

```bash
npm run test
npm run typecheck
```

如果三个命令都通过，这个练习就完成了。

## 一点学习提醒

这次练习的关键不是“加一个字段”，而是理解后端里一个字段要穿过哪些层：

```text
测试期望
  -> 共享类型
  -> Zod 输入校验
  -> Service 类型传递
  -> Repository 创建完整数据
  -> HTTP 响应
```

真实项目里很多 bug 都来自“只改了其中一层，忘了另一层”。这个练习就是让你亲手走一遍。
