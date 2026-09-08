import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMonitoringProfile } from "./MonitoringProfile";

function Profile({semantics="DURATION",goal=4,behavior="LOWER_IS_BETTER"}) {
  const profile=useMonitoringProfile({definitionId:"1",goal,evaluationScope:"OVERALL",periodScope:"CURRENT_PERIOD",evaluationTypeCode:behavior,resultSemantics:semantics,resultMethod:"DIRECT",measurementInputs:[],measurementUnit:"h",dataSource:"Manual",inputFrequencyCode:"MONTHLY",isActive:true,ranges:{redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100}} as any);
  return <>{profile.panel}<output data-testid="fields">{JSON.stringify(profile.fields)}</output></>;
}
describe("Scoring method setup",()=>{
  it("recommends bands for duration and shows compliance limits only for proportional",()=>{
    render(<Profile/>);
    expect(screen.getByLabelText("Método de evaluación")).toHaveValue("RESULT_BANDS");
    expect(screen.getByRole("button",{name:"Agregar banda"})).toBeInTheDocument();
    expect(screen.queryByLabelText(/Cumplimiento mínimo/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Método de evaluación"),{target:{value:"PROPORTIONAL"}});
    expect(screen.getByLabelText(/Cumplimiento mínimo/)).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Agregar banda"})).not.toBeInTheDocument();
  });
  it("keeps yes/no fixed without bands or proportional limits",()=>{
    render(<Profile semantics="BINARY" goal={1}/>);
    expect(JSON.parse(screen.getByTestId("fields").textContent!).scoringMethod).toBe("BINARY");
    expect(screen.queryByLabelText(/Cumplimiento mínimo/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Agregar banda"})).not.toBeInTheDocument();
  });
  it("allows the zero-incidents example to be reviewed and confirmed",()=>{
    render(<Profile semantics="COUNT" goal={0} behavior="ZERO_IS_BETTER"/>);
    fireEvent.click(screen.getByRole("button",{name:"Usar ejemplo de cero incidentes"}));
    expect(JSON.parse(screen.getByTestId("fields").textContent!).scoringRuleConfig.bands.map((b:any)=>b.compliance)).toEqual([100,70,50,0]);
    expect(screen.getByLabelText(/Confirmo estas reglas/)).not.toBeDisabled();
  });
});
