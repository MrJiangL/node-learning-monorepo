# Repository 测试阅读笔记

## 1. Repository 测试为什么要连真实数据库

Repository 测试主要测真实数据库读写行为，而不是用户请求流程。

Service 测试可以用 fake repository，但 Prisma repository 的重点就是 Prisma where 是否真的查对数据，所以要连真实 MySQL。

比如 action 过滤、createdAt 时间范围过滤，如果不连数据库，就不能证明 Prisma 查询条件真的生效。

## 2. beforeEach 里清理数据库的目的

`beforeEach` 清理数据库是为了避免旧数据影响当前测试。

如果不清理，前一个测试留下的 ActivityLog / Project / User 可能会让当前测试多查出数据，导致测试结果不稳定。

清理顺序也很重要：通常先删依赖别人的表，比如 ActivityLog / Todo，再删 Project / User。

## 3. createFactoryUser / createFactoryProject / createFactoryActivityLog 是做什么的

`createFactoryUser` 直接通过 Prisma 创建用户。

`createFactoryProject` 直接创建属于某个 user 的 Project。

`createFactoryActivityLog` 用来创建 ActivityLog，并且可以指定 action、message、createdAt 等字段。

这些 factory 的作用是快速准备测试数据，让测试重点放在 repository 查询行为上，而不是重复写一堆创建数据的细节。

## 4. 为什么要准备不应该返回的数据

只准备“应该返回”的数据，不能证明过滤条件真的生效。

比如只准备一条 `todo.completed`，查询返回它并不能证明 action 过滤写对了。

要同时准备不应该返回的数据：

- action 不匹配的数据
- 时间太早的数据
- 时间太晚的数据
- 其他用户或其他 Project 的数据

这样测试才是在证明“只返回正确的数据”，而不是“刚好数据库里只有这一条数据”。

## 5. 我现在还不懂的地方

我现在能理解 repository 测试是在测数据库查询条件，但还不太熟练自己设计测试数据。

尤其是“不应该返回的数据”要怎么准备，什么时候需要准备不同用户、不同 Project、不同 action、不同时间，还需要继续练。

另外，Repository 测试和 API 集成测试有时候都连数据库，我还需要继续区分：Repository 测 Prisma 查询，API 集成测试测完整 HTTP 链路。
