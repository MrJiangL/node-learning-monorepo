import type { RedisClientType } from "redis";

// getJson 从 Redis 里读取字符串，再反序列化成对象。
//
// <T> 是 TypeScript 泛型：
// 调用方可以告诉 helper：“我期望这里读出来是什么类型”。
//
// 注意：JSON.parse 只能在运行时解析数据，
// 它不会真的校验 T 是否正确。
// 后面如果要更严格，可以结合 Zod 做缓存数据校验。
export const getJson = async <T>(client: RedisClientType, key: string): Promise<T | null> => {
  const cachedValue = await client.get(key);

  if (!cachedValue) {
    return null;
  }

  return JSON.parse(cachedValue) as T;
};

// setJson 把对象序列化成字符串，再写入 Redis。
//
// ttlSeconds 是缓存存活时间，单位是秒。
// redis@6 推荐使用 expiration: { type: "EX", value: 秒数 } 来设置 TTL。
export const setJson = async (
  client: RedisClientType,
  key: string,
  value: unknown,
  ttlSeconds: number
) => {
  await client.set(key, JSON.stringify(value), {
    expiration: {
      type: "EX",
      value: ttlSeconds
    }
  });
};
