import { prisma } from "../src/config/database/prisma.js";
import { seedReferenceCatalogs } from "./reference-catalogs.js";

try {
  await seedReferenceCatalogs(prisma);
  console.info("KPI Management structural catalogs seeded (no demo KPIs)");
} finally {
  await prisma.$disconnect();
}
