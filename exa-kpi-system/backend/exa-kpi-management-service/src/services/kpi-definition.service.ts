import { Prisma } from "@prisma/client";
import { prisma } from "../config/database/prisma.js";
import type {
  CreateKpiDefinitionBody,
  ListKpiDefinitionsQuery,
  UpdateKpiDefinitionBody,
} from "../schemas/kpi-definition.schema.js";
import type { PaginatedResponse } from "../types/api.types.js";
import type { PaginationQuery } from "../schemas/pagination.schema.js";
import { AppError } from "../utils/app-error.js";
import { toKpiDefinitionDto, type KpiDefinitionDto } from "../utils/kpi-definition.dto.js";

const categoryInclude = { category: true } as const;

function buildOrderBy(sortBy: ListKpiDefinitionsQuery["sortBy"], order: "asc" | "desc"): Prisma.KpiDefinitionOrderByWithRelationInput {
  if (sortBy === "category") return { category: { name: order } };
  return { [sortBy]: order } as Prisma.KpiDefinitionOrderByWithRelationInput;
}

async function assertCategoryAvailable(categoryId: bigint): Promise<void> {
  const category = await prisma.kpiCategory.findFirst({
    where: { id: categoryId, isActive: true },
    select: { id: true },
  });
  if (!category) {
    throw new AppError("KPI category does not exist or is inactive", 422, "KPI_CATEGORY_NOT_AVAILABLE");
  }
}

function duplicateCodeError(): AppError {
  return new AppError("A KPI definition with this code already exists", 409, "KPI_CODE_CONFLICT");
}

function handlePrismaWriteError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw duplicateCodeError();
  }
  throw error;
}

async function nextKpiCode(): Promise<string> {
  const definitions = await prisma.kpiDefinition.findMany({
    where: { kpiCode: { startsWith: "KPI-" } },
    select: { kpiCode: true },
  });
  const highest = definitions.reduce((maximum, definition) => {
    const match = /^KPI-(\d+)$/.exec(definition.kpiCode);
    return match ? Math.max(maximum, Number(match[1])) : maximum;
  }, 0);
  return `KPI-${String(highest + 1).padStart(3, "0")}`;
}

async function findExisting(id: bigint) {
  const definition = await prisma.kpiDefinition.findFirst({
    where: { id, deletedAt: null },
    include: categoryInclude,
  });
  if (!definition) throw new AppError("KPI definition not found", 404, "KPI_DEFINITION_NOT_FOUND");
  return definition;
}

export const kpiDefinitionService = {
  async list(query: ListKpiDefinitionsQuery): Promise<PaginatedResponse<KpiDefinitionDto>> {
    const where: Prisma.KpiDefinitionWhereInput = {
      deletedAt: null,
      ...(query.categoryId?.length ? { kpiCategoryId: { in: query.categoryId.map(BigInt) } } : {}),
      ...(query.status?.length ? { statusCode: { in: query.status } } : {}),
      ...(query.search ? {
        OR: [
          { kpiCode: { contains: query.search } },
          { kpiName: { contains: query.search } },
          { description: { contains: query.search } },
          { category: { is: { name: { contains: query.search } } } },
          { statusCode: { contains: query.search } },
        ],
      } : {}),
    };
    const skip = (query.page - 1) * query.pageSize;
    const orderBy = buildOrderBy(query.sortBy, query.sortOrder);

    const [records, totalItems] = await Promise.all([
      prisma.kpiDefinition.findMany({ where, include: categoryInclude, orderBy, skip, take: query.pageSize }),
      prisma.kpiDefinition.count({ where }),
    ]);

    return {
      data: records.map(toKpiDefinitionDto),
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems,
        totalPages: Math.ceil(totalItems / query.pageSize),
      },
    };
  },

  async getById(id: bigint): Promise<KpiDefinitionDto> {
    return toKpiDefinitionDto(await findExisting(id));
  },

  async listConfigurations(id: bigint, query: PaginationQuery) {
    await findExisting(id);
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const where: Prisma.KpiConfigurationWhereInput = { kpiDefinitionId: id, deletedAt: null };
    const revisionWhere: Prisma.KpiConfigurationRevisionWhereInput = {
      effectiveFrom: { lte: today },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
    };
    const [records, totalItems, configuredItems] = await Promise.all([
      prisma.kpiConfiguration.findMany({
        where,
        select: {
          id: true,
          configCode: true,
          status: { select: { code: true } },
          measurementUnit: { select: { symbol: true } },
          inputFrequency: { select: { name: true } },
          primaryDataSource: { select: { name: true, code: true } },
          revisions: { where: revisionWhere, orderBy: { effectiveFrom: "desc" }, take: 1, select: { targetValue: true } },
        },
        orderBy: { configCode: "asc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      prisma.kpiConfiguration.count({ where }),
      prisma.kpiConfiguration.count({ where: { ...where, status: { is: { code: "CONFIGURED" } } } }),
    ]);
    return {
      data: records.map((record) => ({
        id: record.id.toString(),
        configCode: record.configCode,
        goal: record.revisions[0]?.targetValue === null || record.revisions[0]?.targetValue === undefined ? null : Number(record.revisions[0].targetValue),
        measurementUnit: record.measurementUnit.symbol === "N/A" ? null : record.measurementUnit.symbol,
        inputFrequency: record.inputFrequency.name,
        dataSource: record.primaryDataSource.code === "UNSPECIFIED" ? null : record.primaryDataSource.name,
        status: record.status.code,
      })),
      meta: { page: query.page, pageSize: query.pageSize, totalItems, configuredItems, totalPages: Math.ceil(totalItems / query.pageSize) },
    };
  },

  async create(input: CreateKpiDefinitionBody, actorUserId: bigint | null): Promise<KpiDefinitionDto> {
    const categoryId = BigInt(input.kpiCategoryId);
    await assertCategoryAvailable(categoryId);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const created = await prisma.kpiDefinition.create({
          data: {
            kpiCode: await nextKpiCode(),
            kpiName: input.kpiName,
            description: input.description,
            kpiCategoryId: categoryId,
            statusCode: input.isActive ? "ACTIVE" : "INACTIVE",
            isActive: input.isActive,
            createdByUserId: actorUserId,
          },
          include: categoryInclude,
        });
        return toKpiDefinitionDto(created);
      } catch (error) {
        const isGeneratedCodeCollision = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isGeneratedCodeCollision || attempt === 2) return handlePrismaWriteError(error);
      }
    }
    throw duplicateCodeError();
  },

  async update(id: bigint, input: UpdateKpiDefinitionBody, actorUserId: bigint | null): Promise<KpiDefinitionDto> {
    await findExisting(id);
    if (input.kpiCategoryId) await assertCategoryAvailable(BigInt(input.kpiCategoryId));
    if (input.kpiCode) {
      const duplicate = await prisma.kpiDefinition.findFirst({
        where: { kpiCode: input.kpiCode, id: { not: id } },
        select: { id: true },
      });
      if (duplicate) throw duplicateCodeError();
    }

    try {
      const updated = await prisma.kpiDefinition.update({
        where: { id },
        data: {
          ...(input.kpiCode !== undefined ? { kpiCode: input.kpiCode } : {}),
          ...(input.kpiName !== undefined ? { kpiName: input.kpiName } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.kpiCategoryId !== undefined ? { kpiCategoryId: BigInt(input.kpiCategoryId) } : {}),
          updatedAt: new Date(),
          updatedByUserId: actorUserId,
        },
        include: categoryInclude,
      });
      return toKpiDefinitionDto(updated);
    } catch (error) {
      return handlePrismaWriteError(error);
    }
  },

  async setActive(id: bigint, isActive: boolean, actorUserId: bigint | null): Promise<KpiDefinitionDto> {
    await findExisting(id);
    const updated = await prisma.kpiDefinition.update({
      where: { id },
      data: {
        statusCode: isActive ? "ACTIVE" : "INACTIVE",
        isActive,
        updatedAt: new Date(),
        updatedByUserId: actorUserId,
      },
      include: categoryInclude,
    });
    return toKpiDefinitionDto(updated);
  },

  async softDelete(id: bigint, actorUserId: bigint | null): Promise<KpiDefinitionDto> {
    await findExisting(id);
    const now = new Date();
    const deleted = await prisma.kpiDefinition.update({
      where: { id },
      data: {
        deletedAt: now,
        statusCode: "INACTIVE",
        isActive: false,
        updatedAt: now,
        updatedByUserId: actorUserId,
      },
      include: categoryInclude,
    });
    return toKpiDefinitionDto(deleted);
  },
};
