import { prisma } from "../config/database/prisma.js";

export const healthService = {
  async assertDatabaseReady(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
