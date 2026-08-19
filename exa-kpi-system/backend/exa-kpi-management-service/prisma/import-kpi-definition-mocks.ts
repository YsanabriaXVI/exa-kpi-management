import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../src/config/database/prisma.js";
import { initialKpiCategories, initialKpiDefinitions } from "./data/kpi-definition.initial-data.js";

type ImportClient = Pick<Prisma.TransactionClient, "kpiCategory" | "kpiDefinition">;

export interface KpiDefinitionImportResult {
  categoriesCreated: number;
  categoriesPreserved: number;
  definitionsCreated: number;
  definitionsPreserved: number;
}

async function importWithClient(client: ImportClient): Promise<KpiDefinitionImportResult> {
  const result: KpiDefinitionImportResult = {
    categoriesCreated: 0,
    categoriesPreserved: 0,
    definitionsCreated: 0,
    definitionsPreserved: 0,
  };
  const categoriesByCode = new Map<string, bigint>();

  for (const source of initialKpiCategories) {
    const existing = await client.kpiCategory.findUnique({ where: { code: source.code }, select: { id: true } });
    const category = existing ?? await client.kpiCategory.create({
      data: { code: source.code, name: source.name, isActive: true },
      select: { id: true },
    });
    categoriesByCode.set(source.code, category.id);
    if (existing) result.categoriesPreserved += 1;
    else result.categoriesCreated += 1;
  }

  for (const source of initialKpiDefinitions) {
    const categoryId = categoriesByCode.get(source.categoryCode);
    if (!categoryId) throw new Error(`Missing normalized category ${source.categoryCode}`);
    const existing = await client.kpiDefinition.findUnique({ where: { kpiCode: source.kpiCode }, select: { id: true } });
    if (existing) {
      result.definitionsPreserved += 1;
      continue;
    }
    await client.kpiDefinition.create({
      data: {
        kpiCode: source.kpiCode,
        kpiName: source.kpiName,
        description: source.description,
        kpiCategoryId: categoryId,
        statusCode: source.status,
        isActive: source.status === "ACTIVE",
      },
      select: { id: true },
    });
    result.definitionsCreated += 1;
  }
  return result;
}

export async function importKpiDefinitionMocks(client: PrismaClient = prisma): Promise<KpiDefinitionImportResult> {
  return client.$transaction((transaction) => importWithClient(transaction));
}

const isDirectExecution = process.argv[1]?.replace(/\\/g, "/").endsWith("/import-kpi-definition-mocks.ts");
if (isDirectExecution) {
  importKpiDefinitionMocks()
    .then((result) => console.info("KPI Definition initial data import completed", result))
    .finally(() => prisma.$disconnect());
}
