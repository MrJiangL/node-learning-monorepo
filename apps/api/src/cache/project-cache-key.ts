import type { ListSortBy, SortOrder } from "@learn/shared";

export type ProjectListCacheKeyInput = {
  userId: string;
  page: number;
  pageSize: number;
  sortBy: ListSortBy;
  sortOrder: SortOrder;
};

// Project 列表缓存的 TTL，单位是秒。
//
// TTL = time to live，也就是这份缓存最多存活多久。
// 这里先用 60 秒，是为了学习阶段容易观察：
// - 时间太短，看不出缓存效果
// - 时间太长，后面做缓存失效时容易困惑
export const PROJECT_LIST_CACHE_TTL_SECONDS = 60;

// 生成 Project 列表缓存 key。
//
// 一个缓存 key 必须能唯一描述“一次查询”。
// Project 列表跟当前用户、分页、排序都有关，所以这些参数都必须进入 key。
export const createProjectListCacheKey = (input: ProjectListCacheKeyInput) => {
  return [
    "projects",
    "list",
    `user:${input.userId}`,
    `page:${input.page}`,
    `pageSize:${input.pageSize}`,
    `sortBy:${input.sortBy}`,
    `sortOrder:${input.sortOrder}`
  ].join(":");
};
// 生成某个用户的 Project 列表缓存匹配模式。
//
// 这个 pattern 用在缓存失效时：
// - createProject 后，当前用户的列表缓存都可能过期
// - updateProject 后，列表里的项目名称 / 描述可能变旧
// - deleteProject 后，列表里可能还残留已删除的项目
//
// 注意这里故意只包含 userId，不包含 page / pageSize / sortBy / sortOrder。
// 因为一次写操作可能影响这个用户的所有列表查询结果。
export const createProjectListCachePattern = (userId: string) => {
  return ["projects", "list", `user:${userId}`, "*"].join(":");
};
