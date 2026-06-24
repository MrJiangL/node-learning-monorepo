import { afterEach, describe, expect, it, vi } from "vitest";
import { registerUser } from "../auth";

describe("auth API client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("registerUser posts the registration payload to /auth/register", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          success: true,
          data: {
            id: "user-1",
            email: "new-user@example.com",
            name: "New User",
            createdAt: "2026-06-23T00:00:00.000Z",
            updatedAt: "2026-06-23T00:00:00.000Z"
          }
        }),
        { status: 201, headers: { "Content-Type": "application/json" } }
      )
    );

    vi.stubGlobal("fetch", fetchMock);

    await registerUser({
      email: "new-user@example.com",
      password: "password123",
      name: "New User"
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: "new-user@example.com",
        password: "password123",
        name: "New User"
      })
    });
  });

  it("registerUser throws a readable error when registration fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            success: false,
            error: {
              code: "USER_EMAIL_EXISTS",
              message: "Email is already registered"
            }
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await expect(
      registerUser({
        email: "existing@example.com",
        password: "password123",
        name: "Existing User"
      })
    ).rejects.toThrow("Email is already registered");
  });
});
