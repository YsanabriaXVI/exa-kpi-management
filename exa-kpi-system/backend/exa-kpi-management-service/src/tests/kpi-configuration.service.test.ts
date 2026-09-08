import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = vi.hoisted(() => ({
  kpiDefinition: { findFirst: vi.fn() },
  measurementUnit: { findFirst: vi.fn(), findMany: vi.fn() },
  dataSource: { findFirst: vi.fn() },
  inputFrequency: { findUnique: vi.fn() },
  kpiConfigurationStatus: { findUnique: vi.fn() },
  evaluationType: { findUnique: vi.fn() },
  trafficLightLevel: { findMany: vi.fn() },
  kpiConfiguration: { findMany: vi.fn(), create: vi.fn(), findUniqueOrThrow: vi.fn() },
  kpiConfigurationRevision: { create: vi.fn() },
  kpiConfigurationRevisionThreshold: { createMany: vi.fn() },
  kpiConfigurationRevisionSubjectGoal: { createMany: vi.fn() },
  kpiConfigurationRevisionSubject: { createMany: vi.fn() },
  kpiConfigurationRevisionMeasurementInput: { createMany: vi.fn() },
}));
const db = vi.hoisted(() => ({
  $transaction: vi.fn(),
  kpiConfiguration: { findMany: vi.fn() },
  kpiDefinition: { findMany: vi.fn() },
}));
vi.mock("../config/database/prisma.js", () => ({ prisma: db }));

import { kpiConfigurationService } from "../services/kpi-configuration.service.js";

const input = {
  definitionId: "4", goal: 4200, measurementUnit: "kms", dataSource: "Integrator - EMS", isActive: true,
  ranges: { redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100 },
  resultSemantics: null, evaluationTypeCode: null, scoringMethod: null, scoringRuleConfig: null,
  scoringRuleConfigVersion: null, negativeResultPolicy: null, scoringApprovalStatus: "BLOCKED" as const,
  inputFrequencyCode: "MONTHLY", periodScope: "CURRENT_PERIOD" as const, goalMode: "SINGLE" as const,
  evaluationScope: "OVERALL" as const, goalType: "SINGLE_VALUE" as const, goalAssignment: null, goalUnit: "kms", resultMethod: "DIRECT" as const, measurementInputs: [],
  targetKind: "ABSOLUTE_TARGET" as const, rangeMinGoal: null, rangeMaxGoal: null, subjectType: null, subjectGoals: [],
  comparisonDirection: null, calculationPattern: null, calculationTemplate: null, subjects: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  db.$transaction.mockImplementation((callback) => callback(tx));
  tx.kpiDefinition.findFirst.mockResolvedValue({ id: 4n, kpiCode: "KPI-050", kpiName: "Productivity kms/head" });
  tx.measurementUnit.findFirst.mockResolvedValue({ id: 1n, symbol: "kms" });
  tx.measurementUnit.findMany.mockResolvedValue([]);
  tx.dataSource.findFirst.mockResolvedValue({ id: 2n, code: "INTEGRATOR_EMS", name: "Integrator - EMS" });
  tx.inputFrequency.findUnique.mockResolvedValue({ id: 3n, name: "Monthly" });
  tx.kpiConfigurationStatus.findUnique.mockResolvedValue({ id: 4n, code: "CONFIGURED" });
  tx.evaluationType.findUnique.mockResolvedValue({ id: 5n, name: "Higher is better" });
  tx.trafficLightLevel.findMany.mockResolvedValue([{ id: 6n, code: "RED" }, { id: 7n, code: "YELLOW" }, { id: 8n, code: "GREEN" }]);
  tx.kpiConfiguration.findMany.mockResolvedValue([{ configCode: "KPC-050-01" }, { configCode: "KPC-050-03" }]);
  tx.kpiConfiguration.create.mockResolvedValue({ id: 20n });
  tx.kpiConfigurationRevision.create.mockResolvedValue({ id: 30n });
  tx.kpiConfiguration.findUniqueOrThrow.mockResolvedValue({
    id: 20n, configCode: "KPC-050-04", createdAt: new Date("2026-08-19"), updatedAt: null,
    definition: { id: 4n, kpiCode: "KPI-050", kpiName: "Productivity kms/head" }, measurementUnit: { symbol: "kms" },
    primaryDataSource: { code: "INTEGRATOR_EMS", name: "Integrator - EMS" }, status: { code: "CONFIGURED" }, inputFrequency: { name: "Monthly" },
    revisions: [{ targetValue: 4200, evaluationType: { name: "Higher is better" }, thresholds: [] }],
  });
});

describe("kpiConfigurationService.create", () => {
  it("persists catalog units per entity and derives current Result Unit from each Goal Unit",async()=>{
    const units=[{id:1n,symbol:"USD"},{id:2n,symbol:"MXN"}];
    tx.measurementUnit.findFirst.mockImplementation(async({where}:any)=>units.find(unit=>unit.symbol===where.symbol));
    tx.measurementUnit.findMany.mockResolvedValue([units[1]]);
    const subjects=[{subjectExternalId:"A",subjectCode:null,subjectLabel:"Jacky"},{subjectExternalId:"B",subjectCode:null,subjectLabel:"Nancy"}];
    await kpiConfigurationService.create({...input,measurementUnit:"",goalUnit:undefined,evaluationScope:"BY_SUBJECT",goalMode:"BY_SUBJECT",goalAssignment:"DIFFERENT_GOAL_PER_SUBJECT",subjectType:"EMPLOYEE",subjects,subjectGoals:subjects.map((row,i)=>({...row,goal:100,goalUnit:units[i]!.symbol}))},99n);
    expect(tx.kpiConfigurationRevisionSubjectGoal.createMany.mock.calls[0]![0].data).toEqual([
      expect.objectContaining({subjectExternalId:"A",goalUnitId:1n,resultUnitId:1n}),
      expect.objectContaining({subjectExternalId:"B",goalUnitId:2n,resultUnitId:2n}),
    ]);
  });
  it("atomically preserves the real FK and creates configuration, initial revision and three thresholds", async () => {
    const created = await kpiConfigurationService.create(input, 99n);
    expect(db.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.kpiConfiguration.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kpiDefinitionId: 4n, configCode: "KPC-050-04" }) });
    expect(tx.kpiConfigurationRevision.create).toHaveBeenCalledWith({ data: expect.objectContaining({ kpiConfigurationId: 20n, revisionNumber: 1, targetValue: 4200, measurementUnitId: 1n, dataSourceId: 2n }) });
    expect(tx.kpiConfigurationRevisionThreshold.createMany.mock.calls[0]?.[0].data).toHaveLength(3);
    expect(created).toMatchObject({ code: "KPC-050-04", definitionId: 4 });
  });
});

describe("kpiConfigurationService.list", () => {
  it("projects active definitions without configurations as INCOMPLETE without creating PENDING records", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([]);
    db.kpiDefinition.findMany.mockResolvedValue([{
      id: 51n,
      kpiCode: "KPI-051",
      kpiName: "Fuel performance",
      createdAt: new Date("2026-07-28"),
      updatedAt: null,
    }]);

    const result = await kpiConfigurationService.list({ page: 1, pageSize: 100 });

    expect(db.kpiDefinition.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        isActive: true,
        statusCode: "ACTIVE",
        configurations: { none: { deletedAt: null } },
      }),
    }));
    expect(result.data).toEqual([expect.objectContaining({
      id: -51,
      code: "",
      definitionId: 51,
      definitionCode: "KPI-051",
      status: "INCOMPLETE",
    })]);
  });
});

describe("kpiConfigurationService.batchLookup", () => {
  it("loads the complete batch once and preserves requested order while reporting missing IDs", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([
      {
        id: 15n, configCode: "KPC-052-01", kpiDefinitionId: 52n, inputFrequencyId: 1n,
        status: { code: "CONFIGURED" },
        definition: { kpiCode: "KPI-052", kpiName: "Transport damage", isActive: true, statusCode: "ACTIVE", deletedAt: null },
        inputFrequency: { code: "MONTHLY", name: "Monthly", isActive: true },
        revisions: [],
      },
      {
        id: 10n, configCode: "KPC-050-01", kpiDefinitionId: 50n, inputFrequencyId: 1n,
        status: { code: "INACTIVE" },
        definition: { kpiCode: "KPI-050", kpiName: "Productivity", isActive: true, statusCode: "ACTIVE", deletedAt: null },
        inputFrequency: { code: "MONTHLY", name: "Monthly", isActive: true },
        revisions: [],
      },
    ]);

    const result = await kpiConfigurationService.batchLookup({ ids: ["10", "15", "22"] });

    expect(db.kpiConfiguration.findMany).toHaveBeenCalledTimes(1);
    expect(db.kpiConfiguration.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { in: [10n, 15n, 22n] }, deletedAt: null },
    }));
    expect(result.data.map((item) => item.id)).toEqual(["10", "15"]);
    expect(result.data[0]).toMatchObject({ definitionId: "50", inputFrequencyId: "1", status: "INACTIVE", isActive: false });
    expect(result.notFoundIds).toEqual(["22"]);
  });
});

describe("kpiConfigurationService.effectiveSnapshots", () => {
  const effectiveRecord = {
    id: 10n, configCode: "KPC-050-01", status:{code:"CONFIGURED"}, inputFrequency:{id:1n,code:"MONTHLY",monthsPerPeriod:1},
    definition: { id: 50n, kpiCode: "KPI-050", kpiName: "Productivity", description: "Improve productivity" },
    measurementUnit: { id: 1n, code: "KMS", name: "Kilometers", symbol: "kms" },
    primaryDataSource: { id: 2n, code: "EMS", name: "EMS" },
    revisions: [{ id: 100n, revisionNumber: 1, targetValue: { toString: () => "100" }, effectiveFrom: new Date("2026-01-01T00:00:00.000Z"), effectiveTo: new Date("2026-08-31T00:00:00.000Z"), periodScope:"CURRENT_PERIOD",goalMode:"SINGLE",evaluationScope:"OVERALL",goalType:"SINGLE_VALUE",goalAssignment:null,subjectType:null,resultMethod:"DIRECT",calculationPattern:"DIRECT",calculationTemplate:null,measurementInputs:[],subjects:[],subjectGoals:[],groupGoalValue:null,groupGoalUnit:null,groupGoalLabel:null,goalUnit:{id:1n,code:"KMS",name:"Kilometers",symbol:"kms"}, evaluationType: { id: 3n, code: "HIGHER_IS_BETTER", name: "Higher is better" }, measurementUnit: { id: 1n, code: "KMS", name: "Kilometers", symbol: "kms" }, dataSource: { id: 2n, code: "EMS", name: "EMS" }, resultSemantics:"ABSOLUTE_VALUE",scoringMethod:"PROPORTIONAL",scoringRuleConfig:{floorPercent:0,capPercent:100},scoringRuleConfigVersion:1,negativeResultPolicy:"DISALLOW",scoringApprovalStatus:"APPROVED", thresholds: ["RED","YELLOW","GREEN"].map((code,index)=>({ id: BigInt(4+index), rangeMinPercent: { toString: () => "0" }, rangeMaxPercent: { toString: () => "100" }, includesMin: true, includesMax: true, displayOrder: index+1, trafficLightLevel: { id: BigInt(5+index), code, name: code } })) }],
  };

  it("returns the single revision covering the complete Input Period with snapshot catalogs", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([effectiveRecord]);
    const result = await kpiConfigurationService.effectiveSnapshots({ configurationIds: ["10"], periodStart: "2026-08-01", periodEnd: "2026-08-31" });
    expect(db.kpiConfiguration.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: [10n] }, deletedAt: null } }));
    expect(db.kpiConfiguration.findMany).toHaveBeenCalledWith(expect.objectContaining({ select: expect.objectContaining({ revisions: expect.objectContaining({ where: { effectiveFrom: { lte: new Date("2026-08-01T00:00:00.000Z") }, OR: [{ effectiveTo: null }, { effectiveTo: { gte: new Date("2026-08-31T00:00:00.000Z") } }] } }) }) }));
    expect(result.data[0]).toMatchObject({ kpiConfigurationId: "10", kpiConfigurationRevisionId: "100", revisionNumber: 1, goal: "100", evaluationType: { code: "HIGHER_IS_BETTER" }, resultSemantics:"ABSOLUTE_VALUE",scoringMethod:"PROPORTIONAL",scoringRuleConfig:{floorPercent:0,capPercent:100},scoringRuleConfigVersion:1,negativeResultPolicy:"DISALLOW",scoringApprovalStatus:"APPROVED", measurementUnit: { code: "KMS" }, dataSource: { code: "EMS" } });
  });

  it.each(["PREVIOUS_PERIOD","SAME_PERIOD_PREVIOUS_YEAR"])("explicitly propagates the executable historical contract for %s",async reference=>{
    const revision={...effectiveRecord.revisions[0],periodScope:reference,comparisonMode:reference,comparisonDirection:"INCREASE",targetKind:"CHANGE_TARGET",
      targetValue:{toString:()=>"10"},goalUnit:{id:2n,code:"PERCENT",name:"Percent",symbol:"%"},
      thresholds:effectiveRecord.revisions[0]!.thresholds.map((t,i)=>({...t,rangeMinPercent:{toString:()=>String([0,65,80][i])},
        rangeMaxPercent:{toString:()=>String([65,80,100][i])},includesMin:true,includesMax:i===2}))};
    db.kpiConfiguration.findMany.mockResolvedValue([{...effectiveRecord,revisions:[revision]}]);
    const output=(await kpiConfigurationService.effectiveSnapshots({configurationIds:["10"],periodStart:"2026-08-01",periodEnd:"2026-08-31"})).data[0];
    expect(output).toMatchObject({periodScope:reference,comparisonMode:reference,comparisonDirection:"INCREASE",targetKind:"CHANGE_TARGET",goal:"10",
      historicalCapabilityVersion:"HISTORICAL_COMPARISON_V1",inputFrequency:{code:"MONTHLY",monthsPerPeriod:1},
      goalUnit:{symbol:"%"},measurementUnit:{symbol:"kms"},executability:{executable:true},kpiDefinitionId:"50",kpiConfigurationRevisionId:"100"});
  });
  it("fails instead of choosing a revision when coverage is missing or ambiguous", async () => {
    db.kpiConfiguration.findMany.mockResolvedValue([{ ...effectiveRecord, revisions: [] }]);
    await expect(kpiConfigurationService.effectiveSnapshots({ configurationIds: ["10"], periodStart: "2026-08-01", periodEnd: "2026-08-31" })).rejects.toMatchObject({ code: "KPI_EFFECTIVE_REVISION_NOT_FOUND" });
    db.kpiConfiguration.findMany.mockResolvedValue([{ ...effectiveRecord, revisions: [effectiveRecord.revisions[0], { ...effectiveRecord.revisions[0], id: 101n }] }]);
    await expect(kpiConfigurationService.effectiveSnapshots({ configurationIds: ["10"], periodStart: "2026-08-01", periodEnd: "2026-08-31" })).rejects.toMatchObject({ code: "KPI_EFFECTIVE_REVISION_OVERLAP" });
  });
});
