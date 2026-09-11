import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const tx = vi.hoisted(() => ({
  scorecard: { create: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  scorecardDepartmentScope: { deleteMany: vi.fn(), create: vi.fn() }, outboxEvent: { create: vi.fn() },
}));
const db = vi.hoisted(() => ({ scorecard: { findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn() }, poolReference: { findMany: vi.fn(), findUnique: vi.fn() }, poolPeriodReference: { findMany: vi.fn() }, scorecardDepartmentScope: { findMany: vi.fn() }, $transaction: vi.fn() }));
const poolClient = vi.hoisted(() => ({ getPool: vi.fn() }));
const codes = vi.hoisted(() => ({ allocateScorecardCode: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: poolClient }));
vi.mock("../services/scorecard-code.service.js", () => codes);
import { scorecardService } from "../services/scorecard.service.js";

const pool = { id: "2", poolCode: "OPS-01-2026", poolName: "Operations", status: "ACTIVE", issueYear: 2026, validFrom: "2026-08-01", validTo: "2026-12-31", inputFrequency: { id: "1", code: "MONTHLY" }, companies: [{ id: "1", code: "EXA", name: "EXA" }], areas: [{ id: "1", code: "OPS", name: "Operations" }] };
const input = { name: "Operations Scorecard", kpiPoolExternalId: "2", departments: [{ externalDepartmentId: "10", companyExternalId: "1", code: "OPS", name: "Operations" }], collaborators: [{ externalEmployeeId: "100", departmentExternalId: "10", code: "EMP-100", name: "Test Employee" }] };
const row = { id: 1n, code: "SC-OPS-01-2026", name: input.name, description: null, statusCode: "DRAFT", kpiPoolExternalId: 2n, poolCodeSnapshot: pool.poolCode, poolNameSnapshot: pool.poolName, aggregateVersion: 1, createdAt: new Date("2026-08-21"), updatedAt: null, companies: [{ externalCompanyId: 1n, companyCodeSnapshot: "EXA", companyNameSnapshot: "EXA" }], departments: [{ externalDepartmentId: 10n, externalCompanyId: 1n, departmentCodeSnapshot: "OPS", departmentNameSnapshot: "Operations", employees: [{ externalEmployeeId: 100n, employeeCodeSnapshot: "EMP-100", employeeNameSnapshot: "Test Employee" }] }], periodCompositions: [] };

afterEach(() => vi.useRealTimers());
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-07T15:00:00Z")); vi.clearAllMocks(); poolClient.getPool.mockResolvedValue(pool); db.poolReference.findMany.mockResolvedValue([]); db.poolReference.findUnique.mockResolvedValue(null); db.poolPeriodReference.findMany.mockResolvedValue([]); codes.allocateScorecardCode.mockResolvedValue({ sequence: 1, code: row.code }); tx.scorecard.create.mockResolvedValue(row); tx.outboxEvent.create.mockResolvedValue({}); db.$transaction.mockImplementation(async (value: unknown) => typeof value === "function" ? (value as (client: typeof tx) => unknown)(tx) : Promise.all(value as Promise<unknown>[])); });

describe("Scorecard Information service", () => {
  it("creates a DRAFT Scorecard, inherits Pool companies and writes Outbox", async () => {
    await expect(scorecardService.create(input, 7n)).resolves.toMatchObject({ code: "SC-OPS-01-2026", status: "DRAFT", kpiPool: { id: "2" } });
    expect(codes.allocateScorecardCode).toHaveBeenCalledWith(tx, "OPS", 2026);
    expect(tx.scorecard.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kpiPoolExternalId: 2n, companies: { create: [expect.objectContaining({ externalCompanyId: 1n })] } }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "scorecard.created.v1", subject: "scorecard.created.v1" }) });
  });
  it("accepts a non-expired DRAFT Pool as Scorecard source", async () => { poolClient.getPool.mockResolvedValue({ ...pool, status: "DRAFT" }); await expect(scorecardService.create(input, 7n)).resolves.toMatchObject({ status: "DRAFT", kpiPool: { id: "2" } }); });
  it("rejects an INACTIVE Pool as Scorecard source", async () => { poolClient.getPool.mockResolvedValue({ ...pool, status: "INACTIVE" }); await expect(scorecardService.create(input, 7n)).rejects.toMatchObject({ code: "KPI_POOL_INACTIVE" }); expect(db.$transaction).not.toHaveBeenCalled(); });
  it.each(["2023-01", "2023-12", "2024-08"])("accepts historical Pool %s without falsifying audit timestamps", async (key) => { poolClient.getPool.mockResolvedValue({ ...pool, validFrom: `${key}-01`, validTo: `${key}-28` }); await expect(scorecardService.create(input, 7n)).resolves.toMatchObject({ status: "DRAFT" }); expect(tx.scorecard.create.mock.calls[0]![0].data.createdAt).toBeUndefined(); expect(tx.outboxEvent.create.mock.calls[0]![0].data.occurredAt).toEqual(new Date("2026-09-07T15:00:00Z")); });
  it("requires at least one Collaborator", async () => { await expect(scorecardService.create({ ...input, collaborators: [] }, 7n)).rejects.toMatchObject({ code: "SCORECARD_COLLABORATOR_REQUIRED" }); expect(db.$transaction).not.toHaveBeenCalled(); });
  it("rejects a Department outside the inherited Pool company scope", async () => { await expect(scorecardService.create({ ...input, departments: [{ externalDepartmentId: "10", companyExternalId: "999", code: "OPS", name: "Operations" }] }, 7n)).rejects.toMatchObject({ code: "DEPARTMENT_OUTSIDE_POOL_SCOPE" }); expect(db.$transaction).not.toHaveBeenCalled(); });
  it("locks structural scope changes and deactivation after the Pool leaves DRAFT", async () => {
    db.scorecard.findFirst.mockResolvedValue({ id: 1n, kpiPoolExternalId: 2n, statusCode: "ACTIVE", deletedAt: null });
    poolClient.getPool.mockResolvedValue({ ...pool, status: "ACTIVE" });
    await expect(scorecardService.update(1n, { departments: input.departments }, 7n)).rejects.toMatchObject({ code: "SCORECARD_STRUCTURE_LOCKED" });
    await expect(scorecardService.deactivate(1n, 7n)).rejects.toMatchObject({ code: "KPI_POOL_NOT_DRAFT" });
  });
  it("uses database pagination and translates public sort fields", async () => { db.scorecard.findMany.mockResolvedValue([]); db.scorecard.count.mockResolvedValue(21); await expect(scorecardService.list({ page: 2, pageSize: 10, sortBy: "scorecardCode", sortOrder: "asc" })).resolves.toMatchObject({ meta: { page: 2, totalItems: 21, totalPages: 3 } }); expect(db.scorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, orderBy: { code: "asc" } })); });
  it("pushes schedule and Department filters into Prisma before pagination", async () => { db.poolReference.findMany.mockResolvedValueOnce([{ kpiPoolExternalId: 2n }]).mockResolvedValueOnce([]); db.scorecard.findMany.mockResolvedValue([]); db.scorecard.count.mockResolvedValue(0); await scorecardService.list({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc", frequency: ["MONTHLY"], year: [2026], department: ["Operations"] }); expect(db.scorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kpiPoolExternalId: { in: [2n] }, departments: { some: { departmentNameSnapshot: { in: ["Operations"] } } } }), skip: 0, take: 10 })); });
  it("searches code and name terms across middle-dot and dash separators", async () => { db.scorecard.findMany.mockResolvedValue([]); db.scorecard.count.mockResolvedValue(0); await scorecardService.list({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc", search: "SC-OPS · Operations" }); const where=db.scorecard.findMany.mock.calls[0]![0].where; expect(where.AND).toHaveLength(3); expect(where.AND.map((term:any)=>term.OR[0].code.contains)).toEqual(["sc","ops","operations"]); });
});

describe("Scorecard soft deletion", () => {
  it.each(["DRAFT", "ACTIVE", "INACTIVE"])("removes a %s Scorecard regardless of the source Pool status", async statusCode => {
    db.scorecard.findFirst.mockResolvedValue({ ...row, statusCode });
    tx.scorecard.updateMany.mockResolvedValue({ count: 1 });
    tx.scorecard.findUniqueOrThrow.mockResolvedValue({ ...row, statusCode: "INACTIVE", aggregateVersion: 2 });
    await scorecardService.remove(1n, 7n);
    expect(poolClient.getPool).not.toHaveBeenCalled();
    expect(tx.scorecard.updateMany).toHaveBeenCalledWith({ where: { id: 1n, deletedAt: null }, data: expect.objectContaining({ deletedAt: expect.any(Date), statusCode: "INACTIVE", updatedByUserId: 7n }) });
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "scorecard.deactivated.v1" }) });
  });
});
