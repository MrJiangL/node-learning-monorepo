import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../../src/db/prisma.js";
import { createPrismaPlanRepository } from "../../src/modules/plans/plans.prisma-repository.js";

async function createTestUser(email: string) {
  // repository 单元测试不走 /auth/register，
  // 所以这里直接用 Prisma 准备一个“已存在的用户”。
  //
  // 注意：passwordHash 在这个测试里不会被验证，
  // 但数据库字段是必填的，所以仍然要给一个占位值。
  return prisma.user.create({
    data: {
      id: crypto.randomUUID(),
      email,
      passwordHash: "temporary-test-user",
      name: "Repository Test User"
    }
  });
}

describe("prisma plan repository", () => {
  // 这个测试文件是“repository 层测试”。
  //
  // 它不经过 Express，也不发 HTTP 请求，而是直接调用 createPrismaPlanRepository()
  // 返回的数据访问对象。这样测试失败时，我们能更快判断问题是在 Prisma 数据层，
  // 还是在 API 路由 / service 层。
  beforeEach(async () => {
    // 每个测试开始前清空 Plan 表，避免上一个测试创建的数据影响下一个测试。
    //
    // 数据库测试里这一步非常重要：
    // 如果不清理，分页、总数、过滤条件这类断言会因为“历史数据”变得不稳定。
    await prisma.plan.deleteMany();
    await prisma.user.deleteMany();
  });

  it("filters plans by user id", async () => {
    const repository = createPrismaPlanRepository();

    // 这里故意准备两个用户。
    //
    // 如果数据库里只有一个用户，测试很容易“看起来通过”，
    // 但其实没有证明 userId 真的参与了过滤。
    // 两个用户各自有计划，才能验证“只返回指定用户的数据”。
    const learningUser = await createTestUser("learning-user@example.com");
    const anotherUser = await createTestUser("another@example.com");

    // repository.create() 现在必须显式接收 userId。
    //
    // 这个 userId 在真实 API 里来自 requireAuth 解析出的 JWT，
    // 在 repository 单元测试里则由我们手动准备。
    await repository.create(
      {
        title: "Learning user plan",
        difficulty: "easy"
      },
      learningUser.id
    );

    // 第二条计划绕过 repository，直接用 Prisma 创建。
    // 这样我们可以手动指定它属于 anotherUser，制造“别人的计划”。
    await prisma.plan.create({
      data: {
        id: crypto.randomUUID(),
        title: "Another user plan",
        description: null,
        status: "active",
        difficulty: "hard",
        userId: anotherUser.id
      }
    });

    // 只传学习用户的 userId。
    // 正确结果应该只包含 learningUserPlan，不应该包含 anotherUser 的计划。
    const result = await repository.findAll({
      // 这里直接使用我们准备出来的 learningUser.id。
      //
      // createdPlan.userId 在类型上可能是 null，
      // 因为数据库里允许历史计划没有归属用户。
      // 但这个测试场景明确是在验证“指定用户 id 过滤”，
      // 所以使用 learningUser.id 更准确，也不会把 null 混进 filter。
      userId: learningUser.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data.map((plan) => plan.title)).toEqual(["Learning user plan"]);
    expect(result.meta.total).toBe(1);
  });

  it("combines user id and difficulty filters", async () => {
    const repository = createPrismaPlanRepository();
    const learningUser = await createTestUser("combined-owner@example.com");
    const anotherUser = await createTestUser("combined-other@example.com");

    // 这两条计划都属于 learningUser，但 difficulty 不同。
    // 这样可以验证 userId 和 difficulty 是“同时过滤”，不是互相覆盖。
    await repository.create(
      {
        title: "Easy owned plan",
        difficulty: "easy"
      },
      learningUser.id
    );
    await repository.create(
      {
        title: "Hard owned plan",
        difficulty: "hard"
      },
      learningUser.id
    );

    // 再准备一条“别人的 easy 计划”。
    //
    // 如果 repository 只按 difficulty 过滤，而忘了 userId，
    // 这条数据就会混进结果里，测试会失败。
    await repository.create(
      {
        title: "Easy plan from another user",
        difficulty: "easy"
      },
      anotherUser.id
    );

    const result = await repository.findAll({
      userId: learningUser.id,
      difficulty: "easy",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    expect(result.data.map((plan) => plan.title)).toEqual(["Easy owned plan"]);
    expect(result.meta.total).toBe(1);
  });

  it("links a created plan to the provided user", async () => {
    const repository = createPrismaPlanRepository();
    const owner = await createTestUser("plan-owner@example.com");

    const createdPlan = await repository.create(
      {
        title: "Plan with owner",
        difficulty: "medium"
      },
      owner.id
    );

    const savedPlan = await prisma.plan.findUnique({
      where: { id: createdPlan.id },
      include: { user: true }
    });

    expect(savedPlan?.user?.email).toBe(owner.email);
  });

  it("creates and finds a plan by id", async () => {
    const repository = createPrismaPlanRepository();
    const owner = await createTestUser("find-by-id-owner@example.com");

    // create() 会真正往 MySQL 的 Plan 表插入一条记录。
    // 这里我们只传用户能控制的字段，id/status/default difficulty 由 repository 负责补齐。
    const createdPlan = await repository.create(
      {
        title: "Repository test",
        difficulty: "easy"
      },
      owner.id
    );

    // findById() 用刚创建出来的 id 再查一次。
    // 这能同时验证“写入成功”和“按主键查询成功”。
    const foundPlan = await repository.findById(createdPlan.id);

    expect(foundPlan).toMatchObject({
      id: createdPlan.id,
      title: "Repository test",
      difficulty: "easy",
      status: "active",
      userId: owner.id
    });
  });

  it("paginates plans", async () => {
    const repository = createPrismaPlanRepository();
    const owner = await createTestUser("pagination-owner@example.com");

    // 准备 3 条数据，然后用 page=2/pageSize=2 取第二页。
    // 第二页应该只剩第 3 条。
    await repository.create({ title: "Plan 1" }, owner.id);
    await repository.create({ title: "Plan 2" }, owner.id);
    await repository.create({ title: "Plan 3" }, owner.id);

    const result = await repository.findAll({
      page: 2,
      pageSize: 2,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    // 这里验证 data：当前页实际返回了哪些计划。
    expect(result.data.map((plan) => plan.title)).toEqual(["Plan 3"]);

    // 这里验证 meta：分页信息是否准确。
    // total 是过滤后的总条数；totalPages 是总页数。
    expect(result.meta).toEqual({
      page: 2,
      pageSize: 2,
      total: 3,
      totalPages: 2
    });
  });

  it("filters plans by difficulty", async () => {
    const repository = createPrismaPlanRepository();
    const owner = await createTestUser("difficulty-owner@example.com");

    // 准备不同 difficulty 的数据，方便验证 where 条件。
    await repository.create({ title: "Easy plan", difficulty: "easy" }, owner.id);
    await repository.create({ title: "Hard plan", difficulty: "hard" }, owner.id);
    await repository.create({ title: "Another easy plan", difficulty: "easy" }, owner.id);

    const result = await repository.findAll({
      difficulty: "easy",
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "asc"
    });

    // data 只能包含 easy 的计划。
    expect(result.data.map((plan) => plan.title)).toEqual(["Easy plan", "Another easy plan"]);

    // meta.total 也必须按同一个 difficulty 条件统计。
    // 如果 findMany 用了 where，但 count 没用 where，这里就会失败。
    expect(result.meta.total).toBe(2);
  });

  it("按创建时间倒序返回 plans", async () => {
    const repository = createPrismaPlanRepository();
    const owner = await createTestUser("plans-sort-owner@example.com");

    await prisma.plan.create({
      data: {
        id: crypto.randomUUID(),
        title: "Older plan",
        description: null,
        status: "active",
        difficulty: "medium",
        userId: owner.id,
        createdAt: new Date("2026-01-01T00:00:00.000Z")
      }
    });
    await prisma.plan.create({
      data: {
        id: crypto.randomUUID(),
        title: "Newer plan",
        description: null,
        status: "active",
        difficulty: "medium",
        userId: owner.id,
        createdAt: new Date("2026-01-02T00:00:00.000Z")
      }
    });

    const result = await repository.findAll({
      userId: owner.id,
      page: 1,
      pageSize: 10,
      sortBy: "createdAt",
      sortOrder: "desc"
    });

    expect(result.data.map((plan) => plan.title)).toEqual(["Newer plan", "Older plan"]);
  });

  it("returns null when updating a missing plan", async () => {
    const repository = createPrismaPlanRepository();

    // Prisma 原生 update 找不到记录时会抛异常。
    // 但我们的 repository 接口约定是：找不到返回 null。
    // 这个测试就是保护这条接口约定。
    const result = await repository.update("missing-id", {
      title: "No one"
    });

    expect(result).toBeNull();
  });

  it("returns false when deleting a missing plan", async () => {
    const repository = createPrismaPlanRepository();

    // repository 层只表达“有没有删成功”，不直接关心 HTTP 404。
    // service / route 层会把 false 再转换成用户看到的 404 响应。
    const result = await repository.delete("missing-id");

    expect(result).toBe(false);
  });
});
