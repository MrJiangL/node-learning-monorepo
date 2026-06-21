# Task: 后端进阶预备：Redis 连接入门

## 背景

你已经完成了测试金字塔复盘，下一阶段可以开始接触 Redis。

但第一步不要直接做缓存。

先解决一个更基础的问题：

```text
Node 后端怎么连接一个外部 Redis 服务？
```

这张任务只做 Redis 入门连接，不改 Project / Todo 业务逻辑。

---

## 你会练到什么

- Redis 在后端里通常用来做什么
- Node 项目如何安装 Redis client
- `REDIS_URL` 环境变量怎么设计
- 如何封装一个 Redis client 模块
- 如何写一个最小脚本验证 Redis 连接
- 为什么连接外部服务要显式 `connect()` 和 `quit()`

---

## 任务 1：确认本机 Redis 是否可用

先在终端运行：

```bash
redis-cli ping
```

如果返回：

```text
PONG
```

说明本机 Redis 已经在跑。

如果提示：

```text
zsh: command not found: redis-cli
```

说明你还没有安装 Redis 命令行工具。

你的机器如果有 Homebrew，推荐直接安装 Redis：

```bash
brew install redis
```

安装完成后，先启动 Redis：

```bash
brew services start redis
```

再验证：

```bash
redis-cli ping
```

如果返回：

```text
PONG
```

说明 Redis 已经安装并启动成功。

如果你不想让 Redis 后台常驻，也可以不用 `brew services start redis`，改用临时启动：

```bash
redis-server
```

但这种方式会占住当前终端窗口。学习阶段更推荐先用：

```bash
brew services start redis
```

如果你的机器没有 Homebrew，也先告诉我，我们再换一种方式。

---

## 任务 2：安装 Redis client

当前 npm 上 `redis` 包版本是 `6.0.0`。

在 monorepo 根目录运行：

```bash
npm install redis -w @learn/api
```

安装后检查：

```bash
cat apps/api/package.json
```

确认 dependencies 里出现：

```json
"redis": "^6.0.0"
```

---

## 任务 3：给 `.env` 增加 REDIS_URL

打开：

```text
.env
```

新增：

```env
REDIS_URL=redis://localhost:6379
```

注意：

```text
不要把真实密码、云 Redis 连接串发给我。
```

如果以后用云 Redis，这个值可能会包含账号密码，那就只存在本地 `.env`。

---

## 任务 4：创建 Redis client 模块

创建：

```text
apps/api/src/cache/redis-client.ts
```

写入：

```ts
import { createClient } from "redis";

// Redis 是一个外部服务，不像普通对象一样创建后就能直接用。
//
// 这里先只封装 client 的创建逻辑：
// - url 来自 REDIS_URL
// - 如果没有配置，就默认连本机 Redis
//
// 后续我们做缓存时，会复用这个 client。
export const createRedisClient = () => {
  return createClient({
    url: process.env.REDIS_URL ?? "redis://localhost:6379"
  });
};
```

这一步先不在 app 里自动连接 Redis。

原因是：

```text
只要应用启动就强依赖 Redis，会让本地开发和测试更容易被 Redis 状态影响。
```

我们先用脚本单独验证连接。

---

## 任务 5：创建 Redis ping 脚本

创建：

```text
apps/api/src/scripts/redis-ping.ts
```

写入：

```ts
import "dotenv/config";
import { createRedisClient } from "../cache/redis-client.js";

const client = createRedisClient();

try {
  // connect() 会真正建立到 Redis server 的连接。
  await client.connect();

  // ping() 是最小健康检查。
  // 如果 Redis 正常，通常会返回 "PONG"。
  const result = await client.ping();

  console.log(`Redis ping result: ${result}`);
} finally {
  // 脚本结束前主动断开连接。
  //
  // 如果不 quit，Node 进程可能会因为连接还开着而不退出。
  await client.quit();
}
```

---

## 任务 6：给 package.json 增加脚本

打开：

```text
apps/api/package.json
```

在 `scripts` 里新增：

```json
"redis:ping": "tsx src/scripts/redis-ping.ts"
```

注意 JSON 逗号。

---

## 任务 7：运行验证

先跑 Redis ping：

```bash
npm run redis:ping -w @learn/api
```

期望看到：

```text
Redis ping result: PONG
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

再跑构建：

```bash
npm run build -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 本机 Redis 可以返回 `PONG`
- [ ] `@learn/api` 安装了 `redis`
- [ ] `.env` 增加 `REDIS_URL=redis://localhost:6379`
- [ ] 创建 `apps/api/src/cache/redis-client.ts`
- [ ] 创建 `apps/api/src/scripts/redis-ping.ts`
- [ ] `apps/api/package.json` 增加 `redis:ping`
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run build -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Redis 连接入门完成了
```
