import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SetKpiConfigPage } from "./SetKpiConfigPage";
import { kpiDefinitionService } from "../kpi-definition/kpi-definition.service";
import { kpiConfigService } from "./kpi-config.service";
import { catalogManagementService } from "./catalog-management.service";

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  localStorage.setItem("exa:kpi-config-selected-draft", "1");
  vi.spyOn(kpiDefinitionService, "get").mockResolvedValue({ id: "1", kpiCode: "KPI-001", kpiName: "Trips", description: "Trips", status: "ACTIVE", isActive: true } as any);
  vi.spyOn(kpiDefinitionService, "searchActiveOptions").mockResolvedValue([]);
  vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue({ family: { value: "UNKNOWN" }, resultUnitHint: "KM", cadenceHint: "MONTHLY", targetHint: { kind: "ABSOLUTE_TARGET", value: 100 } } as any);
  vi.spyOn(catalogManagementService, "subjectTypes").mockResolvedValue([]);
  vi.spyOn(kpiConfigService, "lookups").mockResolvedValue({ measurementUnits: [{ id: "1", code: "KM", symbol: "km", name: "Kilometers" }], inputFrequencies: [{ code: "MONTHLY", name: "Monthly" }], dataSources: [{ id: "1", name: "Manual" }], subjectCatalogs: [] } as any);
});

describe("Clearing a KPI Definition", () => {
  it.each(["clear button", "unmatched text"])("clears dependent fields through %s and does not restore analyzed defaults", async (method) => {
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><MemoryRouter><SetKpiConfigPage /></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByLabelText("Goal")).toHaveValue(100));
    fireEvent.change(screen.getByLabelText("Data Source"), { target: { value: "Manual" } });
    expect(screen.getByLabelText("Result Measurement Unit")).toHaveValue("km");
    if (method === "clear button") fireEvent.click(screen.getByRole("button", { name: "Clear KPI Definition" }));
    else fireEvent.change(screen.getByRole("textbox", { name: "KPI Definition" }), { target: { value: "Unknown KPI" } });
    await waitFor(() => {
      expect(screen.getByLabelText("Goal")).toHaveValue(null);
      expect(screen.getByLabelText("Goal Measurement Unit")).toHaveValue("");
      expect(screen.getByLabelText("Result Measurement Unit")).toHaveValue("");
      expect(screen.getByLabelText("Input Frequency")).toHaveValue("");
      expect(screen.getByLabelText("Data Source")).toHaveValue("");
    });
    expect(screen.getByRole("textbox", { name: "KPI Definition" })).toHaveValue(method === "clear button" ? "" : "Unknown KPI");
    expect(localStorage.getItem("exa:kpi-config-selected-draft")).toBeNull();
  });
});
