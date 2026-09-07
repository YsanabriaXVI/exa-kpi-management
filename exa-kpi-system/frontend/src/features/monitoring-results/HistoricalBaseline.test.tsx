import {fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {beforeEach,describe,it,expect,vi} from "vitest";
import {ManualResultEntry} from "./ManualResultEntry";
import {manualResultEntryService} from "./manual-result-entry.service";
import {baselineApi} from "./HistoricalBaseline";
let saved:any;
const req={key:"2026-07",start:"2026-07-01",end:"2026-07-31"};
const candidates={baselineVersion:0,requiredPeriod:req,unit:{symbol:"USD"},page:1,total:1,
  candidates:[{id:"21",value:"100000",unit:"USD",periodKey:"2026-07",poolName:"Financial Pool",scorecardName:"Sales",kpiCode:"KPI-050",kpiName:"Sales",subjectLabel:null,rank:1}]};
beforeEach(()=>{
  vi.restoreAllMocks();
  saved={monitoringPeriod:{id:"1",poolName:"Sales 2026",periodLabel:"August 2026",status:"DRAFT",resultsVersion:5,baselineVersion:0,selectedEntryMethod:"MANUAL"},
    inputs:[{id:"2",scorecardId:"9",scorecardName:"Sales",kpiConfigurationId:"5",parentKpiCode:"KPI-050",kpiName:"Increase Sales",evaluationKind:"OVERALL",subject:null,goal:"10",goalUnit:"%",unit:"USD",weight:"100",resultValue:"115000",version:1,groupGoal:null,entryBlock:null,periodScope:"PREVIOUS_PERIOD",
      historical:{state:"UNRESOLVED",requiredPeriod:req,resolution:null,errorCode:null}}],
    summary:{expected:1,entered:1,pending:0,completionPercent:100},scorecards:[],
    check:{status:"CURRENT",runId:"1",runNo:1,basedOnResultsVersion:5,basedOnBaselineVersion:0,summary:null,evaluations:[],scorecards:[],findings:[]}};
  vi.spyOn(manualResultEntryService,"get").mockImplementation(async()=>structuredClone(saved));
  vi.spyOn(baselineApi,"candidates").mockResolvedValue(candidates);
  vi.spyOn(baselineApi,"select").mockImplementation(async()=>{
    saved.monitoringPeriod.baselineVersion=1;saved.check.status="STALE";
    saved.inputs[0].historical={state:"USER_RESOLVED",requiredPeriod:req,resolution:{value:"100000",unit:{symbol:"USD"},sourceType:"USER_MATCH",reason:null,resolvedAt:"2026-09-01T00:00:00Z",resolvedBy:"11",provenance:{poolName:"Financial Pool",kpiCode:"KPI-050"}},errorCode:null};
    return {};
  });
  vi.spyOn(baselineApi,"manual").mockImplementation(async(_p,_i,_v,value,reason)=>{
    saved.monitoringPeriod.baselineVersion=1;saved.check.status="STALE";
    saved.inputs[0].historical={state:"MANUAL",requiredPeriod:req,resolution:{value,unit:{symbol:"USD"},sourceType:"MANUAL",reason,resolvedAt:"2026-09-01T00:00:00Z",resolvedBy:"11",provenance:{}},errorCode:null};
    return {};
  });
  vi.spyOn(manualResultEntryService,"check").mockImplementation(async()=>{
    saved.check={status:"CURRENT",runId:"2",runNo:2,basedOnResultsVersion:5,basedOnBaselineVersion:1,
      summary:{expected:1,entered:1,pending:0,completionPercent:100,errorCount:0,errors:0,critical:0,warnings:0,blocking:0,runStatus:"PASSED"},
      evaluations:[{...saved.inputs[0],rawAchievementPercent:"150",compliancePercent:"100",goalMet:true,trafficLight:"GREEN",weightedContribution:"100",status:"CALCULATED",
        historical:{referenceType:"PREVIOUS_PERIOD",comparisonDirection:"INCREASE",signedChangePercent:"15",achievedChangePercent:"15",requiredPeriod:req,resolution:{value:"100000",sourceType:"USER_MATCH"}}}],
      scorecards:[],findings:[]};return structuredClone(saved);
  });
});
function open(){render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><ManualResultEntry periodId="1"/></MemoryRouter></QueryClientProvider>);}
async function resolve(){fireEvent.click(await screen.findByRole("button",{name:"Resolve Baseline"}));return screen.findByRole("dialog");}
describe("Historical baseline in Monitoring wizard",()=>{
  it("keeps current Result editable while baseline is missing and displays target % separately",async()=>{
    open();expect(await screen.findByRole("textbox",{name:"Result for Increase Sales"})).toBeEnabled();
    expect(screen.getByText("10 %")).toBeVisible();expect(screen.getByText("Baseline: Missing")).toBeVisible();
    expect(screen.getByText(/Required baseline: 2026-07/)).toBeVisible();
  });
  it("searches and explicitly confirms a candidate from another Pool, then rechecks both versions",async()=>{
    open();const dialog=await resolve();
    await within(dialog).findByText(/Financial Pool/);
    fireEvent.change(within(dialog).getByRole("textbox",{name:"Search historical Results"}),{target:{value:"Financial"}});
    fireEvent.click(within(dialog).getByRole("button",{name:"Search"}));
    await waitFor(()=>expect(baselineApi.candidates).toHaveBeenCalledWith("1","2","Financial",1));
    fireEvent.click(await within(dialog).findByRole("radio"));
    fireEvent.click(within(dialog).getByRole("button",{name:"Use Selected Baseline"}));
    await waitFor(()=>expect(baselineApi.select).toHaveBeenCalledWith("1","2",0,"21"));
    await screen.findByText("Results or baseline changed. Run Check Results again.");
    expect(screen.getByRole("textbox",{name:"Result for Increase Sales"})).toHaveValue("115000");
    fireEvent.click(screen.getByRole("button",{name:"Run Check Results again"}));
    await screen.findByText("150.00%");
    expect(manualResultEntryService.check).toHaveBeenCalledWith("1",5,1);
    expect(screen.getByText(/Actual change: 15.00%/)).toBeVisible();
  });
  it("requires manual provenance and sends only value/reason/version; period and unit are read-only",async()=>{
    open();const dialog=await resolve();
    await within(dialog).findByText("Required Result Unit: USD");
    expect(within(dialog).getByText(/Required period: 2026-07/)).toBeVisible();
    fireEvent.change(within(dialog).getByRole("textbox",{name:"Baseline value"}),{target:{value:"100000"}});
    expect(within(dialog).getByRole("button",{name:"Save Manual Baseline"})).toBeDisabled();
    fireEvent.change(within(dialog).getByRole("textbox",{name:"Reason / Source"}),{target:{value:"Historical ERP result before EXA"}});
    fireEvent.click(within(dialog).getByRole("button",{name:"Save Manual Baseline"}));
    await waitFor(()=>expect(baselineApi.manual).toHaveBeenCalledWith("1","2",0,"100000","Historical ERP result before EXA"));
    await screen.findByRole("button",{name:"Change Baseline"});
  });
  it("preserves Results and offers reload when a baseline save conflicts",async()=>{
    vi.mocked(baselineApi.select).mockRejectedValue(new Error("BASELINE_VERSION_CONFLICT"));
    open();const dialog=await resolve();fireEvent.click(await within(dialog).findByRole("radio"));
    fireEvent.click(within(dialog).getByRole("button",{name:"Use Selected Baseline"}));
    expect(await within(dialog).findByRole("alert")).toHaveTextContent("BASELINE_VERSION_CONFLICT");
    expect(screen.getByRole("textbox",{name:"Result for Increase Sales"})).toHaveValue("115000");
  });
  it("keeps each entity resolution independent and Group Goal unweighted",async()=>{
    saved.inputs[0].evaluationKind="ENTITY";saved.inputs[0].subject={id:"7",label:"Jacky"};saved.inputs[0].groupGoal={value:"10",unit:"%",label:"Group"};
    saved.inputs.push({...structuredClone(saved.inputs[0]),id:"3",subject:{id:"8",label:"Carlos"}});
    open();await screen.findByRole("textbox",{name:"Result for Carlos"});
    expect(screen.getAllByRole("button",{name:"Resolve Baseline"})).toHaveLength(2);
    expect(screen.getByText("Group Weight: —")).toBeVisible();expect(screen.getByText("Group Evaluation: Not available yet")).toBeVisible();
  });
  it("disables resolution with unsaved current Results",async()=>{
    open();fireEvent.change(await screen.findByRole("textbox",{name:"Result for Increase Sales"}),{target:{value:"116000"}});
    expect(screen.getByRole("button",{name:"Resolve Baseline"})).toBeDisabled();
  });
});
