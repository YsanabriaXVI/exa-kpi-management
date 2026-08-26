import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  monitoringPeriod: { findUnique: vi.fn() },
  monitoringPeriodInput: { findMany: vi.fn() },
  resultEntryBatch: { create: vi.fn() },
}));
const db = vi.hoisted(() => ({ monitoringPeriod: { findUnique: vi.fn() }, $transaction: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
import { resultEntryService } from "../services/result-entry.service.js";

const input = (id: bigint, value: string | null, version: number | null) => ({
  id, monitoringPeriodId: 1n, scorecard: { scorecardExternalId: 9n, scorecardCodeSnapshot: "SC-OPS", scorecardNameSnapshot: "Operations" },
  kpiConfigurationExternalId: id + 100n, configCodeSnapshot: `KPC-${id}`, kpiCodeSnapshot: `KPI-${id}`, kpiNameSnapshot: `KPI ${id}`,
  goalTextSnapshot: "90%", goalValueSnapshot: null, measurementUnitSymbolSnapshot: "%", measurementUnitNameSnapshot: "Percent", primaryDataSourceNameSnapshot: "EMS",
  result: version === null ? null : { id: id + 200n, resultValue: value === null ? null : { toString: () => value, equals: (other: unknown) => String(other) === value }, comment: null, version, revisionNo: version },
});
const period = { id: 1n, kpiPoolExternalId: 5n, poolInputPeriodExternalId: 4n, poolCodeSnapshot: "OPS-04-2026", poolNameSnapshot: "Operations", periodKey: "2026-08", periodLabel: "August 2026", periodStart: new Date("2026-08-01"), periodEnd: new Date("2026-08-31"), status: { code: "DRAFT" }, scorecards: [], inputs: [input(1n, "0", 1), input(2n, null, 1), input(3n, null, null)] };

beforeEach(() => { vi.clearAllMocks(); db.$transaction.mockImplementation((callback: any) => callback(tx)); });

describe("Result Entry", () => {
  it("counts zero as Entered and null as Pending", async () => {
    db.monitoringPeriod.findUnique.mockResolvedValue(period);
    const result = await resultEntryService.get("1");
    expect(result.summary).toEqual({ expected: 3, entered: 1, pending: 2 });
    expect(result.inputs[0]).toMatchObject({ entryStatus: "ENTERED", resultValue: "0" });
    expect(result.inputs[1]).toMatchObject({ entryStatus: "PENDING", resultValue: null });
  });

  it("rejects a stale version before creating a batch", async () => {
    tx.monitoringPeriod.findUnique.mockResolvedValue({ id: 1n, status: { code: "DRAFT" } });
    tx.monitoringPeriodInput.findMany.mockResolvedValue([input(1n, "80", 2)]);
    await expect(resultEntryService.save("1", { changes: [{ monitoringPeriodInputId: "1", resultValue: "85", comment: null, version: 1 }] }, 7n)).rejects.toMatchObject({ statusCode: 409, code: "RESULT_VERSION_CONFLICT" });
    expect(tx.resultEntryBatch.create).not.toHaveBeenCalled();
  });
});
