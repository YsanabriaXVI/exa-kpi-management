import { prisma } from "../config/database/prisma.js";

export const inputFrequencyService = {
  async list() {
    const frequencies = await prisma.inputFrequency.findMany({
      orderBy: [{ monthsPerPeriod: "asc" }, { code: "asc" }],
    });
    return frequencies.map((frequency, index) => ({
      id: frequency.id.toString(),
      code: frequency.code,
      name: frequency.name,
      description: frequency.description,
      monthsPerPeriod: frequency.monthsPerPeriod,
      periodsPerYear: frequency.periodsPerYear,
      displayOrder: (index + 1) * 10,
      isActive: frequency.isActive,
      updatedAt: (frequency.updatedAt ?? frequency.createdAt).toISOString(),
    }));
  },
};
