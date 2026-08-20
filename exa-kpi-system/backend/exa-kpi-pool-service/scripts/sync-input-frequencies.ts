import "dotenv/config";
import { z } from "zod";
import { prisma } from "../src/config/prisma.js";
import { logger } from "../src/config/logger.js";

const responseSchema = z.object({
  data: z.array(z.object({
    id: z.string().regex(/^[1-9]\d*$/),
    code: z.string().min(1).max(50),
    name: z.string().min(1).max(120),
    monthsPerPeriod: z.number().int().positive(),
    periodsPerYear: z.number().int().positive().nullable(),
    displayOrder: z.number().int().positive(),
    isActive: z.boolean(),
    updatedAt: z.string().datetime(),
  })),
});

const baseUrl = process.env.KPI_MANAGEMENT_BASE_URL ?? "http://localhost:4001";

try {
  const response = await fetch(`${baseUrl}/api/v1/internal/input-frequencies`);
  if (!response.ok) throw new Error(`KPI Management returned HTTP ${response.status}`);
  const { data } = responseSchema.parse(await response.json());
  await prisma.$transaction(data.map((frequency) => prisma.inputFrequencyReference.upsert({
    where: { externalInputFrequencyId: BigInt(frequency.id) },
    update: {
      code: frequency.code,
      name: frequency.name,
      monthsPerPeriod: frequency.monthsPerPeriod,
      periodsPerYear: frequency.periodsPerYear,
      displayOrder: frequency.displayOrder,
      isActive: frequency.isActive,
      sourceUpdatedAt: new Date(frequency.updatedAt),
      syncedAt: new Date(),
    },
    create: {
      externalInputFrequencyId: BigInt(frequency.id),
      code: frequency.code,
      name: frequency.name,
      monthsPerPeriod: frequency.monthsPerPeriod,
      periodsPerYear: frequency.periodsPerYear,
      displayOrder: frequency.displayOrder,
      isActive: frequency.isActive,
      sourceUpdatedAt: new Date(frequency.updatedAt),
    },
  })));
  logger.info({ count: data.length, source: baseUrl }, "Input-frequency projection synchronized");
} finally {
  await prisma.$disconnect();
}
