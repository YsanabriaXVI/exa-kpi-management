import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  kpiDefinition: {
    findMany: vi.fn(), count: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn(),
  },
  kpiConfiguration: { findMany: vi.fn(), count: vi.fn() },
  kpiCategory: { findFirst: vi.fn() },
}));

vi.mock("../config/database/prisma.js", () => ({ prisma: db }));
import { kpiDefinitionService } from "../services/kpi-definition.service.js";

const category = {
  id: 2n, code: "OPS", name: "Operations", description: null, isActive: true,
  createdAt: new Date("2026-01-01"), createdByUserId: null, updatedAt: null, updatedByUserId: null,
};
const definition = {
  id: 9007199254740993n, kpiCode: "KPI-001", kpiName: "Time", description: "Total", kpiCategoryId: 2n,
  statusCode: "ACTIVE", isActive: true, deletedAt: null, createdAt: new Date("2026-01-01"),
  createdByUserId: 123n, updatedAt: null, updatedByUserId: null, category,
};

beforeEach(() => vi.clearAllMocks());

describe("kpiDefinitionService", () => {
  it("uses MySQL pagination, filters, safe order and excludes soft-deleted rows", async () => {
    db.kpiDefinition.findMany.mockResolvedValue([definition]);
    db.kpiDefinition.count.mockResolvedValue(21);
    const result = await kpiDefinitionService.list({
      page: 2, pageSize: 10, search: "KPI", categoryId: ["2"], status: ["ACTIVE"], sortBy: "kpiCode", sortOrder: "asc",
    });

    expect(db.kpiDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({ skip: 10, take: 10, orderBy: { kpiCode: "asc" } }));
    expect(db.kpiDefinition.findMany.mock.calls[0]?.[0].where).toEqual(expect.objectContaining({ deletedAt: null, kpiCategoryId: { in: [2n] }, statusCode: { in: ["ACTIVE"] } }));
    expect(result.meta).toEqual({ page: 2, pageSize: 10, totalItems: 21, totalPages: 3 });
  });

  it("maps BigInt identifiers to JSON-safe strings", async () => {
    db.kpiDefinition.findFirst.mockResolvedValue(definition);
    const result = await kpiDefinitionService.getById(definition.id);
    expect(result.id).toBe("9007199254740993");
    expect(result.createdByUserId).toBe("123");
    expect(() => JSON.stringify(result)).not.toThrow();
  });

  it("lists only configurations related through kpi_definition_id", async () => {
    db.kpiDefinition.findFirst.mockResolvedValue(definition);
    db.kpiConfiguration.findMany.mockResolvedValue([
      { id: 11n, configCode: "KPC-001-01", status: { code: "CONFIGURED" }, measurementUnit: { symbol: "%" }, inputFrequency: { name: "Monthly" }, primaryDataSource: { code: "EMS", name: "EMS" }, revisions: [{ targetValue: 90 }] },
      { id: 12n, configCode: "KPC-001-02", status: { code: "INACTIVE" }, measurementUnit: { symbol: "count" }, inputFrequency: { name: "Monthly" }, primaryDataSource: { code: "MANUAL", name: "Manual" }, revisions: [{ targetValue: 4 }] },
    ]);
    db.kpiConfiguration.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    const result = await kpiDefinitionService.listConfigurations(definition.id, { page: 1, pageSize: 20 });
    expect(db.kpiConfiguration.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { kpiDefinitionId: definition.id, deletedAt: null },
    }));
    expect(result.data.map((item) => item.configCode)).toEqual(["KPC-001-01", "KPC-001-02"]);
    expect(result.data).not.toContainEqual(expect.objectContaining({ configCode: "KPC-002-01" }));
  });

  it("orders categories through the Prisma relation", async () => {
    db.kpiDefinition.findMany.mockResolvedValue([]);
    db.kpiDefinition.count.mockResolvedValue(0);
    await kpiDefinitionService.list({ page: 1, pageSize: 20, sortBy: "category", sortOrder: "asc" });
    expect(db.kpiDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { category: { name: "asc" } } }));
  });

  it("requires an active category on create", async () => {
    db.kpiCategory.findFirst.mockResolvedValue(null);
    await expect(kpiDefinitionService.create({ kpiName: "Time", description: "Total", kpiCategoryId: "2", isActive: true }, null))
      .rejects.toMatchObject({ statusCode: 422, code: "KPI_CATEGORY_NOT_AVAILABLE" });
  });

  it("generates the next KPI code on create", async () => {
    db.kpiCategory.findFirst.mockResolvedValue({ id: 2n });
    db.kpiDefinition.findMany.mockResolvedValue([{ kpiCode: "KPI-001" }, { kpiCode: "KPI-106" }]);
    db.kpiDefinition.create.mockResolvedValue({ ...definition, kpiCode: "KPI-107" });
    const created = await kpiDefinitionService.create({ kpiName: "Time", description: "Total", kpiCategoryId: "2", isActive: true }, null);
    expect(db.kpiDefinition.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ kpiCode: "KPI-107" }) }));
    expect(created.kpiCode).toBe("KPI-107");
  });

  it("persists both activation fields atomically in one update", async () => {
    db.kpiDefinition.findFirst.mockResolvedValue(definition);
    db.kpiDefinition.update.mockResolvedValue({ ...definition, statusCode: "INACTIVE", isActive: false });
    const result = await kpiDefinitionService.setActive(definition.id, false, 123n);
    expect(db.kpiDefinition.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ statusCode: "INACTIVE", isActive: false, updatedByUserId: 123n }),
    }));
    expect(result).toMatchObject({ status: "INACTIVE", isActive: false });
  });

  it("soft deletes while preserving the database row", async () => {
    db.kpiDefinition.findFirst.mockResolvedValue(definition);
    db.kpiDefinition.update.mockImplementation(({ data }) => Promise.resolve({ ...definition, ...data }));
    await kpiDefinitionService.softDelete(definition.id, 123n);
    expect(db.kpiDefinition.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: definition.id },
      data: expect.objectContaining({ deletedAt: expect.any(Date), statusCode: "INACTIVE", isActive: false, updatedByUserId: 123n }),
    }));
  });
});
