import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PoolPeriodExplorer } from "./PoolPeriodExplorer";
import { MonitoringResultsDetail } from "./MonitoringResultsDetail";
import { ResultEntry } from "./ResultEntry";
import { MonitoringOverview } from "./MonitoringOverview";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { monitoringReadService } from "./monitoring-results.service";

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(kpiPoolService, "list").mockResolvedValue([1, 2, 3, 4, 5, 6, 7].map(id => ({ id, code: `POOL-${id}`, name: `Operations ${id}`, companies: ["EXA"] })) as any);
  vi.spyOn(monitoringReadService, "inputSchedule").mockImplementation(async poolId => ({ data: [8, 9, 10, 11, 12].map(month => ({ periodKey: `2026-${String(month).padStart(2, "0")}`, poolInputPeriodId: `${poolId}${month}`, poolWorkflowStatus: month === 8 ? "FINALIZED" : "FUTURE", monitoringPeriod: poolId === "5" && month === 8 ? { id: "1" } : null, status: "DRAFT", entered: 10, expected: 10 })), meta: { totalPages: 1 } }));
  vi.spyOn(monitoringReadService, "resolve").mockResolvedValue({ availability: "NOT_AVAILABLE", inputPeriod: { periodKey: "2026-09" }, reason: "Waiting for Pool composition...", monitoringPeriod: null });
  vi.spyOn(monitoringReadService, "overview").mockResolvedValue({ items: [], meta: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 }, facets: { companies: [], statuses: [], frequencies: [] } });
});
function open(component: React.ReactNode) { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter>{component}</MemoryRouter></QueryClientProvider>); }
describe("Pool calendar discovery", () => {
  it.each(["entry", "detail", "overview"])("shows every Pool and period on the %s route even with only one initialized period", async page => {
    open(page === "entry" ? <ResultEntry/> : page === "detail" ? <MonitoringResultsDetail/> : <MonitoringOverview/>);
    await screen.findByText("7 of 7 Pools");
    await waitFor(() => expect(screen.getAllByRole("button", { name: /2026-12/ })).toHaveLength(7));
    expect(screen.getAllByRole("button", { name: /2026-08/ })).toHaveLength(7);
    expect(screen.getAllByText("Not initialized")).toHaveLength(34);
  });
  it("opens the exact initialized Monitoring identity", async () => {
    open(<Routes><Route path="/" element={<PoolPeriodExplorer/>}/><Route path="/app/monitoring-results/result-entry" element={<p>Opened result wizard</p>}/></Routes>);
    const card = (await screen.findByText("Operations 5")).closest("article")!;
    fireEvent.click(await within(card).findByRole("button", { name: /2026-08/ }));
    expect(await screen.findByText("Opened result wizard")).toBeVisible();
  });
  it("explains unavailable periods instead of hiding them", async () => {
    open(<PoolPeriodExplorer/>);
    const card = (await screen.findByText("Operations 5")).closest("article")!;
    fireEvent.click(await within(card).findByRole("button", { name: /2026-09/ }));
    expect(await within(card).findByText("Waiting for Pool composition...")).toBeVisible();
    expect(monitoringReadService.resolve).toHaveBeenCalledWith("5", "59");
    expect(screen.queryByRole("button", { name: "Initialize Monitoring Period" })).not.toBeInTheDocument();
  });
});
