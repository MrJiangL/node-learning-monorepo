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
  // page / pageSize 是列表接口常见的默认值。
  //
  // 这里用 ?? 而不是 ||：
  // - ?? 只在 null / undefined 时使用默认值
  // - || 会把 0、空字符串、false 都当成“没值”
  //
  // 在真实 API 里，page/pageSize 通常会先由 Zod 校验成合法正整数。
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 10;

  // skip 是数据库要跳过多少条。
  //
  // 第 1 页跳过 0 条，第 2 页跳过 pageSize 条。
  const skip = (page - 1) * pageSize;
  const take = pageSize;

  // where 只应该放“真的要过滤”的条件。
  //
  // 你原来的写法把 completed 默认成 false：
  // completed: input.completed ?? false
  //
  // 这会导致“不传 completed”也变成“只查未完成 Todo”。
  // 但不传 completed 的业务含义应该是：不按完成状态过滤。
  const where: TodoListQueryPolicy["where"] = {};

  // false 是有效过滤值，所以不能写 if (input.completed)。
  //
  // 这里必须判断 undefined：
  // - undefined：没传，不过滤
  // - true：只查已完成
  // - false：只查未完成
  if (input.completed !== undefined) {
    where.completed = input.completed;
  }

  // title 先 trim。
  //
  // 如果 trim 后为空字符串，就不生成搜索条件。
  // 如果有内容，才生成 Prisma 常用的 contains 结构。
  const title = input.title?.trim();

  if (title) {
    where.title = {
      contains: title
    };
  }

  return {
    page,
    pageSize,
    skip,
    take,
    where,
    orderBy: {
      createdAt: "asc"
    }
  };
}
