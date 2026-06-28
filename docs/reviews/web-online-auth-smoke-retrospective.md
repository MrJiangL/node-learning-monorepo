# 线上注册 / 登录 / 退出 smoke 复盘

## 1. 我测试的线上地址

前端地址：

https://scintillating-pavlova-dc76e0.netlify.app

本次主要测试路径：

https://scintillating-pavlova-dc76e0.netlify.app/register
https://scintillating-pavlova-dc76e0.netlify.app/login
https://scintillating-pavlova-dc76e0.netlify.app/projects

API 地址：

https://node-learning-monorepo-production.up.railway.app

## 2. 我走了哪些用户路径

我这次手动走了完整 auth smoke 路径：

1. 打开注册页 `/register`
2. 输入测试邮箱、密码和昵称
3. 提交注册
4. 注册成功后自动进入 `/projects`
5. 创建一个 Project
6. 在这个 Project 下创建一个 Todo
7. 点击退出登录
8. 页面回到 `/login`
9. 使用刚才注册的账号再次登录
10. 登录后重新进入 `/projects`

这说明注册、登录、token 保存、受保护页面访问、Project / Todo 创建、退出登录这几条链路都能在线上跑通。

## 3. 注册页表现如何

注册页表现正常。

我观察到：

- 可以从登录页进入注册页
- 可以填写邮箱、密码和昵称
- 注册成功后不需要手动再登录，会自动进入 `/projects`
- 注册后 token 能正常保存，后续 Project / Todo 请求能带上登录态

这一点解决了之前的问题：前端没有注册页时，测试账号必须通过 API 手动创建。

## 4. 登录态和退出登录表现如何

登录态和退出登录表现正常。

我观察到：

- 注册后可以直接进入 `/projects`
- 退出登录后会回到 `/login`
- 退出后再次访问 `/projects` 会被路由守卫带回登录页
- 用刚才注册的账号重新登录后，可以再次进入 `/projects`

这说明前端的 token 保存、清理和路由守卫目前是串起来的。

## 5. Project / Todo 状态展示表现如何

Project / Todo 主链路表现正常。

我观察到：

- 可以创建 Project
- 可以在 Project 下创建 Todo
- 没有数据时页面有空状态提示
- 加载时有 loading 文案
- 创建后页面能显示新数据

状态提示比之前更清楚，用户知道什么时候该创建 Project，什么时候该选择 Project，再去创建 Todo。

## 6. 我遇到的问题

这次线上 smoke 暂时没有遇到阻断问题。

没有看到：

- CORS 报错
- 登录失败
- 注册失败
- Project 创建失败
- Todo 创建失败
- 退出登录后仍停留在工作台的问题

如果后续遇到问题，我会优先看浏览器 Network、Console，以及 Railway logs。

## 7. 下一步还可以优化什么

下一步可以优化：

1. 给注册页和登录页增加更清楚的错误提示，比如邮箱已存在、密码太短。
2. 给创建 Project / Todo 的表单增加更好的表单级错误展示，减少 alert。
3. 做一次前端产品体验阶段复盘，总结注册、登录态、状态展示这几张任务学到什么。
