import { afterEach, describe, expect, it, vi } from "vitest";
import { authenticatedFetch } from "../authenticated-fetch";
import { refreshAuthToken } from "../auth";
import {
  clearAuthToken,
  getAuthToken,
  getRefreshToken,
  setAuthToken,
  setRefreshToken
} from "../../auth/token-storage";

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

const mockedClearAuthToken = vi.mocked(clearAuthToken);
const mockedGetAuthToken = vi.mocked(getAuthToken);
const mockedGetRefreshToken = vi.mocked(getRefreshToken);
const mockedRefreshAuthToken = vi.mocked(refreshAuthToken);
const mockedSetAuthToken = vi.mocked(setAuthToken);
const mockedSetRefreshToken = vi.mocked(setRefreshToken);

function createAuthResult(accessToken: string, refreshToken: string) {
  return {
    success: true as const,
    data: {
      accessToken,
      refreshToken,
      user: {
        id: "user-1",
        email: "user@example.com",
        name: null,
        createdAt: "2026-06-23T00:00:00.000Z",
        updatedAt: "2026-06-23T00:00:00.000Z"
      }
    }
  };
}

describe("authenticatedFetch", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

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

  it("401 且有 refreshToken 时会刷新 token 并重试原请求", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("{}", { status: 401 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    mockedGetAuthToken.mockReturnValue("old-access-token");
    mockedGetRefreshToken.mockReturnValue("refresh-token");
    mockedRefreshAuthToken.mockResolvedValue(
      createAuthResult("new-access-token", "new-refresh-token")
    );

    await authenticatedFetch("/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name: "Project" })
    });

    expect(mockedRefreshAuthToken).toHaveBeenCalledWith("refresh-token");
    expect(mockedSetAuthToken).toHaveBeenCalledWith("new-access-token");
    expect(mockedSetRefreshToken).toHaveBeenCalledWith("new-refresh-token");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/projects", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer new-access-token"
      },
      body: JSON.stringify({ name: "Project" })
    });
  });

  it("401 且没有 refreshToken 时会清理登录态并返回原响应", async () => {
    const firstResponse = new Response("{}", { status: 401 });
    const fetchMock = vi.fn().mockResolvedValue(firstResponse);
    vi.stubGlobal("fetch", fetchMock);
    mockedGetAuthToken.mockReturnValue("old-access-token");
    mockedGetRefreshToken.mockReturnValue(null);

    const response = await authenticatedFetch("/projects");

    expect(response).toBe(firstResponse);
    expect(mockedClearAuthToken).toHaveBeenCalledTimes(1);
    expect(mockedRefreshAuthToken).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refresh 失败时会清理登录态并返回原 401 响应", async () => {
    const firstResponse = new Response("{}", { status: 401 });
    const fetchMock = vi.fn().mockResolvedValue(firstResponse);
    vi.stubGlobal("fetch", fetchMock);
    mockedGetAuthToken.mockReturnValue("old-access-token");
    mockedGetRefreshToken.mockReturnValue("refresh-token");
    mockedRefreshAuthToken.mockRejectedValue(new Error("refresh failed"));

    const response = await authenticatedFetch("/projects");

    expect(response).toBe(firstResponse);
    expect(mockedRefreshAuthToken).toHaveBeenCalledWith("refresh-token");
    expect(mockedClearAuthToken).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
