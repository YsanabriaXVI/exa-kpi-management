import { PrismaClient } from "@prisma/client";

const globalWithPrisma = globalThis as typeof globalThis & {
  kpiPoolPrisma?: PrismaClient;
};

export const prisma = globalWithPrisma.kpiPoolPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalWithPrisma.kpiPoolPrisma = prisma;
}
