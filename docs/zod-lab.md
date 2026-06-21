# Zod 动手练习

这份练习的目标不是让你“看懂 Zod”，而是让你亲手经历一次完整的校验规则设计过程。

你会做三件事：

1. 先运行一个故意失败的测试。
2. 根据测试失败信息修改 Zod schema。
3. 直到所有测试通过。

## 为什么要这样学

Zod 最容易看起来懂、实际写时卡住。你需要亲手体会这几个点：

- `parse()` 成功时会返回“被整理过的数据”。
- `parse()` 失败时会抛异常。
- `safeParse()` 不抛异常，而是返回 `{ success: true | false }`。
- `trim()`、`min()`、`max()`、`email()` 这些规则可以组合。
- `z.enum()` 适合限制固定选项。
- `z.infer<typeof schema>` 可以从 schema 自动生成 TypeScript 类型。

## 第一步：运行练习

进入项目：

```bash
cd /Users/jianglin/project/node/node-learning-monorepo
```

运行 Zod 练习：

```bash
npm run lab:zod -w @learn/api
```

你现在应该看到测试失败。失败是正常的，因为练习文件里的 schema 故意写得很宽松。

## 第二步：打开练习文件

你主要改这个文件：

[apps/api/src/exercises/zod-lab.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/exercises/zod-lab.ts)

测试在这里：

[apps/api/labs/zod-lab.test.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/labs/zod-lab.test.ts)

建议你先不要急着看答案。先读测试里的 `expect(...)`，反推 schema 应该怎么写。

## 第三步：你要完成的规则

`learnerProfileSchema`：

- `username`：字符串，去掉前后空格，长度至少 2，最多 20。
- `email`：合法邮箱，并且最终转成小写。
- `level`：只能是 `"beginner"`、`"intermediate"`、`"advanced"`。

`createStudyTaskSchema`：

- `title`：字符串，去掉前后空格，不能为空，最多 80 个字符。
- `minutes`：数字，必须是整数，最少 5，最多 240。
- `tags`：可选数组。如果传了，每个 tag 都要去掉空格，至少 1 个字符，最多 20 个字符。

## 你可能会用到的 Zod 方法

```ts
z.string();
z.string().trim();
z.string().min(2);
z.string().max(20);
z.string().email();
z.string().toLowerCase();
z.enum(["beginner", "intermediate", "advanced"]);
z.number().int().min(5).max(240);
z.array(z.string());
z.array(z.string()).optional();
```

## 推荐做法

不要一次全改完。按这个节奏：

1. 只修 `username`。
2. 运行 `npm run lab:zod -w @learn/api`。
3. 只修 `email`。
4. 再运行测试。
5. 继续修 `level`、`title`、`minutes`、`tags`。

这样你会更清楚每一条规则对应哪个失败测试。

## 完成标准

当你看到类似下面的结果，就说明练习完成：

```text
Test Files  1 passed
Tests       9 passed
```

完成后，再运行正式项目测试：

```bash
npm run test
npm run typecheck
```

正式测试应该继续通过。

## 下一步

完成这个练习后，再回到正式代码看：

[apps/api/src/modules/plans/plans.schema.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/plans/plans.schema.ts)

你会发现它其实就是把练习里的规则用在真实接口上。到那时，Zod 就不是一个陌生库了，而是“请求进入系统前的一道门”。
