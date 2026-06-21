import type { Job } from "./job.js";

export const processJobByType = async (job: Job<unknown>) => {
  switch (job.type) {
    case "send-email": {
      // 学习阶段先不真的发邮件。
      //
      // 真实项目里这里通常会调用邮件服务：
      // - SendGrid
      // - AWS SES
      // - Resend
      //
      // 现在只要没有 throw，worker 就会认为处理成功。
      return;
    }

    case "generate-report": {
      // 学习阶段先不真的生成报表。
      //
      // 真实项目里这里可能会：
      // - 查询数据库
      // - 生成 CSV / PDF
      // - 上传到对象存储
      //
      // 这里暂时只保留分支，让你先理解 type dispatch。
      return;
    }

    default: {
      // 不认识的 job type 不能假装成功。
      //
      // 如果这里直接 return，worker 会把未知任务标记成 completed，
      // 这会掩盖配置错误或调用方传错 type 的问题。
      throw new Error(`Unsupported job type: ${job.type}`);
    }
  }
};
