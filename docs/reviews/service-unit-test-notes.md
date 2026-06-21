# Service 单元测试阅读笔记

## 1. fake repository 是什么

fake repository 可以像一个很轻量的 spy。

它一边提供内存数据行为，一边记录 service 调用过哪些 repository 方法。

这样 service 测试不用真的连数据库，也能验证 service 有没有把参数传对、有没有在正确的时机调用 repository。

## 2. 为什么 service 测试不直接查数据库

Service 单元测试不关心 Prisma 怎么写 MySQL，也不关心 SQL 查询细节。

Service 这一层主要负责业务规则，比如权限判断、参数传递、失败时提前停止。

如果 service 测试直接查数据库，测试就会同时混进 Prisma、数据库连接、数据清理这些问题，不容易看出到底是哪一层坏了。

## 3. recorded / deletedIds / updatedCalls 是做什么的

`recorded` 用来记录 ActivityLogService 收到过哪些日志输入。

`deletedIds` 用来记录 service 调用过哪些 `repository.delete`。

`updatedCalls` 用来记录 service 调用过哪些 `repository.update`，以及传了什么 input。

这些数组不是业务代码需要的，而是测试用来观察“service 有没有调用协作者”的窗口。

## 4. 权限失败时为什么要断言没有调用 delete/update

权限失败时，service 应该在真正写数据库之前就停下来。

如果用户不能删除别人的 Project，但 service 仍然调用了 `repository.delete`，那就说明权限判断没有挡住危险操作。

所以这类测试不仅要断言抛出 `PROJECT_NOT_FOUND`，还要断言 `deletedIds` / `updatedCalls` 仍然是空数组。

## 5. 我现在还不懂的地方

我现在大概能看懂 service 单元测试是在测协作者调用，但还不太熟练自己判断“这个逻辑应该写 service 测试还是 repository 测试”。

我还需要继续练习：

- 什么场景用 fake repository
- 什么场景要连真实数据库
- 一个测试里应该断言多少东西才算刚好
- 怎么给测试起一个能表达业务意图的中文名字
