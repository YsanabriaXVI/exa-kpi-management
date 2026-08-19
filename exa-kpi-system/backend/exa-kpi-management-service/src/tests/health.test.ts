import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app } from "../app.js";
import { prisma } from "../config/database/prisma.js";

afterEach(() => vi.restoreAllMocks());

describe("health routes", () => {
  it("returns the service liveness status", async () => {
    const response = await request(app).get("/api/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: { status: "ok", service: "exa-kpi-management-service" },
    });
  });

  it("returns a structured 404 response", async () => {
    const response = await request(app).get("/api/unknown");

    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
  });

  it("returns 503 when the database dependency is unavailable", async () => {
    vi.spyOn(prisma, "$queryRaw").mockRejectedValueOnce(new Error("unavailable"));
    const response = await request(app).get("/api/health/ready");

    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE");
  });
});
