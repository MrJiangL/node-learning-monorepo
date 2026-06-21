# Task: Validate Environment Config

## 目标

现在项目已经有这些配置来源：

```text
PORT
JWT_SECRET
DATABASE_URL
```

目前 `apps/api/src/config/env.ts` 已经集中读取了一部分环境变量，但还比较宽松：

```ts
export const env = {
  PORT: Number(process.env.PORT ?? 3001),
  JWT_SECRET: process.env.JWT_SECRET ?? "dev-learning-secret-change-me"
};
```

这张任务要把它升级成“启动时校验配置”：

```text
环境变量不合法时，服务应该尽早失败，而不是运行到一半才出错。
```

这次主要学习：

- 为什么配置也需要校验。
- 如何用 Zod 校验 `process.env`。
- 为什么 secret 不能随便给生产默认值。
- `z.coerce.number()` 如何把字符串端口转成数字。
- 如何测试配置解析函数。

---

## Step 1: 改造 env.ts

打开：

```text
apps/api/src/config/env.ts
```

建议先把“读取 process.env”和“解析配置”拆开。

示例：

```ts
import { z } from "zod";

const envSchema = z.object({
  // process.env 里的值永远是 string 或 undefined。
  //
  // z.coerce.number() 会先尝试把 "3001" 转成 3001，
  // 再继续检查它是不是 int、是不是大于 0。
  PORT: z.coerce.number().int().positive().default(3001),

  // JWT_SECRET 是签名 token 的密钥。
  //
  // 学习阶段可以用 .env 提供一个本地 secret。
  // 真实项目里，生产环境必须从部署平台的环境变量读取。
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters")
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
```

学习点：

- `envSchema` 是配置的运行时规则。
- `Env` 是从 Zod schema 推导出来的 TypeScript 类型。
- `parseEnv()` 让这段逻辑可以被单元测试覆盖。

---

## Step 2: 检查 .env

打开项目根目录的：

```text
.env
```

确认里面有：

```text
JWT_SECRET=某个至少 16 位的本地开发 secret
```

注意：

- 不要把真实线上 secret 写进任务卡或聊天里。
- 不要把 `.env` 内容贴给我。
- 如果你要问我，我只需要知道“有没有设置”，不需要知道具体值。

---

## Step 3: 增加 env 单元测试

新建文件：

```text
apps/api/tests/unit/env.test.ts
```

写入：

```ts
import { describe, expect, it } from "vitest";
import { parseEnv } from "../../src/config/env.js";

describe("env config", () => {
  it("parses valid environment variables", () => {
    const env = parseEnv({
      PORT: "4000",
      JWT_SECRET: "local-test-secret-123"
    });

    // PORT 从 process.env 进来时是字符串。
    // parseEnv 后应该变成 number。
    expect(env.PORT).toBe(4000);
    expect(env.JWT_SECRET).toBe("local-test-secret-123");
  });

  it("uses default port when PORT is missing", () => {
    const env = parseEnv({
      JWT_SECRET: "local-test-secret-123"
    });

    expect(env.PORT).toBe(3001);
  });

  it("rejects a short JWT secret", () => {
    // 配置错误应该在启动阶段尽早暴露。
    //
    // 这里用很短的 secret，证明 parseEnv 会拒绝它。
    expect(() =>
      parseEnv({
        PORT: "3001",
        JWT_SECRET: "short"
      })
    ).toThrow("JWT_SECRET must be at least 16 characters");
  });

  it("rejects an invalid port", () => {
    expect(() =>
      parseEnv({
        PORT: "not-a-number",
        JWT_SECRET: "local-test-secret-123"
      })
    ).toThrow();
  });
});
```

学习点：

- 这是单元测试，不需要启动 Express。
- 它只测试配置解析函数。
- `process.env` 不适合在测试里直接改来改去，所以我们测试 `parseEnv(fakeObject)`。

---

## Step 4: 确认 token.ts 不用改

打开：

```text
apps/api/src/modules/auth/token.ts
```

它应该已经在用：

```ts
import { env } from "../../config/env.js";
```

所以 `JWT_SECRET` 的读取仍然集中在 `env.ts`。

这就是配置层的价值：

```text
业务代码只使用 env.JWT_SECRET，不直接读 process.env.JWT_SECRET。
```

---

## Step 5: 跑测试

先跑 env 单元测试：

```bash
npm run test -w @learn/api -- tests/unit/env.test.ts
```

再跑完整验证：

```bash
npm run test
npm run typecheck
npm run format:check
npm run build
```

---

## 完成标准

你完成后告诉我：

```text
环境配置校验完成了
```

我会帮你检查：

1. `env.ts` 是否用 Zod 校验配置。
2. 是否没有泄露真实 secret。
3. 测试是否覆盖有效配置、默认端口、短 secret、非法端口。
4. 全量测试、类型检查、格式检查、构建是否通过。
5. smoke 脚本是否仍然能跑通。

---

## 这张任务最重要的一句话

```text
配置错误越早失败越好。
```

如果 `JWT_SECRET` 或 `PORT` 配错，最好在服务启动时就发现，而不是等用户请求进来后才炸。
