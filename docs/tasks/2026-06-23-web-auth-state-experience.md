# Task: 前端登录态体验：退出登录和自动跳转

## 背景

现在前端已经有三条主要页面路径：

    /login      登录页
    /register   注册页
    /projects   Project 工作台

也已经有 token 存储：

    auth_token
    refresh_token

当前登录态相关代码大概分在四层：

    router/index.ts              决定没登录能不能进 /projects
    auth/token-storage.ts        负责读写和清理 token
    api/authenticated-fetch.ts   负责业务请求带 token，以及 401 后尝试 refresh
    ProjectsPage/index.vue       负责退出登录后跳回 /login

这张任务不是为了新增大功能，而是把“登录态什么时候有效、什么时候失效、失效后页面应该去哪”这条线补扎实。

---

## 这张任务只练什么

只练三件事：

1. 路由守卫测试
2. 退出登录测试
3. authenticatedFetch 的 token / refresh 行为测试

不做新的 UI 大改，不做后端接口，不做线上部署。

---

## 任务 1：理解当前路由守卫

先打开：

    apps/web/src/router/index.ts

你会看到：

    router.beforeEach((to) => {
      if (to.meta.requiresAuth && !getAuthToken()) {
        return "/login";
      }
    });

这段代码的意思是：

    如果目标页面需要登录，并且当前没有 accessToken，就跳回 /login。

当前只有 /projects 设置了：

    meta: {
      requiresAuth: true
    }

所以：

    /projects   需要 token
    /login      不需要 token
    /register   不需要 token

学习点：

    路由守卫不是后端鉴权。
    它只是前端体验层的第一道门：没 token 时不要让用户看到工作台页面。

真正的安全边界仍然在后端 requireAuth。

---

## 任务 2：补路由守卫测试

新增文件：

    apps/web/src/router/__tests__/router.test.ts

建议先写这些测试：

    import { beforeEach, describe, expect, it, vi } from "vitest";
    import { router } from "../index";
    import { getAuthToken } from "../../auth/token-storage";

    vi.mock("../../auth/token-storage", () => ({
      getAuthToken: vi.fn()
    }));

    const mockedGetAuthToken = vi.mocked(getAuthToken);

    describe("router auth guard", () => {
      beforeEach(async () => {
        vi.clearAllMocks();
        await router.push("/login");
        await router.isReady();
      });

      it("没有 token 时访问 /projects 会跳到 /login", async () => {
        mockedGetAuthToken.mockReturnValue(null);

        await router.push("/projects");
        await router.isReady();

        expect(router.currentRoute.value.path).toBe("/login");
      });

      it("有 token 时访问 /projects 可以进入工作台", async () => {
        mockedGetAuthToken.mockReturnValue("test-token");

        await router.push("/projects");
        await router.isReady();

        expect(router.currentRoute.value.path).toBe("/projects");
      });

      it("/login 和 /register 不需要 token", async () => {
        mockedGetAuthToken.mockReturnValue(null);

        await router.push("/register");
        await router.isReady();

        expect(router.currentRoute.value.path).toBe("/register");
      });
    });

为什么测试 router，而不是只看代码？

    因为 beforeEach 是一个运行时行为。
    你真正关心的是“用户访问某个路径后，最后停在哪个页面”。

如果你遇到 router 状态互相影响，说明测试之间没有隔离好。

这张任务先接受复用同一个 router；如果不稳定，再考虑把 router 创建逻辑抽成 factory。

---

## 任务 3：理解退出登录链路

打开：

    apps/web/src/pages/ProjectsPage/index.vue

现在退出登录大概是：

    async function handleLogout() {
      clearAuthToken();
      await router.push("/login");
    }

这里有两个动作：

    1. 清掉本地 token
    2. 跳回登录页

注意：

    clearAuthToken() 不只清 accessToken，也会清 refreshToken。

所以退出登录不是只删除 auth_token。

---

## 任务 4：补退出登录按钮测试

先看子组件：

    apps/web/src/pages/ProjectsPage/components/ProjectListPanel/index.vue

如果里面已经有“退出登录”按钮，并且点击后只 emit：

    emit("logout");

那子组件测试只要证明：

    点击按钮 -> emit logout

在现有测试文件里补：

    apps/web/src/pages/ProjectsPage/components/ProjectListPanel/__tests__/ProjectListPanel.test.ts

建议测试：

    it("点击退出登录按钮时会 emit logout 事件", async () => {
      const wrapper = mount(ProjectListPanel, {
        props: {
          selectedProjectId: null,
          projectListState: {
            status: "idle"
          }
        }
      });

      const logoutButton = wrapper.findAll("button").find((button) => button.text() === "退出登录");

      if (!logoutButton) {
        throw new Error("没有找到“退出登录”按钮");
      }

      await logoutButton.trigger("click");

      expect(wrapper.emitted("logout")).toEqual([[]]);
    });

学习点：

    ProjectListPanel 不应该直接清 token，也不应该直接 router.push。
    它只是一个展示组件。

真正的退出登录动作在 ProjectsPage 里。

---

## 任务 5：可选补页面层退出测试

如果你想继续练页面编排测试，可以新增：

    apps/web/src/pages/ProjectsPage/__tests__/ProjectsPage.test.ts

测试思路：

    1. mock clearAuthToken
    2. mock vue-router 的 useRouter().push
    3. mock ProjectListPanel，让它暴露一个能触发 logout 的按钮
    4. 点击按钮
    5. 断言 clearAuthToken 被调用
    6. 断言 router.push("/login") 被调用

这一步比子组件测试绕一点。

如果你觉得 mock 子组件还不熟，可以先跳过页面层测试。这张任务最低要求是子组件 logout 测试 + authenticatedFetch 测试。

---

## 任务 6：理解 authenticatedFetch

打开：

    apps/web/src/api/authenticated-fetch.ts

它现在做三件事：

    1. 如果有 accessToken，请求时带 Authorization header
    2. 如果业务请求返回 401，尝试用 refreshToken 换新 token
    3. 如果没有 refreshToken 或 refresh 失败，就 clearAuthToken

这个 helper 是前端登录态体验里最关键的一层。

原因：

    Project / Todo API 都依赖 authenticatedFetch。
    所以它一旦错了，所有需要登录的业务请求都会一起出问题。

---

## 任务 7：补 authenticatedFetch 测试

新增：

    apps/web/src/api/__tests__/authenticated-fetch.test.ts

先写测试骨架：

    import { afterEach, describe, expect, it, vi } from "vitest";
    import { authenticatedFetch } from "../authenticated-fetch";
    import {
      clearAuthToken,
      getAuthToken,
      getRefreshToken,
      setAuthToken,
      setRefreshToken
    } from "../../auth/token-storage";
    import { refreshAuthToken } from "../auth";

    vi.mock("../../auth/token-storage", () => ({
      clearAuthToken: vi.fn(),
      getAuthToken: vi.fn(),
      getRefreshToken: vi.fn(),
      setAuthToken: vi.fn(),
      setRefreshToken: vi.fn()
    }));

    vi.mock("../auth", () => ({
      refreshAuthToken: vi.fn()
    }));

    const mockedGetAuthToken = vi.mocked(getAuthToken);
    const mockedGetRefreshToken = vi.mocked(getRefreshToken);
    const mockedRefreshAuthToken = vi.mocked(refreshAuthToken);

    describe("authenticatedFetch", () => {
      afterEach(() => {
        vi.restoreAllMocks();
      });
    });

### 7.1 有 accessToken 时带 Authorization header

建议测试：

    it("有 accessToken 时会带 Authorization header", async () => {
      const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
      vi.stubGlobal("fetch", fetchMock);
      mockedGetAuthToken.mockReturnValue("access-token");

      await authenticatedFetch("/projects");

      expect(fetchMock).toHaveBeenCalledWith("/projects", {
        headers: {
          Authorization: "Bearer access-token"
        }
      });
    });

学习点：

    这里不需要真的请求后端。
    我们只验证 authenticatedFetch 组装请求的行为。

### 7.2 401 + refreshToken 时刷新并重试

测试目标：

    第一次 fetch 返回 401
    refreshAuthToken 返回新 accessToken / refreshToken
    第二次 fetch 用新 accessToken 重试原请求

建议 mock：

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));

    mockedGetAuthToken.mockReturnValue("old-access-token");
    mockedGetRefreshToken.mockReturnValue("refresh-token");
    mockedRefreshAuthToken.mockResolvedValue({
      success: true,
      data: {
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        user: {
          id: "user-1",
          email: "user@example.com",
          name: null,
          createdAt: "2026-06-23T00:00:00.000Z",
          updatedAt: "2026-06-23T00:00:00.000Z"
        }
      }
    });

断言重点：

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(mockedRefreshAuthToken).toHaveBeenCalledWith("refresh-token");
    expect(setAuthToken).toHaveBeenCalledWith("new-access-token");
    expect(setRefreshToken).toHaveBeenCalledWith("new-refresh-token");

### 7.3 没有 refreshToken 时清 token

建议测试：

    mockedGetAuthToken.mockReturnValue("old-access-token");
    mockedGetRefreshToken.mockReturnValue(null);

第一次请求返回 401 后，应该：

    clearAuthToken 被调用
    不再重试第二次 fetch

### 7.4 refresh 失败时清 token

建议测试：

    mockedRefreshAuthToken.mockRejectedValue(new Error("refresh failed"));

第一次请求返回 401，refresh 又失败后，应该：

    clearAuthToken 被调用
    返回第一次 401 response

学习点：

    refresh 失败时不要继续拿旧 token 死循环重试。
    清理登录态，让用户重新登录，是更安全的体验。

---

## 任务 8：轻微体验优化

确认 UI 里的退出文案是：

    退出登录

如果已经是这个文案，不用改。

这张任务先不要处理：

    退出登录后是否清空页面内存里的 Project / Todo 状态

原因：

    退出后会跳到 /login，页面组件会卸载。
    状态残留目前不是最优先问题。

---

## 先不要做

这张任务先不要：

    不要做注册页 UI 美化
    不要做用户头像
    不要做记住我
    不要做后端 logout 接口
    不要做 refresh token 黑名单
    不要改后端鉴权逻辑

只把前端登录态体验测试补扎实。

---

## 验证命令

先跑前端测试：

    npm run test -w @learn/web

再跑类型检查：

    npm run typecheck -w @learn/web

最后跑格式和构建：

    npm run format:check
    npm run build -w @learn/web

---

## 完成标准

- [x] 路由守卫测试覆盖未登录访问 /projects
- [x] 路由守卫测试覆盖已登录访问 /projects
- [x] 路由守卫测试覆盖 /login / /register 不需要登录
- [x] 退出登录按钮测试覆盖 emit logout
- [x] authenticatedFetch 测试覆盖 accessToken header
- [x] authenticatedFetch 测试覆盖 401 后 refresh 成功并重试
- [x] authenticatedFetch 测试覆盖没有 refreshToken 时清理 token
- [x] authenticatedFetch 测试覆盖 refresh 失败时清理 token
- [x] 退出登录文案清晰
- [x] npm run test -w @learn/web 通过
- [x] npm run typecheck -w @learn/web 通过
- [x] npm run format:check 通过
- [x] npm run build -w @learn/web 通过

## 完成记录

- 完成时间：2026-06-23
- 新增路由守卫测试：apps/web/src/router/**tests**/router.test.ts
- 新增 authenticatedFetch 测试：apps/web/src/api/**tests**/authenticated-fetch.test.ts
- 补充退出登录按钮 emit 测试：ProjectListPanel.test.ts
- 验证结果：前端测试 9 个文件、23 个测试全部通过

完成后告诉我：

    前端登录态体验完成了
