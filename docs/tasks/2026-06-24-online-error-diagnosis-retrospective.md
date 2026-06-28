# Task: 线上错误定位复盘

## 背景

Request ID 已经接入后端：

    每个请求都有 requestId
    响应头有 X-Request-Id
    request logger 会打印 requestId
    error handler 也会打印 requestId

下一步先不要继续加新监控功能，而是做一次复盘：

    如果线上用户说“刚才操作失败了”，我现在怎么定位？

这张任务只写文档，不写代码。

---

## 这张任务只练什么

只练三件事：

1. 理解 requestId 在排查中的作用
2. 设计一条线上错误定位顺序
3. 分清前端问题、API 问题、数据库问题、环境变量问题

---

## 任务 1：创建复盘文档

创建：

    docs/reviews/online-error-diagnosis-retrospective.md

写这些小标题：

    # 线上错误定位复盘

    ## 1. Request ID 解决了什么问题

    ## 2. 如果用户说创建 Project 失败，我会怎么查

    ## 3. 我会先看前端还是后端

    ## 4. 浏览器 Network 里应该看什么

    ## 5. Railway logs 里应该看什么

    ## 6. X-Request-Id 怎么帮助我串日志

    ## 7. 哪些问题不是 requestId 能解决的

    ## 8. 下一步监控还可以补什么

---

## 任务 2：写一条排查顺序

建议写成这种顺序：

    1. 先问用户发生在哪个页面、哪个动作
    2. 打开浏览器 Network，看失败请求的 URL、status、response
    3. 看响应头里的 X-Request-Id
    4. 去 Railway logs 搜这个 requestId
    5. 如果 request logger 有记录，看 statusCode 和 duration
    6. 如果 error handler 有记录，看 errorName、errorMessage、stack
    7. 如果没有后端日志，回头查前端请求有没有真正打到 API
    8. 如果后端 500，继续查数据库、环境变量或代码异常

学习点：

    requestId 不是监控平台。
    它的作用是把一次请求在不同日志里的线索串起来。

---

## 任务 3：写清楚 requestId 的边界

requestId 能帮助：

    串起一次请求的日志
    把浏览器里的失败请求和后端日志对应起来
    更快定位某个 500 错误对应的 stack

requestId 不能直接帮助：

    自动发现线上故障
    自动报警
    统计错误率
    记录前端 JS 运行错误
    解决数据库慢查询

这些属于下一层监控能力。

---

## 验证命令

这张任务只改文档，所以运行：

    npm run format:check

---

## 完成标准

- [x] 创建 docs/reviews/online-error-diagnosis-retrospective.md
- [x] 写清楚 requestId 解决的问题
- [x] 写出线上错误定位顺序
- [x] 写清楚浏览器 Network 和 Railway logs 分别看什么
- [x] 写清楚 requestId 的能力边界
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-24
- 复盘文档：docs/reviews/online-error-diagnosis-retrospective.md
- 核心结论：
  - Request ID 不是监控平台，而是把一次请求的浏览器记录、request logger、error handler 串起来的线索编号。
  - 线上排障应先看浏览器 Network 定边界，再用 `X-Request-Id` 去 Railway logs 查后端原因。
  - 如果后端日志里找不到 requestId，要回头确认请求是否真正发到了 API。
- 验证结果：
  - npm run format:check 通过

完成后告诉我：

    线上错误定位复盘完成了
