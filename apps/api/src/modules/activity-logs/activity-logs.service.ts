import type { ActivityLog, ActivityLogAction, PaginatedResult } from "@learn/shared";
import type {
  ActivityLogRepository,
  CreateActivityLogInput,
  ListActivityLogsFilter
} from "./activity-logs.repository.js";
import { parseActivityLogMetadata } from "./activity-log-metadata.schema.js";

export type RecordActivityLogInput = {
  action: ActivityLogAction;
  message: string;
  metadata?: Record<string, unknown>;
  userId: string;
  projectId: string;
  projectSnapshotId: string;
  projectSnapshotName?: string | null;
};

export type ListProjectActivityLogsInput = {
  userId: string;
  projectId: string;
  page: number;
  action?: ActivityLogAction;
  createdAfter?: string;
  createdBefore?: string;
  pageSize: number;
};

export type ActivityLogService = {
  record(input: RecordActivityLogInput): Promise<ActivityLog>;
  listProjectLogs(input: ListProjectActivityLogsInput): Promise<PaginatedResult<ActivityLog>>;
};

export function createActivityLogService(repository: ActivityLogRepository): ActivityLogService {
  return {
    async record(input: RecordActivityLogInput) {
      // Service 这里先保持很薄，只负责把“业务输入”转换成 repository 的创建输入。
      //
      // 你可能会觉得这层现在只是转发参数，好像有点多余。
      // 但后面接入 Project / Todo 业务时，Service 会成为统一入口：
      // - 统一决定 action 怎么命名
      // - 统一决定 message 怎么生成
      // - 统一决定 metadata 里放哪些上下文
      // - 统一决定日志失败时是否影响主业务
      //
      // 这里校验的不是客户端 request body，而是后端内部业务事件。
      // 它保护的是“我们自己以后写错 ActivityLog metadata 结构”这种问题：
      // 比如 action 是 todo.created，却忘了传 title。
      const metadata = parseActivityLogMetadata(input.action, input.metadata);

      const createInput: CreateActivityLogInput = {
        action: input.action,
        message: input.message,
        metadata,
        userId: input.userId,
        projectId: input.projectId,
        // ActivityLogService 不负责再查 Project。
        //
        // 这层只知道调用方传进来的日志信息，不知道调用方手里有没有 Project。
        // 所以 projectSnapshotId / projectSnapshotName 必须由更懂业务现场的 service 传入：
        // - ProjectService 创建/更新项目时，本来就拿到了 project / updatedProject
        // - TodoService 校验权限时，本来就会查到 todo 所属的 project
        projectSnapshotId: input.projectSnapshotId,
        projectSnapshotName: input.projectSnapshotName
      };

      return repository.create(createInput);
    },

    async listProjectLogs(input: ListProjectActivityLogsInput) {
      // listProjectLogs 是“业务语言”，findAll 是“数据访问语言”。
      //
      // route / controller 后面会调用 listProjectLogs，
      // service 再把它翻译成 repository.findAll 需要的 filter。
      const filter: ListActivityLogsFilter = {
        userId: input.userId,
        projectId: input.projectId,
        action: input.action,
        createdAfter: input.createdAfter,
        createdBefore: input.createdBefore,
        page: input.page,
        pageSize: input.pageSize
      };

      return repository.findAll(filter);
    }
  };
}
