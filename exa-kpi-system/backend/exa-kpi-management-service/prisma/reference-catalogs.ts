import type { PrismaClient } from "@prisma/client";
import { initialKpiCategories } from "./data/kpi-definition.initial-data.js";

// Explicit reference values from the existing import and catalog migrations.
// KM replaces the accidental demo spelling KMS; distinct domain units remain.
export async function seedReferenceCatalogs(p: PrismaClient) {
  for (const item of initialKpiCategories) await p.kpiCategory.upsert({where:{code:item.code},update:{},create:item});
  for (const [code,symbol,name] of [
    ["PERCENT","%","Percent"], ["COUNT","count","Count"], ["KM","km","Kilometers"],
    ["USD","USD","US Dollars"], ["CONTAINERS","containers","Containers"],
    ["INCIDENTS","incidents","Incidents"], ["UNITS","units","Units"],
    ["KM_HEAD_MONTH","km/head/month","Kilometers per head per month"],
    ["THOUSANDS_KM","thousand km","Thousands of kilometers"],
  ] as const) await p.measurementUnit.upsert({where:{code},update:{},create:{code,symbol,name,isPercentage:code==="PERCENT",decimalPlaces:["COUNT","CONTAINERS","INCIDENTS","UNITS"].includes(code)?0:2}});
  for (const [code,name] of [
    ["EMS","EMS"], ["EMS_DEPOT","EMS-Depot"], ["INTEGRATOR_EMS","Integrator - EMS"],
    ["GPS","GPS"], ["SAP","SAP"], ["TMS","TMS"], ["EXCEL_IMPORT","Excel Import"],
    ["MANUAL_ENTRY","Manual Entry"], ["API","API"], ["OPERATIONAL_TEMPLATE","Operational Template"],
  ] as const) {
    const automated=["INTEGRATOR_EMS","TMS","API"].includes(code);
    await p.dataSource.upsert({where:{code},update:{},create:{code,name,sourceType:automated?"API":"MANUAL",supportsAutomation:automated}});
  }
  for (const [code,name,monthsPerPeriod] of [["MONTHLY","Mensual",1],["QUARTERLY","Trimestral",3],["FOUR_MONTHLY","Cuatrimestral",4],["SEMIANNUAL","Semestral",6],["ANNUAL","Anual",12]] as const) {
    const item={code,name,monthsPerPeriod,periodsPerYear:12/monthsPerPeriod};
    await p.inputFrequency.upsert({where:{code},update:{},create:item});
  }
  for (const code of ["CONFIGURED","INCOMPLETE","INACTIVE"]) await p.kpiConfigurationStatus.upsert({where:{code},update:{},create:{code,name:code}});
  for (const [displayOrder,code] of ["HIGHER_IS_BETTER","LOWER_IS_BETTER","ZERO_IS_BETTER","EQUAL_IS_BETTER","RANGE"].entries()) await p.evaluationType.upsert({where:{code},update:{},create:{code,name:code.replaceAll("_"," "),displayOrder:displayOrder+1}});
  await p.evaluationType.upsert({where:{code:"GREATER_IS_BETTER"},update:{},create:{code:"GREATER_IS_BETTER",name:"Greater is better",displayOrder:6}});
  for (const [code,severityRank,hexColor] of [["RED",3,"#EF4444"],["YELLOW",2,"#EAB308"],["GREEN",1,"#22C55E"]] as const) await p.trafficLightLevel.upsert({where:{code},update:{},create:{code,name:code,severityRank,hexColor}});
  // Canonical base Subject Values and their seven Subject Types are installed
  // by 20260903122000 and 20260904180000. No business objects are seeded here.
}
