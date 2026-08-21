import { prisma } from "../src/config/prisma.js";
import { logger } from "../src/config/logger.js";
try {
  await prisma.$transaction([
    prisma.scorecardStatus.upsert({ where: { code: "DRAFT" }, update: { name: "Draft", displayOrder: 10 }, create: { code: "DRAFT", name: "Draft", description: "Scorecard information or period composition is being prepared.", displayOrder: 10 } }),
    prisma.scorecardStatus.upsert({ where: { code: "ACTIVE" }, update: { name: "Active", displayOrder: 20 }, create: { code: "ACTIVE", name: "Active", description: "The Scorecard has at least one finalized period composition.", displayOrder: 20 } }),
    prisma.scorecardStatus.upsert({ where: { code: "INACTIVE" }, update: { name: "Inactive", displayOrder: 30 }, create: { code: "INACTIVE", name: "Inactive", description: "The Scorecard is retained for historical consultation.", displayOrder: 30 } }),
  ]);
  logger.info("Scorecard lifecycle references seeded");
} finally { await prisma.$disconnect(); }
