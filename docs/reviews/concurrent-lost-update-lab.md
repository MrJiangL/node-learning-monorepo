# 并发更新实验：lost update

## 1. 我运行脚本看到了什么

```text
First read attempts: 0
Second read attempts: 0
Final attempts: 1
Expected if both increments were preserved: 2
```

这个输出说明：两个流程都读到了旧值 `attempts = 0`，但最后数据库里只保留了一次加一的结果。

## 2. 为什么两个流程都读到了 attempts = 0

这时候只是还在读 数据 并没有做更新

更准确地说：

```text
两个读取几乎同时发生。
第一次读取看到 attempts = 0。
第二次读取也看到 attempts = 0。
这时还没有任何一次 update 成功写回数据库。
```

## 3. 为什么最终 attempts 不是 2

说明其中一次更新被覆盖了

两个流程后面都做了同样的计算：

```text
0 + 1 = 1
```

所以它们不是分别把数据库里的当前值加一，而是都把自己算好的 `1` 写回数据库。

执行结果类似：

```text
流程 A：读到 0，准备写 1
流程 B：读到 0，准备写 1
流程 A：写入 attempts = 1
流程 B：也写入 attempts = 1
```

最终不是 2，而是 1。

## 4. 这个问题和 transaction / lock 有什么关系

这个问题和 transaction / lock 的关系是：并发场景下，只把代码写成顺序步骤不够。

```text
read -> calculate -> write
```

如果中间没有保护，多个流程可能同时基于旧值计算，再互相覆盖。

后面可以用几种方式解决：

```text
1. atomic increment：让数据库直接执行 attempts = attempts + 1。
2. transaction：把一组操作放进事务里，保证一致性边界。
3. lock：让某个流程处理期间，其他流程不能同时改同一行。
```

这张任务只观察问题，下一张任务先用 atomic increment 修复它。

## 5. 我现在的理解

read -> calculate -> write 这种流程在单线程理解里很直观，但在并发下可能会用旧值覆盖新值。
下一步需要学习数据库原子更新、transaction 或锁来保护这种更新。

我现在可以把 lost update 理解成：

```text
不是更新没有执行，而是两个更新都基于同一个旧值执行，后写入的结果覆盖了前一次更新的意义。
```
