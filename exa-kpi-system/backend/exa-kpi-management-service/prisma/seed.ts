import { prisma } from "../src/config/database/prisma.js";
import { importKpiDefinitionMocks } from "./import-kpi-definition-mocks.js";
import { importKpiConfigurationMocks } from "./import-kpi-configuration-mocks.js";

try {
  const definitions = await importKpiDefinitionMocks(prisma);
  const configurations = await importKpiConfigurationMocks(prisma);
  console.info("KPI Management seed completed", { definitions, configurations });
} finally {
  await prisma.$disconnect();
}
