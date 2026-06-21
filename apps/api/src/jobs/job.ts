export type JobStatus = "pending" | "processing" | "completed" | "failed";

export type JobLog = {
  message: string;
  createdAt: string;
};

export type Job<TPayload> = {
  id: string;
  type: string;

  // payload 是任务真正要处理的数据。
  //
  // 比如：
  // - 发邮件任务的 payload 可能是 { to, subject, content }
  // - 生成报表任务的 payload 可能是 { userId, reportType }
  payload: TPayload;

  // status 表示任务当前处于哪个阶段。
  //
  // pending：刚进入队列，还没开始处理
  // processing：worker 正在处理
  // completed：处理成功
  // failed：处理失败
  status: JobStatus;

  createdAt: string;
  updatedAt: string;

  // attempts 表示这个任务已经尝试处理了多少次。
  //
  // 任务刚进入队列时是 0。
  // 每次 processor 抛错后，worker 会把 attempts 加 1。
  attempts: number;

  // maxAttempts 表示这个任务最多允许尝试多少次。
  //
  // 如果 attempts 达到 maxAttempts，说明已经没有重试机会，
  // 任务会被标记为 failed。
  maxAttempts: number;

  // logs 记录任务处理过程中的关键事件。
  //
  // status 只表示“当前状态”，比如 completed / failed。
  // logs 则记录“过程”，比如什么时候创建、什么时候开始、什么时候完成或失败。
  logs: JobLog[];

  // idempotencyKey 用来识别“同一次业务请求”。
  //
  // 同一个 key 重复提交时，后端应该返回同一条 Job，
  // 而不是创建多条重复任务。
  idempotencyKey?: string | null;
};
