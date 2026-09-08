import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../config/database/prisma.js";
import { kpiConfigurationService } from "../services/kpi-configuration.service.js";
import { kpiConfigurationBodySchema } from "../schemas/kpi-configuration.schema.js";

const run = process.env.RUN_ENTITY_UNIT_INTEGRATION === "true" ? describe : describe.skip;
const created: bigint[] = [];
let definitionId: bigint | undefined;
let categoryId: bigint | undefined;
run("Per-entity units MySQL round trip", () => {
  beforeAll(async()=>{
    const code=String(Date.now());
    categoryId=(await prisma.kpiCategory.create({data:{code:`UNIT-TEST-${code}`,name:"Entity units integration test"}})).id;
    definitionId=(await prisma.kpiDefinition.create({data:{kpiCode:`KPI-${code}`,kpiName:"Entity units integration test",description:"Temporary test fixture",kpiCategoryId:categoryId}})).id;
  });
  afterAll(async () => {
    for (const id of created) {
      await prisma.kpiConfigurationRevision.deleteMany({where:{kpiConfigurationId:id}});
      await prisma.kpiConfiguration.delete({where:{id}});
    }
    if(definitionId)await prisma.kpiDefinition.delete({where:{id:definitionId}});
    if(categoryId)await prisma.kpiCategory.delete({where:{id:categoryId}});
    await prisma.$disconnect();
  });
  it.each(["CURRENT_PERIOD", "PREVIOUS_PERIOD"])("persists and projects independent units for %s",async periodScope=>{
    const units=await prisma.measurementUnit.findMany({where:{isActive:true,isPercentage:false,symbol:{notIn:["%","N/A"]}},orderBy:{id:"asc"},take:2});
    const source=await prisma.dataSource.findFirstOrThrow({where:{isActive:true,code:{not:"UNSPECIFIED"}}});
    expect(units).toHaveLength(2);
    const historical=periodScope!=="CURRENT_PERIOD";
    const subjects=units.map((_,i)=>({subjectExternalId:`UNIT-TEST-${i}`,subjectLabel:`Unit test ${i}`}));
    const body=kpiConfigurationBodySchema.parse({definitionId:String(definitionId),goal:0,dataSource:source.name,measurementUnit:"",periodScope,
      effectiveFrom:"2099-01-01",evaluationScope:"BY_SUBJECT",goalMode:"BY_SUBJECT",goalAssignment:"DIFFERENT_GOAL_PER_SUBJECT",subjectType:"EMPLOYEE",subjects,
      subjectGoals:subjects.map((row,i)=>({...row,goal:historical?10:100,goalUnit:historical?"%":units[i]!.symbol,resultUnit:units[i]!.symbol})),
      ranges:{redFrom:0,redTo:64,yellowFrom:65,yellowTo:79,greenFrom:80,greenTo:100},
      targetKind:historical?"CHANGE_TARGET":"ABSOLUTE_TARGET",comparisonDirection:historical?"INCREASE":null,
      resultSemantics:"ABSOLUTE_VALUE",evaluationTypeCode:"GREATER_IS_BETTER",scoringMethod:"PROPORTIONAL",scoringRuleConfig:{floorPercent:0,capPercent:100},scoringRuleConfigVersion:1,scoringApprovalStatus:"APPROVED",negativeResultPolicy:"DISALLOW"});
    const saved=await kpiConfigurationService.create(body,null);
    created.push(BigInt(saved.id));
    const reloaded=await kpiConfigurationService.get(BigInt(saved.id));
    expect(reloaded.subjectGoals.map((row:any)=>[row.goalUnit,row.resultUnit])).toEqual(units.map(unit=>[historical?"%":unit.symbol,unit.symbol]));
    const snapshot=(await kpiConfigurationService.effectiveSnapshots({configurationIds:[String(saved.id)],periodStart:"2099-01-01",periodEnd:"2099-01-31"})).data[0]!;
    expect(snapshot.executability.executable).toBe(true);
    expect(snapshot.subjectGoals.map(row=>[row.goalUnit.symbol,row.resultUnit.code])).toEqual(units.map(unit=>[historical?"%":unit.symbol,unit.code]));
  });
});
