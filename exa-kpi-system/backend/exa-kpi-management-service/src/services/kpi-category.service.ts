import { prisma } from "../config/database/prisma.js";
import { toKpiCategoryDto } from "../utils/kpi-category.dto.js";

export const kpiCategoryService = {
  async listActive() {
    const categories = await prisma.kpiCategory.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return categories.map(toKpiCategoryDto);
  },
};
