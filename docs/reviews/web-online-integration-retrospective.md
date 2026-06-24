# 前后端线上联调复盘

这次联调的真实信息：

- 前端地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- API 地址：`https://node-learning-monorepo-production.up.railway.app`
- 前端环境变量：`VITE_API_BASE_URL`
- 后端环境变量：`CORS_ORIGIN`
- 测试账号创建方式：`POST /auth/register`
- 测试密码示例：`password123`

## 1. 这次线上链路是什么

这次线上链路是：

```text
Netlify 前端 -> Railway API -> Railway MySQL
```

浏览器打开 Netlify 前端页面后，前端通过 `VITE_API_BASE_URL` 拼出 Railway API 地址。

用户登录、创建 Project、创建 Todo 这些操作都会从前端发送 HTTP 请求到 Railway API。

Railway API 再连接线上 MySQL 读写数据。

## 2. Netlify 前端需要哪些配置

Netlify 前端最关键的配置是：

```text
VITE_API_BASE_URL=https://node-learning-monorepo-production.up.railway.app
```

这个变量决定了前端请求 API 时到底打到哪里。

如果它没配，或者配错了，前端可能会请求自己的 Netlify 域名，或者请求一个不存在的 API 地址。

修改 Netlify 环境变量后，需要重新部署前端，新的构建结果才会读到新变量。

## 3. Railway API 需要哪些配置

Railway API 最关键的前端联调配置是：

```text
CORS_ORIGIN=https://scintillating-pavlova-dc76e0.netlify.app
```

`CORS_ORIGIN` 的作用是告诉后端：

```text
允许这个前端域名从浏览器里请求我。
```

如果 `CORS_ORIGIN` 没有包含 Netlify 前端域名，浏览器会拦住请求。

这类错误不是后端接口一定坏了，而是浏览器的跨域安全规则不允许当前前端访问当前 API。

## 4. 我怎么创建和使用测试账号

因为当前前端只有登录页，没有注册页，所以测试账号需要先通过 API 创建。

注册测试账号的命令是：

```bash
curl -X POST "https://node-learning-monorepo-production.up.railway.app/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "webtest-20260623@example.com",
    "password": "password123",
    "name": "Web Test User"
  }'
```

注册成功后，就可以在 Netlify 前端登录页使用同一个邮箱和密码登录。

如果邮箱已经被注册过，可以换一个新的测试邮箱。

## 5. 我验证了哪些线上主链路

我验证了这些线上主链路：

- 登录：前端调用 Railway API 的 `POST /auth/login`
- 创建 Project：登录后创建 Project，并确认数据能写入线上数据库
- 查询 Project：刷新或重新进入页面后能看到已创建的 Project
- 创建 Todo：在某个 Project 下创建 Todo
- 查询 Todo：能看到刚创建的 Todo

这说明前端、API、鉴权 token、数据库写入和数据库读取都已经串起来了。

## 6. 如果线上登录失败，我会怎么排查

如果线上登录失败，我会按这个顺序排查：

1. 先确认 Netlify 前端页面能不能正常打开。
2. 打开浏览器 DevTools 的 Network，看 `/auth/login` 请求到底发到了哪个 URL。
3. 确认请求 URL 是 Railway API，而不是 Netlify 前端域名。
4. 打开 Railway API 的 `/health` 或 `/ready`，确认后端服务和数据库连接是否正常。
5. 看 `POST /auth/login` 返回的是 401、404、500，还是 CORS error。
6. 如果是 401，优先检查账号是否注册过、密码是否正确。
7. 如果是 404，优先检查 `VITE_API_BASE_URL` 是否配置错。
8. 如果是 500，去 Railway logs 看后端错误。
9. 如果修改过 Netlify 环境变量，确认是否重新部署过前端。

## 7. 如果遇到 CORS 报错，我会怎么排查

如果遇到 CORS 报错，我会按这个顺序排查：

1. 看浏览器 Console 里的 CORS 报错，确认被拦截的是哪个 API 地址。
2. 确认当前前端域名是 `https://scintillating-pavlova-dc76e0.netlify.app`。
3. 确认 Railway API 的 `CORS_ORIGIN` 是否配置成这个 Netlify 域名。
4. 注意 `/projects` 这种带 path 的地址不应该放进 `CORS_ORIGIN`，只放 origin。
5. 修改 Railway 环境变量后，确认 Railway 服务已经重新部署或重启。
6. 如果 API 用 curl 能通，但浏览器不通，优先怀疑 CORS，而不是接口本身。

## 8. 我现在怎么理解前后端分离部署

前后端分离部署不是简单地把两个服务分别放上线。

它真正需要打通的是：

- 前端知道 API 在哪里：靠 `VITE_API_BASE_URL`
- 后端允许哪个前端访问：靠 `CORS_ORIGIN`
- 浏览器保存并携带登录 token
- 后端验证 token 后访问受保护资源
- API 能稳定连接线上数据库

这次部署让我理解到：

本地开发时，前端和后端经常靠代理或本地端口连起来；线上部署时，它们变成了两个真实域名之间的协作。

所以线上排查问题时，不能只看代码，还要同时看构建环境变量、浏览器 Network、后端日志、数据库连接和 CORS 配置。
