# GitHub Actions CI 入门

## 1. CI 会在什么时候运行

这个 workflow 会在下面两种情况运行：

```text
1. push：代码推送到 GitHub 时。
2. pull_request：有人创建或更新 PR 时。
```

它的目标是自动执行本地常见检查，避免代码只有“我本地能跑”，但别人或 CI 环境跑不起来。

## 2. 这个 workflow 做了哪些步骤

这个 workflow 做了这些事：

```text
1. Checkout 代码
2. 安装 Node 20
3. npm ci 安装依赖
4. 启动 MySQL service
5. 启动 Redis service
6. 生成 Prisma Client
7. 执行 Prisma migration
8. 运行 format:check
9. 运行 typecheck
10. 运行 npm test
```

## 3. 为什么 CI 需要 MySQL service

因为项目里有很多集成测试会访问真实 MySQL。

比如 Prisma repository、API 集成测试、Job repository 测试，都不是纯内存测试。

如果 CI 没有 MySQL service，这些测试会因为连不上数据库而失败。

另外，全量 `npm test` 里也包含 Redis 相关测试，所以 CI 也需要 Redis service。

## 4. 为什么要先 migrate 再 test

测试运行前，数据库里必须有最新表结构。

CI 是一个干净环境，MySQL service 刚启动时只有空数据库，没有项目表。

所以要先执行：

```bash
npx prisma migrate deploy --config prisma.config.ts
```

再执行：

```bash
npm test
```

否则测试访问 `User`、`Project`、`Job` 这些表时，数据库可能还没有表。

## 5. DATABASE_URL 和 DATABASE_HOST 有什么区别

DATABASE_URL 给 Prisma CLI 使用，比如：

```text
prisma migrate deploy
prisma generate
```

DATABASE_HOST / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME 给 API 运行时的 Prisma adapter 使用。

原因是当前项目里：

```text
prisma.config.ts 使用 DATABASE_URL。
apps/api/src/db/prisma.ts 使用 DATABASE_HOST 等字段创建 MariaDB adapter。
```

所以 CI 里两套都要配置。
