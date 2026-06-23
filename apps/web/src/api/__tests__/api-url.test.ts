import { describe, expect, it } from "vitest";
import { buildApiUrl } from "../api-url";

describe("buildApiUrl", () => {
  it("uses the local /api proxy base during development", () => {
    expect(buildApiUrl("/auth/login", "/api")).toBe("/api/auth/login");
  });

  it("uses the configured production API base URL", () => {
    expect(
      buildApiUrl("/auth/login", "https://node-learning-monorepo-production.up.railway.app")
    ).toBe("https://node-learning-monorepo-production.up.railway.app/auth/login");
  });

  it("normalizes extra slashes between the base URL and path", () => {
    expect(buildApiUrl("projects", "https://api.example.com/")).toBe(
      "https://api.example.com/projects"
    );
  });
});
