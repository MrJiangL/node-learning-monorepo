# Node 系统学习 Monorepo

这个项目是给你系统性学习 Node.js 用的练习仓库。它不是只写几个零散 demo，而是按真实项目的方式，把后端 API、类型系统、参数校验、测试、数据库、鉴权、前端接入这些能力一步一步串起来。

当前第一阶段已经搭好：

- `npm workspaces` monorepo
- `apps/api`：Express + TypeScript 后端 API
- `packages/shared`：多个应用共享的类型定义
- `/health`：健康检查接口
- `/plans`：学习计划接口
- Zod 参数校验
- 统一 JSON 错误处理
- Vitest + Supertest 自动化测试

## 目录结构

```text
node-learning-monorepo/
  apps/
    api/              # 后端 API 项目，先用 Express 学 Node 后端基础
  packages/
    shared/           # 共享类型，例如 Plan、CreatePlanInput
  docs/
    learning-path.md  # 中文学习路线
    api-examples.md   # 接口调用示例
```

## 常用命令

先进入项目目录：

```bash
cd /Users/jianglin/project/node/node-learning-monorepo
```

安装依赖：

```bash
npm install
```

启动后端开发服务：

```bash
npm run dev
```

服务默认运行在：

```text
http://localhost:3001
```

运行测试：

```bash
npm run test
```

检查 TypeScript 类型：

```bash
npm run typecheck
```

构建项目：

```bash
npm run build
```

## 推荐学习方式

你可以按这个顺序读代码：

1. 先读 [packages/shared/src/index.ts](/Users/jianglin/project/node/node-learning-monorepo/packages/shared/src/index.ts)，理解共享类型。
2. 再读 [apps/api/src/app.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/app.ts)，理解 Express 应用是怎么组装的。
3. 再读 [apps/api/src/modules/health/health.routes.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/health/health.routes.ts)，从最简单的接口入手。
4. 然后读 [apps/api/src/modules/plans/plans.routes.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/src/modules/plans/plans.routes.ts)，看一次完整请求如何经过校验、业务逻辑、数据层。
5. 最后读测试文件，尤其是 [apps/api/tests/integration/plans.test.ts](/Users/jianglin/project/node/node-learning-monorepo/apps/api/tests/integration/plans.test.ts)，理解“我们希望接口表现成什么样”。

## 第一阶段目标

第一阶段不要急着学很多框架。先把这条链路看懂：

```text
HTTP 请求
  -> Express 路由
  -> Zod 校验请求体
  -> Service 处理业务规则
  -> Repository 保存/读取数据
  -> 统一 JSON 响应
  -> 测试验证行为
```

这条链路熟了之后，再进入 Prisma、登录鉴权、前端页面、NestJS 对比学习。

## 动手练习

如果你想更深入理解 Zod，可以先做这个练习：

[docs/zod-lab.md](/Users/jianglin/project/node/node-learning-monorepo/docs/zod-lab.md)

练习命令：

```bash
npm run lab:zod -w @learn/api
```

这个练习一开始会失败，这是故意设计的。你需要亲手修改 `apps/api/src/exercises/zod-lab.ts`，把失败测试修到通过。

完成 Zod 基础练习后，再做这个真实接口练习：

[docs/difficulty-feature-lab.md](/Users/jianglin/project/node/node-learning-monorepo/docs/difficulty-feature-lab.md)

练习命令：

```bash
npm run lab:difficulty -w @learn/api
```

完整计划在：

[2026-05-14-node-learning-monorepo.md](/Users/jianglin/project/node/node-learning-monorepo/docs/superpowers/plans/2026-05-14-node-learning-monorepo.md)
