import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
const service=vi.hoisted(()=>({check:vi.fn(),history:vi.fn()}));
vi.mock("../services/check-results.service.js",()=>({checkResultsService:service}));
import { createApp } from "../app.js";
beforeEach(()=>{vi.clearAllMocks();service.check.mockResolvedValue({check:{status:"CURRENT",basedOnResultsVersion:4},monitoringPeriod:{status:"DRAFT"}});});
describe("Check Results API",()=>{
 it("accepts only Results version context on its dedicated route",async()=>{
  const response=await request(createApp()).post("/api/v1/monitoring-periods/1/check-results").send({expectedResultsVersion:4});
  expect(response.status).toBe(200);expect(service.check).toHaveBeenCalledWith("1",{expectedResultsVersion:4},expect.any(BigInt));
  expect(response.body.monitoringPeriod.status).toBe("DRAFT");
 });
 it.each([{version:4},{expectedResultsVersion:4,traffic:"GREEN"},{expectedResultsVersion:4,compliance:100},{expectedResultsVersion:-1}])("rejects generic version and client scoring %j",async body=>{
  expect((await request(createApp()).post("/api/v1/monitoring-periods/1/check-results").send(body)).status).toBe(400);
  expect(service.check).not.toHaveBeenCalled();
 });
 it("does not let the old Validate route execute Check Results",async()=>{
  const response=await request(createApp()).post("/api/v1/monitoring-periods/1/validate").send({version:4});
  expect(response.status).toBe(409);expect(response.body.error.code).toBe("CHECK_RESULTS_ENDPOINT_REQUIRED");expect(service.check).not.toHaveBeenCalled();
 });
});
