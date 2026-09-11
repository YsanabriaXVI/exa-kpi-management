import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiSemanticSetup } from "./KpiSemanticSetup";
function Form() {
 const [name,setName]=useState(""); const [custom,setCustom]=useState(false);
 const [unit,setUnit]=useState("km/head"); const [goal,setGoal]=useState("3500");
 return <KpiSemanticSetup definitionName="Trips" configurationName={name} setConfigurationName={setName} customName={custom} setCustomName={setCustom} goal={goal} setGoal={setGoal} goalUnit={unit} setGoalUnit={setUnit} dataSource="Manual" setDataSource={()=>{}} inputFrequencyCode="MONTHLY" setInputFrequencyCode={()=>{}} units={[{id:"1",symbol:"km/head",label:"km/head"},{id:"2",symbol:"%",label:"Percentage"}]} frequencies={[{code:"MONTHLY",name:"Monthly"}]} dataSources={[{id:"1",name:"Manual"}]}/>;
}
describe("Single KPI units",()=>{
 it("uses the Definition name until custom naming is enabled",()=>{
  render(<Form/>);
  const name=screen.getByRole("textbox",{name:"KPI Configuration Name"});
  expect(name).toHaveValue("Trips");
  expect(name).toHaveAttribute("readonly");
  fireEvent.click(screen.getByRole("checkbox",{name:"Use a custom name"}));
  expect(name).not.toHaveAttribute("readonly");
  fireEvent.change(name,{target:{value:"Trips Jacky"}});
  expect(name).toHaveValue("Trips Jacky");
  fireEvent.click(screen.getByRole("checkbox",{name:"Use a custom name"}));
  expect(name).toHaveValue("Trips");
  expect(name).toHaveAttribute("readonly");
 });
 it("updates the Goal Unit and its explanation",()=>{
  render(<Form/>);expect(screen.getByLabelText("Goal Measurement Unit")).toHaveValue("km/head");
  fireEvent.change(screen.getByLabelText("Goal Measurement Unit"),{target:{value:"%"}});
  expect(screen.getByLabelText("Goal Measurement Unit")).toHaveValue("%");
  expect(screen.getByText(/Goal 10%, Result 8%, Compliance 80%/)).toBeInTheDocument();
 });
 it("offers one Goal and no entity or historical evaluation controls",()=>{
  render(<Form/>);expect(screen.getByLabelText("Goal")).toHaveValue(3500);
  expect(screen.queryByText("By Entity")).not.toBeInTheDocument();
  expect(screen.queryByText("Evaluation Reference")).not.toBeInTheDocument();
  expect(screen.queryByText("Official Result Unit")).not.toBeInTheDocument();
 });
});
