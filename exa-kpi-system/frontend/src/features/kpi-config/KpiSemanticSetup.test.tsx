import { useState, type ComponentProps } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { KpiSemanticSetup } from "./KpiSemanticSetup";
import type { SubjectGoal, PeriodScope } from "./kpi-config.types";
vi.mock("../../components/useMultiSelectVisibleCount",()=>({useMultiSelectVisibleCount:()=>2}));

function Form({historical=false, overall=false}: {historical?:boolean;overall?:boolean}) {
  const [rows,setRows]=useState<SubjectGoal[]>([
    {subjectExternalId:"A",subjectLabel:"Jacky",goal:80000,goalUnit:historical?"%":"USD",resultUnit:"USD"},
    {subjectExternalId:"B",subjectLabel:"Nancy",goal:60000,goalUnit:historical?"%":"MXN",resultUnit:"MXN"},
  ]);
  const [scope,setScope]=useState<PeriodScope>(historical?"PREVIOUS_PERIOD":"CURRENT_PERIOD");
  const [defaultGoal,setDefaultGoal]=useState("");
  const props:ComponentProps<typeof KpiSemanticSetup>={periodScope:scope,setPeriodScope:setScope,evaluationScope:overall?"OVERALL":"BY_SUBJECT",setEvaluationScope:vi.fn(),goalAssignment:"DIFFERENT_GOAL_PER_SUBJECT",setGoalAssignment:vi.fn(),goal:"100",setGoal:vi.fn(),goalUnit:historical?"%":"USD",setGoalUnit:vi.fn(),resultUnit:"USD",setResultUnit:vi.fn(),subjectType:"EMPLOYEE",setSubjectType:vi.fn(),subjectGoals:rows,setSubjectGoals:setRows,subjectGoalDrafts:{A:"80000",B:"60000"},setSubjectGoalDrafts:vi.fn(),defaultGoal:"",setDefaultGoal:vi.fn(),groupGoal:null,setGroupGoal:vi.fn(),inputFrequencyCode:"MONTHLY",setInputFrequencyCode:vi.fn(),dataSource:"Manual",setDataSource:vi.fn(),units:["USD","MXN","%"].map(symbol=>({id:symbol,symbol,label:symbol})),subjects:[{id:"A",subjectType:"EMPLOYEE",code:"A",name:"Jacky"},{id:"B",subjectType:"EMPLOYEE",code:"B",name:"Nancy"}],frequencies:[],dataSources:[]};
  return <><KpiSemanticSetup {...props} defaultGoal={defaultGoal} setDefaultGoal={setDefaultGoal}/><output data-testid="rows">{JSON.stringify(rows)}</output></>;
}
describe("Entity Goal and Result Units",()=>{
  it("keeps Overall's global unit selectors",()=>{
    render(<Form overall/>);
    expect(screen.getByLabelText(/Goal Measurement Unit/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Official Result Unit/)).toBeInTheDocument();
  });
  it("edits one current entity independently and applies the default only on request",()=>{
    render(<Form/>);
    expect(screen.queryByLabelText(/Goal Measurement Unit/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Official Result Unit/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Goal Unit for Jacky"),{target:{value:"MXN"}});
    let rows=JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows[0]).toMatchObject({goalUnit:"MXN",resultUnit:"MXN"});
    fireEvent.change(screen.getByLabelText("Default Goal Unit"),{target:{value:"USD"}});
    expect(screen.getByLabelText("Goal Unit for Nancy")).toHaveValue("MXN");
    fireEvent.change(screen.getByLabelText("Goal"),{target:{value:"100"}});
    fireEvent.click(screen.getByLabelText("Apply to all"));
    rows=JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows.map((row:any)=>[row.goalUnit,row.resultUnit])).toEqual([["USD","USD"],["USD","USD"]]);
  });
  it("separates historical target percentages from each entity's actual Result Unit",()=>{
    render(<Form historical/>);
    expect(screen.getByLabelText("Target Unit for Jacky")).toHaveValue("%");
    expect(screen.getByLabelText("Result Unit for Nancy")).toHaveValue("MXN");
    fireEvent.change(screen.getByLabelText("Individual Result Unit for Jacky"),{target:{value:"MXN"}});
    expect(screen.getByLabelText("Result Unit for Jacky")).toHaveValue("MXN");
    const rows=JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows[0]).toMatchObject({goalUnit:"%",resultUnit:"MXN"});
    expect(rows[1]).toMatchObject({goalUnit:"%",resultUnit:"MXN"});
    expect(screen.queryByText(/One Official Result Unit applies/)).not.toBeInTheDocument();
  });
  it("keeps current Goal and Result units aligned when edited from Individual Evaluations",()=>{
    render(<Form/>);
    fireEvent.change(screen.getByLabelText("Individual Result Unit for Jacky"),{target:{value:"MXN"}});
    const rows=JSON.parse(screen.getByTestId("rows").textContent!);
    expect(rows[0]).toMatchObject({goalUnit:"MXN",resultUnit:"MXN"});
    expect(screen.getByLabelText("Goal Unit for Jacky")).toHaveValue("MXN");
  });
});
