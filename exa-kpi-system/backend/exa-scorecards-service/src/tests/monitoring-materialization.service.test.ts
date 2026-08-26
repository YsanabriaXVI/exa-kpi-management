import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ scorecard: { findMany: vi.fn() } }));
const poolClient = vi.hoisted(() => ({ period: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: poolClient }));
import { scorecardCompositionService } from "../services/scorecard-composition.service.js";

const period = { poolPeriodId: "101", poolCompositionId: "201", periodKey: "2026-08", start: "2026-08-01", end: "2026-08-31", workflowStatus: "FINALIZED" };
const scorecard = (id: bigint, lifecycle: "DRAFT" | "ACTIVE", composition?: any) => ({ id, code: `SC-${id}`, name: `Scorecard ${id}`, statusCode: lifecycle, departments: [], periodCompositions: composition ? [composition] : [] });
const composition = (id: bigint, statusCode: "PREPARING" | "FINALIZED") => ({ id, statusCode, kpis: [], links: [] });

beforeEach(() => { vi.clearAllMocks(); poolClient.period.mockResolvedValue(period); });

describe("Scorecards Monitoring materialization projection", () => {
  it("includes DRAFT and ACTIVE Scorecards and represents a missing composition as NOT_STARTED", async () => {
    db.scorecard.findMany.mockResolvedValue([scorecard(1n, "DRAFT"), scorecard(2n, "ACTIVE", composition(22n, "FINALIZED"))]);
    const result = await scorecardCompositionService.monitoringMaterialization(9n, "101");
    expect(db.scorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { kpiPoolExternalId: 9n, statusCode: { in: ["DRAFT", "ACTIVE"] }, deletedAt: null } }));
    expect(result.data).toMatchObject({ readiness: "NOT_READY", applicableScorecardCount: 2, finalizedScorecardCount: 1 });
    expect(result.data.scorecards.map((item) => item.compositionStatus)).toEqual(["NOT_STARTED", "FINALIZED"]);
  });

  it("is READY only when at least one operational Scorecard exists and all are FINALIZED", async () => {
    db.scorecard.findMany.mockResolvedValue([scorecard(1n, "ACTIVE", composition(11n, "FINALIZED")), scorecard(2n, "ACTIVE", composition(22n, "FINALIZED"))]);
    await expect(scorecardCompositionService.monitoringMaterialization(9n, "101")).resolves.toMatchObject({ data: { readiness: "READY", reason: null, finalizedScorecardCount: 2 } });
  });

  it("returns the explicit reasons for no Scorecards and a Pool composition that is not finalized", async () => {
    db.scorecard.findMany.mockResolvedValue([]);
    await expect(scorecardCompositionService.monitoringMaterialization(9n, "101")).resolves.toMatchObject({ data: { readiness: "NOT_READY", reason: "NO_APPLICABLE_SCORECARDS" } });
    poolClient.period.mockResolvedValue({ ...period, poolCompositionId: null, workflowStatus: "EDITABLE" });
    await expect(scorecardCompositionService.monitoringMaterialization(9n, "101")).resolves.toMatchObject({ data: { readiness: "NOT_READY", reason: "POOL_COMPOSITION_NOT_FINALIZED" } });
  });
});
