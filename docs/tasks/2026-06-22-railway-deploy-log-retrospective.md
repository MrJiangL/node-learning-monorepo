# Task: API 部署日志和故障复盘

## 背景

Railway API 首次部署已经成功，线上 smoke 验证也已经通过。

下一步不是继续堆功能，而是回看部署过程：

- 哪些步骤顺利
- 哪些地方容易错
- Railway logs 应该怎么看
- 以后部署失败时怎么定位

这张任务只做部署日志和故障复盘。

---

## 任务 1：回看 Railway Deploy Logs

打开 Railway API service 的 Deployments / Logs。

重点看这些阶段：

- install dependencies
- prisma generate
- build shared
- build api
- prisma migrate deploy
- start api

记录每个阶段大概在日志里长什么样。

---

## 任务 2：创建复盘文档

创建：

`docs/reviews/railway-deploy-log-retrospective.md`

写下面这些小标题：

# Railway 部署日志复盘

## 1. 这次部署经历了哪些阶段

## 2. 哪些日志说明 build 成功

## 3. 哪些日志说明 migration 成功

## 4. 哪些日志说明 API start 成功

## 5. 如果 deploy 失败，我应该先看哪里

## 6. 我现在怎么理解部署日志

---

## 完成标准

- [ ] 创建 `docs/reviews/railway-deploy-log-retrospective.md`
- [ ] 写出 install / build / migrate / start 的区别
- [ ] 写出部署失败时的排查顺序
- [ ] `npm run format:check` 通过

完成后告诉我：

`Railway 部署日志复盘完成了`
