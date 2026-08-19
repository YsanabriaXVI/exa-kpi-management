import type { KpiCategory, KpiDefinition } from "@prisma/client";

type KpiDefinitionWithCategory = KpiDefinition & { category: KpiCategory };

export interface KpiDefinitionDto {
  id: string;
  kpiCode: string;
  kpiName: string;
  description: string;
  status: "ACTIVE" | "INACTIVE";
  isActive: boolean;
  category: { id: string; code: string; name: string };
  createdAt: string;
  updatedAt: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
}

export function toKpiDefinitionDto(record: KpiDefinitionWithCategory): KpiDefinitionDto {
  return {
    id: record.id.toString(),
    kpiCode: record.kpiCode,
    kpiName: record.kpiName,
    description: record.description,
    status: record.statusCode as "ACTIVE" | "INACTIVE",
    isActive: record.isActive,
    category: {
      id: record.category.id.toString(),
      code: record.category.code,
      name: record.category.name,
    },
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt?.toISOString() ?? null,
    createdByUserId: record.createdByUserId?.toString() ?? null,
    updatedByUserId: record.updatedByUserId?.toString() ?? null,
  };
}
