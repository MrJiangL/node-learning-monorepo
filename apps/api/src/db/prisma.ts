import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// API workspace 运行时的当前目录不一定是项目根目录。
// 所以这里显式读取根目录 .env，避免 DATABASE_HOST / DATABASE_PASSWORD 等配置读不到。
config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

// Prisma 7 direct connection 需要显式传入 driver adapter。
//
// MySQL 是一个网络数据库，不像 SQLite 那样只是一个本地文件。
// 所以这里用拆开的 host/port/user/password/database 连接信息创建 adapter。
// DATABASE_URL 仍然保留给 Prisma CLI 和 migration 使用。
const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "node_learning",
  connectionLimit: 5
});

export const prisma = new PrismaClient({ adapter });
