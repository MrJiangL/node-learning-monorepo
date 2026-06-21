# Task: GitHub Actions CI 入门

## 背景

你已经选择下一阶段学习：

```text
CI / GitHub Actions 入门
```

当前项目本地已经有这些检查：

```bash
npm run format:check
npm run typecheck
npm test
```

这一张任务要把它们放进 GitHub Actions，让代码 push 或 PR 时自动运行。

---

## 这张任务只练什么

只练创建第一个 CI workflow：

```text
1. 安装依赖
2. 启动 MySQL service
3. 运行 Prisma migration
4. 运行 format / typecheck / test
```

---

## 学习目标

完成后你应该能说清楚：

```text
1. GitHub Actions workflow 文件放在哪里。
2. CI 为什么需要 MySQL service。
3. DATABASE_URL 和运行时代码使用的 DATABASE_HOST 等变量有什么区别。
4. 为什么 CI 要先 migrate 再跑集成测试。
```

---

## 任务 1：创建 workflow 文件

创建目录和文件：

```text
.github/workflows/ci.yml
```

写入：

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: node_learning
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping -h 127.0.0.1 -uroot -proot"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=10

    env:
      NODE_ENV: test
      JWT_SECRET: local-test-secret-123
      DATABASE_URL: mysql://root:root@127.0.0.1:3306/node_learning
      DATABASE_HOST: 127.0.0.1
      DATABASE_PORT: 3306
      DATABASE_USER: root
      DATABASE_PASSWORD: root
      DATABASE_NAME: node_learning
      JOB_WORKER_ENABLED: "false"

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma Client
        run: npm run prisma:generate -w @learn/api

      - name: Run migrations
        run: npx prisma migrate deploy --config prisma.config.ts

      - name: Check formatting
        run: npm run format:check

      - name: Typecheck
        run: npm run typecheck

      - name: Test
        run: npm test
```

---

## 任务 2：写 CI 复盘

创建：

```text
docs/reviews/github-actions-ci-intro.md
```

写下面这些小标题：

```md
# GitHub Actions CI 入门

## 1. CI 会在什么时候运行

## 2. 这个 workflow 做了哪些步骤

## 3. 为什么 CI 需要 MySQL service

## 4. 为什么要先 migrate 再 test

## 5. DATABASE_URL 和 DATABASE_HOST 有什么区别
```

第 5 节可以这样写：

```text
DATABASE_URL 给 Prisma CLI 使用，比如 migrate deploy。
DATABASE_HOST / DATABASE_USER / DATABASE_PASSWORD / DATABASE_NAME 给 API 运行时的 Prisma adapter 使用。
```

---

## 任务 3：本地验证 YAML 和项目检查

本地不能真正跑 GitHub Actions，但可以跑项目本身的检查：

```bash
npm run format:check
npm run typecheck
npm test
```

---

## 完成标准

- [x] 创建 `.github/workflows/ci.yml`
- [x] workflow 包含 MySQL service
- [x] workflow 设置 DATABASE_URL 和 DATABASE_HOST 等环境变量
- [x] workflow 运行 Prisma generate / migrate deploy
- [x] workflow 运行 format:check / typecheck / test
- [x] 创建 `docs/reviews/github-actions-ci-intro.md`
- [x] `npm run format:check` 通过
- [x] `npm run typecheck` 通过
- [x] `npm test` 通过

完成后告诉我：

```text
GitHub Actions CI 入门完成了
```
