import {fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter} from "react-router-dom";
import {beforeEach,describe,expect,it,vi} from "vitest";
import {ManualResultEntry} from "./ManualResultEntry";
import {manualResultEntryService} from "./manual-result-entry.service";
let response:any;
beforeEach(()=>{
 vi.restoreAllMocks();
 response={monitoringPeriod:{id:"1",poolName:"Sales",periodLabel:"September 2026",status:"DRAFT",resultsVersion:0,selectedEntryMethod:"MANUAL"},scorecards:[],inputs:["Jacky","Nancy","Carlos","Ana"].map((label,index)=>({id:String(index+1),scorecardId:"9",scorecardName:"Sales Scorecard",kpiConfigurationId:"5",parentKpiCode:"KPI-5",kpiName:"Sales by entity",evaluationKind:"ENTITY",subject:{label},goal:["80000","60000","50000","50000"][index],weight:["10","8","7","5"][index],goalUnit:"USD",unit:"USD",resultValue:null,version:null,groupGoal:{value:"250000",unit:"USD",label:"Group Goal"},entryBlock:null})),summary:{expected:4,entered:0,pending:4,completionPercent:0}};
 vi.spyOn(manualResultEntryService,"get").mockImplementation(async()=>structuredClone(response));
 vi.spyOn(manualResultEntryService,"save").mockImplementation(async(_id,resultsVersion,changes)=>{
  expect(resultsVersion).toBe(response.monitoringPeriod.resultsVersion);
  response.monitoringPeriod.selectedEntryMethod="MANUAL";
  for(const change of changes){const input=response.inputs.find((item:any)=>item.id===change.monitoringPeriodInputId);input.resultValue=change.resultValue;input.version=(input.version??0)+1;}
  if(changes.length)response.monitoringPeriod.resultsVersion++;
  const entered=response.inputs.filter((input:any)=>input.resultValue!==null).length;
  response.summary={expected:response.inputs.length,entered,pending:response.inputs.length-entered,completionPercent:entered/response.inputs.length*100};
  return structuredClone(response);
 });
});
function open(){return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter><ManualResultEntry periodId="1"/></MemoryRouter></QueryClientProvider>);}
describe("Manual Result Entry",()=>{
 it("navigates the five-step wizard and advances after persisted workflow actions",async()=>{
  response.monitoringPeriod.version=3;
  response.summary={expected:4,entered:4,pending:0,completionPercent:100};
  response.check={status:"CURRENT",runId:"9",runNo:1,basedOnResultsVersion:0,summary:{readyForSubmit:true,blocking:0,expected:4,entered:4},scorecards:[],evaluations:[],findings:[]};
  vi.spyOn(manualResultEntryService,"workflow").mockImplementation(async(_id,action,version)=>{
    expect(version).toBe(response.monitoringPeriod.version);
    response.monitoringPeriod.version++;
    response.monitoringPeriod.status=action==="submit"?"SUBMITTED":action==="approve"?"VALIDATED":"CLOSED";
    return structuredClone(response);
  });
  open();await screen.findByLabelText("Result for Jacky");
  expect(within(screen.getByRole("navigation",{name:"Results workflow steps"})).getAllByRole("button")).toHaveLength(5);
  fireEvent.click(screen.getByRole("button",{name:"3 Review & Submit"}));
  expect(screen.getByLabelText("Result for Jacky")).not.toBeVisible();
  fireEvent.click(screen.getByRole("button",{name:"Submit Results"}));
  fireEvent.click(screen.getByRole("button",{name:"Confirm Submit Results"}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"4 Approval"})).toHaveAttribute("aria-current","step"));
  fireEvent.click(screen.getByRole("button",{name:"Approve Results"}));
  fireEvent.click(screen.getByRole("button",{name:"Confirm Approve Results"}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"5 Close Period"})).toHaveAttribute("aria-current","step"));
  expect(screen.getByRole("button",{name:"Close Period"})).toBeEnabled();
 });
 it("keeps unsaved Results when navigation is cancelled",async()=>{
  const confirm=vi.spyOn(window,"confirm").mockReturnValue(false);
  open();await screen.findByLabelText("Result for Jacky");
  fireEvent.change(screen.getByLabelText("Result for Jacky"),{target:{value:"123"}});
  fireEvent.click(screen.getByRole("link",{name:"Change Period"}));
  expect(confirm).toHaveBeenCalledWith("Discard unsaved Results and leave this page?");
  expect(screen.getByLabelText("Result for Jacky")).toHaveValue("123");
  expect(manualResultEntryService.save).not.toHaveBeenCalled();
 });
 it("rejects nonnumeric Results without sending a save",async()=>{
  open();await screen.findByLabelText("Result for Jacky");
  fireEvent.change(screen.getByLabelText("Result for Jacky"),{target:{value:"abc"}});
  fireEvent.click(screen.getByRole("button",{name:"Save Results"}));
  expect(await screen.findByRole("alert")).toHaveTextContent("Enter a numeric Result");
  expect(manualResultEntryService.save).not.toHaveBeenCalled();
 });
 it("renders exact entity inputs and read-only Goals, units, weights and Group Goal",async()=>{
  open();await screen.findByLabelText("Result for Jacky");
  expect(screen.getAllByRole("textbox")).toHaveLength(4);
  expect(screen.getByText("10%")).toBeVisible();expect(screen.getByText("80000 USD")).toBeVisible();
  expect(screen.getByText("Group Weight: —")).toBeVisible();expect(screen.getByText("Group Evaluation: Not available yet")).toBeVisible();
  expect(screen.queryByRole("textbox",{name:/Group/})).not.toBeInTheDocument();
  expect(screen.queryByText(/Compliance|Weighted Contribution|Traffic Light|Pool Score/)).not.toBeInTheDocument();
 });
 it("saves partial Results including zero, reloads persisted values and completes",async()=>{
  const view=open();await screen.findByLabelText("Result for Jacky");
  for(const [name,value] of [["Jacky","0"],["Nancy","58200"],["Carlos","52000"]])fireEvent.change(screen.getByLabelText(`Result for ${name}`),{target:{value}});
  fireEvent.click(screen.getByRole("button",{name:"Save Results"}));
  await screen.findByText("Results saved.");expect(screen.getByLabelText("Saved completion")).toHaveTextContent("Completion: 75%");
  expect(manualResultEntryService.save).toHaveBeenCalledWith("1",0,[{monitoringPeriodInputId:"1",resultValue:"0",version:null},{monitoringPeriodInputId:"2",resultValue:"58200",version:null},{monitoringPeriodInputId:"3",resultValue:"52000",version:null}]);
  view.unmount();open();expect(await screen.findByLabelText("Result for Jacky")).toHaveValue("0");
  fireEvent.change(screen.getByLabelText("Result for Ana"),{target:{value:"49500"}});fireEvent.click(screen.getByRole("button",{name:"Save Results"}));
  await waitFor(()=>expect(screen.getByLabelText("Saved completion")).toHaveTextContent("Completion: 100%"));
 });
 it("renders exactly one OVERALL Result using frozen Result Unit, independently of Goal Unit",async()=>{
  response.inputs=[{...response.inputs[0],evaluationKind:"OVERALL",subject:null,kpiName:"Ventas",goalUnit:"%",unit:"USD",groupGoal:null}];response.summary={expected:1,entered:0,pending:1,completionPercent:0};
  open();await screen.findByLabelText("Result for Ventas");expect(screen.getAllByRole("textbox")).toHaveLength(1);
  expect(screen.getByText("80000 %")).toBeVisible();expect(within(screen.getByRole("table")).getByText("USD")).toBeVisible();
 });
 it("persists selection of Manual and requires selection before editing",async()=>{
  response.monitoringPeriod.selectedEntryMethod=null;open();expect(await screen.findByLabelText("Result for Jacky")).toBeDisabled();
  fireEvent.click(screen.getByRole("button",{name:"Select Manual"}));
  await waitFor(()=>expect(screen.getByLabelText("Result for Jacky")).toBeEnabled());expect(manualResultEntryService.save).toHaveBeenCalledWith("1",0,[]);
 });
 it.each(["SUBMITTED","VALIDATED","CLOSED"])("renders %s read-only",async(status)=>{
  response.monitoringPeriod.status=status;open();expect(await screen.findByLabelText("Result for Jacky")).toBeDisabled();expect(screen.queryByRole("button",{name:"Save Results"})).not.toBeInTheDocument();
 });
 it("keeps typed Results on a conflict and does not claim they were saved",async()=>{
  vi.mocked(manualResultEntryService.save).mockRejectedValue(new Error("Results changed since this period was loaded"));open();await screen.findByLabelText("Result for Jacky");fireEvent.change(screen.getByLabelText("Result for Jacky"),{target:{value:"123"}});fireEvent.click(screen.getByRole("button",{name:"Save Results"}));
  await screen.findByRole("alert");expect(screen.getByLabelText("Result for Jacky")).toHaveValue("123");expect(screen.queryByText("Results saved.")).not.toBeInTheDocument();
 });
});
