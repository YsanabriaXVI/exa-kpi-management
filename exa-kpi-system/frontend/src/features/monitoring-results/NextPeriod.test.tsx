import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextPeriod } from "./NextPeriod";
import { initializeMonitoringPeriod, monitoringRequest } from "./monitoring-results.service";
vi.mock("./monitoring-results.service", () => ({ initializeMonitoringPeriod: vi.fn(), monitoringRequest: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
function open() { render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><NextPeriod periodId="1"/></MemoryRouter></QueryClientProvider>); }
describe("Next Period", () => {
  it("opens an existing period without initializing again", async () => {
    vi.mocked(monitoringRequest).mockResolvedValue({ availability: "AVAILABLE", monitoringPeriod: { id: "8" }, inputPeriod: { periodKey: "2026-10" } });
    open();
    expect(await screen.findByRole("link", { name: "Open Next Period" })).toHaveAttribute("href", "/app/monitoring-results/result-entry?monitoringPeriodId=8");
    expect(initializeMonitoringPeriod).not.toHaveBeenCalled();
  });
  it("initializes only the ready successor after an explicit click", async () => {
    vi.mocked(monitoringRequest).mockResolvedValue({ availability: "READY_TO_MATERIALIZE", poolId: "9", inputPeriod: { poolPeriodId: "2", periodKey: "2026-10" }, monitoringPeriod: null });
    vi.mocked(initializeMonitoringPeriod).mockResolvedValue({ id: "8" });
    open();
    const button = await screen.findByRole("button", { name: "Initialize Next Period" });
    expect(initializeMonitoringPeriod).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(initializeMonitoringPeriod).toHaveBeenCalledWith("9", "2"));
  });
  it("shows the end of the calendar without creating another period", async () => {
    vi.mocked(monitoringRequest).mockResolvedValue({ availability: "END_OF_SCHEDULE", reason: "No more Input Periods", inputPeriod: null, monitoringPeriod: null });
    open();
    expect(await screen.findByText("No more Input Periods")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Initialize Next Period" })).not.toBeInTheDocument();
  });
});
