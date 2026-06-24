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
