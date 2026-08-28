import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.monitoringPeriodStatus.upsert({ where: { code: "DRAFT" }, update: { allowsEntry: true, allowsValidation: true, allowsSubmit: true }, create: { code: "DRAFT", name: "Draft", description: "Results may be captured or corrected.", displayOrder: 1, allowsEntry: true, allowsValidation: true, allowsSubmit: true } });
  await prisma.monitoringPeriodStatus.upsert({ where: { code: "SUBMITTED" }, update: { allowsValidation: true }, create: { code: "SUBMITTED", name: "Submitted", description: "Results are read-only and awaiting validation.", displayOrder: 2, allowsValidation: true } });
  await prisma.monitoringPeriodStatus.upsert({ where: { code: "VALIDATED" }, update: { allowsClose: true }, create: { code: "VALIDATED", name: "Validated", description: "Results were validated and may be closed.", displayOrder: 3, allowsClose: true } });
  await prisma.monitoringPeriodStatus.upsert({ where: { code: "CLOSED" }, update: { isTerminal: true }, create: { code: "CLOSED", name: "Closed", description: "Historical read-only Monitoring Period.", displayOrder: 4, isTerminal: true } });
  await prisma.monitoringInputMethod.upsert({ where: { code: "MANUAL" }, update: {}, create: { code: "MANUAL", name: "Manual Entry" } });
  await prisma.monitoringInputMethod.upsert({ where: { code: "EXCEL" }, update: {}, create: { code: "EXCEL", name: "Excel Import" } });
  await prisma.resultEntryBatchStatus.upsert({ where: { code: "IMPORTED" }, update: {}, create: { code: "IMPORTED", name: "Imported" } });
  await prisma.resultEntryRowStatus.upsert({ where: { code: "VALID" }, update: {}, create: { code: "VALID", name: "Valid" } });
  await prisma.kpiResultStatus.upsert({ where: { code: "PENDING" }, update: {}, create: { code: "PENDING", name: "Pending" } });
  await prisma.kpiResultStatus.upsert({ where: { code: "ENTERED" }, update: {}, create: { code: "ENTERED", name: "Entered" } });
}
main().finally(() => prisma.$disconnect());
