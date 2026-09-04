import { z } from "zod";
import { AppError } from "../utils/app-error.js";

const executabilitySchema=z.object({capabilityVersion:z.literal("KPI_EXECUTION_V1"),status:z.enum(["EXECUTABLE","BLOCKED"]),executable:z.boolean(),reasons:z.array(z.object({code:z.string(),message:z.string()}))});
const effectiveSchema=z.object({
  contractVersion:z.literal("EffectiveKpiSettingsV1"),kpiConfigurationId:z.string(),kpiConfigurationRevisionId:z.string(),revisionNumber:z.number(),configCode:z.string(),
  kpiDefinitionId:z.string(),kpiCode:z.string(),kpiName:z.string(),objective:z.string().nullable(),goal:z.string().nullable(),goalMode:z.enum(["SINGLE","RANGE","BY_SUBJECT"]),
  evaluationScope:z.enum(["OVERALL","BY_SUBJECT"]),goalUnit:z.object({id:z.string(),code:z.string(),name:z.string(),symbol:z.string()}),measurementUnit:z.object({id:z.string(),code:z.string(),name:z.string(),symbol:z.string()}),
  subjectType:z.string().nullable(),subjects:z.array(z.object({subjectExternalId:z.string(),subjectCode:z.string().nullable(),subjectLabel:z.string()})),subjectGoals:z.array(z.object({subjectExternalId:z.string(),subjectCode:z.string().nullable(),subjectLabel:z.string(),goal:z.string().nullable()})),
  groupGoal:z.object({value:z.string(),unit:z.string(),label:z.string()}).nullable(),evaluationType:z.object({id:z.string(),code:z.string(),name:z.string()}),resultSemantics:z.string().nullable(),scoringMethod:z.string().nullable(),scoringRuleConfig:z.record(z.string(),z.unknown()).nullable(),scoringRuleConfigVersion:z.number().nullable(),negativeResultPolicy:z.string().nullable(),scoringApprovalStatus:z.string(),dataSource:z.object({id:z.string(),code:z.string(),name:z.string()}),thresholds:z.array(z.object({id:z.string(),trafficLightLevelId:z.string(),code:z.string(),name:z.string(),rangeMinPercent:z.string().nullable(),rangeMaxPercent:z.string().nullable(),includesMin:z.boolean(),includesMax:z.boolean(),displayOrder:z.number()})),executability:executabilitySchema,
}).passthrough();
export type EffectiveKpiSettingsV1=z.infer<typeof effectiveSchema>;
export type FrozenEffectiveKpiSettingsV1=Omit<EffectiveKpiSettingsV1,"contractVersion">&{contractVersion:"FrozenEffectiveKpiSettingsV1"};
export function parseEffectiveKpiSettings(value:unknown):EffectiveKpiSettingsV1 { const parsed=effectiveSchema.safeParse(value); if(!parsed.success) throw new AppError(502,"KPI_POOL_CONTRACT_ERROR","KPI Pool returned invalid Effective KPI Settings",{issues:parsed.error.issues}); return parsed.data; }
export function freezeEffectiveKpiSettings(value:EffectiveKpiSettingsV1):FrozenEffectiveKpiSettingsV1 { if(!value.executability.executable) throw new AppError(422,"KPI_CONFIGURATION_NOT_EXECUTABLE",`${value.configCode} cannot be finalized`,{configurationId:value.kpiConfigurationId,reasons:value.executability.reasons}); return {...value,contractVersion:"FrozenEffectiveKpiSettingsV1"}; }
