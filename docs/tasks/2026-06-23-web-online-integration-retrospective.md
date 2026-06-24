# Task: 前后端线上联调复盘

## 背景

前端已经部署到 Netlify，后端已经部署到 Railway。

现在这条线上链路已经跑通：

```text
Netlify 前端 -> Railway API -> Railway MySQL
```

这张任务不急着继续写新功能，而是复盘一次完整线上联调。

重点不是“能跑就行”，而是把你这次真正踩过和理解到的东西沉淀下来：

- 前端环境变量怎么影响 API 请求地址
- 后端 CORS 怎么放行前端域名
- 为什么前端没有注册页时，仍然可以通过 API 创建测试账号
- 线上登录 / Project / Todo 主链路分别验证了什么
- 如果下次线上前端打不开、登录失败、接口 401/404/CORS 报错，应该从哪里排查

---

## 这张任务只练什么

只练一次部署联调复盘，不写业务代码。

你要把“我部署成功了”升级成“我知道它为什么能成功，坏了该从哪里查”。

---

## 任务 1：创建复盘文档

创建：

`docs/reviews/web-online-integration-retrospective.md`

写下面这些小标题：

```md
# 前后端线上联调复盘

## 1. 这次线上链路是什么

## 2. Netlify 前端需要哪些配置

## 3. Railway API 需要哪些配置

## 4. 我怎么创建和使用测试账号

## 5. 我验证了哪些线上主链路

## 6. 如果线上登录失败，我会怎么排查

## 7. 如果遇到 CORS 报错，我会怎么排查

## 8. 我现在怎么理解前后端分离部署
```

---

## 任务 2：把这次真实信息写进去

至少记录这些真实信息：

- 前端地址：`https://scintillating-pavlova-dc76e0.netlify.app/projects`
- API 地址：`https://node-learning-monorepo-production.up.railway.app`
- 前端环境变量：`VITE_API_BASE_URL`
- 后端环境变量：`CORS_ORIGIN`
- 测试账号创建方式：通过 `POST /auth/register`
- 测试密码示例：`password123`

注意：不要把真实 token、真实数据库密码、Railway 密钥、Netlify 密钥写进文档。

---

## 任务 3：写一个排查顺序

在复盘文档里写清楚：

如果线上登录失败，你会按什么顺序查：

1. 前端页面是否能打开
2. 浏览器 Network 里请求的 API URL 是否正确
3. Railway API `/health` 或 `/ready` 是否正常
4. `POST /auth/login` 返回的是 401、404、500，还是 CORS error
5. Railway logs 里有没有后端错误
6. Netlify 环境变量是否重新部署后生效
7. Railway `CORS_ORIGIN` 是否包含当前前端域名

---

## 验证命令

这张任务只改文档，所以运行：

```bash
npm run format:check
```

如果你愿意，也可以再跑一次线上 API smoke：

```bash
API_BASE_URL=https://node-learning-monorepo-production.up.railway.app npm run smoke:api -w @learn/api
```

---

## 完成标准

- [x] 创建 `docs/reviews/web-online-integration-retrospective.md`
- [x] 写清楚 Netlify 前端和 Railway API 的线上链路
- [x] 写清楚 `VITE_API_BASE_URL` 和 `CORS_ORIGIN` 各自负责什么
- [x] 写清楚测试账号怎么创建和使用
- [x] 写出登录失败 / CORS 报错的排查顺序
- [x] `npm run format:check` 通过

## 完成记录

- 完成时间：2026-06-23
- 复盘文档：`docs/reviews/web-online-integration-retrospective.md`

完成后告诉我：

`前后端线上联调复盘完成了`
