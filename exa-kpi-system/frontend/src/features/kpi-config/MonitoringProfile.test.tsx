import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useMonitoringProfile } from "./MonitoringProfile";
function Form({goal=100,saved,dataSource="Manual"}:any) {
 const p=useMonitoringProfile({definitionId:"1",goal,goalUnit:"%",measurementUnit:"%",dataSource,inputFrequencyCode:"MONTHLY",periodScope:"CURRENT_PERIOD",ranges:{redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100}} as any,saved);
 return <>{p.panel}<output data-testid="fields">{JSON.stringify(p.fields)}</output><output data-testid="ready">{String(p.ready)}</output></>;
}
const fields=()=>JSON.parse(screen.getByTestId("fields").textContent!);
describe("Single result evaluation",()=>{
 it("previews band compliance and traffic colors even before the rest of the form is complete",()=>{
  render(<Form dataSource=""/>);
  fireEvent.change(screen.getByLabelText("Tipo de bandas"),{target:{value:"INTERVALS"}});
  expect(screen.getByTestId("ready")).toHaveTextContent("false");
  expect(screen.getByRole("region",{name:"Vista previa de bandas"})).toHaveTextContent("Rojo");
  expect(screen.getByRole("region",{name:"Vista previa de bandas"})).toHaveTextContent("Verde");
  fireEvent.change(screen.getByLabelText("Compliance 1"),{target:{value:"70"}});
  expect(screen.getByRole("region",{name:"Vista previa de bandas"})).toHaveTextContent("Amarillo");
  fireEvent.click(screen.getByRole("button",{name:"Eliminar banda 2"}));
  expect(screen.getByRole("region",{name:"Vista previa de bandas"})).toHaveTextContent("Completa bandas");
 });
 it("defaults to proportional scoring with fixed compliance limits",()=>{
  render(<Form/>);expect(fields()).toMatchObject({scoringMethod:"PROPORTIONAL",resultSemantics:"ABSOLUTE_VALUE",scoringRuleConfig:{model:"SINGLE_RESULT_V1",floorPercent:0,capPercent:100}});
  expect(screen.getByTestId("ready")).toHaveTextContent("true");
  expect(screen.queryByText("Cambio esperado")).not.toBeInTheDocument();
  expect(screen.getAllByRole("option").map(o=>o.textContent)).not.toContain("Puntos con interpolacion");
 });
 it("requires bands for a zero target",()=>{render(<Form goal={0}/>);expect(screen.getByTestId("ready")).toHaveTextContent("false");});
 it("offers exactly three band choices",()=>{
  render(<Form/>);const select=screen.getByLabelText("Tipo de bandas") as HTMLSelectElement;
  expect([...select.options].map(o=>o.value)).toEqual(["NONE","INTERVALS","LEVELS"]);
 });
 it("converts compliance levels to upper-inclusive intervals",()=>{
  render(<Form goal={5} saved={{evaluationTypeCode:"LOWER_IS_BETTER",scoringRuleConfig:{model:"SINGLE_RESULT_V1",editorMode:"LEVELS",bands:[{minResult:null,maxResult:5,compliance:100},{minResult:5,maxResult:7,compliance:80},{minResult:7,maxResult:10,compliance:50},{minResult:10,maxResult:null,compliance:0}]}}}/>);
  expect(fields().scoringRuleConfig.bands).toEqual([{minResult:null,maxResult:5,compliance:100,includesMin:true,includesMax:true},{minResult:5,maxResult:7,compliance:80,includesMin:false,includesMax:true},{minResult:7,maxResult:10,compliance:50,includesMin:false,includesMax:true},{minResult:10,maxResult:null,compliance:0,includesMin:false,includesMax:true}]);
  expect(screen.getByTestId("ready")).toHaveTextContent("true");
  fireEvent.change(screen.getByLabelText("To 2"),{target:{value:"4"}});
  expect(screen.getByTestId("ready")).toHaveTextContent("false");
 });
});
