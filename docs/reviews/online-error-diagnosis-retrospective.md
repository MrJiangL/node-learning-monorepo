# 线上错误定位复盘

## 1. Request ID 解决了什么问题

Request ID 解决的是“同一次请求的线索散落在不同地方时，怎么把它们串起来”的问题。

线上出错时，我通常会同时看到几类信息：

- 浏览器 Network 里的失败请求
- 后端 request logger 里的请求记录
- 后端 error handler 里的异常详情
- Railway logs 里的运行时日志

如果这些日志之间没有共同标识，我只能靠时间、路径、状态码去猜：

    这条 500 日志是不是刚才那个用户触发的？

有了 Request ID 之后，每次请求都会带一个唯一标识：

    X-Request-Id: xxx

浏览器响应头里能看到它，后端 request logger 和 error handler 里也能看到它。

这样我就能从：

    用户说“刚才失败了”

推进到：

    我找到了这一次失败请求对应的后端日志和异常堆栈。

这里要注意：Request ID 本身不判断请求对错，也不自动报警。它只是把一次请求的前后线索连成一条线。

## 2. 如果用户说创建 Project 失败，我会怎么查

如果用户说：

    我刚才创建 Project 失败了。

我不会第一步就去改代码，而是先把问题定位清楚。

我的排查顺序是：

1. 先问用户发生在哪个页面、哪个动作，比如是不是 `/projects` 页面点击“创建 Project”。
2. 打开浏览器 DevTools 的 Network 面板，重新操作一次，找到失败请求。
3. 看这个请求的 URL，确认它是不是真的打到了线上 API，而不是打到了错误的本地地址。
4. 看 status code，比如是 400、401、403、500，还是 CORS / network error。
5. 看 response body，确认后端有没有返回业务错误信息。
6. 看 response headers 里的 `X-Request-Id`。
7. 去 Railway logs 里搜索这个 requestId。
8. 如果 request logger 有记录，看 method、path、statusCode、durationMs。
9. 如果 error handler 有记录，看 errorName、errorMessage、stack。
10. 如果 Railway logs 里没有对应记录，回头检查前端请求是否真的发到了 API。
11. 如果后端返回 500，再继续查数据库、环境变量或代码异常。

这条顺序的重点是：

    先确认“请求有没有发出去”，再确认“后端有没有收到”，最后才确认“后端为什么失败”。

如果跳过前两步，直接看后端代码，很容易在错误方向上浪费时间。

## 3. 我会先看前端还是后端

我会先看前端 Network。

原因不是说前端更可能有问题，而是 Network 是前后端交界处。

它能最快回答几个基础问题：

- 请求有没有真的发出？
- 请求发到了哪个 URL？
- 请求方法是不是正确，比如 `POST /projects`？
- 请求有没有带 Authorization header？
- 后端有没有响应？
- 响应状态码是什么？
- 响应头里有没有 `X-Request-Id`？

如果 Network 里根本没有请求，问题多半在前端事件、表单校验、按钮状态或代码逻辑。

如果 Network 里请求发到了错误地址，比如仍然指向 localhost，问题多半是前端环境变量或部署配置。

如果 Network 里有请求，但没有后端响应，可能是网络、CORS、API 域名或服务可用性问题。

如果 Network 里有 4xx / 5xx 响应，并且有 `X-Request-Id`，这时再去后端日志查，会更快、更准。

所以我的顺序是：

    前端 Network 先定边界，后端日志再查原因。

## 4. 浏览器 Network 里应该看什么

Network 面板里我会重点看这些信息。

第一，看请求地址：

    Request URL

它应该指向 Railway API 的线上地址，而不是本地 `localhost`，也不是 Netlify 前端自己的静态资源路径。

第二，看请求方法和路径：

    POST /projects

如果创建 Project，却发成了 `GET` 或路径不对，那是前端 API client 或调用代码的问题。

第三，看请求头：

    Authorization: Bearer xxx

如果需要登录的接口没有带 token，后端返回 401 是合理的。这时要查登录态保存、authenticatedFetch、token 清理逻辑。

第四，看状态码：

- 400：通常是请求参数不符合后端 schema
- 401：没有登录、token 缺失或 token 失效
- 403：已登录但没有权限
- 404：路径错误或资源不存在
- 500：后端运行时异常，需要查日志

第五，看 response body。

如果后端返回了错误码和 message，优先读它。它通常比页面文案更接近真实原因。

第六，看 response headers：

    X-Request-Id

这个值就是去 Railway logs 搜索的关键线索。

## 5. Railway logs 里应该看什么

Railway logs 里我会先用 `X-Request-Id` 搜索。

如果能搜到 request logger 的记录，我会看：

- requestId：是否和浏览器里一致
- method：是不是预期的 HTTP 方法
- path：是不是预期的 API 路径
- statusCode：最终返回了什么状态码
- durationMs：这次请求耗时是否异常

request logger 适合回答：

    这次请求最后是什么结果？

如果还能搜到 error handler 的记录，我会继续看：

- requestId：是否和同一次请求一致
- errorName：错误类型是什么
- errorMessage：具体错误信息是什么
- stack：错误从哪一层代码抛出来

error handler 适合回答：

    这次请求为什么炸了？

如果同一个 requestId 只有 request logger，没有 error handler，说明它可能不是代码异常，而是正常的业务错误，比如 400、401、404。

如果同一个 requestId 同时有 request logger 和 error handler，并且 statusCode 是 500，那就说明后端在处理这次请求时抛出了未预期异常。

## 6. X-Request-Id 怎么帮助我串日志

`X-Request-Id` 的价值在于它同时出现在两个地方：

1. 浏览器响应头
2. 后端日志

一次典型排查会像这样：

```text
浏览器 Network
  POST /projects
  status: 500
  X-Request-Id: req-abc

Railway request logger
  requestId: req-abc
  method: POST
  path: /projects
  statusCode: 500
  durationMs: 42

Railway error handler
  requestId: req-abc
  errorName: PrismaClientKnownRequestError
  errorMessage: ...
  stack: ...
```

这三段信息合起来，才能形成完整判断：

- 浏览器告诉我：用户看到的是哪个失败请求。
- request logger 告诉我：后端收到请求后最终返回了什么。
- error handler 告诉我：后端内部具体在哪一步出错。

没有 Request ID 时，我只能靠时间和路径猜测。

有 Request ID 后，我可以比较确定地说：

    这三条记录讲的是同一次请求。

## 7. 哪些问题不是 requestId 能解决的

Request ID 很有用，但它不是完整监控系统。

它不能直接解决这些问题：

- 自动发现线上故障
- 自动报警
- 统计错误率
- 统计慢请求比例
- 记录前端 JavaScript 运行错误
- 记录用户点击路径
- 判断数据库慢查询原因
- 判断服务是否整体不可用
- 保存历史趋势图

这些属于下一层监控能力。

比如：

- 自动发现故障，需要 health check、uptime monitor 或告警系统。
- 统计错误率，需要结构化日志、指标系统或 APM。
- 前端 JS 报错，需要前端错误上报。
- 慢查询定位，需要数据库日志、query duration 或 tracing。

所以我现在对 Request ID 的定位是：

    它不是“报警器”，而是“线索编号”。

## 8. 下一步监控还可以补什么

下一步可以沿着“发现问题”和“定位问题”两个方向继续补。

第一，可以补更清晰的结构化日志。

现在日志已经有 requestId，后续可以逐步统一字段，比如：

- level
- requestId
- method
- path
- statusCode
- durationMs
- userId
- errorName
- errorMessage

这样日志更容易搜索和过滤。

第二，可以补慢请求观察。

request logger 已经有 durationMs，下一步可以定义一个阈值，比如：

    超过 1000ms 的请求打印 warn 日志。

这样能开始观察“不是失败但很慢”的请求。

第三，可以补线上健康检查和可用性监控。

`/health` 和 `/ready` 已经有基础能力，下一步可以接外部 uptime monitor，定时访问线上服务，发现不可用时提醒。

第四，可以补前端错误上报。

现在后端能串 Request ID，但如果前端 JS 在发请求前就报错，后端不会知道。

后续可以考虑：

- 捕获 `window.onerror`
- 捕获 unhandled promise rejection
- 上报页面路径、错误信息、浏览器信息

第五，可以考虑接入 Sentry 这类错误监控平台。

但我现在不会急着接。因为先理解 requestId、日志、Network、Railway logs 的关系，能帮助我真正知道监控平台在替我做什么。

这一阶段的学习重点不是“用了哪个工具”，而是：

    线上出错时，我能不能顺着证据一步步把原因找出来。
