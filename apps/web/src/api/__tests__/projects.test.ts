import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteProject, updateProject } from "../projects";
import { getAuthToken } from "../../auth/token-storage";

vi.mock("../../auth/token-storage", () => ({
  clearAuthToken: vi.fn(),
  getAuthToken: vi.fn(),
  getRefreshToken: vi.fn(),
  setAuthToken: vi.fn(),
  setRefreshToken: vi.fn()
}));

const mockedGetAuthToken = vi.mocked(getAuthToken);

describe("projects API client", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("updateProject patches /projects/:id with Authorization header", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "project-1",
            userId: "user-1",
            name: "更新后的 Project",
            description: "更新后的描述",
            createdAt: "2026-06-02T00:00:00.000Z",
            updatedAt: "2026-06-28T00:00:00.000Z"
          }
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await updateProject("project-1", "access-token", {
      name: "更新后的 Project",
      description: "更新后的描述"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-1", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer access-token"
      },
      body: JSON.stringify({
        name: "更新后的 Project",
        description: "更新后的描述"
      })
    });
  });

  it("deleteProject deletes /projects/:id with Authorization header", async () => {
    mockedGetAuthToken.mockReturnValue(null);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

    vi.stubGlobal("fetch", fetchMock);

    await deleteProject("project-1", "access-token");

    expect(fetchMock).toHaveBeenCalledWith("/api/projects/project-1", {
      method: "DELETE",
      headers: {
        Authorization: "Bearer access-token"
      }
    });
  });
});
