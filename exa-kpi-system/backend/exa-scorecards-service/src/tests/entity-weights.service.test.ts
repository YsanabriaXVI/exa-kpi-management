import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
const db = vi.hoisted(() => ({ scorecard: { findFirst: vi.fn(), update: vi.fn() }, poolPeriodReference: { findFirst: vi.fn() }, scorecardPeriodComposition: { findFirst: vi.fn(), findMany: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() }, scorecardPeriodKpi: { findMany: vi.fn(), update: vi.fn(), updateMany: vi.fn() }, outboxEvent: { create: vi.fn() }, $transaction: vi.fn() }));
const pool = vi.hoisted(() => ({ effectiveSettings: vi.fn() }));
vi.mock("../config/prisma.js", () => ({ prisma: db }));
vi.mock("../clients/kpi-pool.client.js", () => ({ kpiPoolClient: pool }));
import { scorecardCompositionService } from "../services/scorecard-composition.service.js";
import { entityWeights, freezeWeightedSettings } from "../contracts/evaluation-weights.js";

const effective: any = { contractVersion: "EffectiveKpiSettingsV1", kpiConfigurationId: "3", kpiConfigurationRevisionId: "4", configCode: "KPC-3", evaluationScope: "BY_SUBJECT", goal: null, goalUnit: {symbol:"USD"}, measurementUnit: {symbol:"USD"}, subjectGoals: [{subjectExternalId:"A",subjectCode:"A",subjectLabel:"Jacky",goal:"80000"},{subjectExternalId:"B",subjectCode:"B",subjectLabel:"Nancy",goal:"60000"}], groupGoal: {value:"140000",unit:"USD",label:"Group Goal"}, executability:{executable:true} };
let row: any;
let composition: any;
beforeEach(() => {
  vi.clearAllMocks();
  row = { id: 2n, kpiConfigurationExternalId:3n, kpiDefinitionExternalId:5n, kpiPoolMembershipExternalId:6n, weightPercent:new Prisma.Decimal(100), entityWeights:[{subjectExternalId:"A",weight:"65.1250"},{subjectExternalId:"B",weight:"34.8750"}], displayOrder:1 };
  composition = {id:1n,statusCode:"PREPARING",scopeCustomizedAt:new Date(),periodKey:"2026-09",periodStart:new Date("2026-09-01"),periodEnd:new Date("2026-09-30"),poolPeriodExternalId:7n,poolCompositionExternalId:8n,kpis:[row],links:[],scopeDepartments:[]};
  db.scorecard.findFirst.mockResolvedValue({id:9n,code:"SC-9",statusCode:"ACTIVE",kpiPoolExternalId:10n});
  db.scorecard.update.mockResolvedValue({id:9n,code:"SC-9",aggregateVersion:2});
  db.poolPeriodReference.findFirst.mockResolvedValue({poolPeriodExternalId:7n,poolCompositionExternalId:8n,memberships:[{poolMembershipExternalId:6n,categoryName:"Sales",goalSnapshot:"x",measurementUnitSnapshot:"USD"}]});
  db.scorecardPeriodComposition.findFirst.mockImplementation(async () => composition);
  db.scorecardPeriodComposition.findMany.mockResolvedValue([]);
  db.scorecardPeriodComposition.updateMany.mockResolvedValue({count:1});
  db.scorecardPeriodComposition.findUniqueOrThrow.mockImplementation(async () => composition);
  db.scorecardPeriodKpi.findMany.mockImplementation(async () => [row]);
  db.scorecardPeriodKpi.update.mockImplementation(async ({data}: any) => Object.assign(row,data));
  pool.effectiveSettings.mockResolvedValue({effective:structuredClone(effective),sources:{GOAL:"GLOBAL_CONFIGURATION"}});
  db.$transaction.mockImplementation(async (callback:any) => callback(db));
});
describe("Explicit Scorecard entity weights", () => {
  it("preserves separate Goal and Result Units when freezing entity weights",()=>{
    const settings=structuredClone(effective);
    settings.subjectGoals[0].goalUnit={symbol:"USD"};settings.subjectGoals[0].resultUnit={symbol:"USD"};
    settings.subjectGoals[1].goalUnit={symbol:"MXN"};settings.subjectGoals[1].resultUnit={symbol:"MXN"};
    const frozen=freezeWeightedSettings(settings,row.entityWeights);
    expect(frozen.subjectGoals[1]).toMatchObject({goalUnit:{symbol:"MXN"},resultUnit:{symbol:"MXN"},weight:"34.8750"});
    settings.subjectGoals[1].goalUnit.symbol="USD";
    expect(frozen.subjectGoals[1].goalUnit?.symbol).toBe("MXN");
  });
  it("saves explicit weights and persists only their subtotal on the grouping row", async () => {
    await scorecardCompositionService.updateWeights(9n,"2026-09",{kpis:[{kpiConfigurationExternalId:"3",weight:99,entityWeights:[{subjectExternalId:"A",weight:10},{subjectExternalId:"B",weight:8}]}],linkedScorecards:[]});
    const saved=db.scorecardPeriodKpi.updateMany.mock.calls[0]![0].data;
    expect(saved.entityWeights).toEqual([{subjectExternalId:"A",weight:"10.0000"},{subjectExternalId:"B",weight:"8.0000"}]);
    expect(saved.weightPercent.toFixed(4)).toBe("18.0000");
  });
  it("finalizes distinct weights totalling 100, freezes goals and units, and excludes the parent and group", async () => {
    const result = await scorecardCompositionService.finalize(9n,"2026-09",1n);
    expect(result.kpis[0]!.evaluations.map(item => item.weight)).toEqual(["65.1250","34.8750"]);
    expect(result.weights.total).toBe("100.0000");
    expect(row.effectiveSettingsSnapshot).toMatchObject({evaluationWeightsVersion:"EXPLICIT_ENTITY_V1",goalUnit:{symbol:"USD"},measurementUnit:{symbol:"USD"},subjectGoals:[{subjectExternalId:"A",subjectLabel:"Jacky",goal:"80000",weight:"65.1250"},{subjectExternalId:"B",weight:"34.8750"}]});
    expect(row.effectiveSettingsSnapshot.groupGoal).not.toHaveProperty("weight");
    row.entityWeights[0].weight="10";
    expect(row.effectiveSettingsSnapshot.subjectGoals[0].weight).toBe("65.1250");
  });
  it("blocks FINALIZED when a weight is missing, even if the parent is 100", async () => {
    row.entityWeights.pop();
    await expect(scorecardCompositionService.finalize(9n,"2026-09",1n)).rejects.toMatchObject({code:"SCORECARD_ENTITY_WEIGHT_MISSING"});
    expect(db.scorecardPeriodKpi.update).not.toHaveBeenCalled();
  });
  it("validates the entity total rather than the parent total", async () => {
    row.entityWeights[0].weight="10";
    await expect(scorecardCompositionService.finalize(9n,"2026-09",1n)).rejects.toMatchObject({code:"SCORECARD_WEIGHT_TOTAL_INVALID"});
  });
  it("rejects duplicate and foreign entity evaluations", () => {
    expect(() => entityWeights(effective,[row.entityWeights[0],row.entityWeights[0]])).toThrowError(expect.objectContaining({code:"SCORECARD_ENTITY_DUPLICATE"}));
    expect(() => entityWeights(effective,[{subjectExternalId:"X",weight:100}])).toThrowError(expect.objectContaining({code:"SCORECARD_ENTITY_NOT_FOUND"}));
  });
  it("preserves missing versus explicit zero and checks numeric precision", () => {
    expect(entityWeights(effective,[],false)[0]!.weight).toBeNull();
    expect(entityWeights(effective,[{subjectExternalId:"A",weight:0}],false)[0]!.weight).toBe("0.0000");
    expect(() => entityWeights(effective,[{subjectExternalId:"A",weight:"0.00001"}],false)).toThrow();
  });
  it("returns legacy FINALIZED without resolving or rewriting effective settings", async () => {
    composition.statusCode="FINALIZED";
    row.effectiveSettingsSnapshot={evaluationScope:"BY_SUBJECT",subjectGoals:effective.subjectGoals};
    const original=JSON.stringify(row.effectiveSettingsSnapshot);
    await scorecardCompositionService.get(9n,"2026-09",1n);
    expect(pool.effectiveSettings).not.toHaveBeenCalled();
    expect(JSON.stringify(row.effectiveSettingsSnapshot)).toBe(original);
    await expect(scorecardCompositionService.updateWeights(9n,"2026-09",{kpis:[],linkedScorecards:[]})).rejects.toMatchObject({code:"SCORECARD_COMPOSITION_ALREADY_FINALIZED"});
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it("isolates frozen metadata from subsequent configuration changes", () => {
    const source=structuredClone(effective);
    const frozen:any=freezeWeightedSettings(source,row.entityWeights);
    source.subjectGoals[0].subjectLabel="Changed"; source.groupGoal.value="999";
    expect(frozen.subjectGoals[0].subjectLabel).toBe("Jacky");
    expect(frozen.groupGoal?.value).toBe("140000");
  });
});
