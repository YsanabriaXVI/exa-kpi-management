import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ScorecardAssignment } from "./ScorecardAssignment";
import { scorecardService } from "./scorecard.service";

let composition: any;
beforeEach(() => {
  vi.restoreAllMocks();
  const scorecard:any={id:1,code:"SC-1",name:"Sales",poolSource:"Sales Pool",poolId:1,inputFrequency:"Monthly",scopeDepartments:[],scopeCompanies:[],companies:[],departments:[],collaborators:[]};
  composition={id:"1",periodKey:"2026-09",status:"PREPARING",scopeCustomized:true,scope:{departments:[]},kpis:[{id:"2",kpiConfigurationExternalId:"3",configurationCode:"KPC-3",definitionCode:"KPI-3",definitionName:"Sales by entity",weight:"100.0000",evaluationScope:"BY_SUBJECT",goalUnit:"USD",resultUnit:"USD",evaluations:[{subjectExternalId:"A",subjectLabel:"Jacky",goal:"80000",weight:"65.1250"},{subjectExternalId:"B",subjectLabel:"Nancy",goal:"60000",weight:"34.8750"}]}],linkedScorecards:[]};
  vi.spyOn(scorecardService,"getById").mockResolvedValue(scorecard);
  vi.spyOn(scorecardService,"list").mockResolvedValue([scorecard]);
  vi.spyOn(scorecardService,"periods").mockResolvedValue([{periodKey:"2026-09",poolCompositionStatus:"FINALIZED",scorecardCompositionStatus:"PREPARING"}] as any);
  vi.spyOn(scorecardService,"composition").mockImplementation(async()=>composition);
  vi.spyOn(scorecardService,"updateWeights").mockResolvedValue(composition);
});
function open() {return render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false,gcTime:0}}})}><MemoryRouter initialEntries={["/app/scorecards/assignment?scorecardId=1&period=2026-09"]}><ScorecardAssignment/></MemoryRouter></QueryClientProvider>);}
describe("Entity assignment weights",()=>{
  it("shows only the empty state when the period is unavailable and does not request compositions",async()=>{
    vi.mocked(scorecardService.periods).mockResolvedValue([{periodKey:"2026-08",scorecardCompositionStatus:"FINALIZED"},{periodKey:"2026-09",scorecardCompositionStatus:"UNAVAILABLE"}] as any);
    open();
    expect(await screen.findByText("No information available")).toBeInTheDocument();
    expect(scorecardService.composition).not.toHaveBeenCalled();
    expect(screen.queryByText("Composition Weight")).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:/Save Assignment/})).not.toBeInTheDocument();
  });
  it("does not load previous composition or weight panels for an empty assignment",async()=>{
    composition.kpis=[];
    vi.mocked(scorecardService.periods).mockResolvedValue([{periodKey:"2026-08",scorecardCompositionStatus:"FINALIZED"},{periodKey:"2026-09",scorecardCompositionStatus:"PREPARING"}] as any);
    open();
    expect(await screen.findByText("No information available")).toBeInTheDocument();
    await waitFor(()=>expect(scorecardService.composition).toHaveBeenCalledTimes(1));
    expect(scorecardService.composition).toHaveBeenCalledWith(1,"2026-09");
    expect(screen.queryByText("Composition Weight")).not.toBeInTheDocument();
  });
  it("renders independent weights without a parent input and saves explicit entity identities",async()=>{
    open();
    const jacky=await screen.findByRole("spinbutton",{name:"Weight for Jacky"});
    expect(jacky).toHaveValue(65.125);
    expect(screen.getByRole("spinbutton",{name:"Weight for Nancy"})).toHaveValue(34.875);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(2);
    fireEvent.change(jacky,{target:{value:"60"}});
    fireEvent.click(screen.getByRole("button",{name:/Save Assignment/}));
    await waitFor(()=>expect(scorecardService.updateWeights).toHaveBeenCalledWith(1,"2026-09",{kpis:[{kpiConfigurationExternalId:"3",weight:0,entityWeights:[{subjectExternalId:"A",weight:60},{subjectExternalId:"B",weight:34.875}]}],linkedScorecards:[]}));
  });
  it("keeps frozen entity weights read-only",async()=>{
    composition.status="FINALIZED";open();
    expect(await screen.findByRole("spinbutton",{name:"Weight for Jacky"})).toBeDisabled();
    expect(screen.getByRole("spinbutton",{name:"Weight for Nancy"})).toBeDisabled();
  });
  it("shows a missing weight as blank instead of distributing the parent",async()=>{
    composition.kpis[0].evaluations[0].weight=null;open();
    expect(await screen.findByRole("spinbutton",{name:"Weight for Jacky"})).toHaveValue(null);
  });
});
