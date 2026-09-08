import { render, screen, within } from "@testing-library/react";
import { expect, it } from "vitest";
import { ResultBandsPreview } from "./ResultBandsPreview";

it("uses configured Traffic Light thresholds and updates without changing band compliance", () => {
  const bands=[{minResult:0,maxResult:0,compliance:100},{minResult:1,maxResult:1,compliance:70},{minResult:2,maxResult:2,compliance:50},{minResult:3,compliance:0}];
  const ranges={redFrom:0,redTo:59,yellowFrom:60,yellowTo:79,greenFrom:80,greenTo:100};
  const {rerender}=render(<ResultBandsPreview bands={bands} ranges={ranges} complete/>);
  expect(screen.getByText("3+")).toBeInTheDocument();
  const row=screen.getByText("70%").closest("li")!;
  expect(within(row).getByText("Amarillo")).toBeInTheDocument();
  rerender(<ResultBandsPreview bands={bands} ranges={{...ranges,yellowTo:69,greenFrom:70}} complete/>);
  expect(within(row).getByText("Verde")).toBeInTheDocument();
  expect(within(row).getByText("70%")).toBeInTheDocument();
});
