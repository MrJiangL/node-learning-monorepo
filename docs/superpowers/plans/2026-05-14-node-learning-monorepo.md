# Node Learning Monorepo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## 中文导读

这份计划是“执行用”的，所以保留了很多英文文件名、命令和代码片段。你学习时可以先看这几份中文文档：

- `README.md`：项目是什么、怎么启动、应该按什么顺序读代码。
- `docs/learning-path.md`：按周拆分的 Node.js 系统学习路线。
- `docs/api-examples.md`：用 curl 验证每个接口，并解释请求和响应是什么意思。

这份计划本身适合在你准备继续开发下一阶段功能时使用。每个 Task 都对应一个小阶段，例如 monorepo 基础、健康检查接口、统一错误处理、学习计划 API、Prisma、登录鉴权、前端工作区和 NestJS 对比项目。

如果你只是学习代码，不需要一次读完整个计划。推荐顺序是：

1. 先读 `README.md`。
2. 再读 `docs/learning-path.md`。
3. 打开 `apps/api/src/app.ts`，顺着注释理解 Express 请求流。
4. 最后回到这份计划，看下一阶段要做什么。

**Goal:** Build a systematic Node.js learning monorepo that starts with a tested Express + TypeScript API and grows into database, auth, frontend, and NestJS practice.

**Architecture:** Use `npm workspaces` to keep the toolchain simple while still learning real monorepo boundaries. The first app is `apps/api`, and shared contracts live in `packages/shared`; each learning phase adds one real capability with tests before implementation.

**Tech Stack:** Node.js 20, npm workspaces, TypeScript, Express, Zod, Vitest, Supertest, Prisma with SQLite, JWT, bcrypt, React or Next.js in a later workspace.

---

## File Structure

- `package.json` - root npm workspace scripts for build, test, typecheck, and dev.
- `tsconfig.base.json` - shared TypeScript compiler defaults.
- `apps/api/package.json` - API workspace dependencies and scripts.
- `apps/api/src/app.ts` - Express application composition.
- `apps/api/src/server.ts` - local server entrypoint.
- `apps/api/src/config/env.ts` - environment parsing.
- `apps/api/src/errors/app-error.ts` - typed HTTP error class.
- `apps/api/src/middleware/error-handler.ts` - centralized JSON error responses.
- `apps/api/src/middleware/not-found.ts` - 404 handler.
- `apps/api/src/http/async-handler.ts` - async route wrapper.
- `apps/api/src/modules/health/health.routes.ts` - health endpoint.
- `apps/api/src/modules/plans/plans.schema.ts` - Zod request validation.
- `apps/api/src/modules/plans/plans.repository.ts` - plan storage boundary.
- `apps/api/src/modules/plans/plans.service.ts` - business logic.
- `apps/api/src/modules/plans/plans.routes.ts` - REST routes.
- `apps/api/tests/integration/health.test.ts` - API smoke tests.
- `apps/api/tests/integration/plans.test.ts` - plans API behavior tests.
- `apps/api/tests/unit/plans.service.test.ts` - service unit tests.
- `packages/shared/package.json` - shared package metadata.
- `packages/shared/src/index.ts` - shared API contract types.
- `prisma/schema.prisma` - added in Task 5 for database persistence.
- `apps/web` - added in Task 8 for frontend practice.

## Learning Path

1. Restore Node and TypeScript fluency with a tiny API surface.
2. Learn Express request flow, middleware, route composition, and error handling.
3. Add Zod validation at system boundaries.
4. Add tests with Vitest and Supertest.
5. Replace memory storage with Prisma + SQLite.
6. Add authentication with JWT and bcrypt.
7. Add API documentation and endpoint examples.
8. Add a frontend workspace that consumes the API.
9. Rebuild the same API shape in NestJS to understand enterprise-style structure.

### Task 1: Monorepo Baseline

**Files:**

- Create: `package.json`
- Create: `tsconfig.base.json`
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`

- [ ] **Step 1: Create root workspace metadata**

```json
{
  "name": "node-learning-monorepo",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "npm run dev -w @learn/api",
    "build": "npm run build --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.19.0",
    "typescript": "^5.8.3",
    "vitest": "^3.1.4"
  }
}
```

- [ ] **Step 2: Create shared TypeScript defaults**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "noUncheckedIndexedAccess": true
  }
}
```

- [ ] **Step 3: Create shared package contract**

```ts
export type PlanStatus = "active" | "completed";

export type Plan = {
  id: string;
  title: string;
  description: string | null;
  status: PlanStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreatePlanInput = {
  title: string;
  description?: string;
};
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: dependencies install successfully and `package-lock.json` is created at the workspace root.

- [ ] **Step 5: Verify TypeScript project wiring**

Run: `npm run typecheck`

Expected: command exits successfully after each workspace typechecks.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.base.json apps/api packages/shared
git commit -m "chore: create node learning monorepo"
```

### Task 2: Health API

**Files:**

- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/modules/health/health.routes.ts`
- Test: `apps/api/tests/integration/health.test.ts`

- [ ] **Step 1: Write the failing health test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("GET /health", () => {
  it("returns API status", async () => {
    const app = createApp();

    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: "ok",
        service: "node-learning-api"
      }
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @learn/api -- health.test.ts`

Expected: FAIL with an import error because `src/app.ts` does not exist.

- [ ] **Step 3: Implement minimal Express app**

```ts
import express from "express";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/health", healthRouter);

  return app;
}
```

- [ ] **Step 4: Implement health route**

```ts
import { Router } from "express";

export const healthRouter = Router();

healthRouter.get("/", (_request, response) => {
  response.json({
    success: true,
    data: {
      status: "ok",
      service: "node-learning-api"
    }
  });
});
```

- [ ] **Step 5: Add server entrypoint**

```ts
import { createApp } from "./app.js";
import { env } from "./config/env.js";

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`API listening on http://localhost:${env.PORT}`);
});
```

- [ ] **Step 6: Add environment parsing**

```ts
export const env = {
  PORT: Number(process.env.PORT ?? 3001)
};
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -w @learn/api -- health.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src apps/api/tests/integration/health.test.ts
git commit -m "feat: add health endpoint"
```

### Task 3: Error Handling and 404 Responses

**Files:**

- Create: `apps/api/src/errors/app-error.ts`
- Create: `apps/api/src/middleware/error-handler.ts`
- Create: `apps/api/src/middleware/not-found.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/integration/health.test.ts`

- [ ] **Step 1: Add failing 404 test**

```ts
it("returns a JSON 404 for unknown routes", async () => {
  const app = createApp();

  const response = await request(app).get("/missing");

  expect(response.status).toBe(404);
  expect(response.body).toEqual({
    success: false,
    error: {
      code: "NOT_FOUND",
      message: "Route GET /missing was not found"
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -w @learn/api -- health.test.ts`

Expected: FAIL because Express returns its default 404 HTML response.

- [ ] **Step 3: Add AppError**

```ts
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}
```

- [ ] **Step 4: Add not-found middleware**

```ts
import type { RequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const notFound: RequestHandler = (request, _response, next) => {
  next(new AppError(404, "NOT_FOUND", `Route ${request.method} ${request.path} was not found`));
};
```

- [ ] **Step 5: Add error handler**

```ts
import type { ErrorRequestHandler } from "express";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({
      success: false,
      error: {
        code: error.code,
        message: error.message
      }
    });
    return;
  }

  response.status(500).json({
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "Unexpected server error"
    }
  });
};
```

- [ ] **Step 6: Wire middleware in app**

```ts
import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { notFound } from "./middleware/not-found.js";
import { healthRouter } from "./modules/health/health.routes.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use("/health", healthRouter);
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm run test -w @learn/api -- health.test.ts`

Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add apps/api/src apps/api/tests/integration/health.test.ts
git commit -m "feat: add json error handling"
```

### Task 4: Plans API With Zod Validation

**Files:**

- Create: `apps/api/src/http/async-handler.ts`
- Create: `apps/api/src/modules/plans/plans.schema.ts`
- Create: `apps/api/src/modules/plans/plans.repository.ts`
- Create: `apps/api/src/modules/plans/plans.service.ts`
- Create: `apps/api/src/modules/plans/plans.routes.ts`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/integration/plans.test.ts`
- Test: `apps/api/tests/unit/plans.service.test.ts`

- [ ] **Step 1: Write failing integration tests**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("plans API", () => {
  it("creates and lists learning plans", async () => {
    const app = createApp();

    const createResponse = await request(app)
      .post("/plans")
      .send({ title: "30 days of Node", description: "Rebuild backend basics" });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.success).toBe(true);
    expect(createResponse.body.data).toMatchObject({
      title: "30 days of Node",
      description: "Rebuild backend basics",
      status: "active"
    });

    const listResponse = await request(app).get("/plans");

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toHaveLength(1);
    expect(listResponse.body.data[0].title).toBe("30 days of Node");
  });

  it("rejects invalid plan input", async () => {
    const app = createApp();

    const response = await request(app).post("/plans").send({ title: "" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
  });
});
```

- [ ] **Step 2: Write failing service test**

```ts
import { describe, expect, it } from "vitest";
import { createPlanService } from "../../src/modules/plans/plans.service.js";
import { createInMemoryPlanRepository } from "../../src/modules/plans/plans.repository.js";

describe("plan service", () => {
  it("creates immutable plan records", async () => {
    const service = createPlanService(createInMemoryPlanRepository());

    const plan = await service.createPlan({
      title: "Express foundations",
      description: "Routes, middleware, and errors"
    });

    expect(plan.id).toEqual(expect.any(String));
    expect(plan.title).toBe("Express foundations");
    expect(plan.status).toBe("active");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm run test -w @learn/api -- plans`

Expected: FAIL because plans files do not exist.

- [ ] **Step 4: Add async handler**

```ts
import type { NextFunction, Request, RequestHandler, Response } from "express";

export function asyncHandler(
  handler: (request: Request, response: Response, next: NextFunction) => Promise<void>
): RequestHandler {
  return (request, response, next) => {
    void handler(request, response, next).catch(next);
  };
}
```

- [ ] **Step 5: Add plan schema**

```ts
import { z } from "zod";

export const createPlanSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required")
    .max(100, "Title must be 100 characters or less"),
  description: z.string().trim().max(1000, "Description must be 1000 characters or less").optional()
});
```

- [ ] **Step 6: Add in-memory repository**

```ts
import type { CreatePlanInput, Plan } from "@learn/shared";

export type PlanRepository = {
  create(input: CreatePlanInput): Promise<Plan>;
  findAll(): Promise<Plan[]>;
};

export function createInMemoryPlanRepository(): PlanRepository {
  let plans: Plan[] = [];

  return {
    async create(input) {
      const now = new Date().toISOString();
      const plan: Plan = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: "active",
        createdAt: now,
        updatedAt: now
      };

      plans = [...plans, plan];
      return plan;
    },
    async findAll() {
      return [...plans];
    }
  };
}
```

- [ ] **Step 7: Add service**

```ts
import type { CreatePlanInput } from "@learn/shared";
import type { PlanRepository } from "./plans.repository.js";

export function createPlanService(planRepository: PlanRepository) {
  return {
    createPlan(input: CreatePlanInput) {
      return planRepository.create(input);
    },
    listPlans() {
      return planRepository.findAll();
    }
  };
}
```

- [ ] **Step 8: Add routes**

```ts
import { Router } from "express";
import { ZodError } from "zod";
import { AppError } from "../../errors/app-error.js";
import { asyncHandler } from "../../http/async-handler.js";
import { createInMemoryPlanRepository } from "./plans.repository.js";
import { createPlanSchema } from "./plans.schema.js";
import { createPlanService } from "./plans.service.js";

export const plansRouter = Router();
const planService = createPlanService(createInMemoryPlanRepository());

plansRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const plans = await planService.listPlans();
    response.json({ success: true, data: plans });
  })
);

plansRouter.post(
  "/",
  asyncHandler(async (request, response) => {
    try {
      const input = createPlanSchema.parse(request.body);
      const plan = await planService.createPlan(input);
      response.status(201).json({ success: true, data: plan });
    } catch (error) {
      if (error instanceof ZodError) {
        throw new AppError(
          400,
          "VALIDATION_ERROR",
          error.issues[0]?.message ?? "Invalid request body"
        );
      }
      throw error;
    }
  })
);
```

- [ ] **Step 9: Wire plans route into app**

```ts
app.use("/plans", plansRouter);
```

- [ ] **Step 10: Run tests to verify they pass**

Run: `npm run test -w @learn/api`

Expected: PASS.

- [ ] **Step 11: Commit**

```bash
git add apps/api/src apps/api/tests packages/shared/src/index.ts
git commit -m "feat: add validated plans api"
```

### Task 5: Prisma Persistence With SQLite

**Files:**

- Create: `prisma/schema.prisma`
- Create: `apps/api/src/modules/plans/prisma-plans.repository.ts`
- Modify: `apps/api/src/modules/plans/plans.routes.ts`
- Modify: `apps/api/package.json`
- Test: `apps/api/tests/integration/plans.test.ts`

- [ ] **Step 1: Add Prisma dependencies**

Run: `npm install @prisma/client -w @learn/api && npm install prisma -D -w @learn/api`

Expected: Prisma packages are added to `apps/api/package.json`.

- [ ] **Step 2: Create schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite"
  url      = env("DATABASE_URL")
}

model Plan {
  id          String   @id @default(cuid())
  title       String
  description String?
  status      String   @default("active")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

- [ ] **Step 3: Add database URL**

Create `.env`:

```bash
DATABASE_URL="file:./dev.db"
PORT=3001
```

- [ ] **Step 4: Run migration**

Run: `npx prisma migrate dev --name init`

Expected: migration file is created and Prisma Client is generated.

- [ ] **Step 5: Implement Prisma repository**

```ts
import { PrismaClient } from "@prisma/client";
import type { CreatePlanInput, Plan } from "@learn/shared";
import type { PlanRepository } from "./plans.repository.js";

const prisma = new PrismaClient();

function toPlan(record: {
  id: string;
  title: string;
  description: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}): Plan {
  return {
    id: record.id,
    title: record.title,
    description: record.description,
    status: record.status === "completed" ? "completed" : "active",
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function createPrismaPlanRepository(): PlanRepository {
  return {
    async create(input: CreatePlanInput) {
      const record = await prisma.plan.create({
        data: {
          title: input.title,
          description: input.description ?? null
        }
      });
      return toPlan(record);
    },
    async findAll() {
      const records = await prisma.plan.findMany({
        orderBy: { createdAt: "desc" }
      });
      return records.map(toPlan);
    }
  };
}
```

- [ ] **Step 6: Switch route to Prisma repository**

```ts
const planService = createPlanService(createPrismaPlanRepository());
```

- [ ] **Step 7: Run tests**

Run: `npm run test -w @learn/api`

Expected: PASS after tests use an isolated SQLite database or reset test data in `beforeEach`.

- [ ] **Step 8: Commit**

```bash
git add apps/api prisma package.json package-lock.json
git commit -m "feat: persist plans with prisma"
```

### Task 6: Authentication Foundation

**Files:**

- Create: `apps/api/src/modules/auth/auth.schema.ts`
- Create: `apps/api/src/modules/auth/auth.repository.ts`
- Create: `apps/api/src/modules/auth/auth.service.ts`
- Create: `apps/api/src/modules/auth/auth.routes.ts`
- Create: `apps/api/src/middleware/require-auth.ts`
- Modify: `prisma/schema.prisma`
- Modify: `apps/api/src/app.ts`
- Test: `apps/api/tests/integration/auth.test.ts`

- [ ] **Step 1: Add auth dependencies**

Run: `npm install bcryptjs jsonwebtoken -w @learn/api && npm install @types/jsonwebtoken -D -w @learn/api`

Expected: dependencies install successfully.

- [ ] **Step 2: Write failing auth test**

```ts
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("auth API", () => {
  it("registers and logs in a user", async () => {
    const app = createApp();

    const registerResponse = await request(app)
      .post("/auth/register")
      .send({ email: "learner@example.com", password: "Password123!" });

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body.data.email).toBe("learner@example.com");

    const loginResponse = await request(app)
      .post("/auth/login")
      .send({ email: "learner@example.com", password: "Password123!" });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.data.token).toEqual(expect.any(String));
  });
});
```

- [ ] **Step 3: Extend Prisma schema**

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

- [ ] **Step 4: Add auth schemas**

```ts
import { z } from "zod";

export const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128)
});
```

- [ ] **Step 5: Implement auth service**

```ts
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { AppError } from "../../errors/app-error.js";

export function createAuthService(authRepository: AuthRepository, jwtSecret: string) {
  return {
    async register(email: string, password: string) {
      const existingUser = await authRepository.findByEmail(email);
      if (existingUser) {
        throw new AppError(409, "EMAIL_TAKEN", "Email is already registered");
      }

      const passwordHash = await bcrypt.hash(password, 12);
      return authRepository.createUser(email, passwordHash);
    },
    async login(email: string, password: string) {
      const user = await authRepository.findByEmail(email);
      if (!user) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      const passwordMatches = await bcrypt.compare(password, user.passwordHash);
      if (!passwordMatches) {
        throw new AppError(401, "INVALID_CREDENTIALS", "Invalid email or password");
      }

      return jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: "1h" });
    }
  };
}
```

- [ ] **Step 6: Run tests**

Run: `npm run test -w @learn/api`

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api prisma package.json package-lock.json
git commit -m "feat: add authentication"
```

### Task 7: Documentation and Practice Log

**Files:**

- Create: `README.md`
- Create: `docs/learning-path.md`
- Create: `docs/api-examples.md`

- [ ] **Step 1: Create README**

```md
# Node Learning Monorepo

This repository is a hands-on path for relearning Node.js through real backend features.

## Commands

- `npm install`
- `npm run dev`
- `npm run test`
- `npm run typecheck`

## Workspaces

- `apps/api` - Express + TypeScript API
- `packages/shared` - shared types
```

- [ ] **Step 2: Create learning path**

```md
# Learning Path

## Week 1

- Restore TypeScript basics.
- Understand Express request and response flow.
- Write tests for `/health` and `/plans`.

## Week 2

- Learn Prisma schema design.
- Persist plans in SQLite.
- Practice migrations and data reset.

## Week 3

- Add authentication.
- Protect plan routes.
- Learn JWT risks and password hashing.

## Week 4

- Add a frontend workspace.
- Consume the API from a browser UI.
- Deploy the API and frontend.
```

- [ ] **Step 3: Create API examples**

````md
# API Examples

## Health

```bash
curl http://localhost:3001/health
```
````

## Create Plan

```bash
curl -X POST http://localhost:3001/plans \
  -H "Content-Type: application/json" \
  -d '{"title":"30 days of Node","description":"Rebuild backend basics"}'
```

````

- [ ] **Step 4: Commit**

```bash
git add README.md docs
git commit -m "docs: add learning guide"
````

### Task 8: Frontend Workspace

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/src/App.tsx`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/api/plans.ts`

- [ ] **Step 1: Create Vite React app workspace**

Run: `npm create vite@latest apps/web -- --template react-ts`

Expected: `apps/web` contains a Vite React TypeScript app.

- [ ] **Step 2: Add API client**

```ts
import type { CreatePlanInput, Plan } from "@learn/shared";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export async function listPlans(): Promise<Plan[]> {
  const response = await fetch(`${API_BASE_URL}/plans`);
  const body = await response.json();
  return body.data;
}

export async function createPlan(input: CreatePlanInput): Promise<Plan> {
  const response = await fetch(`${API_BASE_URL}/plans`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  const body = await response.json();
  return body.data;
}
```

- [ ] **Step 3: Implement first screen**

```tsx
import { useEffect, useState } from "react";
import type { Plan } from "@learn/shared";
import { createPlan, listPlans } from "./api/plans";

export function App() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    void listPlans().then(setPlans);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const plan = await createPlan({ title });
    setPlans((currentPlans) => [plan, ...currentPlans]);
    setTitle("");
  }

  return (
    <main>
      <h1>Node Learning Plans</h1>
      <form onSubmit={handleSubmit}>
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
        <button type="submit">Create</button>
      </form>
      <ul>
        {plans.map((plan) => (
          <li key={plan.id}>{plan.title}</li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web package.json package-lock.json
git commit -m "feat: add web workspace"
```

### Task 9: NestJS Comparison App

**Files:**

- Create: `apps/nest-api/package.json`
- Create: `apps/nest-api/src/main.ts`
- Create: `apps/nest-api/src/app.module.ts`
- Create: `apps/nest-api/src/plans/plans.controller.ts`
- Create: `apps/nest-api/src/plans/plans.service.ts`

- [ ] **Step 1: Create Nest app workspace**

Run: `npx @nestjs/cli new apps/nest-api --package-manager npm --skip-git`

Expected: NestJS app is created under `apps/nest-api`.

- [ ] **Step 2: Recreate health and plans routes**

```ts
import { Controller, Get } from "@nestjs/common";

@Controller("health")
export class HealthController {
  @Get()
  getHealth() {
    return {
      success: true,
      data: {
        status: "ok",
        service: "node-learning-nest-api"
      }
    };
  }
}
```

- [ ] **Step 3: Compare concepts in docs**

Add this table to `docs/learning-path.md`:

```md
## Express to NestJS Mapping

| Express Concept    | NestJS Concept                   |
| ------------------ | -------------------------------- |
| Router             | Controller                       |
| Middleware         | Middleware / Guard / Interceptor |
| Service factory    | Injectable service               |
| Manual validation  | Pipe with DTO                    |
| app.ts composition | Module graph                     |
```

- [ ] **Step 4: Commit**

```bash
git add apps/nest-api docs/learning-path.md package.json package-lock.json
git commit -m "feat: add nestjs comparison app"
```

## Self-Review

- Spec coverage: The user asked for a project, a plan, systematic Node learning, and preferably monorepo. Tasks cover monorepo setup, API foundations, testing, validation, database, auth, documentation, frontend, and NestJS comparison.
- Placeholder scan: The plan avoids undefined placeholder instructions and includes concrete file paths, commands, and code examples.
- Type consistency: Shared types are defined in `@learn/shared` before API tasks import them. Route, repository, and service names stay consistent across tasks.

## Execution Options

Plan complete and saved to `docs/superpowers/plans/2026-05-14-node-learning-monorepo.md`. Two execution options:

1. **Subagent-Driven (recommended)** - Dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints.
