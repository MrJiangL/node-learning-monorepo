# Redis 缓存阶段复盘

## 1. 我现在怎么理解 cache aside

我现在可以先把 Redis 理解成后端的临时 storage。

它不像前端的 `localStorage` 存在用户浏览器里，而是存在后端旁边。后端 API 可以先去 Redis 查一份临时保存的数据，如果 Redis 里有，就不用每次都查 MySQL。

以 `GET /projects` 为例：

- 读数据时，后端先根据当前用户、分页和排序参数生成一个 Redis key。
- 然后后端先用这个 key 查 Redis。
- 如果 Redis 里有数据，就是缓存命中，后端直接返回 Redis 的结果，不需要查 MySQL。
- 如果 Redis 里没有数据，就是缓存未命中，后端再调用 `projectService.listProjects` 查询 MySQL。
- 查询 MySQL 成功之后，后端会把这份结果写入 Redis，并设置 TTL。
- 这样下一次同样的查询就可以直接读 Redis。

所以我现在对 cache aside 的理解是：

```text
业务代码自己决定先查缓存。
缓存没有时，再查数据库。
查完数据库后，再把结果写回缓存。
```

## 2. Project 列表缓存 key 为什么这样设计

当前 key 示例：

```text
projects:list:user:user-1:page:1:pageSize:10:sortBy:createdAt:sortOrder:asc
```

Project 列表缓存 key 必须能描述“这到底是哪一次查询”。

`userId` 必须进入 key，因为每个用户只能看到自己的 Project。如果没有 `userId`，不同用户可能共用同一份缓存，造成数据泄露。

`page` 必须进入 key，因为第 1 页和第 2 页的数据不同。如果没有 `page`，第 2 页可能错误地复用第 1 页缓存。

`pageSize` 必须进入 key，因为每页 10 条和每页 20 条的数据范围不同。如果没有 `pageSize`，不同分页大小可能拿到错误结果。

`sortBy` 必须进入 key，因为按不同字段排序时结果可能不同。虽然现在只支持 `createdAt`，但 key 设计上已经把排序字段纳入了查询条件。

`sortOrder` 必须进入 key，因为 `asc` 和 `desc` 返回的数据顺序不同。如果没有 `sortOrder`，升序请求可能拿到倒序结果。

所以缓存 key 的本质不是随便起一个名字，而是在描述：

```text
这一份缓存对应哪一个用户、哪一页、哪种分页大小、哪种排序方式。
```

## 3. TTL 解决什么问题

TTL 是 `time to live`，意思是缓存最多存活多久。

比如我们现在把 Project 列表缓存 TTL 设置成 60 秒，就是说：

```text
这份 Redis 缓存最多存在 60 秒。
60 秒之后，即使没人主动删除，它也会自动过期。
```

不能让缓存永远存在，因为数据库里的真实数据会变化。

如果缓存永远存在，就可能出现：

- 用户已经创建了新 Project，但列表缓存里还没有。
- 用户已经更新了 Project 名称，但列表缓存里还是旧名称。
- 用户已经删除了 Project，但列表缓存里还残留旧数据。

TTL 和主动删除缓存的区别是：

- TTL 是兜底机制：即使忘了删缓存，缓存也不会永久存在。
- 主动删除缓存是及时机制：写操作成功后立刻让旧缓存失效。

所以我现在理解是：

```text
TTL 负责“最多旧多久”。
主动 invalidation 负责“数据变了就尽快旧缓存删掉”。
```

## 4. 写操作后为什么要 invalidation

`POST /projects` 后要清列表缓存，因为用户创建了一个新 Project。旧的列表缓存里可能还没有这个新 Project。

`PATCH /projects/:id` 后要清列表缓存，因为用户可能更新了 Project 的 `name` 或 `description`。旧的列表缓存里可能还是更新前的数据。

`DELETE /projects/:id` 后要清列表缓存，因为用户删除了一个 Project。旧的列表缓存里可能还残留这条已经删除的数据。

这些操作都属于写操作。

写操作会改变 MySQL 里的真实数据，所以相关 Redis 缓存可能变旧。

因此写操作成功之后，需要让旧缓存失效。

## 5. 为什么只清当前用户的缓存

Project 是用户自己的资源。

用户 A 创建、更新、删除 Project，只会影响用户 A 的 Project 列表，不应该影响用户 B 的缓存。

如果每次写操作都清空所有用户的 Project 缓存，会有两个问题：

- 影响范围太大，浪费缓存。
- 用户多的时候，每个用户的写操作都会让其他用户缓存失效。

所以我们用当前用户的 `userId` 生成 pattern：

```text
projects:list:user:${userId}:*
```

例如用户 `user-1` 的 pattern 是：

```text
projects:list:user:user-1:*
```

它会匹配：

```text
projects:list:user:user-1:page:1:pageSize:10:sortBy:createdAt:sortOrder:asc
projects:list:user:user-1:page:2:pageSize:10:sortBy:createdAt:sortOrder:asc
```

但不会匹配：

```text
projects:list:user:user-2:page:1:pageSize:10:sortBy:createdAt:sortOrder:asc
```

这样就能只清当前用户的列表缓存，避免影响其他用户。

## 6. 这一阶段的测试分别证明了什么

`project-cache-key.test.ts` 证明了缓存 key 的生成是稳定的，并且不同用户、不同分页、不同排序会生成不同 key。

`redis-json-cache.test.ts` 证明了我们可以把对象序列化成 JSON 写入 Redis，也可以从 Redis 读出来再解析成对象。同时它也证明了写入时会设置 TTL。

`project-list-cache.test.ts` 证明了 Project 列表读取缓存的流程：

- 缓存未命中时，会调用 loader 查询真实数据，并写入 Redis。
- 缓存命中时，会直接返回 Redis 数据，不再调用 loader。

`project-list-cache-invalidation.test.ts` 证明了按用户删除 Project 列表缓存的逻辑：

- 只删除当前用户的 Project 列表缓存。
- 不会删除其他用户的缓存。
- 没有缓存时返回 0。

`projects-cache-api.test.ts` 证明了缓存逻辑已经接进真实 API：

- `GET /projects` 可以优先返回 Redis 缓存里的列表数据。
- `POST /projects` 创建成功后会清理当前用户的列表缓存。
- `PATCH /projects/:id` 更新成功后会清理当前用户的列表缓存。
- `DELETE /projects/:id` 删除成功后会清理当前用户的列表缓存。

## 7. 我现在还不太确定的点

- Redis 挂了以后，API 应该直接报错，还是应该绕过 Redis 去查 MySQL？
- 什么样的数据适合放缓存，什么样的数据不适合放缓存？
- TTL 应该怎么定，60 秒是随便定的吗？
- 如果以后有多个 API 服务实例，它们清 Redis 缓存会不会有问题？
- 如果缓存删除失败，但数据库已经写成功了，应该怎么处理？
