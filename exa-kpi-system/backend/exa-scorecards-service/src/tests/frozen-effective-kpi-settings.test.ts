import {describe,expect,it} from "vitest";
import {freezeEffectiveKpiSettings} from "../contracts/frozen-effective-kpi-settings.js";

const base:any={contractVersion:"EffectiveKpiSettingsV1",kpiConfigurationId:"1",kpiConfigurationRevisionId:"2",revisionNumber:1,configCode:"KPC-1",kpiDefinitionId:"3",kpiCode:"KPI-1",kpiName:"Sales",objective:null,goal:"100",goalMode:"SINGLE",evaluationScope:"OVERALL",goalUnit:{id:"1",code:"USD",name:"USD",symbol:"USD"},measurementUnit:{id:"1",code:"USD",name:"USD",symbol:"USD"},subjectType:null,subjects:[],subjectGoals:[],groupGoal:null,evaluationType:{id:"1",code:"GREATER_IS_BETTER",name:"Greater"},resultSemantics:"ABSOLUTE_VALUE",scoringMethod:"PROPORTIONAL",scoringRuleConfig:{},scoringRuleConfigVersion:1,negativeResultPolicy:"DISALLOW",scoringApprovalStatus:"APPROVED",dataSource:{id:"1",code:"EMS",name:"EMS"},thresholds:[],executability:{capabilityVersion:"KPI_EXECUTION_V1",status:"EXECUTABLE",executable:true,reasons:[]}};
describe("FINALIZED KPI snapshot",()=>{
 it("freezes a versioned immutable-value copy",()=>expect(freezeEffectiveKpiSettings(base)).toMatchObject({contractVersion:"FrozenEffectiveKpiSettingsV1",goal:"100"}));
 it("rejects a non-executable configuration with its structured reasons",()=>expect(()=>freezeEffectiveKpiSettings({...base,executability:{...base.executability,status:"BLOCKED",executable:false,reasons:[{code:"GROUP_GOAL_RUNTIME_UNDEFINED",message:"undefined"}]}})).toThrowError(expect.objectContaining({code:"KPI_CONFIGURATION_NOT_EXECUTABLE"})));
});
