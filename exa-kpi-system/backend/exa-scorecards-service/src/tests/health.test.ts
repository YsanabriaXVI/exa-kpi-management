import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
describe("health", () => {
  it("reports liveness", async () => { const response = await request(createApp()).get("/api/health/live"); expect(response.status).toBe(200); expect(response.body).toEqual({ status: "live", service: "exa-scorecards-service" }); });
  it("reports readiness", async () => { const response = await request(createApp({ databaseCheck: async () => undefined })).get("/api/health/ready"); expect(response.status).toBe(200); expect(response.body.status).toBe("ready"); });
  it("reports unavailable database", async () => { const response = await request(createApp({ databaseCheck: async () => { throw new Error("offline"); } })).get("/api/health/ready"); expect(response.status).toBe(503); expect(response.body.error.code).toBe("DATABASE_UNAVAILABLE"); });
});
