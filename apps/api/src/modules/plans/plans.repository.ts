import type {
  CreatePlanInput,
  ListSortBy,
  PaginatedResult,
  Plan,
  PlanDifficulty,
  SortOrder,
  UpdatePlanInput
} from "@learn/shared";
// Repository 是“数据访问层”的接口。
//
// service 不关心数据到底存在内存、SQLite、PostgreSQL 还是远程 API。
// 它只关心 repository 是否提供 create 和 findAll 这两个能力。
// 这让我们以后从内存数组换成 Prisma 时，可以少改很多业务代码。
export type PlanRepository = {
  create(input: CreatePlanInput, userId: string): Promise<Plan>;
  findAll(filter: ListPlansFilter): Promise<PaginatedResult<Plan>>;
  findById(id: string): Promise<Plan | null>;
  update(id: string, input: UpdatePlanInput): Promise<Plan | null>;
  delete(id: string): Promise<boolean>;
};

export type ListPlansFilter = {
  // difficulty 是可选的过滤条件。
  // 有 difficulty：只返回对应难度。
  // 没有 difficulty：返回全部计划。
  //
  // 这个类型和 listPlansQuerySchema 的输出形状保持一致，
  // 让 route -> service -> repository 之间传递的数据有一条清晰路线。
  difficulty?: PlanDifficulty;

  // userId 表示“只查询某个用户自己的计划”。
  //
  // 它在类型上仍然是可选的，是为了让 repository 可以表达更底层的查询能力：
  // - 不传 userId：查询所有计划，适合少数内部测试或后台任务。
  // - 传 userId：只查询这个用户自己的计划，这是 HTTP API 当前使用的安全路径。
  //
  // 对外的 /plans API 不允许客户端决定 userId。
  // route 会从 requireAuth 得到 request.user.id，service 再强制把它放进 filter。
  userId?: string;

  page: number;
  pageSize: number;

  // sortBy / sortOrder 来自 query schema。
  //
  // 当前只支持 createdAt，是为了先把排序链路练清楚。
  // 后面如果要支持 title / difficulty，可以再扩展 schema 和 repository。
  sortBy: ListSortBy;
  sortOrder: SortOrder;
};

// 这个实现只把数据存在内存数组里。
//
// 优点：学习阶段非常简单，不需要先配置数据库。
// 缺点：服务重启后数据会消失。
// 后面学习 Prisma 时，我们会保留 PlanRepository 接口，替换掉这个实现。
export function createInMemoryPlanRepository(): PlanRepository {
  let plans: Plan[] = [];

  return {
    async create(input, userId) {
      const now = new Date().toISOString();

      // 这里由服务端生成完整 Plan，而不是相信客户端传来的 id/status/time。
      // 后端应该掌握这些系统字段，避免客户端伪造数据。
      const plan: Plan = {
        id: crypto.randomUUID(),
        title: input.title,
        description: input.description ?? null,
        status: "active",
        difficulty: input?.difficulty ?? "medium",
        createdAt: now,
        updatedAt: now,
        userId
      };

      // 这里使用不可变更新：plans = [...plans, plan]
      //
      // 它没有修改原来的数组，而是创建一个包含旧数据和新 plan 的新数组。
      // 对小项目来说 push 也能工作，但不可变写法有助于养成更安全的状态管理习惯。
      plans = [...plans, plan];
      return plan;
    },
    async findAll(filter: ListPlansFilter) {
      // repository 是最接近数据的一层，所以“怎么筛选数组”放在这里。
      // route/service 不需要知道 plans 是数组、数据库表，还是远程接口。
      //
      // 以后换 Prisma 时，这里大概率会变成：
      // prisma.plan.findMany({ where: { difficulty: filter.difficulty } })
      // 上层代码可以尽量少改。
      //
      // 返回一个新数组，避免调用方拿到内部 plans 后直接修改它。
      // 这是“不要把内部状态裸露出去”的一个小例子。
      const filteredPlans = plans.filter((plan) => {
        // 如果传了 difficulty，计划难度必须匹配；没传则不按难度筛选。
        const difficultyMatches = filter.difficulty ? plan.difficulty === filter.difficulty : true;

        // 如果传了 userId，计划归属用户必须匹配；没传则不按用户筛选。
        //
        // 内存 repository 主要服务早期学习和单元测试。
        // 即使现在生产路径已经换成 Prisma，它仍然应该遵守同一个接口语义。
        const userMatches = filter.userId ? plan.userId === filter.userId : true;

        return difficultyMatches && userMatches;
      });

      const sortedPlans = [...filteredPlans].sort((left, right) => {
        const leftTime = new Date(left.createdAt).getTime();
        const rightTime = new Date(right.createdAt).getTime();

        return filter.sortOrder === "asc" ? leftTime - rightTime : rightTime - leftTime;
      });

      // page 是从 1 开始的页码，但数组下标从 0 开始。
      // 所以第 1 页的起点是 0，第 2 页的起点是 pageSize。
      //
      // 示例：page=2, pageSize=10
      // startIndex = (2 - 1) * 10 = 10
      // endIndex = 10 + 10 = 20
      const startIndex = (filter.page - 1) * filter.pageSize;
      const endIndex = startIndex + filter.pageSize;

      // slice(start, end) 会返回 [start, end) 之间的数据，不会修改原数组。
      // 这刚好符合我们当前“不变更内部状态”的习惯。
      const pagePlans = sortedPlans.slice(startIndex, endIndex);
      const total = filteredPlans.length;

      return {
        // 这里一定要返回 pagePlans，而不是 filteredPlans。
        // filteredPlans 是“过滤后的所有数据”，pagePlans 才是“当前页的数据”。
        data: [...pagePlans],
        meta: {
          page: filter.page,
          pageSize: filter.pageSize,
          total,
          totalPages: Math.ceil(total / filter.pageSize)
        }
      };
    },
    async findById(id: string) {
      return plans.find((plan) => plan.id === id) ?? null;
    },

    async update(id: string, input: UpdatePlanInput) {
      // repository 只负责“根据 id 找数据并更新数据”。
      // 找不到时返回 null，不在这里决定 HTTP 状态码。
      // 这样 repository 将来换成 Prisma 时，接口语义仍然保持稳定。
      const existingPlan = plans.find((plan) => plan.id === id);

      if (!existingPlan) {
        return null;
      }

      const updatedPlan: Plan = {
        ...existingPlan,

        // PATCH 是局部更新：没传的字段保留原值。
        // 用 ?? 而不是 ||，因为我们只想在 null/undefined 时回退。
        title: input.title ?? existingPlan.title,
        description: input.description ?? existingPlan.description,
        difficulty: input.difficulty ?? existingPlan.difficulty,

        // 更新时只刷新 updatedAt，不改 createdAt。
        updatedAt: new Date().toISOString()
      };

      // 使用 map 创建新数组，避免直接修改原数组。
      // 这和前面的 create 使用 plans = [...plans, plan] 是同一个不可变更新思路。
      plans = plans.map((plan) => (plan.id === id ? updatedPlan : plan));
      return updatedPlan;
    },

    async delete(id) {
      // delete 这里只回答一个问题：这条数据有没有被删掉？
      //
      // 找不到时返回 false，而不是抛 HTTP 错误。
      // repository 是数据层，不应该知道 404、响应体这些 HTTP 细节。
      const planExists = plans.some((plan) => plan.id === id);
      if (!planExists) {
        return false;
      }

      // filter 会创建一个新数组，保留所有“不等于目标 id”的计划。
      // 这就是内存数据里的不可变删除。
      plans = plans.filter((plan) => plan.id !== id);

      return true;
    }
  };
}
