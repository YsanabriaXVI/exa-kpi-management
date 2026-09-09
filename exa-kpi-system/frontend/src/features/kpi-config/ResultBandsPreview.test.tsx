import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ResultBandsPreview } from "./ResultBandsPreview";

it("uses configured Traffic Light thresholds and updates without changing band compliance", () => {
  const bands=[{minResult:0,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:70},{minResult:2,maxResult:2,compliance:50},{minResult:3,compliance:0}];
  const ranges={redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100};
  const {rerender}=render(<ResultBandsPreview bands={bands} ranges={ranges} complete/>);
  expect(screen.getByText("≥ 3")).toBeInTheDocument();
  const row=screen.getByText("70%").closest("li")!;
  expect(within(row).getByText("Amarillo")).toBeInTheDocument();
  rerender(<ResultBandsPreview bands={bands} ranges={{...ranges,yellowTo:69,greenFrom:70}} complete/>);
  expect(within(row).getByText("Verde")).toBeInTheDocument();
  expect(within(row).getByText("70%")).toBeInTheDocument();
});

it("shows sorted explicit intervals with open endpoints and an unbounded tail", () => {
  render(<ResultBandsPreview bands={[
    {minResult:100,maxResult:null,includesMin:true,compliance:100},
    {minResult:0,maxResult:100,includesMin:true,includesMax:false,compliance:50},
  ]} unit="USD" complete/>);
  const rows=screen.getAllByRole("listitem");
  expect(within(rows[0]).getByText("0 ≤ x < 100 USD")).toBeInTheDocument();
  expect(rows[0].querySelector(".interval-endpoint.open")).not.toBeNull();
  expect(within(rows[1]).getByText("≥ 100 USD")).toBeInTheDocument();
  expect(rows[1].querySelector(".interval-endpoint.unbounded")).not.toBeNull();
  expect(within(rows[1]).getByText("100%")).toBeInTheDocument();
});
