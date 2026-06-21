import { describe, expect, it } from "vitest";
import { createStudyTaskSchema, learnerProfileSchema } from "../src/exercises/zod-lab.js";

describe("Zod lab: learnerProfileSchema", () => {
  it("trims username and lowercases email", () => {
    const result = learnerProfileSchema.parse({
      username: "  jianglin  ",
      email: "JIANG@example.COM",
      level: "beginner"
    });

    expect(result).toEqual({
      username: "jianglin",
      email: "jiang@example.com",
      level: "beginner"
    });
  });

  it("rejects usernames that are too short after trimming", () => {
    const result = learnerProfileSchema.safeParse({
      username: " j ",
      email: "jiang@example.com",
      level: "beginner"
    });

    expect(result.success).toBe(false);
  });

  it("rejects invalid emails", () => {
    const result = learnerProfileSchema.safeParse({
      username: "jianglin",
      email: "not-an-email",
      level: "beginner"
    });

    expect(result.success).toBe(false);
  });

  it("rejects unsupported levels", () => {
    const result = learnerProfileSchema.safeParse({
      username: "jianglin",
      email: "jiang@example.com",
      level: "expert"
    });

    expect(result.success).toBe(false);
  });
});

describe("Zod lab: createStudyTaskSchema", () => {
  it("parses a valid study task", () => {
    const result = createStudyTaskSchema.parse({
      title: "  Read Express middleware source  ",
      minutes: 45,
      tags: [" node ", " express "]
    });

    expect(result).toEqual({
      title: "Read Express middleware source",
      minutes: 45,
      tags: ["node", "express"]
    });
  });

  it("rejects empty titles after trimming", () => {
    const result = createStudyTaskSchema.safeParse({
      title: "   ",
      minutes: 30
    });

    expect(result.success).toBe(false);
  });

  it("rejects study tasks shorter than 5 minutes", () => {
    const result = createStudyTaskSchema.safeParse({
      title: "Read docs",
      minutes: 4
    });

    expect(result.success).toBe(false);
  });

  it("rejects decimal minutes", () => {
    const result = createStudyTaskSchema.safeParse({
      title: "Read docs",
      minutes: 10.5
    });

    expect(result.success).toBe(false);
  });

  it("rejects empty tags after trimming", () => {
    const result = createStudyTaskSchema.safeParse({
      title: "Read docs",
      minutes: 20,
      tags: ["node", "   "]
    });

    expect(result.success).toBe(false);
  });
});
