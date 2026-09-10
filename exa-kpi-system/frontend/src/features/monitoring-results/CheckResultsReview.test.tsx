import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ManualResultEntry } from "./ManualResultEntry";
import { manualResultEntryService } from "./manual-result-entry.service";
let saved:any;
const input=(id:string,name:string,result:string|null)=>({id,scorecardId:"9",scorecardName:"Sales",kpiConfigurationId:id,parentKpiCode:`KPI-${id}`,kpiName:name,evaluationKind:"OVERALL",subject:null,goal:"100",weight:"20",goalUnit:"USD",unit:"USD",resultValue:result,version:1,groupGoal:null,entryBlock:null});
const report=()=>({status:"CURRENT",runId:"12",runNo:12,basedOnResultsVersion:saved.monitoringPeriod.resultsVersion,
 summary:{expected:4,entered:3,pending:1,completionPercent:75,errorCount:1,errors:1,critical:0,warnings:0,blocking:1,runStatus:"BLOCKED",weightCoverageComplete:true,allRequiredScoringCalculable:false,readyForSubmit:false},
 evaluations:[{...saved.inputs[0],extraPoints:"14.600000",rawAchievementPercent:"114.600000",compliancePercent:"91.234567",goalMet:true,trafficLight:"GREEN",weightedContribution:"13.685185",status:"CALCULATED"},
 {...saved.inputs[1],rawAchievementPercent:"83.333333",compliancePercent:"83.333333",goalMet:false,trafficLight:"GREEN",weightedContribution:"8.333333",status:"CALCULATED"},
 {...saved.inputs[2],rawAchievementPercent:null,compliancePercent:"100.000000",goalMet:true,trafficLight:"YELLOW",weightedContribution:"20.000000",status:"CALCULATED"},
 {...saved.inputs[3],entityLabel:"Ana",rawAchievementPercent:null,compliancePercent:null,goalMet:null,trafficLight:null,weightedContribution:null,status:"NOT_CALCULABLE"}],
 scorecards:[{id:"9",name:"Sales",code:"SC-9",score:"42.500000",scoreStatus:"PARTIAL",weightCoverage:"100.000000",calculableWeight:"75.000000",pendingWeight:"25.000000"}],
 findings:[{code:"RESULT_MISSING",severity:"ERROR",scope:"EVALUATION",kpiCode:"KPI-4",entityLabel:"Ana",scorecardId:"9",message:"Enter Ana's Result.",blocking:true}]});
beforeEach(()=>{
 vi.restoreAllMocks();
 saved={monitoringPeriod:{id:"1",poolName:"Sales",periodLabel:"September",status:"DRAFT",resultsVersion:4,selectedEntryMethod:"MANUAL"},inputs:[input("1","Greater sales","57300"),input("2","Lower costs","6"),input("3","Zero incidents","0"),input("4","Entity sales",null)],scorecards:[],summary:{expected:4,entered:3,pending:1,completionPercent:75},check:{status:"NOT_CHECKED",runId:null,evaluations:[],scorecards:[],findings:[],summary:null}};
 vi.spyOn(manualResultEntryService,"get").mockImplementation(async()=>structuredClone(saved));
 vi.spyOn(manualResultEntryService,"check").mockImplementation(async()=>{saved.check=report();return structuredClone(saved);});
 vi.spyOn(manualResultEntryService,"save").mockImplementation(async(_id,_version,changes)=>{for(const c of changes){saved.inputs.find((i:any)=>i.id===c.monitoringPeriodInputId).resultValue=c.resultValue;}saved.monitoringPeriod.resultsVersion++;saved.check={...saved.check,status:"STALE",evaluations:[],scorecards:[],findings:[],summary:null};return structuredClone(saved);});
});
function open(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><ManualResultEntry periodId="1"/></MemoryRouter></QueryClientProvider>);}
describe("Check Results UI",()=>{
 it("renders backend Greater, Lower, Zero and entity evaluation without deriving scores",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Check Results"}));
  await screen.findByText("CURRENT · Check #12 · Results v4");
  expect(manualResultEntryService.check).toHaveBeenCalledWith("1",4,undefined);
  expect(screen.getByText("+14.60 pts")).toBeVisible();expect(screen.getByText("91.23%")).toBeVisible();expect(screen.getByText("13.69%")).toBeVisible();
 });
 it("renders boolean/null Goal Met, explicit Traffic and partial findings",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Check Results"}));await screen.findByText("Extra Points");
  const lower=screen.getAllByText("Lower costs").find(e=>e.closest("tr")?.textContent?.includes("83.33"))!.closest("tr")!;
  expect(within(lower).getByText("No")).toBeVisible();expect(within(lower).getByText("Green")).toBeVisible();
  expect(within(lower).getByText("Green")).toHaveClass("traffic-status", "green");
  const missing=screen.getByText("NOT_CALCULABLE").closest("tr")!;expect(within(missing).getAllByText("—").length).toBeGreaterThanOrEqual(5);
  expect(screen.getByText(/Partial Score: 42.50/)).toBeVisible();expect(screen.getByText("RESULT_MISSING")).toBeVisible();expect(screen.getByText(/Blocks future Submit/)).toBeVisible();
 });
 it("hides stale scoring after save and checks again against the new Results version",async()=>{
  open();fireEvent.click(await screen.findByRole("button",{name:"Check Results"}));await screen.findByText("Extra Points");
  fireEvent.click(screen.getByRole("button",{name:"Back: Result Entry"}));
  fireEvent.change(screen.getByLabelText("Result for Greater sales"),{target:{value:"60000"}});
  expect(screen.getByRole("button",{name:"Run Check Results again"})).toBeDisabled();expect(screen.queryByText("Extra Points")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Save Results"}));await screen.findByText("Results or baseline changed. Run Check Results again.");
  expect(screen.queryByText("13.69%")).not.toBeInTheDocument();fireEvent.click(screen.getByRole("button",{name:"Run Check Results again"}));
  await screen.findByText("CURRENT · Check #12 · Results v5");expect(manualResultEntryService.check).toHaveBeenLastCalledWith("1",5,undefined);
 });
 it("keeps Results on conflict and provides reload/retry",async()=>{
  vi.mocked(manualResultEntryService.check).mockRejectedValueOnce(new Error("Results changed. Reload and run Check Results again."));
  open();fireEvent.click(await screen.findByRole("button",{name:"Check Results"}));await screen.findByRole("alert");
  fireEvent.click(screen.getByRole("button",{name:"Back: Result Entry"}));
  expect(screen.getByRole("textbox",{name:"Result for Greater sales"})).toHaveValue("57300");
  saved.monitoringPeriod.resultsVersion=5;fireEvent.click(screen.getByRole("button",{name:"Reload saved Results"}));await waitFor(()=>expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button",{name:"Check Results"}));await screen.findByText("CURRENT · Check #12 · Results v5");
 });
 it("disables duplicate Check while running",async()=>{
  let resolve!:(value:any)=>void;vi.mocked(manualResultEntryService.check).mockImplementation(()=>new Promise(r=>{resolve=r;}));
  open();fireEvent.click(await screen.findByRole("button",{name:"Check Results"}));expect(screen.getByRole("button",{name:"Checking Results…"})).toBeDisabled();
  resolve({...saved,check:report()});await screen.findByText("Extra Points");
 });
 it.each(["SUBMITTED","VALIDATED","CLOSED"])("keeps %s read-only",async status=>{
  saved.monitoringPeriod.status=status;open();await screen.findByLabelText("Result for Greater sales");expect(screen.queryByRole("button",{name:"Check Results"})).not.toBeInTheDocument();
 });
});
