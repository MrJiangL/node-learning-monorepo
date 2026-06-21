import type {
  CreateTodoInput,
  ListSortBy,
  PaginatedResult,
  SortOrder,
  Todo,
  UpdateTodoInput
} from "@learn/shared";

export type ListTodosFilter = {
  projectId: string;
  page: number;
  pageSize: number;

  // sortBy / sortOrder 来自 query schema。
  //
  // Todo 列表当前只支持按 createdAt 排序。
  // 后面如果要支持 dueDate / completed，可以继续扩展 shared 类型和 schema。
  sortBy: ListSortBy;
  sortOrder: SortOrder;

  // completed 是可选过滤条件。
  //
  // undefined 表示“不按完成状态过滤”，返回当前 Project 下的所有 Todo。
  // true 表示只返回已完成 Todo。
  // false 表示只返回未完成 Todo。
  //
  // 注意：false 是一个有效查询值，不等于“没传”。
  // 所以后面的判断要用 filter.completed !== undefined。
  completed?: boolean;

  // dueAfter / dueBefore 是可选日期范围过滤。
  //
  // 它们来自 query string，通过 Zod 校验后仍然保持 string。
  // repository 会在真正拼 Prisma where 时转成 Date。
  dueAfter?: string;
  dueBefore?: string;

  // title 是可选搜索关键字。
  //
  // undefined 表示“不按标题搜索”。
  // 有值时，repository 会用 Prisma contains 做模糊匹配。
  title?: string;
};

export type TodoRepository = {
  // 创建 Todo 时必须传 projectId。
  //
  // Todo 不直接属于 User，而是属于 Project。
  // 所以 Todo 的归属链路是：Todo -> Project -> User。
  create(input: CreateTodoInput, projectId: string): Promise<Todo>;

  // 查询某个 Project 下的一页 Todo。
  //
  // 注意这里按 projectId 查，不是按 userId 查。
  // 因为 Todo 表里没有 userId，权限校验后面会通过 Project 来完成。
  //
  // page / pageSize 放进 filter 里，是为了让 repository 能统一负责：
  // - 数据过滤：只查这个项目下的 Todo
  // - 数据分页：只返回当前页的数据
  // - 总数统计：告诉调用方一共有多少条、多少页
  findAll(filter: ListTodosFilter): Promise<PaginatedResult<Todo>>;

  // 按 Todo id 查询一条记录。
  //
  // 找不到时返回 null，保持和 Plan / Project repository 一样的接口风格。
  findById(id: string): Promise<Todo | null>;

  // 更新 Todo。
  //
  // 下一张 API 会用它来做 completed 状态切换。
  update(id: string, input: UpdateTodoInput): Promise<Todo | null>;

  // 删除 Todo。
  //
  // repository 只负责按 id 删除，不判断这个 Todo 属于谁。
  // 权限判断放在 service 层：先查 Todo，再查它所属 Project 的 userId。
  delete(id: string): Promise<Todo | null>;
};
