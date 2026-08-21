import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => { vi.clearAllMocks(); poolClient.getPool.mockResolvedValue(pool); db.poolReference.findMany.mockResolvedValue([]); db.poolReference.findUnique.mockResolvedValue(null); db.poolPeriodReference.findMany.mockResolvedValue([]); codes.allocateScorecardCode.mockResolvedValue({ sequence: 1, code: row.code }); tx.scorecard.create.mockResolvedValue(row); tx.outboxEvent.create.mockResolvedValue({}); db.$transaction.mockImplementation(async (value: unknown) => typeof value === "function" ? (value as (client: typeof tx) => unknown)(tx) : Promise.all(value as Promise<unknown>[])); });

describe("Scorecard Information service", () => {
  it("creates a DRAFT Scorecard, inherits Pool companies and writes Outbox", async () => {
    await expect(scorecardService.create(input, 7n)).resolves.toMatchObject({ code: "SC-OPS-01-2026", status: "DRAFT", kpiPool: { id: "2" } });
    expect(codes.allocateScorecardCode).toHaveBeenCalledWith(tx, "OPS", 2026);
    expect(tx.scorecard.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kpiPoolExternalId: 2n, companies: { create: [expect.objectContaining({ externalCompanyId: 1n })] } }) }));
    expect(tx.outboxEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: "scorecard.created.v1", subject: "scorecard.created.v1" }) });
  });
  it("rejects an inactive Pool", async () => { poolClient.getPool.mockResolvedValue({ ...pool, status: "INACTIVE" }); await expect(scorecardService.create(input, 7n)).rejects.toMatchObject({ code: "KPI_POOL_NOT_ACTIVE" }); expect(db.$transaction).not.toHaveBeenCalled(); });
  it("rejects a Department outside the inherited Pool company scope", async () => { await expect(scorecardService.create({ ...input, departments: [{ externalDepartmentId: "10", companyExternalId: "999", code: "OPS", name: "Operations" }] }, 7n)).rejects.toMatchObject({ code: "DEPARTMENT_OUTSIDE_POOL_SCOPE" }); expect(db.$transaction).not.toHaveBeenCalled(); });
  it("uses database pagination and translates public sort fields", async () => { db.scorecard.findMany.mockResolvedValue([]); db.scorecard.count.mockResolvedValue(21); await expect(scorecardService.list({ page: 2, pageSize: 10, sortBy: "scorecardCode", sortOrder: "asc" })).resolves.toMatchObject({ meta: { page: 2, totalItems: 21, totalPages: 3 } }); expect(db.scorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, orderBy: { code: "asc" } })); });
  it("pushes schedule and Department filters into Prisma before pagination", async () => { db.poolReference.findMany.mockResolvedValueOnce([{ kpiPoolExternalId: 2n }]).mockResolvedValueOnce([]); db.scorecard.findMany.mockResolvedValue([]); db.scorecard.count.mockResolvedValue(0); await scorecardService.list({ page: 1, pageSize: 10, sortBy: "createdAt", sortOrder: "desc", frequency: ["MONTHLY"], year: [2026], department: ["Operations"] }); expect(db.scorecard.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ kpiPoolExternalId: { in: [2n] }, departments: { some: { departmentNameSnapshot: { in: ["Operations"] } } } }), skip: 0, take: 10 })); });
});
