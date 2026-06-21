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
