import { beforeEach, describe, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: { monitoringPeriod: { findMany: db.findMany } } }));
import { monitoringReadService } from "../services/monitoring-read.service.js";
import { monitoringListQuerySchema } from "../schemas/monitoring-period.schema.js";
const period = () => ({ id: 1n, kpiPoolExternalId: 5n, poolInputPeriodExternalId: 4n, poolCodeSnapshot: "OPS", poolNameSnapshot: "Operations", companiesSnapshot: [], periodKey: "2026-08", periodLabel: "August", periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), status: { code: "DRAFT" }, resultsVersion: 2, baselineVersion: 1, currentScoringResultsVersion: 2, currentScoringBaselineVersion: 1, inputs: [{ result: { resultValue: "110", trafficLightCode: "GREEN" } }, { result: { resultValue: "20", trafficLightCode: null } }], scorecards: [{ id: 1n, scorecardNameSnapshot: "Sales", previewScorePercent: "80.000000", finalScorePercent: null }] });
beforeEach(() => vi.clearAllMocks());
describe("Overview scoring", () => {
  it("returns authoritative scorecard scores and calculated/unavailable traffic counts", async () => {
    db.findMany.mockResolvedValue([period()]);
    const result = await monitoringReadService.overview(monitoringListQuerySchema.parse({}));
    expect(result.data[0]).toMatchObject({ scorecards: [{ name: "Sales", score: "80.000000" }], trafficLights: { green: 1, yellow: 0, red: 0, unavailable: 1 } });
  });
  it("does not expose scores or traffic computed from an older baseline", async () => {
    db.findMany.mockResolvedValue([{ ...period(), baselineVersion: 2 }]);
    const result = await monitoringReadService.overview(monitoringListQuerySchema.parse({}));
    expect(result.data[0]).toMatchObject({ scorecards: [{ score: null }], trafficLights: { green: 0, unavailable: 2 } });
  });
});
