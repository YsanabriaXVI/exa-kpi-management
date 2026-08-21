import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../app.js";
import { kpiPoolService } from "../services/kpi-pool.service.js";
import { kpiPoolMembershipService } from "../services/kpi-pool-membership.service.js";
import { kpiPoolLifecycleService } from "../services/kpi-pool-lifecycle.service.js";
import { AppError } from "../utils/app-error.js";

const dto = {
  id: "17", poolCode: "OPS-SEG-01-2026", poolName: "EXA Operations and Security",
  description: null, notes: null, status: "DRAFT", issueYear: 2026, poolSequence: 1,
  areaScopeKey: "OPS|SEG",
  inputFrequency: { id: "1", code: "MONTHLY" }, validFrom: "2026-01-01", validTo: "2026-12-31",
  areas: [], companies: [], kpiCount: 0, scorecardCount: 0, operationalPeriod: null,
  createdAt: "2026-08-20T12:00:00.000Z", updatedAt: null,
};

describe("Pool Info routes", () => {
  afterEach(() => vi.restoreAllMocks());

  it("creates a DRAFT Pool through the validated boundary", async () => {
    const create = vi.spyOn(kpiPoolService, "create").mockResolvedValue(dto);
    const response = await request(createApp()).post("/api/v1/kpi-pools").send({
      poolName: "EXA Operations and Security", poolAreaIds: ["1", "2"], companyIds: ["1", "2"],
      inputFrequencyId: "1", validFrom: "2026-01-01", validTo: "2026-12-31",
    });
    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({ status: "DRAFT", poolCode: "OPS-SEG-01-2026" });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ poolAreaIds: ["1", "2"] }), 1n);
  });

  it("rejects duplicate scope IDs before the service", async () => {
    const create = vi.spyOn(kpiPoolService, "create");
    const response = await request(createApp()).post("/api/v1/kpi-pools").send({
      poolName: "Invalid", poolAreaIds: ["1", "1"], companyIds: ["1"], inputFrequencyId: "1",
      validFrom: "2026-01-01", validTo: "2026-12-31",
    });
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(create).not.toHaveBeenCalled();
  });

  it("rejects invalid validity before the service", async () => {
    const response = await request(createApp()).post("/api/v1/kpi-pools").send({
      poolName: "Invalid", poolAreaIds: ["1"], companyIds: ["1"], inputFrequencyId: "1",
      validFrom: "2026-12-31", validTo: "2026-01-01",
    });
    expect(response.status).toBe(400);
  });

  it("returns the structural lock conflict from PATCH", async () => {
    vi.spyOn(kpiPoolService, "update").mockRejectedValue(new AppError(409, "KPI_POOL_STRUCTURE_LOCKED", "Only DRAFT Pools can be structurally edited"));
    const response = await request(createApp()).patch("/api/v1/kpi-pools/17").send({ poolName: "Renamed" });
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("KPI_POOL_STRUCTURE_LOCKED");
  });

  it("adds a validated membership batch", async () => {
    const add = vi.spyOn(kpiPoolMembershipService, "add").mockResolvedValue({ data: [], meta: { targetPeriod: { start: "2026-01-01", end: "2026-01-31" } } });
    const response = await request(createApp()).post("/api/v1/kpi-pools/17/kpi-configurations").send({ configurationIds: ["10", "15", "15"] });
    expect(response.status).toBe(201);
    expect(add).toHaveBeenCalledWith(17n, { configurationIds: ["10", "15"] }, 1n);
  });

  it("rejects an empty membership batch", async () => {
    const response = await request(createApp()).post("/api/v1/kpi-pools/17/kpi-configurations").send({ configurationIds: [] });
    expect(response.status).toBe(400);
  });

  it("returns derived availability", async () => {
    const availability = vi.spyOn(kpiPoolMembershipService, "availability").mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0, targetPeriod: { start: "2026-01-01", end: "2026-01-31" }, configurationStatus: "EDITABLE", editabilitySource: "CONSERVATIVE_FUTURE_ONLY" } });
    const response = await request(createApp()).get("/api/v1/kpi-pools/17/available-kpi-configurations");
    expect(response.status).toBe(200);
    expect(availability).toHaveBeenCalledWith(17n, { page: 1, pageSize: 20 });
  });

  it("returns Pool usage for KPI Configurations in one batch", async () => {
    const usage = vi.spyOn(kpiPoolMembershipService, "usage").mockResolvedValue({ data: [{ configurationId: "10", usedIn: 2, pools: [] }] });
    const response = await request(createApp()).post("/api/v1/kpi-pools/kpi-configuration-usage").send({ configurationIds: ["10", "10"] });
    expect(response.status).toBe(200);
    expect(usage).toHaveBeenCalledWith(["10"]);
    expect(response.body.data[0].usedIn).toBe(2);
  });

  it("runs the explicit activation command", async () => {
    vi.spyOn(kpiPoolLifecycleService, "activate").mockResolvedValue({ id: "17", status: "ACTIVE", eventId: "00000000-0000-4000-8000-000000000001" });
    const response = await request(createApp()).post("/api/v1/kpi-pools/17/activate");
    expect(response.body.data.status).toBe("ACTIVE");
  });
});
