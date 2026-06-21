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
