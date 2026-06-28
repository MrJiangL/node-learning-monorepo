# Task: 生产化监控阶段复盘

## 背景

你已经把项目从“本地能跑”推进到了“线上能跑，并且出错时有基本线索”：

```text
Netlify 前端
  -> Railway API
    -> Railway MySQL
```

这一阶段你完成了几件很重要的生产化能力：

- Railway API 部署
- `/health` 健康检查
- `/ready` 数据库 readiness check
- error handler 服务端日志
- Request ID 日志串联
- 前端线上接入 Railway API
- 线上注册 / 登录 / Project / Todo smoke
- 线上错误定位复盘

现在先不要继续写新功能。

这张任务要做一次“生产化监控阶段复盘”：

    我现在到底具备了哪些线上维护能力？
    还有哪些能力没有具备？
    下一阶段应该继续补监控，还是转向部署稳定性？

---

## 为什么要做这张复盘

很多项目会有一个误区：

    功能上线了 = 项目完成了。

但真实线上项目还要回答：

- 服务挂了，我怎么知道？
- 用户说失败，我怎么定位？
- 数据库连不上，接口应该怎么表现？
- 哪些日志是有用的，哪些只是噪音？
- 我现在看到的是“单次错误”，还是“系统性故障”？

前面几张任务已经让你有了基础答案。

这张复盘要把这些答案收束起来。

---

## 这张任务只练什么

只练三件事：

1. 总结当前已经具备的生产化可观察性能力
2. 分清 health、ready、error log、requestId 各自解决的问题
3. 选择下一阶段方向

不写代码，不接第三方平台，不改部署配置。

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/production-observability-stage-retrospective.md
```

写这些小标题：

```md
# 生产化监控阶段复盘

## 1. 这一阶段我完成了什么

## 2. /health 解决了什么问题

## 3. /ready 解决了什么问题

## 4. error handler 日志解决了什么问题

## 5. requestId 解决了什么问题

## 6. 浏览器 Network、Railway logs、Request ID 怎么配合

## 7. 当前还缺哪些真正的监控能力

## 8. 下一阶段我选择什么
```

---

## 任务 2：解释 health 和 ready 的区别

这一段很关键。

建议你写清楚：

```text
/health 更像“进程还活着吗？”
/ready 更像“服务依赖也准备好了吗？”
```

比如：

- `/health` 可以不查数据库，只说明 API 进程能响应。
- `/ready` 要检查数据库连接，因为业务请求依赖数据库。

学习点：

```text
健康检查不等于业务可用。
Readiness 比 health 更接近真实业务依赖。
```

---

## 任务 3：解释 error handler 日志的价值

建议回答：

```text
error handler 日志不是给用户看的，而是给开发者排查线上异常看的。
```

它应该帮助我看到：

- 哪个请求出错
- 错误类型是什么
- 错误信息是什么
- stack 从哪一层抛出来
- 有没有 requestId 可以串回浏览器请求

注意边界：

```text
前端响应不能泄露 stack。
服务端日志可以记录更详细的错误上下文。
```

---

## 任务 4：解释 requestId 的定位

建议写成一句话：

```text
requestId 不是发现问题的工具，而是定位某一次请求的线索编号。
```

它解决的是：

- 浏览器失败请求和后端日志怎么对应
- request logger 和 error handler 怎么对应
- 用户反馈的某次失败怎么查到具体后端异常

它不解决：

- 自动报警
- 错误率统计
- 慢请求趋势
- 前端 JS 报错上报
- 数据库慢查询分析

---

## 任务 5：写出你现在的线上排障路径

可以写成下面这种顺序：

```text
1. 用户反馈某个页面或动作失败
2. 我先打开浏览器 Network
3. 看请求 URL、method、status、response body
4. 看响应头 X-Request-Id
5. 去 Railway logs 搜 requestId
6. 先看 request logger 的 statusCode 和 durationMs
7. 再看 error handler 的 errorName、errorMessage、stack
8. 如果没有后端日志，回头查前端请求是否真正到达 API
9. 如果是数据库或环境变量问题，再去查 Railway 配置和数据库连接
```

学习点：

```text
排障不是凭感觉找代码。
排障是先确定边界，再沿着证据缩小范围。
```

---

## 任务 6：选择下一阶段

最后一节请你选一个方向。

### A. 继续监控能力

适合你想继续练：

- 慢请求日志
- 结构化日志
- uptime monitor
- 前端错误上报
- Sentry 入门

这个方向会继续强化：

```text
线上坏了，我怎么更早知道？
```

### B. 部署稳定性

适合你想继续练：

- Railway 环境变量复查
- 数据库迁移上线流程
- 部署前 checklist
- 回滚策略
- CI/CD 和部署前验证

这个方向会继续强化：

```text
我怎么降低上线出错概率？
```

### C. 回到业务功能

适合你想继续做产品能力：

- Project / Todo 更完整的业务交互
- Activity Log 前端展示
- 用户设置页
- 更好的空状态引导

这个方向会继续强化：

```text
产品本身还能变得更有用吗？
```

---

## 先不要做

这张任务先不要：

- 不要接 Sentry
- 不要接 Datadog
- 不要改部署配置
- 不要写新 API
- 不要补前端新页面

先把当前阶段学到的生产化能力讲清楚。

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/production-observability-stage-retrospective.md
- [x] 写清楚 `/health` 和 `/ready` 的区别
- [x] 写清楚 error handler 服务端日志的价值
- [x] 写清楚 requestId 的作用和边界
- [x] 写出一条线上排障路径
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-26
- 复盘文档：docs/reviews/production-observability-stage-retrospective.md
- 下一阶段选择：B，部署稳定性
- 选择原因：
  - 当前已经具备基础排障线索，包括 `/health`、`/ready`、error handler 日志和 requestId。
  - 继续接第三方监控前，更值得先补“上线前怎么少出错、上线后怎么验证、失败时怎么恢复”。
  - 下一阶段优先练部署 checklist、线上 smoke 和回滚预案。
- 验证结果：
  - npm run format:check 通过

完成后告诉我：

```text
生产化监控阶段复盘完成了，我选 X
```
