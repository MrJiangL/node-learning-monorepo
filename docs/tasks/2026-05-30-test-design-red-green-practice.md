# Task: Test Design Red Green Practice

## 目标

这一张进入：

```text
测试设计专项：先写测试再实现
```

你前面已经写了很多功能，但你自己也说过：

```text
测试我不知道怎么写，怎么才算测试完成。
```

所以这一张不急着做新 API，而是专门练测试设计。

这次你要练的是：

- 先写测试，再写实现。
- 一个测试只验证一个明确行为。
- 测试名用中文描述业务行为。
- 用测试覆盖正常路径、默认值、边界值、非法输入。

我们会写一个纯函数：

```ts
buildTodoListQuery(input);
```

它不访问数据库，只把列表查询参数转换成 repository 更容易使用的结构。

这样你不用被 Express、Prisma、数据库干扰，可以专心练“测试怎么设计”。

---

## Step 1: 新建测试文件，先不要写实现

创建：

```text
apps/api/tests/unit/todo-list-query-policy.test.ts
```

先写测试：

```ts
import { describe, expect, it } from "vitest";
import { buildTodoListQuery } from "../../src/exercises/todo-list-query-policy.js";

describe("Todo 列表查询策略", () => {
  it("不传参数时使用默认分页和默认排序", () => {
    const result = buildTodoListQuery({});

    expect(result).toEqual({
      page: 1,
      pageSize: 10,
      skip: 0,
      take: 10,
      where: {},
      orderBy: {
        createdAt: "asc"
      }
    });
  });

  it("会把 page 和 pageSize 转成 skip 和 take", () => {
    const result = buildTodoListQuery({
      page: 3,
      pageSize: 20
    });

    expect(result).toMatchObject({
      page: 3,
      pageSize: 20,
      skip: 40,
      take: 20
    });
  });

  it("completed=false 是有效过滤条件", () => {
    const result = buildTodoListQuery({
      completed: false
    });

    expect(result.where).toEqual({
      completed: false
    });
  });

  it("title 会 trim 后生成 contains 搜索条件", () => {
    const result = buildTodoListQuery({
      title: "  report  "
    });

    expect(result.where).toEqual({
      title: {
        contains: "report"
      }
    });
  });

  it("空 title 不生成搜索条件", () => {
    const result = buildTodoListQuery({
      title: "   "
    });

    expect(result.where).toEqual({});
  });
});
```

注意：这个测试现在会失败，因为实现文件还不存在。

这就是 RED。

---

## Step 2: 跑测试，确认它失败

运行：

```bash
npm run test -w @learn/api -- tests/unit/todo-list-query-policy.test.ts
```

你应该看到类似：

```text
Cannot find module '../../src/exercises/todo-list-query-policy.js'
```

这个失败是正确的，因为你还没写实现。

不要跳过这一步。

---

## Step 3: 新建实现文件

创建：

```text
apps/api/src/exercises/todo-list-query-policy.ts
```

先写类型和空实现：

```ts
export type TodoListQueryInput = {
  page?: number;
  pageSize?: number;
  completed?: boolean;
  title?: string;
};

export type TodoListQueryPolicy = {
  page: number;
  pageSize: number;
  skip: number;
  take: number;
  where: {
    completed?: boolean;
    title?: {
      contains: string;
    };
  };
  orderBy: {
    createdAt: "asc";
  };
};

export function buildTodoListQuery(input: TodoListQueryInput): TodoListQueryPolicy {
  // TODO: 你来实现。
  //
  // 先不要一次写完所有逻辑。
  // 推荐顺序：
  // 1. 先让“不传参数时使用默认分页和默认排序”通过。
  // 2. 再让 page/pageSize 的测试通过。
  // 3. 再处理 completed=false。
  // 4. 最后处理 title trim。
  throw new Error("还没有实现");
}
```

---

## Step 4: 按测试逐个实现

### 第一个测试：默认值

你先只写够让第一个测试通过的代码。

提示：

```ts
const page = input.page ?? 1;
const pageSize = input.pageSize ?? 10;
```

### 第二个测试：skip / take

分页公式：

```ts
const skip = (page - 1) * pageSize;
const take = pageSize;
```

### 第三个测试：completed=false

这里是测试设计里最重要的点。

不能写：

```ts
if (input.completed) {
  // ...
}
```

因为：

```text
false 是有效值，不是“没传”。
```

你应该判断：

```ts
if (input.completed !== undefined) {
  // ...
}
```

### 第四、五个测试：title

先 trim：

```ts
const title = input.title?.trim();
```

只有非空字符串才放进 `where`：

```ts
if (title) {
  // ...
}
```

---

## Step 5: 完成标准

你完成后，至少要跑：

```bash
npm run test -w @learn/api -- tests/unit/todo-list-query-policy.test.ts
```

看到这 5 条测试通过。

然后告诉我：

```text
测试设计 red-green 练习完成了
```

我会帮你：

1. 看你的测试是否真的覆盖了关键行为。
2. 看你的实现有没有把 `false` 当成没传。
3. 补详细中文注释。
4. 跑类型检查、格式检查、构建和完整测试。
5. 带你做本阶段复盘。
