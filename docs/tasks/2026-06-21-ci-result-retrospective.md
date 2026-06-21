# Task: CI 结果复盘和优化

## 背景

你已经创建了第一个 GitHub Actions workflow。

本地我们可以跑：

```bash
npm run format:check
npm run typecheck
npm test
```

但真正的 CI 结果要在 GitHub 上看。

下一步先做一张复盘任务：看 CI 是不是通过，如果失败，读懂失败原因。

---

## 这张任务只练什么

只练 CI 结果阅读：

```text
1. GitHub Actions 在哪里看。
2. 怎么判断哪个 step 失败。
3. 失败时先看日志，不盲目改。
4. 记录本地验证和 CI 验证的区别。
```

---

## 任务 1：查看 GitHub Actions

把代码 push 到 GitHub 后，打开仓库：

```text
Actions -> CI
```

查看最新一次 workflow。

---

## 任务 2：创建复盘文档

创建：

```text
docs/reviews/ci-result-retrospective.md
```

写下面这些小标题：

```md
# CI 结果复盘

## 1. CI 是否通过

## 2. 如果失败，失败在哪个 step

## 3. 本地验证和 CI 验证有什么区别

## 4. 我现在怎么理解 CI

## 5. 下一步要优化什么
```

如果 CI 还没推到 GitHub，可以在第 1 节写：

```text
暂时还没有远程 CI 结果，本地已通过 format / typecheck / test。
```

---

## 验证命令

本地继续运行：

```bash
npm run format:check
npm run typecheck
npm test
```

---

## 完成标准

- [ ] 创建 `docs/reviews/ci-result-retrospective.md`
- [ ] 写下 CI 是否通过，或者说明还没有远程结果
- [ ] 写清楚本地验证和 CI 验证的区别
- [ ] `npm run format:check` 通过
- [ ] `npm run typecheck` 通过
- [ ] `npm test` 通过

完成后告诉我：

```text
CI 结果复盘完成了
```
