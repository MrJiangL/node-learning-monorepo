import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { z } from "zod";

// API workspace 运行时的当前目录不一定是项目根目录。
//
// 所以这里显式读取 monorepo 根目录的 .env。
// 这样无论 env.ts 被谁先 import，PORT / JWT_SECRET 等配置都能稳定加载。
config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

// 这里集中管理环境变量。
//
// process.env 里的值永远来自外部世界：
// - 本地 .env
// - 终端临时变量
// - 部署平台环境变量
//
// 所以它和 request.body 一样，都不能直接相信。
// 用 Zod 在启动阶段校验配置，可以让配置错误尽早暴露。
const envSchema = z.object({
  // process.env.PORT 进来时是字符串，例如 "3001"。
  //
  // z.coerce.number() 会先尝试把字符串转成数字，
  // 再检查它是不是整数、是不是正数。
  PORT: z.coerce.number().int().positive().default(3001),

  // JWT_SECRET 是签名 token 的密钥。
  //
  // 这里不再给一个源码里的默认值。
  // 如果没有配置 JWT_SECRET，服务启动时就应该失败，
  // 这样不会在开发时悄悄使用一个弱 secret。
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),

  // NODE_ENV 用来区分运行环境。
  //
  // 当前主要用途：
  // - test：测试环境默认关闭请求日志，避免输出太吵。
  // - development：本地开发时保留请求日志。
  // - production：生产环境可以再接入更正式的日志系统。
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().trim().min(1).optional(),
  JOB_WORKER_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),

  JOB_WORKER_INTERVAL_MS: z.coerce.number().int().positive().default(1000)
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(source: NodeJS.ProcessEnv): Env {
  // parseEnv 单独导出，是为了方便测试。
  //
  // 测试时我们可以传入一个假的对象，
  // 不需要真的修改全局 process.env。
  return envSchema.parse(source);
}

export const env = parseEnv(process.env);
