# Task: Redis 缓存阶段复盘：cache aside / key / TTL / invalidation

## 背景

这一阶段你已经完成了 Redis 缓存主线：

```text
1. Redis 连接入门
2. Project 列表 cache key 和 TTL
3. Redis JSON get / set helper
4. Project 列表缓存读取
5. Project 列表缓存失效
6. GET /projects 接入缓存
7. POST / PATCH / DELETE 后清理缓存
```

现在不要急着继续堆功能。

这张任务要做一次复盘，把这些点串成一套完整理解：

```text
cache aside 模式到底是什么？
缓存 key 为什么这么设计？
TTL 解决什么问题？
写操作后为什么要 invalidation？
测试怎么证明缓存行为是对的？
```

---

## 你会练到什么

- 用自己的话解释 cache aside
- 说清楚 cache hit / cache miss
- 解释为什么缓存 key 必须包含 userId / page / pageSize / sortBy / sortOrder
- 解释为什么写操作后要删除缓存
- 区分 TTL 和主动失效的作用
- 复盘 Redis integration test 怎么设计

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/redis-cache-stage.md
```

写入下面结构，然后用你自己的话补充每一节。

可以先按我的提示写，不用追求文采，重点是“你真的理解了”。

````md
# Redis 缓存阶段复盘

## 1. 我现在怎么理解 cache aside

用自己的话解释：

- 读数据时先查哪里？
- 缓存命中时发生什么？
- 缓存未命中时发生什么？
- 数据库结果什么时候写回 Redis？

## 2. Project 列表缓存 key 为什么这样设计

当前 key 示例：

```text
projects:list:user:user-1:page:1:pageSize:10:sortBy:createdAt:sortOrder:asc
```
````

解释这些字段为什么都需要进入 key：

- userId
- page
- pageSize
- sortBy
- sortOrder

## 3. TTL 解决什么问题

说明：

- TTL 是什么
- 为什么不能让缓存永远存在
- TTL 和“主动删除缓存”有什么区别

## 4. 写操作后为什么要 invalidation

分别解释：

- POST /projects 后为什么要清列表缓存
- PATCH /projects/:id 后为什么要清列表缓存
- DELETE /projects/:id 后为什么要清列表缓存

## 5. 为什么只清当前用户的缓存

解释：

- 为什么不能清所有用户的缓存
- 为什么 pattern 是 `projects:list:user:${userId}:*`
- 这样如何避免影响其他用户

## 6. 这一阶段的测试分别证明了什么

列出这些测试各自证明什么：

- `project-cache-key.test.ts`
- `redis-json-cache.test.ts`
- `project-list-cache.test.ts`
- `project-list-cache-invalidation.test.ts`
- `projects-cache-api.test.ts`

## 7. 我现在还不太确定的点

写 2-5 条你还不确定的问题。

例如：

- Redis 挂了 API 要不要继续可用？
- 什么时候该用缓存，什么时候不该用？
- 多实例服务下缓存失效会不会有问题？
- TTL 应该怎么定？

````

---

## 任务 2：运行验证

这张任务主要是文档复盘，但你仍然跑一组代表性验证，确认代码还干净。

先确认 Redis 还活着：

```bash
npm run redis:ping -w @learn/api
````

再跑缓存 API 测试：

```bash
npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [ ] 创建 `docs/reviews/redis-cache-stage.md`
- [ ] 用自己的话解释 cache aside
- [ ] 解释 Project 列表缓存 key 的每个字段
- [ ] 解释 TTL 和主动 invalidation 的区别
- [ ] 解释 POST / PATCH / DELETE 为什么都要清缓存
- [ ] 解释为什么只清当前用户缓存
- [ ] 复盘每个缓存测试证明了什么
- [ ] 写下 2-5 个仍然不确定的问题
- [ ] `npm run redis:ping -w @learn/api` 输出 `Redis ping result: PONG`
- [ ] `npm run test -w @learn/api -- tests/integration/projects-cache-api.test.ts` 通过
- [ ] `npm run typecheck -w @learn/api` 通过
- [ ] `npm run format:check` 通过

完成后告诉我：

```text
Redis 缓存阶段复盘完成了
```
