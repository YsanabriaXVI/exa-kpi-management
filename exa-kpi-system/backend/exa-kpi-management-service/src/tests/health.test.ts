import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

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
});
