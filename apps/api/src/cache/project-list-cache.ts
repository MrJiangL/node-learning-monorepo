import type { PaginatedResult, Project } from "@learn/shared";
import type { RedisClientType } from "redis";
import type { ListProjectsFilter } from "../modules/projects/projects.repository.js";
import {
  createProjectListCacheKey,
  createProjectListCachePattern,
  PROJECT_LIST_CACHE_TTL_SECONDS
} from "./project-cache-key.js";
import { getJson, setJson } from "./redis-json-cache.js";

// loadProjects 表示“缓存没有命中时，真正去加载 Project 列表的函数”。
//
// 这里故意不直接 import Prisma repository：
// - cache helper 只负责缓存流程
// - repository 只负责数据库查询
// - 两者通过 loadProjects 这个函数连接起来
//
// 这种写法的好处是：
// - 测试时可以传 fake loader，不需要真的查数据库
// - 未来如果数据源从 Prisma 换成别的实现，缓存 helper 不需要改
export type LoadProjectList = () => Promise<PaginatedResult<Project>>;

// getCachedProjectList 负责 Project 列表的缓存读取流程。
//
// 流程是：
// 1. 根据 filter 生成稳定的 Redis key
// 2. 先从 Redis 读取缓存
// 3. 如果缓存存在，直接返回缓存结果
// 4. 如果缓存不存在，调用 loadProjects 获取新数据
// 5. 把新数据写入 Redis，并设置 TTL
// 6. 返回新数据
export const getCachedProjectList = async (
  client: RedisClientType,
  filter: ListProjectsFilter,
  loadProjects: LoadProjectList
): Promise<PaginatedResult<Project>> => {
  const cacheKey = createProjectListCacheKey(filter);
  let cachedResult: PaginatedResult<Project> | null = null;

  try {
    // 这里是读缓存。
    //
    // 如果 Redis 正常：
    // - 命中：cachedResult 是列表数据
    // - 未命中：cachedResult 是 null
    //
    // 如果 Redis 异常：
    // - catch 会接住错误
    // - 后面继续走 loadProjects
    cachedResult = await getJson<PaginatedResult<Project>>(client, cacheKey);
  } catch {
    // Redis 是缓存层，不是主数据源。
    //
    // 所以这里不把错误继续抛出去。
    // 读缓存失败时，让请求继续走数据库查询。
    cachedResult = null;
  }
  if (cachedResult) {
    return cachedResult;
  }

  const freshResult = await loadProjects();

  try {
    // 数据库已经查到结果了。
    //
    // 写缓存只是性能优化：
    // - 写成功：下次请求更快
    // - 写失败：这次请求也应该正常返回数据库结果
    await setJson(client, cacheKey, freshResult, PROJECT_LIST_CACHE_TTL_SECONDS);
  } catch {
    // 写缓存失败时，不影响本次 API 响应。
    //
    // 这里不 return 别的东西，因为 freshResult 才是这次查询的真实结果。
  }

  return freshResult;
};

// deleteProjectListCacheByUserId 删除某个用户的所有 Project 列表缓存。
//
// 这里用 scanIterator，而不是 client.keys(pattern)。
//
// 原因：
// - KEYS 会一次性扫描整个 Redis keyspace
// - 数据量大时，KEYS 可能阻塞 Redis
// - SCAN 是渐进式扫描，更适合真实服务
//
// 返回 deletedCount 是为了测试和观察：
// 调用方可以知道这次到底删了多少个缓存 key。
export const deleteProjectListCacheByUserId = async (
  client: RedisClientType,
  userId: string
): Promise<number> => {
  const pattern = createProjectListCachePattern(userId);
  let deletedCount = 0;

  for await (const keys of client.scanIterator({
    MATCH: pattern,
    COUNT: 100
  })) {
    if (keys.length === 0) {
      continue;
    }

    deletedCount += await client.del(keys);
  }

  return deletedCount;
};
