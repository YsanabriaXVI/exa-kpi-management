import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";

describe("health endpoints", () => {
  it("reports liveness", async () => {
    const response = await request(createApp()).get("/api/health/live");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: "live", service: "exa-kpi-pool-service" });
  });

  it("reports readiness when the database is available", async () => {
    const response = await request(createApp({ databaseCheck: async () => undefined })).get("/api/health/ready");
    expect(response.status).toBe(200);
    expect(response.body.checks.database.status).toBe("available");
  });

  it("returns DATABASE_UNAVAILABLE when the database check fails", async () => {
    const response = await request(createApp({ databaseCheck: async () => { throw new Error("offline"); } })).get("/api/health/ready");
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE");
  });
});
