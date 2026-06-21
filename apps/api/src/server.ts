import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { startJobWorkerLoop } from "./jobs/job-worker-loop.js";
import { jobQueue } from "./jobs/job-queue-instance.js";
import { processJobByType } from "./jobs/job-processors.js";

const app = createApp();

// server.ts 是真正启动 HTTP 服务的入口。
// 本地开发时 npm run dev 会执行这个文件。
// 测试时不会执行这个文件，因为测试只需要 createApp()，不需要监听端口。
const server = app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});

// worker loop 和 HTTP server 是同一个 Node 进程里的两个工作：
// - HTTP server 负责响应请求
// - worker loop 负责定时处理 pending job
//
// 学习阶段这样放在一起比较直观。
// 真实大型项目里，worker 通常会拆成独立进程或独立服务。

const jobWorkerLoop = env.JOB_WORKER_ENABLED
  ? startJobWorkerLoop({
      repository: jobQueue,
      processor: processJobByType,
      intervalMs: env.JOB_WORKER_INTERVAL_MS
    })
  : null;

const shutdown = () => {
  jobWorkerLoop?.stop();

  server.close(() => {
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
