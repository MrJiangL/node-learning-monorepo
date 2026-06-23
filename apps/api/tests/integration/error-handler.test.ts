import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../../src/middleware/error-handler.js";

describe("error handler", () => {
  it("logs unexpected errors on the server without leaking details to the client", async () => {
    const app = express();
    app.get("/boom", () => {
      throw new Error("database exploded with internal details");
    });
    app.use(errorHandler);

    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      const response = await request(app).get("/boom");

      expect(response.status).toBe(500);
      expect(response.body).toEqual({
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "Unexpected server error"
        }
      });
      expect(JSON.stringify(response.body)).not.toContain("database exploded");
      expect(errorSpy).toHaveBeenCalledWith(
        "Unhandled request error",
        expect.objectContaining({
          method: "GET",
          path: "/boom",
          errorName: "Error",
          errorMessage: "database exploded with internal details",
          stack: expect.any(String)
        })
      );
    } finally {
      errorSpy.mockRestore();
    }
  });
});
