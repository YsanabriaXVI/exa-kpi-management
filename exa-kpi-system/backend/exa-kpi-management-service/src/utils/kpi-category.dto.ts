import type { KpiCategory } from "@prisma/client";

export function toKpiCategoryDto(category: KpiCategory) {
  return {
    id: category.id.toString(),
    code: category.code,
    name: category.name,
    description: category.description,
  };
}
