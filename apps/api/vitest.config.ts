import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // 这些测试会访问同一个本地 MySQL 数据库。
    //
    // 每个测试文件里都有 deleteMany() 做测试隔离；
    // 如果多个测试文件并行跑，就可能出现 A 文件刚创建数据，
    // B 文件的 beforeEach 马上把它清掉，导致分页、列表测试不稳定。
    //
    // 所以这里让测试文件串行执行，先保证学习阶段的数据库测试稳定。
    fileParallelism: false,
    include: ["tests/**/*.test.ts"]
  }
});
