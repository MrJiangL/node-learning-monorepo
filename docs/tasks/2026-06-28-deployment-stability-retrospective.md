# Task: 部署稳定性阶段复盘

## 背景

你已经完成了部署稳定性 checklist：

```text
docs/reviews/deployment-stability-checklist.md
```

这份 checklist 把上线流程拆成了几层：

- 部署前检查
- Railway 后端部署后验证
- Netlify 前端部署后验证
- 数据库和环境变量检查
- 线上 smoke
- 失败判断
- 手动回滚预案

现在先不要继续加自动化。

这张任务要做一次阶段复盘：

    部署稳定性到底在解决什么问题？
    它和监控、日志、requestId 是什么关系？
    下一阶段要继续部署自动化，还是回到业务功能？

---

## 为什么要做这张复盘

你前面已经练过：

```text
线上坏了，我怎么定位？
```

现在 checklist 又补了一层：

```text
上线前怎么少坏？
上线后怎么验证？
坏了怎么恢复？
```

这张复盘就是把这两层合起来。

真实工程里，部署稳定性不是某一个工具，而是一套习惯：

- 上线前有质量门禁
- 上线时知道看什么
- 上线后会跑 smoke
- 出问题时会判断影响范围
- 需要时能回滚

---

## 这张任务只练什么

只练三件事：

1. 总结部署稳定性 checklist 解决的问题
2. 分清 checklist、smoke、监控、回滚各自的职责
3. 选择下一阶段方向

不写代码，不改 CI，不接监控平台。

---

## 任务 1：创建复盘文档

创建：

```text
docs/reviews/deployment-stability-retrospective.md
```

写这些小标题：

```md
# 部署稳定性阶段复盘

## 1. 这一阶段我完成了什么

## 2. 部署前 checklist 解决了什么问题

## 3. 线上 smoke 解决了什么问题

## 4. /health、/ready、requestId 在部署验证里分别怎么用

## 5. 回滚预案解决了什么问题

## 6. 为什么数据库 migration 不能简单回滚

## 7. 当前部署流程还缺什么

## 8. 下一阶段我选择什么
```

---

## 任务 2：解释 checklist 和 smoke 的区别

建议写清楚：

```text
checklist 是部署前和部署中的检查。
smoke 是部署后的最小关键路径验证。
```

比如：

- checklist 会检查测试、类型、构建、环境变量、migration。
- smoke 会真实走一遍注册、登录、创建 Project、创建 Todo。

学习点：

```text
checklist 更像“出门前检查有没有带钥匙”。
smoke 更像“到了目的地以后确认门真的能打开”。
```

---

## 任务 3：解释 health / ready / requestId 怎么协作

建议写成：

```text
/health：确认 API 进程活着。
/ready：确认 API 关键依赖准备好，尤其是数据库。
requestId：当某次请求失败时，把浏览器 Network 和 Railway logs 串起来。
```

它们不是互相替代关系。

而是不同层级的验证：

```text
进程是否活着 -> /health
依赖是否可用 -> /ready
单次请求为什么失败 -> requestId
```

---

## 任务 4：解释什么时候回滚

建议写清楚：

可以先排查：

- 非核心页面问题
- `/health` 和 `/ready` 都正常
- 少量请求失败
- 失败原因很明确，能快速修复

应该优先回滚：

- 登录、注册、Project / Todo 主路径不可用
- 大量 500
- `/health` 失败
- `/ready` 失败且短时间无法修复
- 服务反复重启
- 有数据写错风险

学习点：

```text
回滚不是失败，而是一种恢复服务的手段。
```

---

## 任务 5：选择下一阶段

最后一节请你选一个方向。

### A. 继续部署自动化

适合你想继续练：

- GitHub Actions 部署前 checklist 自动化
- API smoke 脚本线上化
- 部署后自动访问 `/health` 和 `/ready`
- 自动生成 release checklist

这个方向会强化：

```text
把手动上线流程逐步自动化。
```

### B. 回到业务功能

适合你想继续做产品能力：

- Activity Log 前端展示
- Project / Todo 更完整交互
- 用户设置页
- 更好的首页和引导

这个方向会强化：

```text
让产品本身更有用。
```

### C. 继续监控能力

适合你想继续练：

- 慢请求日志
- 结构化日志
- uptime monitor
- 前端错误上报
- Sentry 入门

这个方向会强化：

```text
线上坏了，我怎么更早知道？
```

---

## 先不要做

这张任务先不要：

- 不要写 GitHub Actions
- 不要接 Sentry
- 不要改 Railway / Netlify 配置
- 不要新增业务功能

先把部署稳定性这一小阶段讲清楚。

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

---

## 完成标准

- [x] 创建 docs/reviews/deployment-stability-retrospective.md
- [x] 写清楚 checklist 和 smoke 的区别
- [x] 写清楚 `/health`、`/ready`、requestId 的协作关系
- [x] 写清楚什么时候继续排查，什么时候回滚
- [x] 写清楚数据库 migration 回滚为什么要谨慎
- [x] 在 A / B / C 中选择下一阶段
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-28
- 复盘文档：docs/reviews/deployment-stability-retrospective.md
- 下一阶段选择：B，回到业务功能
- 选择原因：
  - 已经连续完成部署、监控、排障、checklist 和回滚预案。
  - 当前更适合用这些生产化能力护航下一轮真实功能，而不是继续只做基础设施。
  - Activity Log 后端能力已经具备，前端展示是很自然的下一步。
- 下一张任务：docs/tasks/2026-06-28-web-activity-log-panel.md
- 验证结果：
  - npm run format:check 通过

这张任务已经完成。

下一步看：

```text
docs/tasks/2026-06-28-web-activity-log-panel.md
```
