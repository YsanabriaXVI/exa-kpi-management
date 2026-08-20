import { natsManager } from "../config/nats.js";
import { prisma } from "../config/prisma.js";

export type DatabaseCheck = () => Promise<void>;

export const checkDatabase: DatabaseCheck = async () => {
  await prisma.$queryRaw`SELECT 1`;
};

export async function getReadiness(databaseCheck: DatabaseCheck = checkDatabase) {
  await databaseCheck();
  return {
    status: "ready" as const,
    service: "exa-kpi-pool-service",
    checks: {
      database: { status: "available" as const },
      nats: natsManager.status,
    },
  };
}
