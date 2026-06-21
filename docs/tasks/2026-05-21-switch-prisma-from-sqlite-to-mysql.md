# Task: Switch Prisma From SQLite To MySQL

## 目标

把当前 Prisma 数据库从 SQLite 切换到你本地的 MySQL。

这次主要学习：

- MySQL 连接信息怎么写
- Prisma 的 `provider` 如何从 `sqlite` 切到 `mysql`
- Prisma 7 为什么把 datasource URL 放在 `prisma.config.ts`
- Prisma 7 direct connection 为什么需要 driver adapter
- 为什么 SQLite migration 不能直接拿去给 MySQL 用
- 如何重新生成 MySQL migration

这张任务卡会先处理“数据库基础设施切换”，先不要改 repository 业务逻辑。
切完 MySQL 后，再回到 repository 单元测试。

## 最终效果

这些命令能在本地 MySQL 上通过：

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api -- --name init_mysql
npm run test
npm run typecheck
npm run format:check
npm run build
```

并且 `plans` API 背后的数据写入 MySQL，而不是 SQLite 的 `dev.db`。

## 你需要先准备的信息

你不用把密码发给我。你自己写到 `.env` 就可以。

先确认这些信息：

```text
host: localhost
port: 3306
user: root 或你的 MySQL 用户名
password: 你的 MySQL 密码
database: node_learning
```

如果你还没有建库，可以在 MySQL 里执行：

```sql
CREATE DATABASE node_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

学习点：

- MySQL 需要先有一个 database，Prisma migration 会在这个 database 里建表。
- `utf8mb4` 可以更好地支持中文和 emoji。

---

## Step 1: 替换数据库 adapter 依赖

当前项目里有 SQLite adapter：

```text
@prisma/adapter-better-sqlite3
better-sqlite3
```

切 MySQL 后，用 Prisma 7 的 MariaDB/MySQL adapter。

运行：

```bash
npm uninstall @prisma/adapter-better-sqlite3 better-sqlite3 -w @learn/api
npm install @prisma/adapter-mariadb dotenv -w @learn/api
```

学习点：

- Prisma 7 的 direct database connection 需要 adapter。
- `@prisma/adapter-mariadb` 可以连接 MySQL/MariaDB。
- `dotenv` 继续用于读取项目根目录 `.env`。

---

## Step 2: 修改 `.env`

打开项目根目录：

```text
.env
```

把 SQLite 配置：

```env
DATABASE_URL="file:./dev.db"
```

改成 MySQL 配置。示例：

```env
DATABASE_URL="mysql://root:你的密码@localhost:3306/node_learning"
DATABASE_HOST="localhost"
DATABASE_PORT="3306"
DATABASE_USER="root"
DATABASE_PASSWORD="你的密码"
DATABASE_NAME="node_learning"
```

注意：

- 密码里如果有特殊字符，例如 `@`、`#`、`:`、`/`，`DATABASE_URL` 里可能需要 URL encode。
- 你不需要把真实密码告诉我。
- 后面我检查时，只看字段是否存在，不需要看密码内容。

学习点：

- `DATABASE_URL` 给 Prisma CLI/migration 使用。
- `DATABASE_HOST`、`DATABASE_USER` 这些拆开的字段给运行时 adapter 使用。

---

## Step 3: 修改 Prisma schema

打开：

```text
prisma/schema.prisma
```

把 datasource 改成：

```prisma
datasource db {
  provider = "mysql"
}
```

保持 `model Plan` 暂时不变。

学习点：

- Prisma 7 里 `schema.prisma` 不写 `url`。
- `provider = "mysql"` 告诉 Prisma 用 MySQL 方言生成 migration。

---

## Step 4: 修改 Prisma Client 入口

打开：

```text
apps/api/src/db/prisma.ts
```

把 SQLite adapter 改成 MySQL/MariaDB adapter。

参考：

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { config } from "dotenv";
import { fileURLToPath } from "node:url";

config({ path: fileURLToPath(new URL("../../../../.env", import.meta.url)) });

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER ?? "root",
  password: process.env.DATABASE_PASSWORD ?? "",
  database: process.env.DATABASE_NAME ?? "node_learning",
  connectionLimit: 5
});

export const prisma = new PrismaClient({ adapter });
```

学习点：

- SQLite 是本地文件，所以以前要处理 `file:./dev.db` 的相对路径。
- MySQL 是网络连接，所以这里用 host/port/user/password/database。
- repository 不用知道这些连接细节，只 import `prisma`。

---

## Step 5: 处理旧 SQLite migration

当前 `prisma/migrations` 是 SQLite 方言生成的。MySQL 不能直接复用。

学习项目里推荐先备份旧 migration：

```bash
mv prisma/migrations prisma/migrations-sqlite-backup
mkdir -p prisma/migrations
```

如果你确认不需要 SQLite 数据库文件，也可以清理：

```bash
rm -f dev.db dev.db.generated-by-db-push.bak
```

学习点：

- migration 是数据库方言相关的。
- SQLite 的 `DATETIME`、MySQL 的字段类型和约束生成方式不完全一样。
- 切数据库时，最好重新生成一套新的 migration。

---

## Step 6: 生成 MySQL migration

运行：

```bash
npm run prisma:generate -w @learn/api
npm run prisma:migrate -w @learn/api -- --name init_mysql
```

预期：

```text
prisma/migrations/xxxx_init_mysql/migration.sql
```

里面应该是 MySQL 方言，例如可能出现：

```sql
CREATE TABLE `Plan` ...
```

学习点：

- MySQL 通常用反引号包表名/字段名。
- 这说明你现在生成的是 MySQL migration，不是 SQLite migration。

---

## Step 7: 跑验证

运行：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

如果格式检查失败：

```bash
npm run format
npm run format:check
```

## 常见报错

`Access denied for user`

说明用户名或密码不对，检查 `.env`。

`Unknown database 'node_learning'`

说明还没有创建 database，先执行：

```sql
CREATE DATABASE node_learning CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

`Can't connect to MySQL server`

说明 MySQL 服务没启动，或者 host/port 不对。

`P1012` / datasource url 相关错误

确认 `schema.prisma` 里没有 `url = env("DATABASE_URL")`，Prisma 7 的 URL 应该放在 `prisma.config.ts`。

## 完成标准

你完成后告诉我：

```text
MySQL 切换完成了
```

我会帮你：

1. 检查 MySQL migration 是否正确。
2. 跑完整验证。
3. 补中文注释。
4. 回到下一张任务：Prisma repository 单元测试。
