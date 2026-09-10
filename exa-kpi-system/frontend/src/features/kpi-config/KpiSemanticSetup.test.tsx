import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KpiSemanticSetup } from "./KpiSemanticSetup";
function Form() {
 const [unit,setUnit]=useState("km/head"); const [goal,setGoal]=useState("3500");
 return <KpiSemanticSetup goal={goal} setGoal={setGoal} goalUnit={unit} setGoalUnit={setUnit} dataSource="Manual" setDataSource={()=>{}} inputFrequencyCode="MONTHLY" setInputFrequencyCode={()=>{}} units={[{id:"1",symbol:"km/head",label:"km/head"},{id:"2",symbol:"%",label:"Percentage"}]} frequencies={[{code:"MONTHLY",name:"Monthly"}]} dataSources={[{id:"1",name:"Manual"}]}/>;
}
describe("Single KPI units",()=>{
 it("derives a read-only Result Unit when Goal Unit changes",()=>{
  render(<Form/>);expect(screen.getByLabelText("Result Measurement Unit")).toHaveValue("km/head");
  expect(screen.getByLabelText("Result Measurement Unit")).toHaveAttribute("readonly");
  fireEvent.change(screen.getByLabelText("Goal Measurement Unit"),{target:{value:"%"}});
  expect(screen.getByLabelText("Result Measurement Unit")).toHaveValue("%");
  expect(screen.getByText(/Goal 10%, Result 8%, Compliance 80%/)).toBeInTheDocument();
 });
 it("offers one Goal and no entity or historical evaluation controls",()=>{
  render(<Form/>);expect(screen.getByLabelText("Goal")).toHaveValue(3500);
  expect(screen.queryByText("By Entity")).not.toBeInTheDocument();
  expect(screen.queryByText("Evaluation Reference")).not.toBeInTheDocument();
  expect(screen.queryByText("Official Result Unit")).not.toBeInTheDocument();
 });
});
