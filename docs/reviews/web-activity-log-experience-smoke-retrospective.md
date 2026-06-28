# Activity Log 体验优化 smoke 和复盘

## 1. 这次我优化了什么

这次优化的是 Activity Log 面板的可读性。

第一版 Activity Log 已经能展示日志，但展示内容还偏开发者视角：

```text
todo.completed
2026-06-28T11:30:00.000Z
```

这些内容对开发者排查很清楚，但对普通用户不够自然。

这次优化后：

- `action` 从英文枚举变成中文文案
- `createdAt` 从 ISO 字符串变成更容易读的本地时间
- `<time datetime>` 仍然保留原始 ISO 值
- 补了 action/time helper 测试
- 更新了 ActivityLogPanel 组件测试

现在用户看到的更接近：

```text
完成了 Todo：学习组件测试
完成 Todo
2026/06/28 19:30
```

这说明 Activity Log 不再只是“后端日志原样搬到前端”，而是开始变成一个给用户看的动态流。

## 2. 中文 action 解决了什么问题

中文 action 解决的是：

    用户能不能快速理解这条日志属于什么动作。

原来的 action 是后端稳定契约：

```text
project.created
project.updated
todo.created
todo.completed
todo.deleted
```

这些枚举适合：

- 后端存储
- API 契约
- 前后端类型约束
- 测试断言
- 开发者排查

但直接展示给用户，会有一点像把数据库字段暴露在界面上。

优化后，前端把它映射成：

```text
project.created -> 创建 Project
project.updated -> 更新 Project
project.deleted -> 删除 Project
todo.created -> 创建 Todo
todo.updated -> 更新 Todo
todo.completed -> 完成 Todo
todo.deleted -> 删除 Todo
```

这里有一个重要分层：

```text
后端 action 是稳定数据。
前端 label 是展示文案。
```

不要为了中文展示去改后端 action。

后端继续保存稳定枚举，前端负责把它翻译成用户可读文案。

这和很多真实项目里的做法一致：

- 数据层保持稳定
- 展示层做本地化和产品化表达

## 3. 时间格式化解决了什么问题

时间格式化解决的是：

    用户能不能自然读懂这条日志发生在什么时候。

原始 ISO 时间长这样：

```text
2026-06-28T11:30:00.000Z
```

它的优点是标准、精确、适合机器处理。

但直接展示给用户有几个问题：

- 有 `T` 和 `Z`，不像自然时间
- 用户不一定知道它是 UTC
- 阅读成本高
- 页面显得偏技术调试界面

优化后用 `Intl.DateTimeFormat("zh-CN")` 做本地时间格式化。

这样用户看到的是更接近本地习惯的时间：

```text
2026/06/28 19:30
```

第一版没有做“刚刚 / 3 分钟前 / 昨天”这种相对时间，这是合理的。

因为相对时间会引入更多问题：

- 当前时间变化后展示要不要自动刷新
- 测试会更不稳定
- 时区和边界处理更复杂

当前阶段先做稳定的本地日期时间格式化，是更适合学习项目的选择。

## 4. 为什么 datetime 仍然保留原始 ISO

虽然用户看到的是格式化后的时间，但 `<time>` 的 `datetime` 属性仍然保留原始 ISO 字符串。

也就是类似：

```html
<time datetime="2026-06-28T11:30:00.000Z">2026/06/28 19:30</time>
```

这样做的价值是：

- 展示文本对用户友好
- `datetime` 对机器友好
- 浏览器、辅助技术或未来脚本仍然能读取标准时间
- 测试也能确认原始数据没有被丢掉

这是一个很好的前端展示习惯：

```text
用户读展示文本。
机器读语义属性。
```

所以这次优化不是简单地把原始时间替换掉，而是把“人读的时间”和“机器读的时间”分开保存。

## 5. 当前 Activity Log 还缺什么

当前 Activity Log 已经比第一版更像产品界面，但还不是最终形态。

还缺这些能力：

### 1. 还没有线上 smoke

本地测试、类型检查、格式检查、build 都已经通过。

但如果要确认线上体验，还需要部署到 Netlify 后，用真实浏览器走一遍：

```text
登录 -> 选择 Project -> 创建 Todo -> 查看 Activity Log -> 完成 Todo -> 查看 Activity Log
```

这一步能验证：

- Netlify 前端是否部署了最新代码
- Railway API 是否正常返回 Activity Log
- CORS 是否正常
- 线上 token 是否正常携带
- 线上数据库是否真的写入和读取日志

### 2. 还没有 action 筛选

现在所有日志都在一个列表里。

后续如果日志变多，可能需要：

- 只看 Todo 动作
- 只看 Project 动作
- 只看删除动作
- 只看完成动作

但这不是当前最急的。

### 3. 还没有分页 UI

后端 Activity Log API 已经有分页能力，但前端还没有分页控件。

当一个 Project 的日志很多时，前端需要支持翻页或加载更多。

### 4. 还没有更细的视觉层级

现在已经有中文 action 和格式化时间，但还可以继续优化：

- action 做成小标签
- 不同类型用不同颜色
- message 做主信息
- 时间弱化显示

这些属于后续产品打磨。

### 5. 还没有解析 metadata

现在主要依赖后端 message。

后续如果要做更丰富展示，可以利用 metadata 显示：

- 原标题
- 新标题
- Todo id
- Project 快照名

但 metadata 展示会扩大复杂度，当前不急。

## 6. 下一阶段我选择什么

我选择 B：部署上线和线上 smoke。

原因是：

Activity Log 前端展示已经完成了两步：

1. 第一版：能展示日志。
2. 第二版：日志更容易读。

现在继续做 action 筛选、分页 UI、metadata 解析当然可以，但更值得先走一次上线闭环。

前面已经专门写过部署稳定性 checklist：

```text
docs/reviews/deployment-stability-checklist.md
```

现在正好用它来验证一个真实前端功能：

```text
本地验证通过
  -> 部署到 Netlify
  -> 打开线上前端
  -> 登录
  -> 创建 / 完成 Todo
  -> 确认 Activity Log 中文 action 和格式化时间在线上正常展示
```

这一步的学习价值是：

    不只是把功能做完，而是确认功能在线上真的可用。

所以我下一阶段选择：

```text
B：部署上线和线上 smoke
```

这会把这一轮 Activity Log 功能从“本地完成”推进到“线上验证完成”。
