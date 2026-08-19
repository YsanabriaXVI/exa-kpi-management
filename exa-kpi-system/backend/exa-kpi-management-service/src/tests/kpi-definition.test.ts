import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError } from "../utils/app-error.js";

const mocks = vi.hoisted(() => ({
  list: vi.fn(), getById: vi.fn(), listConfigurations: vi.fn(), create: vi.fn(), update: vi.fn(), setActive: vi.fn(), softDelete: vi.fn(),
}));

vi.mock("../services/kpi-definition.service.js", () => ({ kpiDefinitionService: mocks }));
vi.mock("../services/kpi-category.service.js", () => ({ kpiCategoryService: { listActive: vi.fn().mockResolvedValue([]) } }));

import { app } from "../app.js";

const activeDefinition = {
  id: "1", kpiCode: "KPI-001", kpiName: "Tiempo de entrega", description: "Tiempo total",
  status: "ACTIVE", isActive: true,
  category: { id: "2", code: "OPS", name: "Operations" },
  createdAt: "2026-08-19T00:00:00.000Z", updatedAt: null,
  createdByUserId: null, updatedByUserId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ data: [], meta: { page: 1, pageSize: 20, totalItems: 0, totalPages: 0 } });
});

describe("KPI Definition API", () => {
  it("lists related KPI Configurations through the nested endpoint", async () => {
    mocks.listConfigurations.mockResolvedValue({ data: [{ id: "11", configCode: "KPC-001-01" }], meta: { page: 1, pageSize: 20, totalItems: 1, configuredItems: 1, totalPages: 1 } });
    const response = await request(app).get("/api/v1/kpi-definitions/1/configurations");
    expect(response.status).toBe(200);
    expect(mocks.listConfigurations).toHaveBeenCalledWith(1n, { page: 1, pageSize: 20 });
  });
  it("lists an empty page", async () => {
    const response = await request(app).get("/api/v1/kpi-definitions");
    expect(response.status).toBe(200);
    expect(response.body.meta.totalItems).toBe(0);
  });

  it("passes server-side pagination", async () => {
    mocks.list.mockResolvedValue({ data: [activeDefinition], meta: { page: 2, pageSize: 5, totalItems: 6, totalPages: 2 } });
    const response = await request(app).get("/api/v1/kpi-definitions?page=2&pageSize=5");
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2, pageSize: 5 }));
  });

  it.each(["page=0", "pageSize=0", "pageSize=101", "page=x"])("rejects invalid pagination: %s", async (query) => {
    expect((await request(app).get(`/api/v1/kpi-definitions?${query}`)).status).toBe(400);
  });

  it("passes code search", async () => {
    await request(app).get("/api/v1/kpi-definitions?search=KPI-001");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ search: "KPI-001" }));
  });

  it("passes name search", async () => {
    await request(app).get("/api/v1/kpi-definitions?search=tiempo");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ search: "tiempo" }));
  });

  it("passes category filter", async () => {
    await request(app).get("/api/v1/kpi-definitions?categoryId=2");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ categoryId: ["2"] }));
  });

  it("passes status filter", async () => {
    await request(app).get("/api/v1/kpi-definitions?status=INACTIVE");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ status: ["INACTIVE"] }));
  });

  it("passes multiple categories and statuses", async () => {
    await request(app).get("/api/v1/kpi-definitions?categoryId=2&categoryId=3&status=ACTIVE&status=INACTIVE");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ categoryId: ["2", "3"], status: ["ACTIVE", "INACTIVE"] }));
  });

  it("accepts whitelisted sorting", async () => {
    await request(app).get("/api/v1/kpi-definitions?sortBy=kpiName&sortOrder=asc");
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ sortBy: "kpiName", sortOrder: "asc" }));
  });

  it.each(["description", "category", "statusCode"])("accepts %s sorting", async (sortBy) => {
    const response = await request(app).get(`/api/v1/kpi-definitions?sortBy=${sortBy}&sortOrder=desc`);
    expect(response.status).toBe(200);
    expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ sortBy, sortOrder: "desc" }));
  });

  it("rejects arbitrary sorting", async () => {
    expect((await request(app).get("/api/v1/kpi-definitions?sortBy=deletedAt")).status).toBe(400);
  });

  it("gets an existing definition", async () => {
    mocks.getById.mockResolvedValue(activeDefinition);
    const response = await request(app).get("/api/v1/kpi-definitions/1");
    expect(response.status).toBe(200);
    expect(response.body.data.id).toBe("1");
  });

  it("returns 404 for a missing definition", async () => {
    mocks.getById.mockRejectedValue(new AppError("not found", 404, "KPI_DEFINITION_NOT_FOUND"));
    const response = await request(app).get("/api/v1/kpi-definitions/99");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("KPI_DEFINITION_NOT_FOUND");
  });

  it("creates a valid definition", async () => {
    mocks.create.mockResolvedValue(activeDefinition);
    const response = await request(app).post("/api/v1/kpi-definitions").send({ kpiName: " Tiempo ", description: " Total ", kpiCategoryId: "2" });
    expect(response.status).toBe(201);
    expect(mocks.create.mock.calls[0]?.[0]).toEqual({ kpiName: "Tiempo", description: "Total", kpiCategoryId: "2", isActive: true });
  });

  it("rejects an invalid create payload and mass assignment", async () => {
    const response = await request(app).post("/api/v1/kpi-definitions").send({ kpiCode: "", createdAt: "2020-01-01" });
    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 422 for an unavailable category", async () => {
    mocks.create.mockRejectedValue(new AppError("category", 422, "KPI_CATEGORY_NOT_AVAILABLE"));
    const response = await request(app).post("/api/v1/kpi-definitions").send({ kpiName: "Time", description: "Total", kpiCategoryId: "99" });
    expect(response.status).toBe(422);
  });

  it("returns 409 for a duplicate create code", async () => {
    mocks.create.mockRejectedValue(new AppError("duplicate", 409, "KPI_CODE_CONFLICT"));
    const response = await request(app).post("/api/v1/kpi-definitions").send({ kpiName: "Time", description: "Total", kpiCategoryId: "2" });
    expect(response.status).toBe(409);
  });

  it("partially updates a definition", async () => {
    mocks.update.mockResolvedValue({ ...activeDefinition, kpiName: "Updated" });
    const response = await request(app).patch("/api/v1/kpi-definitions/1").send({ kpiName: " Updated " });
    expect(response.status).toBe(200);
    expect(mocks.update.mock.calls[0]?.[1]).toEqual({ kpiName: "Updated" });
  });

  it("returns 404 when updating a missing definition", async () => {
    mocks.update.mockRejectedValue(new AppError("not found", 404, "KPI_DEFINITION_NOT_FOUND"));
    expect((await request(app).patch("/api/v1/kpi-definitions/99").send({ kpiName: "Updated" })).status).toBe(404);
  });

  it("returns 409 when an update duplicates a code", async () => {
    mocks.update.mockRejectedValue(new AppError("duplicate", 409, "KPI_CODE_CONFLICT"));
    expect((await request(app).patch("/api/v1/kpi-definitions/1").send({ kpiCode: "KPI-002" })).status).toBe(409);
  });

  it("deactivates with consistent status and flag", async () => {
    mocks.setActive.mockResolvedValue({ ...activeDefinition, status: "INACTIVE", isActive: false });
    const response = await request(app).patch("/api/v1/kpi-definitions/1/deactivate");
    expect(response.body.data).toMatchObject({ status: "INACTIVE", isActive: false });
    expect(mocks.setActive).toHaveBeenCalledWith(1n, false, null);
  });

  it("activates with consistent status and flag", async () => {
    mocks.setActive.mockResolvedValue(activeDefinition);
    const response = await request(app).patch("/api/v1/kpi-definitions/1/activate");
    expect(response.body.data).toMatchObject({ status: "ACTIVE", isActive: true });
    expect(mocks.setActive).toHaveBeenCalledWith(1n, true, null);
  });

  it("soft deletes a definition", async () => {
    mocks.softDelete.mockResolvedValue({ ...activeDefinition, status: "INACTIVE", isActive: false });
    const response = await request(app).delete("/api/v1/kpi-definitions/1");
    expect(response.status).toBe(200);
    expect(mocks.softDelete).toHaveBeenCalledWith(1n, null);
  });

  it("rejects invalid IDs", async () => {
    expect((await request(app).get("/api/v1/kpi-definitions/not-a-number")).status).toBe(400);
  });
});
