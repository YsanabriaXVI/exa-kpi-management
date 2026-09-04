import type { PrismaClient } from "@prisma/client";
import { prisma } from "../src/config/database/prisma.js";
import { initialKpiConfigurations } from "./kpi-configuration.initial-data.js";

const codeOf = (value: string) => value === "%" ? "PERCENT" : value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 50) || "UNSPECIFIED";
export const INITIAL_KPI_REVISION_EFFECTIVE_FROM = new Date("2026-01-01T00:00:00.000Z");

export async function importKpiConfigurationMocks(client: PrismaClient) {
  const units = [...new Set([...initialKpiConfigurations.map((item) => item.measurementUnit), "%", "km", "Incidents", "Units", "USD"])];
  const sources = [...new Set([...initialKpiConfigurations.map((item) => item.dataSource), "EMS", "SAP", "GPS", "Excel Import", "Manual Entry", "API"])];
  for (const unit of units) await client.measurementUnit.upsert({ where: { code: codeOf(unit) }, update: {}, create: { code: codeOf(unit), symbol: unit || "N/A", name: unit || "Unspecified", isPercentage: unit === "%", isActive: Boolean(unit) } });
  for (const source of sources) await client.dataSource.upsert({ where: { code: codeOf(source) }, update: {}, create: { code: codeOf(source), name: source || "Unspecified", sourceType: source.includes("Integrator") || source === "TMS" || source === "API" ? "API" : source ? "MANUAL" : "OTHER", supportsAutomation: source.includes("Integrator") || source === "TMS" || source === "API", isActive: Boolean(source) } });
  for (const frequency of [
    { code: "MONTHLY", name: "Mensual", monthsPerPeriod: 1, periodsPerYear: 12 },
    { code: "QUARTERLY", name: "Trimestral", monthsPerPeriod: 3, periodsPerYear: 4 },
    { code: "FOUR_MONTHLY", name: "Cuatrimestral", monthsPerPeriod: 4, periodsPerYear: 3 },
    { code: "SEMIANNUAL", name: "Semestral", monthsPerPeriod: 6, periodsPerYear: 2 },
    { code: "ANNUAL", name: "Anual", monthsPerPeriod: 12, periodsPerYear: 1 },
  ]) await client.inputFrequency.upsert({ where: { code: frequency.code }, update: frequency, create: frequency });
  for (const item of [{ code: "CONFIGURED", name: "Configured" }, { code: "INCOMPLETE", name: "Incomplete" }, { code: "INACTIVE", name: "Inactive" }]) await client.kpiConfigurationStatus.upsert({ where: { code: item.code }, update: {}, create: item });
  for (const [index, item] of [{ code: "HIGHER_IS_BETTER", name: "Higher is better" }, { code: "LOWER_IS_BETTER", name: "Lower is better" }, { code: "ZERO_IS_BETTER", name: "Zero is best" }, { code: "EQUAL_IS_BETTER", name: "Exact value is best" }, { code: "RANGE", name: "Inside range is best" }].entries()) await client.evaluationType.upsert({ where: { code: item.code }, update: {}, create: { ...item, displayOrder: index + 1 } });
  for (const item of [{ code: "RED", name: "Red", severityRank: 3, hexColor: "#EF4444" }, { code: "YELLOW", name: "Yellow", severityRank: 2, hexColor: "#EAB308" }, { code: "GREEN", name: "Green", severityRank: 1, hexColor: "#22C55E" }]) await client.trafficLightLevel.upsert({ where: { code: item.code }, update: {}, create: item });

  let imported = 0;
  for (const item of initialKpiConfigurations) {
    const definition = await client.kpiDefinition.findUnique({ where: { kpiCode: item.definitionCode } });
    if (!definition) continue;
    const [unit, source, frequency, status, evaluation] = await Promise.all([
      client.measurementUnit.findUniqueOrThrow({ where: { code: codeOf(item.measurementUnit) } }), client.dataSource.findUniqueOrThrow({ where: { code: codeOf(item.dataSource) } }),
      client.inputFrequency.findUniqueOrThrow({ where: { code: "MONTHLY" } }), client.kpiConfigurationStatus.findUniqueOrThrow({ where: { code: item.status } }), client.evaluationType.findUniqueOrThrow({ where: { code: item.evaluationType } }),
    ]);
    const configuration = await client.kpiConfiguration.upsert({ where: { configCode: item.configCode }, update: { kpiDefinitionId: definition.id, measurementUnitId: unit.id, inputFrequencyId: frequency.id, primaryDataSourceId: source.id, kpiConfigurationStatusId: status.id }, create: { configCode: item.configCode, kpiDefinitionId: definition.id, measurementUnitId: unit.id, inputFrequencyId: frequency.id, primaryDataSourceId: source.id, kpiConfigurationStatusId: status.id } });
    if (item.status === "CONFIGURED") {
      const revision = await client.kpiConfigurationRevision.upsert({ where: { kpiConfigurationId_revisionNumber: { kpiConfigurationId: configuration.id, revisionNumber: 1 } }, update: { effectiveFrom: INITIAL_KPI_REVISION_EFFECTIVE_FROM, measurementUnitId: unit.id, goalUnitId: unit.id, dataSourceId: source.id }, create: { kpiConfigurationId: configuration.id, revisionNumber: 1, targetValue: item.goal, evaluationTypeId: evaluation.id, measurementUnitId: unit.id, goalUnitId: unit.id, evaluationScope: "OVERALL", goalType: "SINGLE_VALUE", resultMethod: "DIRECT", calculationPattern: "DIRECT", dataSourceId: source.id, effectiveFrom: INITIAL_KPI_REVISION_EFFECTIVE_FROM, changeReason: "Imported from approved frontend development data" } });
      const levels = await client.trafficLightLevel.findMany({ where: { code: { in: ["RED", "YELLOW", "GREEN"] } } });
      const ranges = { RED: [item.ranges.redFrom, item.ranges.redTo], YELLOW: [item.ranges.yellowFrom, item.ranges.yellowTo], GREEN: [item.ranges.greenFrom, item.ranges.greenTo] } as const;
      for (const [order, code] of ["RED", "YELLOW", "GREEN"].entries()) { const level = levels.find((entry) => entry.code === code)!; const range = ranges[code as keyof typeof ranges]; const values = { rangeMinPercent: range[0], rangeMaxPercent: range[1], includesMin: true, includesMax: true, displayOrder: order + 1 }; await client.kpiConfigurationRevisionThreshold.upsert({ where: { kpiConfigurationRevisionId_trafficLightLevelId: { kpiConfigurationRevisionId: revision.id, trafficLightLevelId: level.id } }, update: values, create: { kpiConfigurationRevisionId: revision.id, trafficLightLevelId: level.id, ...values } }); }
    }
    imported += 1;
  }
  return { sourceRecords: initialKpiConfigurations.length, imported };
}

const isDirectExecution = process.argv[1]?.replace(/\\/g, "/").endsWith("/import-kpi-configuration-mocks.ts");
if (isDirectExecution) importKpiConfigurationMocks(prisma).then((result) => console.info("KPI Configuration initial data import completed", result)).finally(() => prisma.$disconnect());
