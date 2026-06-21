import { describe, expect, it } from "vitest";
import { AppError } from "../../src/errors/app-error.js";
import { createInMemoryPlanRepository } from "../../src/modules/plans/plans.repository.js";
import { createPlanService } from "../../src/modules/plans/plans.service.js";

describe("plan service", () => {
  it("creates immutable plan records", async () => {
    const service = createPlanService(createInMemoryPlanRepository());

    // service 不应该相信客户端传来的 userId。
    //
    // 这里的 currentUserId 模拟 requireAuth 从 JWT 中解析出的登录用户 id。
    // 真实请求里它来自 request.user.id。
    const currentUserId = "user-1";

    const plan = await service.createPlan(
      {
        title: "Express foundations",
        description: "Routes, middleware, and errors"
      },
      currentUserId
    );

    expect(plan.id).toEqual(expect.any(String));
    expect(plan.title).toBe("Express foundations");
    expect(plan.status).toBe("active");
    expect(plan.userId).toBe(currentUserId);
  });

  it("prevents updating a plan owned by another user", async () => {
    const service = createPlanService(createInMemoryPlanRepository());

    // 先创建一条属于 user-2 的计划。
    // 这一步是 Arrange：准备测试场景。
    const privatePlan = await service.createPlan(
      {
        title: "Private plan"
      },
      "user-2"
    );

    // 再让 user-1 尝试修改 user-2 的计划。
    // 这一步是 Act + Assert：执行动作，并断言它会被拒绝。
    await expect(
      service.updatePlan(privatePlan.id, { title: "Changed by another user" }, "user-1")
    ).rejects.toMatchObject({
      statusCode: 404,
      code: "PLAN_NOT_FOUND"
    } satisfies Partial<AppError>);

    // 最后再用真正的 owner 读一次。
    // 权限测试不能只看“返回了 404”，还要确认没有产生副作用。
    const ownerRead = await service.getPlan(privatePlan.id, "user-2");
    expect(ownerRead.title).toBe("Private plan");
  });
});
