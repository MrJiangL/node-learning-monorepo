# Task: Redis 缓存进阶：缓存失败时降级到数据库

## 背景

你前面已经把 `GET /projects` 接入了 Redis 缓存。

现在的读取流程大概是：

```text
请求 GET /projects
-> 先读 Redis
-> 命中就返回缓存
-> 未命中就查数据库
-> 再写回 Redis
```

这个流程在 Redis 正常时没问题。

但真实后端里会遇到一个问题：

```text
Redis 只是缓存，不应该因为 Redis 暂时不可用，就让核心接口直接失败。
```

比如：

```text
Redis 读失败 -> 仍然应该查数据库并返回结果
Redis 写失败 -> 仍然应该把数据库结果返回给用户
```

这张任务要做：

```text
让 getCachedProjectList 在 Redis 读写失败时降级到 loadProjects。
```

---

## 你会练到什么

- 缓存和数据库的主次关系
- 什么叫 graceful degradation，中文可以理解成“优雅降级”
- 为什么缓存失败不应该影响核心业务读取
- 如何给异常路径写测试
- 为什么 catch 不一定等于吞错误，而是有意识地选择降级策略

---

## 核心理解

这里数据库是主数据源：

```text
Project 真正的数据在 MySQL。
```

Redis 是辅助加速层：

```text
Redis 只是为了让列表读得更快。
```

所以当 Redis 出问题时，合理策略是：

```text
缓存读失败：跳过缓存，查数据库
缓存写失败：忽略写缓存失败，返回数据库结果
```

但如果数据库查询失败：

```text
loadProjects 失败：应该继续抛错
```

因为这个时候核心数据源真的失败了，不能假装成功。

---

## 任务 1：给缓存读取加降级

修改：

```text
apps/api/src/cache/project-list-cache.ts
```

找到：

```ts
const cachedResult = await getJson<PaginatedResult<Project>>(client, cacheKey);

if (cachedResult) {
  return cachedResult;
}
```

你要把“读 Redis”包进 `try/catch`。

可以按这个思路写：

```ts
let cachedResult: PaginatedResult<Project> | null = null;

try {
  // 这里是读缓存。
  //
  // 如果 Redis 正常：
  // - 命中：cachedResult 是列表数据
  // - 未命中：cachedResult 是 null
  //
  // 如果 Redis 异常：
  // - catch 会接住错误
  // - 后面继续走 loadProjects
  cachedResult = await getJson<PaginatedResult<Project>>(client, cacheKey);
} catch {
  // Redis 是缓存层，不是主数据源。
  //
  // 所以这里不把错误继续抛出去。
  // 读缓存失败时，让请求继续走数据库查询。
  cachedResult = null;
}

if (cachedResult) {
  return cachedResult;
}
```

注意：

```text
这里先不要加 console.error。
```

因为我们之前做过请求日志噪音控制。学习阶段先把行为做对，后面再单独学“可观察性日志怎么打”。

---

## 任务 2：给缓存写入加降级

继续修改：

```text
apps/api/src/cache/project-list-cache.ts
```

现在的代码是：

```ts
const freshResult = await loadProjects();
await setJson(client, cacheKey, freshResult, PROJECT_LIST_CACHE_TTL_SECONDS);

return freshResult;
```

你要改成：

```ts
const freshResult = await loadProjects();

try {
  // 数据库已经查到结果了。
  //
  // 写缓存只是性能优化：
  // - 写成功：下次请求更快
  // - 写失败：这次请求也应该正常返回数据库结果
  await setJson(client, cacheKey, freshResult, PROJECT_LIST_CACHE_TTL_SECONDS);
} catch {
  // 写缓存失败时，不影响本次 API 响应。
  //
  // 这里不 return 别的东西，因为 freshResult 才是这次查询的真实结果。
}

return freshResult;
```

重点：

```text
loadProjects 不能放进 try/catch 里吞掉。
```

因为数据库失败和缓存失败不是一个级别的问题。

---

## 任务 3：补一个缓存读失败测试

修改：

```text
apps/api/tests/integration/project-list-cache.test.ts
```

新增一个测试：

```ts
it("Redis 读取失败时会降级调用 loader 返回数据库结果", async () => {
  let loadCount = 0;

  const failingClient = {
    get: async () => {
      throw new Error("Redis read failed");
    },
    set: async () => "OK"
  };

  const result = await getCachedProjectList(failingClient as never, filter, async () => {
    loadCount += 1;
    return projectList;
  });

  expect(result).toEqual(projectList);
  expect(loadCount).toBe(1);
});
```

这里用了：

```ts
failingClient as never;
```

这是为了让测试聚焦在“Redis get 抛错”这个行为上。

真实项目里我们通常会抽更小的 cache client interface，让测试不用这样转类型。现在你先理解行为，后面再学接口抽象。

---

## 任务 4：补一个缓存写失败测试

继续修改：

```text
apps/api/tests/integration/project-list-cache.test.ts
```

新增一个测试：

```ts
it("Redis 写入失败时仍然返回 loader 查询结果", async () => {
  let loadCount = 0;

  const failingClient = {
    get: async () => null,
    set: async () => {
      throw new Error("Redis write failed");
    }
  };

  const result = await getCachedProjectList(failingClient as never, filter, async () => {
    loadCount += 1;
    return projectList;
  });

  expect(result).toEqual(projectList);
  expect(loadCount).toBe(1);
});
```

这个测试证明：

```text
即使缓存写入失败，API 也可以返回数据库结果。
```

---

## 任务 5：确认数据库失败仍然会抛错

再新增一个测试：

```ts
it("loader 查询失败时不会被缓存降级逻辑吞掉", async () => {
  const fakeClient = {
    get: async () => null,
    set: async () => "OK"
  };

  await expect(
    getCachedProjectList(fakeClient as never, filter, async () => {
      throw new Error("Database failed");
    })
  ).rejects.toThrow("Database failed");
});
```

这个测试很重要。

因为我们想降级的是：

```text
Redis 失败
```

不是：

```text
所有错误都假装没发生
```

---

## 任务 6：运行验证

先跑这张任务相关测试：

```bash
npm run test -w @learn/api -- tests/integration/project-list-cache.test.ts
```

再跑类型检查：

```bash
npm run typecheck -w @learn/api
```

最后跑格式检查：

```bash
npm run format:check
```

如果格式检查不通过：

```bash
npm run format
npm run format:check
```

---

## 完成标准

- [x] Redis 读取失败时不会让 `getCachedProjectList` 直接失败
- [x] Redis 读取失败时会调用 `loadProjects`
- [x] Redis 写入失败时仍然返回 `loadProjects` 的结果
- [x] `loadProjects` 自己失败时，错误仍然会抛出
- [x] 测试描述使用中文
- [x] 代码注释能解释“为什么缓存失败可以降级，数据库失败不能吞”
- [x] `npm run test -w @learn/api -- tests/integration/project-list-cache.test.ts` 通过
- [x] `npm run typecheck -w @learn/api` 通过
- [x] `npm run format:check` 通过

完成后告诉我：

```text
Redis 缓存故障降级完成了
```
