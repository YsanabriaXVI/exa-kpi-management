import { act, fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DefinitionAssist } from "./DefinitionAssist";
import { KpiDefinitionModal } from "./KpiDefinitionModal";
import { kpiDefinitionService } from "./kpi-definition.service";
import type { AnalyzerResponse } from "./kpi-definition.types";
import { mergeDefinitionSuggestions, visibleDefinitionSuggestions } from "./visible-definition-suggestions";

const proposal = <T,>(value: T | null) => ({ value, confidence: value ? "HIGH" as const : "LOW" as const, evidence: [] });
const analysis = (overrides: Partial<AnalyzerResponse> = {}): AnalyzerResponse => ({
  ruleVersion: "DEFINITION_ASSIST_V1", analysisStatus: "GOOD", configurationReadiness: "READY", missingConfigurationConcepts: [],
  originalName: "Vender 10 contenedores por mes", normalizedName: "vender 10 contenedores por mes",
  family: proposal("SALES"), behavior: proposal("GREATER_IS_BETTER"), resultSemantics: proposal("COUNT"), calculationPattern: proposal("DIRECT"),
  comparison: { detected: false, intent: "NONE", mode: "NONE", direction: null }, resultUnitHint: "CONTAINERS", cadenceHint: "MONTHLY",
  targetHint: { value: 10, unit: "CONTAINERS", kind: "ABSOLUTE_TARGET", confidence: "HIGH", evidence: [] },
  missingConcepts: [], ambiguities: [], suggestedQuestions: [], ...overrides,
});
const suggestionResponse = { query: "costo", normalizedQuery: "costo", suggestions: [
  { id: "1", code: "KPI-023", name: "Costo por km", normalizedName: "costo por km", similarityScore: 99, matchType: "EXACT_OR_NEAR_DUPLICATE" as const },
  { id: "2", code: "KPI-071", name: "Costo mensual", normalizedName: "costo mensual", similarityScore: 65, matchType: "STRONG_SIMILARITY" as const },
] };

function renderAssist(name = "", onNameChange = vi.fn(), onViewExisting = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}><DefinitionAssist name={name} isEdit={false} onNameChange={onNameChange} onViewExisting={onViewExisting}/></QueryClientProvider>);
}
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

describe("Definition Assist", () => {
  it("uses visible table rows as a typo-tolerant fallback without duplicating backend results", () => {
    const visible = visibleDefinitionSuggestions("Cumplimento de metas de proyectos", [{ id: "recent", kpiCode: "KPI-999", kpiName: "Cumplimiento de metas de proyecto", description: "Track project goals", status: "ACTIVE", isActive: true, category: { id: "cat-1", code: "PROJECT", name: "Projects" }, createdAt: "2026-01-01", updatedAt: null, createdByUserId: null, updatedByUserId: null }]);
    expect(visible[0]).toMatchObject({ id: "recent", matchType: "RELATED" });
    expect(mergeDefinitionSuggestions([{ ...visible[0], matchType: "STRONG_SIMILARITY" }], visible)).toHaveLength(1);
  });
  it("respects the minimum name length", async () => {
    vi.useFakeTimers();
    const suggest = vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue(suggestionResponse);
    const analyze = vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis());
    renderAssist("a"); await act(() => vi.advanceTimersByTimeAsync(500));
    expect(suggest).not.toHaveBeenCalled(); expect(analyze).not.toHaveBeenCalled();
  });

  it("debounces requests", async () => {
    vi.useFakeTimers();
    const suggest = vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue(suggestionResponse);
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis());
    renderAssist("costo"); await act(() => vi.advanceTimersByTimeAsync(449)); expect(suggest).not.toHaveBeenCalled();
    await act(() => vi.advanceTimersByTimeAsync(1)); expect(suggest).toHaveBeenCalledTimes(1);
  });

  it("does not render a stale response after the name changes", async () => {
    vi.useFakeTimers();
    let resolveFirst!: (value: typeof suggestionResponse) => void;
    let resolveSecond!: (value: typeof suggestionResponse) => void;
    vi.spyOn(kpiDefinitionService, "suggestions")
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis());
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const view = render(<QueryClientProvider client={client}><DefinitionAssist name="ventas" isEdit={false} onNameChange={vi.fn()} onViewExisting={vi.fn()}/></QueryClientProvider>);
    await act(() => vi.advanceTimersByTimeAsync(450));
    view.rerender(<QueryClientProvider client={client}><DefinitionAssist name="ventas contenedores" isEdit={false} onNameChange={vi.fn()} onViewExisting={vi.fn()}/></QueryClientProvider>);
    await act(() => vi.advanceTimersByTimeAsync(450));
    expect(kpiDefinitionService.suggestions).toHaveBeenCalledTimes(2);
    await act(async () => { resolveSecond({ ...suggestionResponse, query: "ventas contenedores", suggestions: [{ ...suggestionResponse.suggestions[0], id: "new", name: "Ventas de contenedores" }] }); await Promise.resolve(); await vi.runOnlyPendingTimersAsync(); });
    fireEvent.focus(screen.getByRole("combobox")); expect(screen.getByText("Ventas de contenedores")).toBeInTheDocument();
    await act(async () => resolveFirst({ ...suggestionResponse, query: "ventas", suggestions: [{ ...suggestionResponse.suggestions[0], id: "old", name: "Ventas antiguas" }] }));
    expect(screen.queryByText("Ventas antiguas")).not.toBeInTheDocument(); expect(screen.getByText("Ventas de contenedores")).toBeInTheDocument();
  });

  it("prioritizes suggestions, supports keyboard View and preserves the user's name", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue(suggestionResponse);
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis());
    const onChange = vi.fn(); const onView = vi.fn(); renderAssist("costo", onChange, onView);
    const input = screen.getByRole("combobox"); fireEvent.focus(input);
    await screen.findByText("KPI-023"); expect(screen.getByText("Strong similarity")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Possible existing KPIs" })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "ArrowDown" }); fireEvent.keyDown(input, { key: "ArrowUp" }); fireEvent.keyDown(input, { key: "Enter" });
    expect(input).toHaveValue("costo"); expect(onChange).not.toHaveBeenCalled(); expect(onView).toHaveBeenCalledWith("1");
    fireEvent.focus(input); fireEvent.keyDown(input, { key: "Escape" }); expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("does not present configuration readiness gaps as Definition errors", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue({ ...suggestionResponse, suggestions: [] });
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis({ configurationReadiness: "INCOMPLETE", missingConfigurationConcepts: ["GOAL", "CADENCE"] }));
    renderAssist("Aumentar ventas");
    expect(await screen.findByText("Definition is understandable.")).toBeInTheDocument();
    expect(screen.getByText("Suggested category")).toBeInTheDocument(); expect(screen.getByText("Measurement details will be configured later.")).toBeInTheDocument();
    expect(screen.queryByText(/Goal/)).not.toBeInTheDocument(); expect(screen.queryByText(/Cadence/)).not.toBeInTheDocument();
  });

  it("does not infer result unit or behavior from a percentage target", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue({ ...suggestionResponse, suggestions: [] });
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis({ analysisStatus: "NEEDS_CONFIRMATION", behavior: proposal(null), resultSemantics: proposal(null), resultUnitHint: null, targetHint: { value: 10, unit: "PERCENT", kind: "CHANGE_TARGET", confidence: "MEDIUM", evidence: [] }, comparison: { detected: false, intent: "POSSIBLE", mode: null, direction: "REDUCTION" } }));
    renderAssist("Reducir gasto administrativo 10%");
    expect(await screen.findByText("This KPI may need clarification when configured.")).toBeInTheDocument();
    expect(screen.queryByText("10 %")).not.toBeInTheDocument(); expect(screen.queryByText("Possible comparison detected")).not.toBeInTheDocument();
    expect(screen.queryByText("Suggested result unit")).not.toBeInTheDocument(); expect(screen.queryByText("Lower is better")).not.toBeInTheDocument();
  });

  it("renders ambiguity meanings but hides detailed measurement configuration", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue({ ...suggestionResponse, suggestions: [] });
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis({ analysisStatus: "NEEDS_CONFIRMATION", targetHint: { minValue: 2, maxValue: 8, unit: "CELSIUS", kind: "RANGE_TARGET", confidence: "HIGH", evidence: [] }, comparison: { detected: true, intent: "EXPLICIT", mode: "SAME_PERIOD_PREVIOUS_YEAR", direction: "INCREASE" }, ambiguities: [{ code: "RESULT_REPORTING_MEANING", explanation: "Reporting meaning is ambiguous.", evidence: [], pendingDecision: "Choose", possibleInterpretations: [{ code: "CURRENT", description: "Current indicator value" }, { code: "CHANGE", description: "Reduction achieved %" }] }], suggestedQuestions: [{ code: "HOW_RESULT_IS_REPORTED", prompt: "How will this KPI result be reported?" }] }));
    renderAssist("Mantener temperatura entre 2 y 8 °C");
    expect(await screen.findByText("Current indicator value")).toBeInTheDocument(); expect(screen.getByText("Reduction achieved %")).toBeInTheDocument();
    expect(screen.getByText("This will be resolved in KPI Configuration.")).toBeInTheDocument();
    expect(screen.queryByText("2–8 °C")).not.toBeInTheDocument(); expect(screen.queryByText(/Same period previous year/)).not.toBeInTheDocument();
    expect(screen.queryByText("How will this KPI result be reported?")).not.toBeInTheDocument();
  });

  it("shows NEEDS_DETAIL and a non-blocking autosuggest failure", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockRejectedValue(new Error("offline"));
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis({ analysisStatus: "NEEDS_DETAIL", family: proposal("UNKNOWN") }));
    renderAssist("Mejorar rendimiento");
    expect(await screen.findByText("This definition may benefit from a more specific concept.")).toBeInTheDocument(); expect(await screen.findByText(/Similar KPI search is unavailable/)).toBeInTheDocument();
  });

  it("keeps analyzer failure non-blocking and persists only the existing form contract", async () => {
    vi.spyOn(kpiDefinitionService, "suggestions").mockResolvedValue({ ...suggestionResponse, suggestions: [] });
    vi.spyOn(kpiDefinitionService, "analyze").mockRejectedValue(new Error("offline"));
    const onSubmit = vi.fn(); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KpiDefinitionModal categories={[{ id: "cat-1", code: "SALES", name: "Sales", description: null }]} isSaving={false} onClose={vi.fn()} onViewExisting={vi.fn()} onSubmit={onSubmit}/></QueryClientProvider>);
    fireEvent.change(screen.getByLabelText("KPI Name"), { target: { value: "Aumentar ventas 10%" } });
    fireEvent.change(screen.getByLabelText("KPI Description"), { target: { value: "Measure sales growth clearly" } });
    fireEvent.change(screen.getByLabelText("Category"), { target: { value: "cat-1" } });
    expect(await screen.findByText(/Definition Assist temporarily unavailable/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create KPI Definition" }));
    expect(onSubmit).toHaveBeenCalledWith({ kpiName: "Aumentar ventas 10%", description: "Measure sales growth clearly", kpiCategoryId: "cat-1" }, true);
  });

  it("keeps EDIT advisory and preserves Cancel behavior", async () => {
    vi.spyOn(kpiDefinitionService, "analyze").mockResolvedValue(analysis());
    const onClose = vi.fn(); const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><KpiDefinitionModal definition={{ id: "kpi-1", kpiCode: "KPI-001", kpiName: "Ventas", description: "Existing sales objective", status: "ACTIVE", isActive: true, category: { id: "cat-1", code: "SALES", name: "Sales" }, createdAt: "2026-01-01", updatedAt: null, createdByUserId: null, updatedByUserId: null }} categories={[{ id: "cat-1", code: "SALES", name: "Sales", description: null }]} isSaving={false} onClose={onClose} onViewExisting={vi.fn()} onSubmit={vi.fn()}/></QueryClientProvider>);
    const input = screen.getByLabelText("KPI Name"); fireEvent.change(input, { target: { value: "Ventas editadas libremente" } });
    expect(input).toHaveValue("Ventas editadas libremente"); expect(input).not.toHaveAttribute("aria-autocomplete");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(onClose).toHaveBeenCalledTimes(1);
  });
});
