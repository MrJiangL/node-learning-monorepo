import type { ActivityLog, ActivityLogAction, PaginatedResult } from "@learn/shared";

export type CreateActivityLogInput = {
  // action 描述“发生了什么动作”。
  //
  // 这里不用普通 string，而是复用 shared 里的 ActivityLogAction 联合类型。
  // 这样调用方只能传 "project.created" / "todo.completed" 这些被允许的值，
  // 不容易写出 "project_create" 这种后面难以统计的字符串。
  action: ActivityLogAction;

  // message 是一段适合展示给用户看的摘要。
  //
  // 例如：“创建了项目 Learning Node”。
  // 真正用于筛选和统计的字段应该是 action / userId / projectId，
  // message 更多是展示层友好的文本。
  message: string;

  // metadata 用来保存不同 action 的附加信息。
  //
  // 例如：
  // - project.updated 可以放 { oldName, newName }
  // - todo.completed 可以放 { todoId, title }
  //
  // 字段可选，表示调用方可以只记录 action/message，不额外保存上下文。
  metadata?: Record<string, unknown>;

  // userId 表示“是谁触发了这个动作”。
  //
  // 后面 service 会从当前登录用户 currentUser.id 传进来，
  // 不应该让客户端 request.body 自己决定。
  userId: string;

  // projectId 表示“这个动作发生在哪个 Project 里”。
  projectId: string;

  projectSnapshotId: string;
  projectSnapshotName?: string | null;
};

export type ListActivityLogsFilter = {
  // 只查询某一个 Project 的活动日志。
  projectId: string;

  // userId 用来做权限边界。
  //
  // Project 删除后，ActivityLog.projectId 可能已经是 null。
  // 所以查询日志时不能再依赖 Project relation 做权限判断。
  //
  // 这里使用 ActivityLog.userId + projectSnapshotId：
  // - userId 确认“这条日志是谁触发的”
  // - projectSnapshotId 确认“这条日志属于哪个历史 Project”
  userId: string;

  // action 是可选过滤条件。
  //
  // undefined 表示不过滤 action，返回这个 Project 下的全部日志。
  action?: ActivityLogAction;

  // repository 接收 string，是为了让 service 不关心 Prisma Date 查询细节。
  //
  // 具体转换成 Date 的动作放在 Prisma repository 里。
  // 这样 service 只负责传递“业务过滤条件”，不负责拼数据库查询。
  createdAfter?: string;
  createdBefore?: string;
  page: number;
  pageSize: number;
};

export type ActivityLogRepository = {
  create(input: CreateActivityLogInput): Promise<ActivityLog>;
  findAll(filter: ListActivityLogsFilter): Promise<PaginatedResult<ActivityLog>>;
};
