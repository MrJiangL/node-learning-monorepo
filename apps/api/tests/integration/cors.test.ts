import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../../src/app.js";

describe("CORS", () => {
  it("allows the configured frontend origin", async () => {
    const app = createApp({
      corsOrigin: "https://web.example.com"
    });

    const response = await request(app).get("/health").set("Origin", "https://web.example.com");

    expect(response.status).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe("https://web.example.com");
  });
});
