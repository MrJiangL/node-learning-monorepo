// 这个包放“共享类型”。
//
// 在 monorepo 里，后端、前端、测试工具都可能需要知道同一种数据长什么样。
// 与其在每个项目里重复定义 Plan，不如统一放在 packages/shared。
// 这样以后 apps/web 前端项目也可以直接复用这些类型，减少前后端字段不一致的问题。

// 学习计划目前只有两个状态：
// - active：正在学习
// - completed：已经完成
// 用联合类型可以让 TypeScript 帮我们防止拼错，例如 "complete" 就会报错。
export type PlanStatus = "active" | "completed";

export type PlanDifficulty = "easy" | "medium" | "hard";

export type SortOrder = "asc" | "desc";
export type ListSortBy = "createdAt";

// Plan 表示系统返回给客户端的一条完整学习计划。
// 注意 createdAt / updatedAt 用 string，而不是 Date：
// HTTP API 传输 JSON 时没有真正的 Date 类型，Date 会被序列化成字符串。
export type Plan = {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  difficulty: PlanDifficulty;
  createdAt: string;
  updatedAt: string;
  userId: string | null;
};

// CreatePlanInput 表示“创建计划时客户端需要传什么”。
// 它故意比 Plan 少很多字段：
// - id 由服务器生成
// - status 默认是 active
// - createdAt / updatedAt 由服务器生成
// 这就是后端 API 设计里常见的“输入类型”和“输出类型”分开。
export type CreatePlanInput = {
  title: string;
  description?: string;
  difficulty?: PlanDifficulty;
};

// UpdatePlanInput 表示“更新计划时客户端可以传什么”。
//
// 和 CreatePlanInput 不同，PATCH 是局部更新：
// - 用户可以只更新 title
// - 也可以只更新 difficulty
// - 没传的字段应该保留原值
//
// 所以这里的字段都是可选的。id/status/createdAt/updatedAt 仍然不允许客户端传，
// 因为这些字段属于服务端控制的数据。
export type UpdatePlanInput = {
  title?: string;
  description?: string;
  difficulty?: PlanDifficulty;
};

export type PaginationMeta = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PaginatedResult<T> = {
  data: T[];
  meta: PaginationMeta;
};

export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RegisterUserInput = {
  email: string;
  password: string;
  name?: string;
};

export type LoginUserInput = {
  email: string;
  password: string;
};

export type AuthTokenResult = {
  user: User;
  refreshToken: string;
  accessToken: string;
};

// Project 表示系统返回给客户端的一条项目数据。
//
// 这里的 userId 是必填 string，因为 Project 在数据库设计上必须属于某个用户。
// 这和 Plan.userId 不一样：
// - Plan.userId 现在是 string | null，是为了兼容前面学习阶段的历史数据
// - Project.userId 是 string，因为这是新模块，可以从一开始就设计成强归属
export type Project = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  userId: string;
};

// CreateProjectInput 表示“创建项目时客户端可以传什么”。
//
// 不要让客户端传 id / userId / createdAt / updatedAt：
// - id 由服务端生成
// - userId 来自当前登录用户
// - createdAt / updatedAt 由数据库生成
export type CreateProjectInput = {
  name: string;
  description?: string;
};

// UpdateProjectInput 表示“更新 Project 时客户端可以传什么”。
//
// PATCH 是局部更新：
// - 只传 name：只更新项目名
// - 只传 description：只更新描述
// - 没传的字段保持原值
//
// id / userId / createdAt / updatedAt 仍然由服务端控制，不允许客户端传。
export type UpdateProjectInput = {
  name?: string;
  description?: string;
};

// Todo 表示系统返回给客户端的一条任务数据。
//
// dueDate 用 string | null，而不是 Date：
// HTTP API 返回 JSON 时没有真正的 Date 类型，Date 会被序列化成字符串。
export type Todo = {
  id: string;
  title: string;
  description: string | null;
  completed: boolean;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  projectId: string;
};

// CreateTodoInput 表示“创建 Todo 时客户端可以传什么”。
//
// projectId 不放在这里，是因为 projectId 会来自 URL：
// POST /projects/:projectId/todos
//
// 这样客户端虽然能选择“在哪个项目下创建 Todo”，
// 但后面 service 仍然要校验这个 project 是否属于当前用户。
export type CreateTodoInput = {
  title: string;
  description?: string;
  dueDate?: string;
};

// UpdateTodoInput 表示“更新 Todo 时客户端可以传什么”。
//
// 下一张 API 任务会做“完成状态切换”，所以这里先把 completed 放进来。
export type UpdateTodoInput = {
  title?: string;
  description?: string;
  completed?: boolean;
  dueDate?: string | null;
};

// InitialTodoInput 表示“创建 Project 时顺便创建的初始 Todo”。
//
// 它复用了 CreateTodoInput 的字段，而不是重新手写一遍。
// 这样以后如果 CreateTodoInput 增加 dueDate 之类字段，
// 这里也能保持类型一致。
export type InitialTodoInput = Pick<CreateTodoInput, "title" | "description" | "dueDate">;

// CreateProjectWithTodosInput 表示一个更复杂的创建请求：
// - Project 的基本字段来自 CreateProjectInput
// - todos 是这个项目创建时要一起插入的初始任务
export type CreateProjectWithTodosInput = CreateProjectInput & {
  todos: InitialTodoInput[];
};

// ProjectWithTodos 是这个接口返回给客户端的数据形状。
//
// 注意这里不要把它设计成 Prisma 原始返回类型。
// API 层仍然应该返回我们 shared package 里定义好的干净类型。
export type ProjectWithTodos = {
  project: Project;
  todos: Todo[];
};

export type ActivityLogAction =
  | "project.created"
  | "project.updated"
  | "project.deleted"
  | "todo.created"
  | "todo.updated"
  | "todo.completed"
  | "todo.deleted";

export type ActivityLog = {
  id: string;
  action: ActivityLogAction;
  message: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userId: string;
  // projectId 表示当前还能关联到的 Project。
  //
  // Project 删除后，这个字段会变成 null。
  // 所以前端不能只依赖 projectId 来展示历史日志。
  projectId: string | null;

  // projectSnapshotId 是“动作发生当时”的 Project id 快照。
  //
  // 即使 Project 被删除，这个字段也要保留。
  projectSnapshotId: string;

  // projectSnapshotName 是“动作发生当时”的 Project 名称快照。
  //
  // 这样 Project 删除后，日志仍然能展示：
  // “删除了项目 xxx”
  projectSnapshotName: string | null;
};
