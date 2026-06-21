# Task: Prisma + SQLite Persistence

## 目标

把当前的内存数组存储，升级成 Prisma + SQLite 数据库存储。

这次主要学习：

- Prisma 是什么，解决什么问题
- SQLite 为什么适合学习阶段
- `schema.prisma` 如何定义数据表
- migration 是什么
- Prisma Client 如何生成
- 为什么 repository 接口能让我们平滑替换存储实现

这张任务卡对应总计划：

```text
Task 5: Prisma Persistence With SQLite
```

先不要一次性把所有路由都切到 Prisma。第一张 Prisma 任务只做“初始化 + 建表 + 能跑起来”，下一张任务再替换 repository。

## 最终效果

项目里会新增：

```text
prisma.config.ts
prisma/schema.prisma
prisma/migrations/...
apps/api/src/db/prisma.ts
```

并且这些命令可以正常运行：

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api
npm run typecheck
npm run test
```

## 涉及文件

你需要修改：

- `apps/api/package.json`

你需要新增：

- `prisma.config.ts`
- `prisma/schema.prisma`
- `apps/api/src/db/prisma.ts`

暂时不要修改：

- `apps/api/src/modules/plans/plans.repository.ts`
- `apps/api/src/modules/plans/plans.routes.ts`

原因：这张任务先把数据库基础设施搭好。下一张任务再做真正的 repository 替换，这样每一步都比较清楚。

---

## Step 1: 安装 Prisma

在项目根目录运行：

```bash
npm install prisma --save-dev -w @learn/api
npm install @prisma/client -w @learn/api
npm install @prisma/adapter-better-sqlite3 better-sqlite3 dotenv -w @learn/api
```

学习点：

- `prisma` 是开发工具，用来生成 client、执行 migration。
- `@prisma/client` 是运行时代码，API 服务运行时会 import 它。
- Prisma 7 连接 SQLite 时，需要用 `@prisma/adapter-better-sqlite3` 把数据库 driver 传给 `PrismaClient`。
- `dotenv` 用来显式读取项目根目录 `.env`，避免 workspace 当前目录不同导致环境变量读不到。
- `-w @learn/api` 表示把依赖安装到 API workspace。

---

## Step 2: 给 API workspace 加脚本

打开：

```text
apps/api/package.json
```

在 `scripts` 里新增：

```json
{
  "prisma:generate": "prisma generate --config ../../prisma.config.ts",
  "prisma:migrate": "prisma migrate dev --config ../../prisma.config.ts"
}
```

注意：不要删除已有脚本，只是追加。

学习点：

- Prisma 7 推荐用 `prisma.config.ts` 管理 schema、migration 路径和 datasource。
- API workspace 在 `apps/api`，所以脚本里的 config 相对路径是 `../../prisma.config.ts`。

---

## Step 3: 创建 Prisma config

新增文件：

```text
prisma.config.ts
```

写入：

```ts
import { config } from "dotenv";
import { fileURLToPath } from "node:url";
import { defineConfig, env } from "prisma/config";

// npm workspace 脚本运行时，当前目录通常是 apps/api。
// 这里显式读取项目根目录的 .env，避免 Prisma 找不到 DATABASE_URL。
config({ path: fileURLToPath(new URL(".env", import.meta.url)) });

export default defineConfig({
  schema: "prisma/schema.prisma",
  engine: "classic",
  migrations: {
    path: "prisma/migrations"
  },
  datasource: {
    url: env("DATABASE_URL")
  }
});
```

学习点：

- Prisma 7 不再把 datasource `url` 写在 `schema.prisma` 里。
- `schema` 指向 Prisma schema 文件。
- `migrations.path` 指向 migration 文件夹。
- `datasource.url` 从 `.env` 读取数据库连接串。
- `engine: "classic"` 让当前学习项目使用更稳定的经典引擎。

---

## Step 4: 创建 Prisma schema

新增文件：

```text
prisma/schema.prisma
```

写入：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
}

model Plan {
  id          String   @id
  title       String
  description String?
  status      String
  difficulty  String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

学习点：

- `model Plan` 会变成数据库里的 `Plan` 表。
- `String?` 表示可空，对应现在 API 里的 `description: string | null`。
- `@updatedAt` 会在更新时自动刷新时间。
- 这里暂时用 `String` 表示 status/difficulty，后面再学习 Prisma enum。
- Prisma 7 的 `schema.prisma` 这里只保留 provider，不再写 `url = env("DATABASE_URL")`。

---

## Step 5: 配置 DATABASE_URL

在项目根目录新增或修改：

```text
.env
```

加入：

```env
DATABASE_URL="file:./dev.db"
```

学习点：

- SQLite 数据库就是一个本地文件。
- `file:./dev.db` 表示 Prisma 会在项目根目录附近创建开发数据库文件。
- `.env` 通常不提交真实密钥；不过 SQLite 学习库没有敏感信息，后面我们再专门整理 `.gitignore` 和环境变量策略。

---

## Step 6: 生成 Prisma Client

运行：

```bash
npm run prisma:generate -w @learn/api
```

预期：

```text
Generated Prisma Client
```

如果报 `Environment variable not found: DATABASE_URL`，回去检查 `.env` 是否在项目根目录。

---

## Step 7: 创建 migration

运行：

```bash
npm run prisma:migrate -w @learn/api -- --name create_plan
```

预期会生成类似：

```text
prisma/migrations/xxxx_create_plan/migration.sql
```

学习点：

- migration 是数据库结构变化记录。
- 以后别人拉项目，不需要手动建表，只需要执行 migration。

---

## Step 8: 创建 Prisma Client 入口

新增文件：

```text
apps/api/src/db/prisma.ts
```

写入：

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

// src/db/prisma.ts 位于 apps/api/src/db。
// 这里往上四层回到项目根目录读取 .env。
config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db"
});

// 这个文件先集中创建 PrismaClient。
//
// 以后 repository 要访问数据库时，从这里 import prisma。
// 这样数据库连接创建的位置是统一的，不会散落在各个模块里。
export const prisma = new PrismaClient({ adapter });
```

学习点：

- `PrismaClient` 是 Prisma 生成的数据库访问对象。
- Prisma 7 direct connection 需要传 `adapter`。
- 先集中放在 `src/db/prisma.ts`，后面更容易管理连接生命周期。

---

## Step 9: 跑验证

运行：

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api -- --name create_plan
npm run typecheck
npm run test
npm run format:check
npm run build
```

如果格式检查失败，运行：

```bash
npm run format
```

再重新跑：

```bash
npm run format:check
```

## 完成标准

你完成后告诉我：

```text
Prisma 初始化完成了
```

我会帮你：

1. 检查 Prisma schema 和 migration。
2. 跑完整验证。
3. 给 Prisma 相关代码补中文注释。
4. 出下一张任务卡：用 Prisma repository 替换内存 repository。
