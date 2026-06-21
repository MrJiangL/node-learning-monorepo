import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("difficulty feature lab", () => {
  it("defaults a new learning plan to medium difficulty", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/plans")
      .send({ title: "Practice Zod in a real API" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: "Practice Zod in a real API",
      difficulty: "medium"
    });
  });

  it("accepts easy, medium, and hard difficulty values", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/plans")
      .send({ title: "Add enum validation", difficulty: "hard" });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      title: "Add enum validation",
      difficulty: "hard"
    });
  });

  it("rejects unsupported difficulty values", async () => {
    const app = createApp();

    const response = await request(app)
      .post("/plans")
      .send({ title: "Break the schema", difficulty: "impossible" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      success: false,
      error: {
        code: "VALIDATION_ERROR"
      }
    });
  });
});
