# Task: 线上注册 / 登录 / 退出 smoke 复盘

## 背景

现在前端产品体验已经补了三块：

    注册页
    登录态守卫和退出登录
    Project / Todo 状态展示

下一步不是马上继续写新功能，而是回到线上环境，把这条用户路径真实走一遍：

    打开 Netlify 前端
    注册新账号
    自动进入 /projects
    创建 Project
    创建 Todo
    退出登录
    确认回到 /login
    再次登录
    确认还能看到数据

这张任务是 smoke 复盘，不写代码。

---

## 这张任务只练什么

只练两件事：

1. 在线上前端按真实用户路径手动 smoke
2. 把观察到的现象写成复盘文档

---

## 任务 1：准备线上验证

确认线上地址：

    https://scintillating-pavlova-dc76e0.netlify.app

确认 API 地址：

    https://node-learning-monorepo-production.up.railway.app

确认 Netlify 已经重新部署到包含注册页的版本。

如果你刚 push 过代码，要等 Netlify build 完成后再测。

---

## 任务 2：手动走一遍 auth smoke

建议新建一个测试邮箱，例如：

    web-smoke-当前时间戳@example.com

手动验证：

1. 打开 /register
2. 输入邮箱、密码、昵称
3. 提交注册
4. 确认进入 /projects
5. 创建一个 Project
6. 创建一个 Todo
7. 点击退出登录
8. 确认回到 /login
9. 用刚才账号重新登录
10. 确认能回到 /projects

观察时重点看：

    页面是否有明显 loading
    空状态是否能看懂
    错误信息是否可读
    退出后是否真的回到登录页
    刷新页面后登录态是否符合预期

---

## 任务 3：创建复盘文档

创建：

    docs/reviews/web-online-auth-smoke-retrospective.md

写这些小标题：

    # 线上注册 / 登录 / 退出 smoke 复盘

    ## 1. 我测试的线上地址

    ## 2. 我走了哪些用户路径

    ## 3. 注册页表现如何

    ## 4. 登录态和退出登录表现如何

    ## 5. Project / Todo 状态展示表现如何

    ## 6. 我遇到的问题

    ## 7. 下一步还可以优化什么

不要写真实 token。

测试账号邮箱可以写，密码如果只是学习用 password123 可以写；如果你用了真实密码，不要写。

---

## 任务 4：如果发现问题，只记录，不急着修

这张任务先不修代码。

如果你发现问题，先写进复盘：

    问题是什么
    在哪一步出现
    你猜是哪一层导致
    下次应该怎么验证

原因：

    smoke 复盘的价值是先把真实现象记录下来。
    不要一边测一边改，否则容易忘记原始问题是什么。

---

## 验证命令

这张任务只改文档，所以本地只跑：

    npm run format:check

如果你顺手想确认前端仍然能构建，可以跑：

    npm run build -w @learn/web

---

## 完成标准

- [x] 创建 docs/reviews/web-online-auth-smoke-retrospective.md
- [x] 记录线上前端地址
- [x] 记录注册 / 登录 / 退出路径
- [x] 记录 Project / Todo 主链路
- [x] 记录观察到的问题或确认没有问题
- [x] 写出下一步可优化点
- [x] npm run format:check 通过

## 完成记录

- 完成时间：2026-06-24
- 复盘文档：docs/reviews/web-online-auth-smoke-retrospective.md
- 验证结果：npm run format:check 通过

完成后告诉我：

    线上 auth smoke 复盘完成了
