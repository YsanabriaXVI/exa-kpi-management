import { prisma } from "../src/config/prisma.js";
import { logger } from "../src/config/logger.js";

try {
  const areas = [
    { code: "OPS", name: "Operations", displayOrder: 10 },
    { code: "SEG", name: "Security", displayOrder: 20 },
    { code: "FIN", name: "Finance", displayOrder: 30 },
  ];
  const companies = [
    { externalCompanyId: 1n, code: "EXA", name: "EXA", displayOrder: 10 },
    { externalCompanyId: 2n, code: "CMX", name: "CONMOXA", displayOrder: 20 },
    { externalCompanyId: 3n, code: "TRE", name: "TREXA", displayOrder: 30 },
    { externalCompanyId: 4n, code: "LMG", name: "La Mega", displayOrder: 40 },
  ];

  await prisma.$transaction([
    ...areas.map((area) => prisma.poolArea.upsert({
      where: { code: area.code },
      update: { name: area.name, displayOrder: area.displayOrder, isActive: true },
      create: area,
    })),
    ...companies.map((company) => prisma.companyReference.upsert({
      where: { externalCompanyId: company.externalCompanyId },
      update: { code: company.code, name: company.name, displayOrder: company.displayOrder, isActive: true, syncedAt: new Date() },
      create: company,
    })),
  ]);
  logger.info({ areas: areas.length, companies: companies.length }, "KPI Pool approved bootstrap completed");
} finally {
  await prisma.$disconnect();
}
