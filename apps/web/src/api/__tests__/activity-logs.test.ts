import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchActivityLogs, fetchUserActivityLogs } from "../activity-logs";
import { getAuthToken } from "../../auth/token-storage";

vi.mock("../../auth/token-storage", () => ({
  clearAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAuthToken: vi.fn(),
  setRefreshToken: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);

describe("activity log API client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("fetchActivityLogs gets project activity logs with Authorization header", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await fetchActivityLogs("project-1", "access-token");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-1/activity-logs", {
      headers: {
        Authorization: "Bearer access-token"
      }
    });
  });

  it("fetchActivityLogs throws a readable error when loading fails", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "PROJECT_NOT_FOUND",
              message: "Project not found"
            }
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(fetchActivityLogs("missing-project", "access-token")).rejects.toThrow(
      "Project not found"
    );
  });

  it("fetchUserActivityLogs gets current user activity logs with Authorization header", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: [],
          meta: {
            page: 1,
            pageSize: 10,
            total: 0,
            totalPages: 0
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await fetchUserActivityLogs("access-token");

    expect(fetchMock).toHaveBeenCalledWith("/api/activity-logs", {
      headers: {
        Authorization: "Bearer access-token"
      }
    });
  });

  it("fetchUserActivityLogs throws a readable error when loading fails", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "AUTH_REQUIRED",
              message: "Authentication is required"
            }
          }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(fetchUserActivityLogs("access-token")).rejects.toThrow(
      "Authentication is required"
    );
  });
});
