import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PeriodWorkflow } from "./PeriodWorkflow";
import type { ManualEntryResponse } from "./manual-result-entry.service";
function fixture(status: string, current = true) {
  return { monitoringPeriod: { status, poolName: "Sales", periodLabel: "September 2026" }, check: { findings: [], status: current ? "CURRENT" : "STALE", summary: { readyForSubmit: true } }, summary: { pending: 0 }, inputs: [], scorecards: [] } as unknown as ManualEntryResponse;
}
describe("Period workflow", () => {
  it.each(["DRAFT", "SUBMITTED", "VALIDATED"])("requires a justified exception in %s", async status => {
    const data = fixture(status);
    data.summary.pending = 1;
    data.check!.summary!.readyForSubmit = false;
    data.check!.summary!.readyForSubmitWithExceptions = true;
    const onAction = vi.fn().mockResolvedValue(undefined);
    const label = status === "DRAFT" ? "Submit with Exceptions" : status === "SUBMITTED" ? "Approve with Exceptions" : "Close with Exceptions";
    render(<PeriodWorkflow data={data} disabled={false} onAction={onAction}/>);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByRole("button", { name: `Confirm ${label}` })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Workflow reason"), { target: { value: "Source did not deliver the Result" } });
    fireEvent.click(screen.getByRole("button", { name: `Confirm ${label}` }));
    await waitFor(() => expect(onAction).toHaveBeenCalledWith(status === "DRAFT" ? "submit" : status === "SUBMITTED" ? "approve" : "close", { withExceptions: true, justification: "Source did not deliver the Result" }));
  });
  it("blocks exceptions when Check includes non-waivable errors", () => {
    const data = fixture("DRAFT");
    data.summary.pending = 1;
    data.check!.summary!.readyForSubmit = false;
    data.check!.summary!.readyForSubmitWithExceptions = false;
    render(<PeriodWorkflow data={data} disabled={false} onAction={vi.fn()}/>);
    expect(screen.getByRole("button", { name: "Submit Results" })).toBeDisabled();
  });
  it("blocks submission for stale Check or unsaved changes", () => {
    const props = { onAction: vi.fn(), disabled: false };
    const view = render(<PeriodWorkflow {...props} data={fixture("DRAFT", false)}/>);
    expect(screen.getByRole("button", { name: "Submit Results" })).toBeDisabled();
    view.rerender(<PeriodWorkflow {...props} disabled data={fixture("DRAFT")}/>);
    expect(screen.getByRole("button", { name: "Submit Results" })).toBeDisabled();
  });
  it("confirms submission before sending the transition", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<PeriodWorkflow data={fixture("DRAFT")} disabled={false} onAction={onAction}/>);
    fireEvent.click(screen.getByRole("button", { name: "Submit Results" }));
    expect(onAction).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm Submit Results" }));
    await waitFor(() => expect(onAction).toHaveBeenCalledWith("submit", {}));
  });
  it("requires a reason when returning for correction", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    render(<PeriodWorkflow data={fixture("SUBMITTED")} disabled={false} onAction={onAction}/>);
    fireEvent.click(screen.getByRole("button", { name: "Return for Correction" }));
    expect(screen.getByRole("button", { name: "Confirm Return for Correction" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Workflow reason"), { target: { value: "Review the September figures" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm Return for Correction" }));
    await waitFor(() => expect(onAction).toHaveBeenCalledWith("return-for-correction", { reason: "Review the September figures" }));
  });
  it("offers no mutations for a closed period", () => {
    render(<PeriodWorkflow data={fixture("CLOSED")} disabled={false} onAction={vi.fn()}/>);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
