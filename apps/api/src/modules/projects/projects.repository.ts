import type {
  CreateProjectInput,
  CreateProjectWithTodosInput,
  ListSortBy,
  PaginatedResult,
  Project,
  ProjectWithTodos,
  SortOrder,
  UpdateProjectInput
} from "@learn/shared";

export type ListProjectsFilter = {
  userId: string;
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
};

export type ProjectRepository = {
  // 创建项目时必须传入 userId。
  //
  // 这个 userId 后面会来自 JWT 解析出的当前登录用户，
  // 不应该让客户端从 request.body 里传，否则用户可以伪造归属关系。
  create(input: CreateProjectInput, userId: string): Promise<Project>;

  // 查询某个用户自己的 Project 列表。
  //
  // Project 是强归属资源，所以 userId 必须在 filter 里。
  // route 不允许客户端传 userId；service 会从当前登录用户里补进去。
  findAll(filter: ListProjectsFilter): Promise<PaginatedResult<Project>>;

  // 按项目 id 查询一条记录。
  //
  // repository 只负责数据查询，找不到时返回 null。
  // “返回 404 还是 403”这种 HTTP 语义，后面交给 service / route 决定。
  findById(id: string): Promise<Project | null>;

  // 一次创建 Project 和它的初始 Todo。
  //
  // 这个能力会由 Prisma repository 用 transaction 实现。
  // 接口层只描述“业务需要什么”，不把 Prisma 的 tx 细节暴露给 service。
  createWithTodos(input: CreateProjectWithTodosInput, userId: string): Promise<ProjectWithTodos>;

  // 删除 Project。
  //
  // repository 只负责按 id 删除，不判断这个 Project 属于谁。
  // 权限判断放在 service 层。
  delete(id: string): Promise<Project | null>;

  // 更新 Project。
  //
  // repository 只负责按 id 更新数据。
  // “这个 Project 是否属于当前用户”的权限判断仍然放在 service 层。
  update(id: string, input: UpdateProjectInput): Promise<Project | null>;
};
