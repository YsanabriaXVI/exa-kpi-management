import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  kpiPoolInputPeriod: { findFirst: vi.fn(), findMany: vi.fn() },
  kpiPool: { findFirst: vi.fn() },
  monitoringPeriodClosureReference: { findUnique: vi.fn() },
  kpiPoolPeriodComposition: { findUnique: vi.fn() },
  kpiPoolKpi: { findFirst: vi.fn() },
  kpiPoolPeriodConfigurationOverride: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn(), create: vi.fn() },
  $transaction: vi.fn(),
}));
const management = vi.hoisted(() => ({ effectiveSnapshot: vi.fn() }));
const scorecards = vi.hoisted(() => ({ frozenUsage: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-management.client.js", () => ({ kpiManagementClient: management }));
vi.mock("../clients/scorecards.client.js", () => ({ scorecardsClient: scorecards }));
import { kpiPoolOverrideService } from "../services/kpi-pool-override.service.js";

const period = { id: 20n, kpiPoolId: 5n, periodKey: "2026-09", periodStart: new Date("2026-09-01T00:00:00.000Z"), periodEnd: new Date("2026-09-30T00:00:00.000Z") };
const pool = { id: 5n, poolCode: "POOL-005", poolName: "Transporte", statusCode: "ACTIVE" };
const membership = { id: 30n };
const snapshot = { kpiConfigurationRevisionId: "40", goal: "4000", goalMode: "SINGLE", thresholds: [] };

beforeEach(() => {
  vi.clearAllMocks();
  db.kpiPoolInputPeriod.findFirst.mockImplementation(async (args: any) => args.where.id ? period : null);
  db.kpiPool.findFirst.mockResolvedValue(pool);
  db.monitoringPeriodClosureReference.findUnique.mockResolvedValue(null);
  db.kpiPoolPeriodComposition.findUnique.mockResolvedValue(null);
  db.kpiPoolKpi.findFirst.mockResolvedValue(membership);
  db.kpiPoolPeriodConfigurationOverride.findMany.mockResolvedValue([]);
  db.$transaction.mockImplementation(async (callback: (tx: typeof db) => unknown) => callback(db));
  management.effectiveSnapshot.mockResolvedValue(snapshot);
  scorecards.frozenUsage.mockResolvedValue({ frozen: false, scorecardId: null, scorecardPeriodCompositionId: null });
});

describe("KPI Pool period override boundary", () => {
  it("returns real Pool and editable Input Period context", async () => {
    await expect(kpiPoolOverrideService.resolve(5n, 20n, 10n)).resolves.toMatchObject({
      pool: { code: "POOL-005", name: "Transporte" },
      period: { key: "2026-09", status: "EDITABLE" },
      editability: { editable: true, frozen: false },
      contextVersion: "40",
    });
  });

  it("rejects a direct Save against a FINALIZED Pool period", async () => {
    db.kpiPoolPeriodComposition.findUnique.mockResolvedValue({ id: 99n });
    await expect(kpiPoolOverrideService.save(5n, 20n, 10n, { goal: 4300, applyToFuturePeriods: false, reason: "September plan", expectedContextVersion: "40" }, 1n)).rejects.toMatchObject({ code: "POOL_PERIOD_NOT_EDITABLE", statusCode: 409, details: { periodStatus: "FINALIZED" } });
    expect(db.kpiPoolPeriodConfigurationOverride.create).not.toHaveBeenCalled();
  });

  it("rejects a stale edit before writing an override", async () => {
    await expect(kpiPoolOverrideService.save(5n, 20n, 10n, { goal: 4300, applyToFuturePeriods: false, reason: "September plan", expectedContextVersion: "old-token" }, 1n)).rejects.toMatchObject({ code: "POOL_OVERRIDE_STALE", statusCode: 409 });
    expect(db.kpiPoolPeriodConfigurationOverride.create).not.toHaveBeenCalled();
  });

  it("reports CLOSED as stronger than FINALIZED and keeps it read-only", async () => {
    db.monitoringPeriodClosureReference.findUnique.mockResolvedValue({ id: 88n });
    db.kpiPoolPeriodComposition.findUnique.mockResolvedValue({ id: 99n });
    await expect(kpiPoolOverrideService.resolve(5n, 20n, 10n)).resolves.toMatchObject({ period: { status: "CLOSED" }, editability: { editable: false, frozen: true, reason: "CLOSED" } });
  });
});
