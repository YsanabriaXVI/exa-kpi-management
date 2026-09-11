import { periodDisplay } from "./period-display";
import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ManualResultEntry } from "./ManualResultEntry";
import { PoolPeriodExplorer } from "./PoolPeriodExplorer";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  CircleHelp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  Keyboard,
  LockKeyhole,
  LoaderCircle,
  Maximize2,
  Search,
  Settings2,
  ShieldCheck,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { PaginationControls } from "../../components/PaginationControls";
import { ActionToast } from "../../components/ActionToast";
import { saveMonitoringPeriodClosure } from "./monitoring-period-state";
import { initializeMonitoringPeriod, monitoringReadService, monitoringResultsService } from "./monitoring-results.service";
import type { ResultEntryInput } from "./monitoring-results.service";
import type { ExcelImportPreview } from "./monitoring-results.service";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { scorecardService } from "../scorecards/scorecard.service";
import "./monitoring-results.css";
import "./result-entry-resolver.css";
import "./result-entry-resolver-fixes.css";

type InputMethod = "manual" | "excel";
type EntryWorkflowStatus = "Draft" | "Submitted" | "Validated" | "Closed";
type PermissionCode =
  | "MONITORING_ENTER_RESULTS"
  | "MONITORING_VALIDATE_RESULTS"
  | "MONITORING_CLOSE_PERIOD"
  | "MONITORING_CLOSE_WITH_EXCEPTIONS";
type DraftSnapshot = {
  results: Record<string, string>;
  comments: Record<string, string>;
};
type ManualSortKey = "code" | "name" | "goal" | "unit" | "dataSource" | "result" | "comment" | "status";
type ManualResultStatus = "Entered" | "Invalid" | "Pending";
type FilterOption = { value: string; label: string };
type ManualColumnKey = ManualSortKey;
type ValidationSortKey = "row" | "code" | "category" | "error" | "currentValue" | "expected";
type PreviewColumnKey = "code" | "name" | "goal" | "unit" | "dataSource" | "result" | "comment" | "compliance" | "score" | "trafficLight" | "status";
type ScorecardPreviewColumnKey = "scorecard" | "departments" | "expected" | "entered" | "missing" | "previewScore" | "status";
type ClosurePreview = "COMPLETION" | "TRAFFIC_LIGHT" | "VALIDATION" | "ALL";
type MissingResultSortKey = "code" | "name" | "unit" | "goal" | "dataSource" | "result" | "validation" | "trafficLight";
type ScorecardKpiSortKey = "code" | "name" | "unit" | "goal" | "result" | "score" | "weight" | "weightedValue" | "entryStatus" | "trafficLight";

const manualColumns: Array<{ key: ManualColumnKey; label: string }> = [
  { key: "code", label: "KPI Code" },
  { key: "name", label: "KPI Name" },
  { key: "goal", label: "Goal" },
  { key: "unit", label: "Measurement Unit" },
  { key: "dataSource", label: "Data Source" },
  { key: "result", label: "Result" },
  { key: "comment", label: "Comment" },
  { key: "status", label: "Result Status" },
];

const previewColumns: Array<{ key: PreviewColumnKey; label: string }> = [
  { key: "code", label: "KPI Code" },
  { key: "name", label: "KPI Name" },
  { key: "goal", label: "Goal" },
  { key: "unit", label: "Measurement Unit" },
  { key: "dataSource", label: "Data Source" },
  { key: "result", label: "Result" },
  { key: "compliance", label: "Compliance" },
  { key: "score", label: "Score" },
  { key: "comment", label: "Comment" },
  { key: "trafficLight", label: "Traffic Light" },
  { key: "status", label: "Result Status" },
];

const scorecardPreviewColumns: Array<{ key: ScorecardPreviewColumnKey; label: string }> = [
  { key: "scorecard", label: "ScoreCard" },
  { key: "departments", label: "Departments" },
  { key: "expected", label: "KPIs Expected" },
  { key: "entered", label: "KPIs Entered" },
  { key: "missing", label: "Missing" },
  { key: "previewScore", label: "Preview Score" },
  { key: "status", label: "Status" },
];

function ManualMultiSelect({ label, options, selected, onChange }: { label: string; options: FilterOption[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [open]);
  return <div className={`manual-filter-multiselect manual-chip-filter ${open ? "open" : ""}`} ref={rootRef}>
    <button type="button" className="manual-filter-trigger" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      {selectedOptions.length ? <span className={`manual-filter-chips ${selectedOptions.length > 2 ? "has-more" : ""}`}>{selectedOptions.slice(0, 2).map((option) => <span className="manual-filter-chip" key={option.value}><span>{option.label}</span><span role="button" tabIndex={0} aria-label={`Remove ${option.label}`} onClick={(event) => { event.stopPropagation(); toggle(option.value); }}><X size={13}/></span></span>)}{selectedOptions.length > 2 && <span className="manual-filter-chip more"><span>+{selectedOptions.length - 2} more</span><span role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => { event.stopPropagation(); onChange(selectedOptions.slice(0, 2).map((option) => option.value)); }}><X size={13}/></span></span>}</span> : <span className="manual-filter-placeholder">{label}</span>}
    </button>
    {open && <div className="manual-filter-options">
      <button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}><i>{!selected.length && <Check size={12}/>}</i>All</button>
      {options.map((option) => <button type="button" className={selected.includes(option.value) ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><i>{selected.includes(option.value) && <Check size={12}/>}</i>{option.label}</button>)}
    </div>}
  </div>;
}

function ManualColumnSelect({ selected, onChange }: { selected: ManualColumnKey[]; onChange: (values: ManualColumnKey[]) => void }) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const allSelected = selected.length === manualColumns.length;
  const toggle = (key: ManualColumnKey) => {
    if (selected.includes(key)) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== key));
    } else onChange([...selected, key]);
  };
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && rootRef.current) rootRef.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && rootRef.current) rootRef.current.open = false;
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);
  return <details className="manual-filter-multiselect manual-column-select" ref={rootRef}>
    <summary><Settings2 size={15}/> Columns · {selected.length}</summary>
    <div>
      <button type="button" className={allSelected ? "selected" : ""} onClick={() => onChange(manualColumns.map((column) => column.key))}><i>{allSelected && <Check size={12}/>}</i>All Columns</button>
      {manualColumns.map((column) => <button type="button" className={selected.includes(column.key) ? "selected" : ""} key={column.key} onClick={() => toggle(column.key)}><i>{selected.includes(column.key) && <Check size={12}/>}</i>{column.label}</button>)}
    </div>
  </details>;
}

function PreviewColumnSelect({ selected, onChange, onLimit }: { selected: PreviewColumnKey[]; onChange: (values: PreviewColumnKey[]) => void; onLimit: () => void }) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const allSelected = selected.length === previewColumns.length;
  const toggle = (key: PreviewColumnKey) => {
    if (selected.includes(key)) {
      if (selected.length === 1) return;
      onChange(selected.filter((item) => item !== key));
    } else if (selected.length >= 9) onLimit();
    else onChange([...selected, key]);
  };
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && rootRef.current) rootRef.current.open = false;
    };
    const closeEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && rootRef.current) rootRef.current.open = false;
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);
  return <details className="manual-filter-multiselect manual-column-select" ref={rootRef}>
    <summary><Settings2 size={15}/> Columns · {selected.length}</summary>
    <div>
      <button type="button" className={allSelected ? "selected" : ""} onClick={() => { if (previewColumns.length > 9) onLimit(); else onChange(previewColumns.map((column) => column.key)); }}><i>{allSelected && <Check size={12}/>}</i>All Columns</button>
      {previewColumns.map((column) => <button type="button" className={selected.includes(column.key) ? "selected" : ""} key={column.key} onClick={() => toggle(column.key)}><i>{selected.includes(column.key) && <Check size={12}/>}</i>{column.label}</button>)}
    </div>
  </details>;
}

function ScorecardPreviewColumnSelect({ selected, onChange }: { selected: ScorecardPreviewColumnKey[]; onChange: (values: ScorecardPreviewColumnKey[]) => void }) {
  const rootRef = useRef<HTMLDetailsElement>(null);
  const toggle = (key: ScorecardPreviewColumnKey) => selected.includes(key)
    ? selected.length > 1 && onChange(selected.filter((item) => item !== key))
    : onChange([...selected, key]);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node) && rootRef.current) rootRef.current.open = false; };
    const closeEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && rootRef.current) rootRef.current.open = false; };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeEscape); };
  }, []);
  return <details className="manual-filter-multiselect manual-column-select" ref={rootRef}>
    <summary><Settings2 size={15}/> Columns · {selected.length}</summary>
    <div>
      <button type="button" className={selected.length === scorecardPreviewColumns.length ? "selected" : ""} onClick={() => onChange(scorecardPreviewColumns.map((column) => column.key))}><i>{selected.length === scorecardPreviewColumns.length && <Check size={12}/>}</i>All Columns</button>
      {scorecardPreviewColumns.map((column) => <button type="button" className={selected.includes(column.key) ? "selected" : ""} key={column.key} onClick={() => toggle(column.key)}><i>{selected.includes(column.key) && <Check size={12}/>}</i>{column.label}</button>)}
    </div>
  </details>;
}

function CompactCommentTextarea({ value, disabled, onChange, onExpand }: { value: string; disabled: boolean; onChange: (value: string) => void; onExpand: () => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [focused, setFocused] = useState(false);
  const compactValue = !focused && value.length > 80 ? `${value.slice(0, 80)}…` : value;
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 68)}px`;
  }, [compactValue]);
  return <div className="manual-comment-editor">
    <textarea ref={textareaRef} rows={1} disabled={disabled} value={compactValue} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }} placeholder="Add optional comment..." />
    <button type="button" disabled={disabled} onClick={onExpand} aria-label="Expand comment editor" title="Expand comment"><Maximize2 size={15}/></button>
  </div>;
}

const steps = [
  "Result Entry",
  "Check Results",
  "Review & Submit",
  "Approval",
  "Close Period",
] as const;
const stepNumbers = [1, 2, 3, 4, 5] as const;
const mockPermissions = new Set<PermissionCode>([
  "MONITORING_ENTER_RESULTS",
  "MONITORING_VALIDATE_RESULTS",
  "MONITORING_CLOSE_PERIOD",
  "MONITORING_CLOSE_WITH_EXCEPTIONS",
]);

function initialDraft(items: Array<{code:string;result:string}> = []): DraftSnapshot {
  return {
    results: Object.fromEntries(
      items.map((kpi) => [kpi.code, kpi.result === "—" ? "" : kpi.result]),
    ),
    comments: {},
  };
}

function isInvalidResult(value: string) {
  return Boolean(value.trim()) && !/^[0-9+\-/%.,\s]+$/.test(value);
}

function measurementUnitLabel(unit: string) {
  const labels: Record<string, string> = {
    "%": "% · Percentage",
    kms: "km · Kilometers",
    count: "# · Count",
    hours: "h · Hours",
  };
  return labels[unit] ?? `${unit} · ${unit}`;
}

function measurementUnitShort(unit: string) {
  if (unit === "kms") return "km";
  if (unit === "count") return "count";
  return unit;
}

function goalWithUnit(goal: string, unit: string) {
  if (!goal || /[a-z%#]/i.test(goal)) return goal;
  return `${Number(goal).toLocaleString("en-US")} ${measurementUnitShort(unit)}`.trim();
}

function normalizeResolverPoolSearch(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[.\u2014\u2013\u00b7_/-]+/g, " ").replace(/\s+/g, " ").trim();
}

export function ResultEntry() {
  const [params] = useSearchParams();
  const periodId = params.get("monitoringPeriodId");
  return periodId ? <ManualResultEntry key={periodId} periodId={periodId}/> : <main className="monitor-page result-entry-page"><header className="monitor-header"><div><h1>Result Entry</h1><p>Select a Pool and Input Period to start or continue the Results workflow.</p></div></header><PoolPeriodExplorer/></main>;
}

function ResultEntryResolver() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedMonitoringPeriodId, setSelectedMonitoringPeriodId] = useState(searchParams.get("monitoringPeriodId") ?? "");
  useEffect(() => {
    if (selectedMonitoringPeriodId) navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${selectedMonitoringPeriodId}`, { replace: true });
  }, [selectedMonitoringPeriodId, navigate]);
  const [selectedPoolId, setSelectedPoolId] = useState(searchParams.get("poolId") ?? "");
  const [selectedPoolPeriodId, setSelectedPoolPeriodId] = useState(searchParams.get("poolInputPeriodId") ?? "");
  const [poolSearch, setPoolSearch] = useState("");
  const [poolSuggestionsOpen, setPoolSuggestionsOpen] = useState(false);
  const [resolverToast, setResolverToast] = useState("");
  const [initializingPeriod,setInitializingPeriod]=useState(false);
  const resolverPoolRef = useRef<HTMLDivElement>(null);
  const periodsQuery = useQuery({ queryKey: ["monitoring-periods"], queryFn: monitoringResultsService.listPeriods, retry: false });
  const poolsQuery = useQuery({ queryKey: ["result-entry-pools"], queryFn: kpiPoolService.list, retry: false });
  const scorecardsQuery = useQuery({ queryKey: ["result-entry-scorecards"], queryFn: scorecardService.list, retry: false });
  const poolPeriodsQuery = useQuery({ queryKey: ["result-entry-pool-periods", selectedPoolId], queryFn: () => kpiPoolService.getInputPeriods(Number(selectedPoolId)), enabled: Boolean(selectedPoolId), retry: false });
  const resolverQuery = useQuery({ queryKey: ["monitoring-period-resolver", selectedPoolId, selectedPoolPeriodId], queryFn: () => monitoringReadService.resolve(selectedPoolId, selectedPoolPeriodId), enabled: Boolean(selectedPoolId && selectedPoolPeriodId && /^\d+$/.test(selectedPoolPeriodId)), retry: false });
  const selectedMonitoringPeriodRecord = periodsQuery.data?.items.find((item) => item.id === selectedMonitoringPeriodId) ?? null;
  const selectedMonitoringPeriod = selectedMonitoringPeriodRecord && { ...selectedMonitoringPeriodRecord, periodLabel: poolPeriodsQuery.data?.data.length ? periodDisplay({ start: selectedMonitoringPeriodRecord.periodStart, end: selectedMonitoringPeriodRecord.periodEnd }, poolPeriodsQuery.data.data).label : selectedMonitoringPeriodRecord.periodLabel };
  const selectedPoolRecord = poolsQuery.data?.find((item) => String(item.id) === selectedPoolId) ?? null;
  const poolPeriodOptions = poolPeriodsQuery.data?.data ?? [];
  const selectedPoolPeriod: any = poolPeriodOptions.find((item) => {
    const materialized = periodsQuery.data?.items.find((period) => period.poolId === selectedPoolId && period.periodStart === item.start);
    return (item.poolPeriodId ?? materialized?.poolInputPeriodId ?? item.start) === selectedPoolPeriodId;
  }) ?? null;
  const selectedPoolPeriodLabel = selectedPoolPeriod?.start
    ? periodDisplay(selectedPoolPeriod, poolPeriodOptions).label
    : "Selected Input Period";
  const selectedReadiness = resolverQuery.data?.monitoringPeriod ?? null;
  const resolvedReadiness: any = selectedReadiness ?? selectedMonitoringPeriod;
  useEffect(() => { if (selectedReadiness?.id && selectedMonitoringPeriodId !== selectedReadiness.id) setSelectedMonitoringPeriodId(selectedReadiness.id); }, [selectedReadiness?.id, selectedMonitoringPeriodId]);
  const resolvedPeriodStart = selectedPoolPeriod?.start ?? resolvedReadiness?.periodStart ?? null;
  const resolverPoolOptions = useMemo(() => {
    const options = new Map<string, { id: number; code: string; name: string; companies: string[] }>();
    for (const item of poolsQuery.data ?? []) {
      options.set(String(item.id), { id: item.id, code: item.code, name: item.name, companies: item.companies });
    }
    for (const period of periodsQuery.data?.items ?? []) {
      if (!options.has(period.poolId)) {
        options.set(period.poolId, {
          id: Number(period.poolId),
          code: period.poolCode,
          name: period.poolName,
          companies: [],
        });
      }
    }
    return [...options.values()];
  }, [periodsQuery.data, poolsQuery.data]);
  const matchingPools = useMemo(() => {
    const terms = normalizeResolverPoolSearch(poolSearch).split(" ").filter(Boolean);
    return resolverPoolOptions.filter((item) => {
      const candidate = normalizeResolverPoolSearch(`${item.code} ${item.name} ${item.companies.join(" ")}`);
      return terms.every((term) => candidate.includes(term));
    });
  }, [poolSearch, resolverPoolOptions]);
  const matchingScorecards = useMemo(() => {
    const terms = normalizeResolverPoolSearch(poolSearch).split(" ").filter(Boolean);
    return (scorecardsQuery.data ?? []).filter((item) => {
      const candidate = normalizeResolverPoolSearch(`${item.code} ${item.name} ${item.poolSource} ${item.company}`);
      return terms.every((term) => candidate.includes(term));
    });
  }, [poolSearch, scorecardsQuery.data]);
  const matchingMonitoringPeriods = useMemo(() => {
    const terms = normalizeResolverPoolSearch(poolSearch).split(" ").filter(Boolean);
    return (periodsQuery.data?.items ?? []).filter((item) => {
      const captureCandidate = item.status === "DRAFT" || item.id === selectedMonitoringPeriodId;
      const candidate = normalizeResolverPoolSearch(`${item.code} ${item.poolCode} ${item.poolName} ${item.periodLabel} ${item.periodKey} ${item.status}`);
      return captureCandidate && terms.every((term) => candidate.includes(term));
    });
  }, [periodsQuery.data, poolSearch, selectedMonitoringPeriodId]);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!resolverPoolRef.current?.contains(event.target as Node)) setPoolSuggestionsOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setPoolSuggestionsOpen(false); };
    document.addEventListener("mousedown", close); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);
  useEffect(() => {
    if (selectedMonitoringPeriodId || !periodsQuery.data?.items.length) return;
    const legacyPoolId = searchParams.get("poolId");
    const requestedPoolPeriodId = searchParams.get("poolInputPeriodId");
    const legacyPeriod = searchParams.get("period")?.toLowerCase();
    if (!legacyPoolId) return;
    const candidates = periodsQuery.data.items.filter((item) => item.poolId === legacyPoolId);
    const resolved = candidates.find((item) => requestedPoolPeriodId ? item.poolInputPeriodId === requestedPoolPeriodId : !legacyPeriod || item.periodLabel.toLowerCase() === legacyPeriod || item.periodKey === legacyPeriod) ?? (!requestedPoolPeriodId && candidates.length === 1 ? candidates[0] : null);
    if (resolved) {
      setSelectedMonitoringPeriodId(resolved.id);
      navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${resolved.id}`, { replace: true });
    }
  }, [navigate, periodsQuery.data, searchParams, selectedMonitoringPeriodId]);
  useEffect(() => {
    if (!selectedMonitoringPeriod) return;
    setSelectedPoolId(selectedMonitoringPeriod.poolId);
    setSelectedPoolPeriodId(selectedMonitoringPeriod.poolInputPeriodId);
    setPoolSearch(`${selectedMonitoringPeriod.poolCode} · ${selectedMonitoringPeriod.poolName}`);
  }, [selectedMonitoringPeriod?.id]);
  const pool = selectedMonitoringPeriod ? { id:Number(selectedMonitoringPeriod.poolId),code:selectedMonitoringPeriod.poolCode,name:selectedMonitoringPeriod.poolName,currentPeriod:selectedMonitoringPeriod.periodLabel,kpiLines:selectedMonitoringPeriod.expected,companies:[],duration:`${selectedMonitoringPeriod.periodStart} - ${selectedMonitoringPeriod.periodEnd}`,frequency:selectedMonitoringPeriod.frequency??"Not available",generatedInputs:1,closedInputs:selectedMonitoringPeriod.status==="CLOSED"?1:0,resultsEntered:selectedMonitoringPeriod.entered,missing:selectedMonitoringPeriod.pending,status:selectedMonitoringPeriod.status } : {id:0,code:"—",name:"No Monitoring Period selected",currentPeriod:"—",kpiLines:0,companies:[],duration:"—",frequency:"—",generatedInputs:0,closedInputs:0,resultsEntered:0,missing:0,status:"LOCKED"};
  const inputPeriod = selectedMonitoringPeriod?.periodLabel ?? "No Monitoring Period selected";
  const resultEntryQuery = useQuery({ queryKey: ["monitoring-result-entry", selectedMonitoringPeriodId], queryFn: () => monitoringResultsService.getResultEntry(selectedMonitoringPeriodId), enabled: Boolean(selectedMonitoringPeriodId), retry: false });
  const readinessSummary: any = resultEntryQuery.data?.summary ?? (resolvedReadiness ? { expected: resolvedReadiness.expected ?? 0, entered: resolvedReadiness.entered ?? 0, pending: resolvedReadiness.pending ?? resolvedReadiness.expected ?? 0 } : null);
  const readinessPercent = readinessSummary?.expected ? Math.round(readinessSummary.entered / readinessSummary.expected * 100) : 0;
  const activeKpiResults = useMemo(() => {
    if (!resultEntryQuery.data) return [];
    return resultEntryQuery.data.inputs.map((input: ResultEntryInput) => ({
      code: input.kpiCode, name: input.kpiName, unit: input.unit ?? "", dataSource: input.dataSource ?? "", goal: input.goal ?? "",
      result: input.resultValue ?? "—", compliance: input.scoring?.compliancePercent == null ? null : Number(input.scoring.compliancePercent), score: input.scoring?.weightedScorePoints == null ? null : Number(input.scoring.weightedScorePoints),
      entryStatus: input.entryStatus === "ENTERED" ? "Entered" as const : "Pending" as const,
      validation: input.resultValue === null ? "Missing" as const : input.scoring?.status === "NOT_CALCULABLE" ? "Warning" as const : "Valid" as const,
      trafficLight: input.scoring?.trafficLight === "GREEN" ? "Excellent" as const : input.scoring?.trafficLight === "YELLOW" ? "Warning" as const : "Caution" as const, scorecardCode:input.scorecardCode,scorecardName:input.scorecardName,
    }));
  }, [resultEntryQuery.data]);
  useEffect(() => {
    if (!resultEntryQuery.data) return;
    const inputs = resultEntryQuery.data.inputs;
    setDraft((current) => ({ ...current, results: Object.fromEntries(inputs.map((input) => [input.kpiCode, input.resultValue ?? ""])), comments: Object.fromEntries(inputs.map((input) => [input.kpiCode, input.comment ?? ""])) }));
    setSelectedKpi(inputs[0]?.kpiCode ?? "");
  }, [resultEntryQuery.dataUpdatedAt]);
  const requestedStep = Number(searchParams.get("step"));
  const initialStatus: EntryWorkflowStatus =
    selectedMonitoringPeriod?.status === "DRAFT"
      ? "Draft"
      : selectedMonitoringPeriod?.status === "SUBMITTED"
        ? "Submitted"
        : selectedMonitoringPeriod?.status === "VALIDATED"
          ? "Validated"
          : selectedMonitoringPeriod?.status === "CLOSED"
            ? "Closed"
          : "Draft";
  // The wizard always starts at the real Monitoring Period gate; legacy step query parameters cannot bypass it.
  const initialStep = 1;
  const [step, setStep] = useState(
    initialStep,
  );
  const [wizardStarted, setWizardStarted] = useState(false);
  const [method, setMethod] = useState<InputMethod>("manual");
  const [selectedKpi, setSelectedKpi] = useState(activeKpiResults[0]?.code ?? "");
  const [draft, setDraft] = useState<DraftSnapshot>(initialDraft);
  const [validationRun, setValidationRun] = useState(initialStatus !== "Draft");
  const [status, setStatus] = useState<EntryWorkflowStatus>(initialStatus);
  useEffect(() => {
    if (!selectedMonitoringPeriod) return;
    const nextStatus: EntryWorkflowStatus = selectedMonitoringPeriod.status === "CLOSED"
      ? "Closed"
      : selectedMonitoringPeriod.status === "VALIDATED"
        ? "Validated"
        : selectedMonitoringPeriod.status === "SUBMITTED"
          ? "Submitted"
          : "Draft";
    setStatus(nextStatus);
  }, [selectedMonitoringPeriod?.id, selectedMonitoringPeriod?.status]);
  useEffect(() => {
    const live=resultEntryQuery.data?.monitoringPeriod;
    if(!live)return;
    setStatus(live.status==="CLOSED"?"Closed":live.status==="VALIDATED"?"Validated":live.status==="SUBMITTED"?"Submitted":"Draft");
    setValidationRun(live.validationRun?.status === "CURRENT");
    if(live.returnReason)setReturnReason(live.returnReason);
  },[resultEntryQuery.data?.monitoringPeriod.status,resultEntryQuery.data?.monitoringPeriod.validationRun?.status]);
  const [excelPreview, setExcelPreview] = useState<ExcelImportPreview | null>(null);
  const [excelBusy, setExcelBusy] = useState(false);
  const [excelError, setExcelError] = useState("");
  const [workflowBusy, setWorkflowBusy] = useState(false);
  const [returnReason, setReturnReason] = useState("");
  const [previewTab, setPreviewTab] = useState<"kpis" | "scorecards">("kpis");
  const [closureComment, setClosureComment] = useState("");
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showCloseConfirmation, setShowCloseConfirmation] = useState(false);
  const [closeDialogPosition, setCloseDialogPosition] = useState({ x: 0, y: 0 });
  const closeDialogDrag = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const [showMissingDetails, setShowMissingDetails] = useState(false);
  const [closurePreview, setClosurePreview] = useState<ClosurePreview>("COMPLETION");
  const [missingResultSort, setMissingResultSort] = useState<{ key: MissingResultSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const [switchTarget, setSwitchTarget] = useState<InputMethod | null>(null);
  const [showImportSummary, setShowImportSummary] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  const [manualSearch, setManualSearch] = useState("");
  const [manualStatuses, setManualStatuses] = useState<string[]>([]);
  const [manualUnits, setManualUnits] = useState<string[]>([]);
  const [manualSources, setManualSources] = useState<string[]>([]);
  const [visibleManualColumns, setVisibleManualColumns] = useState<ManualColumnKey[]>(manualColumns.map((column) => column.key));
  const [expandedCommentCode, setExpandedCommentCode] = useState<string | null>(null);
  const [commentPreviewReadOnly, setCommentPreviewReadOnly] = useState(false);
  const [manualChangesPending, setManualChangesPending] = useState(false);
  const [showSaveAllConfirm, setShowSaveAllConfirm] = useState(false);
  const [editingResultCode, setEditingResultCode] = useState<string | null>(null);
  const [validationSort, setValidationSort] = useState<{ key: ValidationSortKey; direction: SortDirection }>({ key: "row", direction: "asc" });
  const [findingSeverityFilter, setFindingSeverityFilter] = useState<string>("ALL");
  const [manualPage, setManualPage] = useState(1);
  const [manualPageSize, setManualPageSize] = useState(10);
  const [manualSort, setManualSort] = useState<{ key: ManualSortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const [previewSearch, setPreviewSearch] = useState("");
  const [previewTrafficLights, setPreviewTrafficLights] = useState<string[]>([]);
  const [previewStatuses, setPreviewStatuses] = useState<string[]>([]);
  const [previewUnits, setPreviewUnits] = useState<string[]>([]);
  const [previewSources, setPreviewSources] = useState<string[]>([]);
  const [visiblePreviewColumns, setVisiblePreviewColumns] = useState<PreviewColumnKey[]>(previewColumns.map((column) => column.key).filter((key) => key !== "dataSource" && key !== "comment"));
  const [showPreviewColumnLimit, setShowPreviewColumnLimit] = useState(false);
  const [previewPage, setPreviewPage] = useState(1);
  const [previewPageSize, setPreviewPageSize] = useState(10);
  const [previewSort, setPreviewSort] = useState<{ key: PreviewColumnKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const [scorecardSearch, setScorecardSearch] = useState("");
  const [scorecardDepartments, setScorecardDepartments] = useState<string[]>([]);
  const [scorecardStatuses, setScorecardStatuses] = useState<string[]>([]);
  const [scorecardKpiStatuses, setScorecardKpiStatuses] = useState<string[]>([]);
  const [visibleScorecardColumns, setVisibleScorecardColumns] = useState<ScorecardPreviewColumnKey[]>(scorecardPreviewColumns.map((column) => column.key));
  const [scorecardPage, setScorecardPage] = useState(1);
  const [scorecardPageSize, setScorecardPageSize] = useState(10);
  const [scorecardSort, setScorecardSort] = useState<{ key: ScorecardPreviewColumnKey; direction: SortDirection }>({ key: "scorecard", direction: "asc" });
  const [expandedScorecards, setExpandedScorecards] = useState<string[]>([]);
  const [scorecardKpiSearches, setScorecardKpiSearches] = useState<Record<string, string>>({});
  const [scorecardKpiSorts, setScorecardKpiSorts] = useState<Record<string, { key: ScorecardKpiSortKey; direction: SortDirection }>>({});

  const expandedCommentKpi = expandedCommentCode
    ? activeKpiResults.find((kpi) => kpi.code === expandedCommentCode)
    : null;
  const entered = Object.values(draft.results).filter((value) =>
    value.trim(),
  ).length;
  const missingKpis = useMemo(
    () => activeKpiResults.filter((kpi) => !draft.results[kpi.code]?.trim()),
    [draft.results],
  );
  const sortedMissingKpis = useMemo(() => [...missingKpis].sort((left, right) => {
    const value = (kpi: (typeof activeKpiResults)[number]) => {
      if (missingResultSort.key === "result") return draft.results[kpi.code] ?? "";
      if (missingResultSort.key === "validation") return "Missing";
      return kpi[missingResultSort.key];
    };
    return compareSortValues(value(left), value(right), missingResultSort.direction);
  }), [draft.results, missingKpis, missingResultSort]);
  const criticalKpis = useMemo(
    () =>
      activeKpiResults.filter((kpi) =>
        isInvalidResult(draft.results[kpi.code] ?? ""),
      ),
    [draft.results],
  );
  const missing = missingKpis.length;
  const persistedValidationRun = resultEntryQuery.data?.monitoringPeriod.validationRun;
  const persistedValidation = persistedValidationRun?.summary;
  const hasBlockingErrors = persistedValidationRun?.status !== "CURRENT" || Boolean(persistedValidation?.blocking);
  const completionPercentage = activeKpiResults.length ? Math.round((entered / activeKpiResults.length) * 100) : 0;
  const trafficLightCounts = {
    green: activeKpiResults.filter((kpi) => kpi.trafficLight === "Excellent").length,
    yellow: activeKpiResults.filter((kpi) => kpi.trafficLight === "Warning").length,
    red: activeKpiResults.filter((kpi) => kpi.trafficLight === "Caution").length,
  };
  const validationWarningCount = persistedValidation?.warnings ?? 0;
  const validationValidCount = persistedValidation?.passed ?? 0;
  const validationFindings = useMemo(() => (persistedValidationRun?.findings ?? []).filter((finding) => findingSeverityFilter === "ALL" || finding.severity === findingSeverityFilter || findingSeverityFilter === "MISSING" && finding.code.includes("RESULT_MISSING")).map((finding, index) => ({
    id: finding.id, row: index + 1, code: finding.kpiCode ?? "Period", category: finding.severity,
    error: finding.message, currentValue: finding.kpiCode ? draft.results[finding.kpiCode] || "—" : "—",
    expected: finding.code, blocksSubmit: finding.blocksSubmit,
  })).sort((left, right) => compareSortValues(left[validationSort.key], right[validationSort.key], validationSort.direction)), [draft.results, findingSeverityFilter, persistedValidationRun, validationSort]);
  const readOnly = !selectedMonitoringPeriod || status !== "Draft";
  const canEnter = mockPermissions.has("MONITORING_ENTER_RESULTS");
  const canValidate = mockPermissions.has("MONITORING_VALIDATE_RESULTS");
  const canClose = mockPermissions.has("MONITORING_CLOSE_PERIOD");
  const canCloseWithExceptions = mockPermissions.has(
    "MONITORING_CLOSE_WITH_EXCEPTIONS",
  );
  const manualStatus = (code: string): ManualResultStatus => {
    const value = draft.results[code] ?? "";
    if (!value.trim()) return "Pending";
    return isInvalidResult(value) ? "Invalid" : "Entered";
  };
  const manualFilteredRows = useMemo(() => activeKpiResults.filter((kpi) => {
    const term = manualSearch.trim().toLowerCase();
    const resultStatus = manualStatus(kpi.code);
    return (!term || `${kpi.code} ${kpi.name} ${kpi.goal} ${kpi.unit} ${kpi.dataSource}`.toLowerCase().includes(term))
      && (!manualStatuses.length || manualStatuses.includes(resultStatus) || editingResultCode === kpi.code)
      && (!manualUnits.length || manualUnits.includes(kpi.unit))
      && (!manualSources.length || manualSources.includes(kpi.dataSource));
  }).sort((left, right) => {
    const value = (item: (typeof activeKpiResults)[number]) => {
      if (manualSort.key === "result") return draft.results[item.code] ?? "";
      if (manualSort.key === "comment") return draft.comments[item.code] ?? "";
      if (manualSort.key === "status") return manualStatus(item.code);
      return item[manualSort.key];
    };
    return compareSortValues(value(left), value(right), manualSort.direction);
  }), [draft.comments, draft.results, editingResultCode, manualSearch, manualSort, manualSources, manualStatuses, manualUnits]);
  const manualTotalPages = Math.max(1, Math.ceil(manualFilteredRows.length / manualPageSize));
  const manualPageStart = (manualPage - 1) * manualPageSize;
  const manualRows = manualFilteredRows.slice(manualPageStart, manualPageStart + manualPageSize);
  const manualStatusCounts = {
    entered: activeKpiResults.filter((kpi) => manualStatus(kpi.code) === "Entered").length,
    incorrect: activeKpiResults.filter((kpi) => manualStatus(kpi.code) === "Invalid").length,
    pending: activeKpiResults.filter((kpi) => manualStatus(kpi.code) === "Pending").length,
  };
  const unsavedChangeCount = resultEntryQuery.data?.inputs.filter((input) => {
    const raw = (draft.results[input.kpiCode] ?? "").trim();
    const nextResult = raw === "" ? null : raw;
    const sameResult = nextResult === null
      ? input.resultValue === null
      : input.resultValue !== null && Number(nextResult) === Number(input.resultValue);
    const nextComment = (draft.comments[input.kpiCode] ?? "").trim() || null;
    return !sameResult || nextComment !== (input.comment?.trim() || null);
  }).length ?? 0;
  const manualUnitOptions = [...new Set(activeKpiResults.map((kpi) => kpi.unit))].sort().map((value) => ({ value, label: measurementUnitLabel(value) }));
  const manualSourceOptions = [...new Set(activeKpiResults.map((kpi) => kpi.dataSource))].sort().map((value) => ({ value, label: value }));
  const previewFilteredRows = useMemo(() => activeKpiResults.filter((kpi) => {
    const term = previewSearch.trim().toLowerCase();
    const resultStatus = manualStatus(kpi.code);
    return (!term || `${kpi.code} ${kpi.name} ${kpi.goal} ${kpi.unit} ${kpi.dataSource} ${kpi.trafficLight}`.toLowerCase().includes(term))
      && (!previewStatuses.length || previewStatuses.includes(resultStatus))
      && (!previewTrafficLights.length || previewTrafficLights.includes(kpi.trafficLight))
      && (!previewUnits.length || previewUnits.includes(kpi.unit))
      && (!previewSources.length || previewSources.includes(kpi.dataSource));
  }).sort((left, right) => {
    const value = (item: (typeof activeKpiResults)[number]) => {
      if (previewSort.key === "status") return manualStatus(item.code);
      if (previewSort.key === "result") return draft.results[item.code] ?? "";
      if (previewSort.key === "comment") return draft.comments[item.code] ?? "";
      return item[previewSort.key];
    };
    return compareSortValues(value(left) ?? "", value(right) ?? "", previewSort.direction);
  }), [draft.results, previewSearch, previewSort, previewSources, previewStatuses, previewTrafficLights, previewUnits]);
  const previewTotalPages = Math.max(1, Math.ceil(previewFilteredRows.length / previewPageSize));
  const previewPageStart = (previewPage - 1) * previewPageSize;
  const previewRows = previewFilteredRows.slice(previewPageStart, previewPageStart + previewPageSize);
  const liveScorecards = resultEntryQuery.data?.scorecards ?? [];
  const estimatedScores = liveScorecards.flatMap((scorecard) => scorecard.previewScorePercent == null ? [] : [Number(scorecard.previewScorePercent)]);
  const estimatedPoolScore = estimatedScores.length ? estimatedScores.reduce((sum, value) => sum + value, 0) / estimatedScores.length : null;
  const scorecardPreviewRows = useMemo(() => liveScorecards.map((scorecard) => {
    const kpis=activeKpiResults.filter((kpi)=>kpi.scorecardCode===scorecard.code).map((kpi)=>({...kpi,weight:null}));
    const enteredCount=kpis.filter((kpi)=>Boolean(draft.results[kpi.code]?.trim())).length;
    const missingCount=kpis.length-enteredCount;
    return {scorecard:{...scorecard,departments:scorecard.departments.map((department)=>department.name),entryStatus:missingCount?"Pending Input":"Completed",previewScore:scorecard.previewScorePercent==null?0:Number(scorecard.previewScorePercent),kpis},expected:kpis.length,entered:enteredCount,missing:missingCount,kpiStatus:missingCount?"With Missing":"Completed"};
  }), [activeKpiResults,draft.results,liveScorecards]);
  const scorecardCompletedCount = scorecardPreviewRows.filter((row) => row.kpiStatus === "Completed").length;
  const scorecardMissingCount = scorecardPreviewRows.length - scorecardCompletedCount;
  const scorecardDepartmentOptions = [...new Set(scorecardPreviewRows.flatMap((row) => row.scorecard.departments))].sort().map((value) => ({ value, label: value }));
  const scorecardStatusOptions = [...new Set(scorecardPreviewRows.map((row) => row.scorecard.entryStatus))].sort().map((value) => ({ value, label: value }));
  const filteredScorecardRows = useMemo(() => scorecardPreviewRows.filter((row) => {
    const term = scorecardSearch.trim().toLowerCase();
    return (!term || `${row.scorecard.code} ${row.scorecard.name} ${row.scorecard.departments.join(" ")}`.toLowerCase().includes(term))
      && (!scorecardDepartments.length || row.scorecard.departments.some((department) => scorecardDepartments.includes(department)))
      && (!scorecardStatuses.length || scorecardStatuses.includes(row.scorecard.entryStatus))
      && (!scorecardKpiStatuses.length || scorecardKpiStatuses.includes(row.kpiStatus));
  }).sort((left, right) => {
    const value = (row: (typeof scorecardPreviewRows)[number]) => {
      if (scorecardSort.key === "scorecard") return `${row.scorecard.code} ${row.scorecard.name}`;
      if (scorecardSort.key === "departments") return row.scorecard.departments.join(", ");
      if (scorecardSort.key === "previewScore") return row.scorecard.previewScore;
      if (scorecardSort.key === "status") return row.scorecard.entryStatus;
      return row[scorecardSort.key];
    };
    return compareSortValues(value(left), value(right), scorecardSort.direction);
  }), [scorecardDepartments, scorecardKpiStatuses, scorecardPreviewRows, scorecardSearch, scorecardSort, scorecardStatuses]);
  const scorecardTotalPages = Math.max(1, Math.ceil(filteredScorecardRows.length / scorecardPageSize));
  const scorecardPageStart = (scorecardPage - 1) * scorecardPageSize;
  const pagedScorecardRows = filteredScorecardRows.slice(scorecardPageStart, scorecardPageStart + scorecardPageSize);

  useEffect(() => {
    setManualPage((current) => Math.min(current, manualTotalPages));
  }, [manualTotalPages]);

  useEffect(() => {
    const validKeys = new Set(manualColumns.map((column) => column.key));
    setVisibleManualColumns((current) => {
      const normalized = [...new Set(current)].filter((key) => validKeys.has(key));
      return normalized.length === current.length && normalized.every((key, index) => key === current[index])
        ? current
        : normalized.length
          ? normalized
          : manualColumns.map((column) => column.key);
    });
  }, []);

  useEffect(() => {
    setPreviewPage((current) => Math.min(current, previewTotalPages));
  }, [previewTotalPages]);

  useEffect(() => {
    setScorecardPage((current) => Math.min(current, scorecardTotalPages));
  }, [scorecardTotalPages]);

  const stepAvailable = (number: number) => {
    if (!selectedMonitoringPeriod) return false;
    if (number === 1) return status === "Draft" && canEnter;
    if (number === 2) return status === "Draft" && entered > 0 && canValidate;
    if (number === 3) return status !== "Draft" || (validationRun && !hasBlockingErrors);
    if (number === 4) return status === "Submitted" || status === "Validated" || status === "Closed";
    return status === "Validated" || status === "Closed";
  };

  const stepComplete = (number: number) => {
    if (number === 1) return entered > 0;
    if (number === 2) return validationRun && !hasBlockingErrors;
    if (number === 3) return status === "Submitted" || status === "Validated" || status === "Closed";
    if (number === 4) return status === "Validated" || status === "Closed";
    return status === "Closed";
  };

  function markDraftSaved() {
    setDraftMessage("All changes saved.");
  }

  function updateManualField(code: string, field: "result" | "comment", value: string) {
    setDraft((current) => {
      const nextDraft: DraftSnapshot = field === "result"
        ? { ...current, results: { ...current.results, [code]: value } }
        : { ...current, comments: { ...current.comments, [code]: value } };
      return nextDraft;
    });
    setManualChangesPending(true);
    setDraftMessage("");
  }

  async function saveAllManualChanges() {
    if(!resultEntryQuery.data||!selectedMonitoringPeriodId)return;
    const changes=resultEntryQuery.data.inputs.flatMap((input)=>{
      const raw=(draft.results[input.kpiCode]??"").trim();
      const resultValue=raw===""?null:raw;
      const comment=(draft.comments[input.kpiCode]??"").trim()||null;
      const sameValue=resultValue===null?input.resultValue===null:input.resultValue!==null&&Number(resultValue)===Number(input.resultValue);
      if(sameValue&&comment===(input.comment?.trim()||null))return [];
      return [{monitoringPeriodInputId:input.id,resultValue,comment,version:input.version}];
    });
    if(!changes.length){setManualChangesPending(false);setShowSaveAllConfirm(false);return;}
    const invalid=changes.find((change)=>change.resultValue!==null&&!/^-?\d+(\.\d+)?$/.test(change.resultValue));
    if(invalid){setShowSaveAllConfirm(false);setResolverToast("Every Result must be a valid number before saving.");return;}
    setWorkflowBusy(true);
    try{await monitoringResultsService.saveChanges(selectedMonitoringPeriodId,changes);markDraftSaved();setManualChangesPending(false);setShowSaveAllConfirm(false);setValidationRun(false);await refreshWorkflow();}
    catch(error){setResolverToast(error instanceof Error?error.message:"Manual results could not be saved.");}
    finally{setWorkflowBusy(false);}
  }

  function sortManualRows(key: ManualSortKey) {
    setManualSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setManualPage(1);
  }

  function sortValidationFindings(key: ValidationSortKey) {
    setValidationSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
  }

  function sortPreviewRows(key: PreviewColumnKey) {
    setPreviewSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPreviewPage(1);
  }

  function sortScorecardRows(key: ScorecardPreviewColumnKey) {
    setScorecardSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setScorecardPage(1);
  }

  useEffect(() => {
    if (!wizardStarted || step !== 1 || method !== "manual" || readOnly) return;
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["s", "g"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setShowSaveAllConfirm(true);
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [method, readOnly, step, wizardStarted]);

  function selectKpi(code: string) {
    setSelectedKpi(code);
  }

  function focusFindingKpi(code: string) {
    setMethod("manual");
    setManualSearch(code);
    setManualStatuses([]);
    setManualUnits([]);
    setManualSources([]);
    setManualPage(1);
    setStep(1);
    window.setTimeout(() => {
      const row = document.querySelector<HTMLElement>(`[data-kpi-code="${CSS.escape(code)}"]`);
      row?.scrollIntoView({ behavior: "smooth", block: "center" });
      row?.querySelector<HTMLInputElement>("input.manual-inline-input.result")?.focus();
    }, 0);
  }

  function requestMethod(nextMethod: InputMethod) {
    if (nextMethod === method || readOnly) return;
    if (method === "manual" && unsavedChangeCount > 0) {
      setSwitchTarget(nextMethod);
      return;
    }
    setMethod(nextMethod);
  }

  function discardAndSwitch() {
    if (!switchTarget || !resultEntryQuery.data) return;
    setDraft({
      results: Object.fromEntries(resultEntryQuery.data.inputs.map((input) => [input.kpiCode, input.resultValue ?? ""])),
      comments: Object.fromEntries(resultEntryQuery.data.inputs.map((input) => [input.kpiCode, input.comment ?? ""])),
    });
    setManualChangesPending(false);
    setDraftMessage("All changes saved.");
    setMethod(switchTarget);
    setSwitchTarget(null);
  }

  async function confirmImport() {
    if (!excelPreview?.changes.length || !selectedMonitoringPeriodId) return;
    setExcelBusy(true); setExcelError("");
    try { await monitoringResultsService.confirmExcel(selectedMonitoringPeriodId, excelPreview.changes); await refreshWorkflow(); setDraftMessage("Excel changes imported into the shared Draft."); setShowImportSummary(false); setExcelPreview(null); setValidationRun(false); }
    catch (error) { setExcelError(error instanceof Error ? error.message : "Excel import could not be confirmed."); }
    finally { setExcelBusy(false); }
  }

  async function downloadExcelTemplate() {
    if (!selectedMonitoringPeriodId) return; setExcelBusy(true); setExcelError("");
    try { const blob=await monitoringResultsService.downloadExcelTemplate(selectedMonitoringPeriodId); const url=URL.createObjectURL(blob); const link=document.createElement("a"); link.href=url; link.download=`${pool.code}_${selectedMonitoringPeriod?.periodKey ?? "results"}.xlsx`; link.click(); URL.revokeObjectURL(url); }
    catch(error){setExcelError(error instanceof Error?error.message:"Excel template could not be downloaded.");} finally{setExcelBusy(false);}
  }

  async function previewExcelFile(file: File) {
    if (!selectedMonitoringPeriodId) return; setExcelBusy(true); setExcelError("");
    try { const preview=await monitoringResultsService.previewExcel(selectedMonitoringPeriodId,file); setExcelPreview(preview); setShowImportSummary(true); }
    catch(error){setExcelError(error instanceof Error?error.message:"Excel file could not be validated.");} finally{setExcelBusy(false);}
  }

  async function refreshWorkflow() {
    await Promise.all([resultEntryQuery.refetch(), periodsQuery.refetch()]);
  }

  async function runValidation() {
    const version=resultEntryQuery.data?.monitoringPeriod.version;
    if (status !== "Draft" || !canValidate || version===undefined) return;
    setWorkflowBusy(true);
    try { await monitoringResultsService.validate(selectedMonitoringPeriodId,version); setValidationRun(true); await refreshWorkflow(); }
    catch(error){setResolverToast(error instanceof Error?error.message:"Validation could not be completed.");}
    finally{setWorkflowBusy(false);}
  }

  async function returnForCorrection(code?: string) {
    const version=resultEntryQuery.data?.monitoringPeriod.version;
    if(version===undefined||returnReason.trim().length<10){setResolverToast("Enter a correction reason of at least 10 characters.");return;}
    setWorkflowBusy(true);
    try { await monitoringResultsService.returnForCorrection(selectedMonitoringPeriodId,version,returnReason.trim()); setStatus("Draft"); setValidationRun(false); setMethod("manual"); setReturnReason(""); if(code)selectKpi(code); setStep(1); await refreshWorkflow(); }
    catch(error){setResolverToast(error instanceof Error?error.message:"The Monitoring Period could not be returned.");}
    finally{setWorkflowBusy(false);}
  }

  function navigateStep(number: number) {
    if (!stepAvailable(number) && number !== step) return;
    setStep(number);
  }

  function goNext() {
    if (step < 5 && stepAvailable(step + 1)) setStep(step + 1);
  }

  function selectResolverPool(id: string) {
    if(!id){setSelectedPoolId("");setSelectedPoolPeriodId("");setSelectedMonitoringPeriodId("");setPoolSearch("");navigate("/app/monitoring-results/result-entry",{replace:true});return;}
    const nextPool = poolsQuery.data?.find((item) => String(item.id) === id);
    setSelectedPoolId(id); setSelectedPoolPeriodId(""); setSelectedMonitoringPeriodId("");
    setPoolSearch(nextPool ? `${nextPool.code} — ${nextPool.name}` : "");
    setPoolSuggestionsOpen(false);
    navigate(`/app/monitoring-results/result-entry?poolId=${id}`, { replace: true });
  }

  function selectResolverScorecard(scorecardId: number) {
    const scorecard = scorecardsQuery.data?.find((item) => item.id === scorecardId);
    if (!scorecard?.poolId) return;
    setSelectedPoolId(String(scorecard.poolId)); setSelectedPoolPeriodId(""); setSelectedMonitoringPeriodId("");
    setPoolSearch(`${scorecard.code} · ${scorecard.name}`); setPoolSuggestionsOpen(false);
    navigate(`/app/monitoring-results/result-entry?poolId=${scorecard.poolId}`, { replace: true });
  }

  function selectResolverPeriod(value: string) {
    setSelectedPoolPeriodId(value);
    const option = poolPeriodOptions.find((item) => {
      const materialized = periodsQuery.data?.items.find((period) => period.poolId === selectedPoolId && period.periodStart === item.start);
      return (item.poolPeriodId ?? materialized?.poolInputPeriodId ?? item.start) === value;
    });
    const materialized = option ? periodsQuery.data?.items.find((period) => period.poolId === selectedPoolId && period.periodStart === option.start) : null;
    setSelectedMonitoringPeriodId(materialized?.id ?? "");
    const query = new URLSearchParams({ poolId: selectedPoolId, poolInputPeriodId: value });
    if (materialized) query.set("monitoringPeriodId", materialized.id);
    navigate(`/app/monitoring-results/result-entry?${query}`, { replace: true });
  }

  function selectMonitoringPeriod(id: string) {
    const period = periodsQuery.data?.items.find((item) => item.id === id);
    if (!period) return;
    setSelectedMonitoringPeriodId(period.id);
    setSelectedPoolId(period.poolId);
    setSelectedPoolPeriodId(period.poolInputPeriodId);
    setPoolSearch(`${period.code} · ${period.periodLabel} · ${period.status}`);
    setPoolSuggestionsOpen(false);
    setWizardStarted(false);
    setStep(1);
    navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${period.id}`, { replace: true });
  }

  async function submitResults() {
    const version=resultEntryQuery.data?.monitoringPeriod.version;
    if (status !== "Draft" || !validationRun || hasBlockingErrors || version===undefined) return;
    setWorkflowBusy(true);
    try { await monitoringResultsService.submit(selectedMonitoringPeriodId,version); setStatus("Submitted"); setStep(4); setShowSubmitConfirmation(false); await refreshWorkflow(); }
    catch(error){setResolverToast(error instanceof Error?error.message:"Results could not be submitted.");}
    finally{setWorkflowBusy(false);}
  }

  async function approveSubmittedResults() {
    const version=resultEntryQuery.data?.monitoringPeriod.version;
    if (status !== "Submitted" || !canValidate || hasBlockingErrors || version===undefined) return;
    setWorkflowBusy(true);
    try { await monitoringResultsService.approve(selectedMonitoringPeriodId,version); setStatus("Validated"); await refreshWorkflow(); }
    catch(error){setResolverToast(error instanceof Error?error.message:"Results could not be validated.");}
    finally{setWorkflowBusy(false);}
  }

  async function closePeriod() {
    const version=resultEntryQuery.data?.monitoringPeriod.version;
    if (!stepAvailable(5)) return;
    if (missing > 0 && !closureComment.trim()) return;
    if(version===undefined)return;
    setWorkflowBusy(true);
    try { await monitoringResultsService.close(selectedMonitoringPeriodId,version,missing>0,missing>0?closureComment.trim():null); saveMonitoringPeriodClosure(pool.id,inputPeriod,missing>0?"with-exceptions":"normal"); setShowCloseConfirmation(false); setStatus("Closed"); await refreshWorkflow(); }
    catch(error){setResolverToast(error instanceof Error?error.message:"The Monitoring Period could not be closed.");}
    finally{setWorkflowBusy(false);}
  }

  const validationLabel = !validationRun
    ? "Validation required"
    : hasBlockingErrors
      ? "Critical errors"
      : missing
        ? "With warnings"
        : "No errors";

  return (
    <main className="monitor-page result-entry-page">
      <header className="result-entry-header">
        <button className="monitor-back result-entry-back" onClick={() => navigate("/app/monitoring-results/overview")}>
          <ArrowLeft size={16} />
          Monitoring Overview
        </button>
        <div>
          <h1>Result Entry</h1>
          <p>
            {selectedMonitoringPeriod ? "Enter, review or correct KPI results for the selected Monitoring Period." : "Select a Monitoring Period to enter, review or correct KPI results."}
          </p>
        </div>
      </header>

      {wizardStarted && <ol className="entry-stepper">
        {steps.map((label, index) => {
          const number = stepNumbers[index];
          const available = stepAvailable(number);
          const complete = stepComplete(number);
          const state =
            number === step
              ? "current"
              : complete
                ? "complete"
                : available
                  ? "available"
                  : "locked";
          return (
            <li key={label} className={state}>
              <button
                disabled={!available && number !== step}
                onClick={() => navigateStep(number)}
              >
                <span>
                  {complete && number !== step ? <Check size={20} strokeWidth={3.5} /> : index + 1}
                </span>
                <strong>{label}</strong>
              </button>
              {index < steps.length - 1 && <i />}
            </li>
          );
        })}
      </ol>}

      {false && step > 1 && selectedMonitoringPeriod && <section className="entry-context" aria-label="Result entry context">
        <article className="entry-context-block pool-context-block">
          <header>
            <span>Pool &amp; Period Context</span>
            <small className="entry-context-badge">Selected Monitoring Scope</small>
          </header>
          <div className="entry-context-grid">
            <div><small>Pool Code</small><strong>{pool.code}</strong></div>
            <div><small>Pool Name</small><strong>{pool.name}</strong></div>
            <div><small>Input Period</small><strong>{inputPeriod}</strong></div>
            <div><small>Company</small><strong>{pool.companies.join(", ")}</strong></div>
          </div>
        </article>
        <article className="entry-context-block capture-context-block">
          <header>
            <span>Result Entry Context</span>
            <span className={`result-draft-state status-${status.toLowerCase()}`}>
              {status} · {entered}/{activeKpiResults.length} entered
            </span>
          </header>
          <div className="entry-context-grid">
            <div><small>KPI Lines</small><strong>{pool.kpiLines}</strong></div>
            <div><small>Input Frequency</small><strong>{pool.frequency}</strong></div>
            <div><small>Attached Scorecards</small><strong>{liveScorecards.length}</strong></div>
          </div>
        </article>
      </section>}

      {wizardStarted && selectedMonitoringPeriod && readinessSummary && <section className="monitoring-period-sticky-context" aria-label="Selected Monitoring Period"><div className="monitoring-context-identity"><strong>{selectedMonitoringPeriod.code}</strong><small>{selectedMonitoringPeriod.poolCode} · {selectedMonitoringPeriod.poolName}</small><span>{selectedMonitoringPeriod.periodLabel} · {selectedMonitoringPeriod.status} · {selectedMonitoringPeriod.frequency ?? "Frequency unavailable"}</span></div><div className="monitoring-context-actions"><p><strong>{readinessSummary.entered}/{readinessSummary.expected}</strong> Entered <i/> <strong>{readinessSummary.pending}</strong> Pending</p><button type="button" onClick={() => setWizardStarted(false)}>Change Period</button></div></section>}

      <section className="entry-workspace">
        {!wizardStarted && (
          <div className="monitoring-period-selector">
            <header><h2>Select Monitoring Period</h2><p>Choose the specific Monitoring Period you want to enter, review or correct.</p></header>
            <div className="period-resolver-controls monitoring-period-controls">
              <label><span>KPI Pool</span><div className="resolver-period-select"><select value={selectedPoolId} disabled={poolsQuery.isLoading} onChange={(event)=>selectResolverPool(event.target.value)}><option value="">Select KPI Pool</option>{resolverPoolOptions.map((item)=><option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select><ChevronDown size={16}/></div></label>
              <label><span>Input Period</span><div className={`resolver-period-select ${!selectedPoolId ? "waiting-pool" : ""}`} onMouseDown={(event) => { if (!selectedPoolId) { event.preventDefault(); setResolverToast("Select a KPI Pool before choosing an Input Period."); } }}><select value={selectedPoolPeriodId} disabled={!selectedPoolId || poolPeriodsQuery.isLoading} onChange={(event) => selectResolverPeriod(event.target.value)}><option value="">Select Input Period</option>{poolPeriodOptions.map((item) => { const materialized = periodsQuery.data?.items.find((period) => period.poolId === selectedPoolId && period.periodStart === item.start); const value = item.poolPeriodId ?? materialized?.poolInputPeriodId ?? item.start; const periodLabel = periodDisplay(item, poolPeriodOptions).label; return <option value={value} key={item.start}>{periodLabel} · {materialized?.status ?? "Not Available"}</option>; })}</select><ChevronDown size={16}/></div></label>
            </div>
            {!selectedPoolId && !poolsQuery.isLoading && <div className="monitoring-period-unselected"><Search size={28}/><strong>No KPI Pool selected.</strong><p>Select a Pool and then choose its Input Period.</p></div>}
            {selectedPoolId && !selectedPoolPeriodId && !poolPeriodsQuery.isLoading && <div className="monitoring-period-unselected"><ChevronDown size={28}/><p>Select an Input Period to see its Monitoring status.</p></div>}
            {selectedPoolPeriodId && !selectedMonitoringPeriod && !poolPeriodsQuery.isLoading && <div className="monitoring-period-unselected monitoring-period-not-available"><AlertTriangle size={28}/><h3>{selectedPoolPeriodLabel}</h3><strong>{resolverQuery.isLoading ? "Resolving Monitoring state..." : resolverQuery.data?.availability==="READY_TO_MATERIALIZE"?"READY TO MATERIALIZE":"Monitoring Period not available yet"}</strong>{!resolverQuery.isLoading&&<><p>The Monitoring Period has not been initialized for this Input Period.</p><div className="monitoring-period-reason"><small>Reason</small><p>{resolverQuery.data?.reason ?? "Waiting for Scorecard compositions to be finalized."}</p></div></>}{resolverQuery.data?.availability==="READY_TO_MATERIALIZE"&&<button className="entry-primary" disabled={initializingPeriod} onClick={async()=>{setInitializingPeriod(true);try{const created=await initializeMonitoringPeriod(selectedPoolId,selectedPoolPeriodId);await Promise.all([periodsQuery.refetch(),resolverQuery.refetch()]);setSelectedMonitoringPeriodId(created.id);navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${created.id}`,{replace:true});}catch(error){setResolverToast(error instanceof Error?error.message:"Monitoring Period could not be initialized.");}finally{setInitializingPeriod(false);}}}>{initializingPeriod?"Initializing…":"Initialize Monitoring Period"}</button>}</div>}
            {selectedMonitoringPeriod && readinessSummary && <article className="monitoring-period-summary-card"><header><div><strong>{selectedMonitoringPeriod.code}</strong><span>{selectedMonitoringPeriod.status}</span></div><h3>{selectedMonitoringPeriod.poolCode} · {selectedMonitoringPeriod.poolName}</h3><p>{selectedMonitoringPeriod.periodLabel} · {selectedMonitoringPeriod.frequency ?? "Frequency unavailable"}</p></header><p className="monitoring-period-metrics"><strong>{readinessSummary.expected}</strong> Expected <i/> <strong>{readinessSummary.entered}</strong> Entered <i/> <strong>{readinessSummary.pending}</strong> Pending</p><div className="monitoring-period-progress"><i style={{ width: `${readinessPercent}%` }}/><span>{readinessPercent}%</span></div>{selectedMonitoringPeriod.status !== "DRAFT" && <p className="monitoring-period-readonly-note">{selectedMonitoringPeriod.status === "SUBMITTED" ? "Results are read-only while this Monitoring Period is under validation." : selectedMonitoringPeriod.status === "VALIDATED" ? "Results are validated and read-only." : "This historical Monitoring Period is read-only."}</p>}</article>}
            {resultEntryQuery.isError&&<p className="result-entry-live-error" role="alert">The selected Monitoring Period could not be loaded. <button type="button" onClick={()=>resultEntryQuery.refetch()}>Retry</button></p>}
            {selectedPoolPeriodId && <footer><button className="entry-primary" disabled={!selectedMonitoringPeriod||resultEntryQuery.isLoading||resultEntryQuery.isError||!resultEntryQuery.data} onClick={() => { if (!selectedMonitoringPeriod||!resultEntryQuery.data) return; setStep(selectedMonitoringPeriod.status === "DRAFT" ? 1 : selectedMonitoringPeriod.status === "SUBMITTED" ? 4 : selectedMonitoringPeriod.status === "VALIDATED" ? 4 : 5); setWizardStarted(true); }}>{resultEntryQuery.isLoading?"Loading Results…":selectedMonitoringPeriod?.status === "DRAFT" ? "Continue Result Entry" : selectedMonitoringPeriod ? "View Results" : "Continue"}</button></footer>}
          </div>
        )}

        {false && step === 1 && (
          <div className="monitoring-period-step">
            <header><h2>Select Monitoring Period</h2><p>Select a Scorecard and one of its Pool Input Periods to see its real status and available action.</p></header>
            <div className="period-resolver-controls">
              <label><span>Scorecard</span><div className="resolver-pool-autocomplete" ref={resolverPoolRef}><Search size={17}/><input value={poolSearch} placeholder="Search Scorecard code or name..." role="combobox" autoComplete="off" aria-expanded={poolSuggestionsOpen} aria-controls="result-entry-pool-suggestions" onClick={() => setPoolSuggestionsOpen(true)} onFocus={() => setPoolSuggestionsOpen(true)} onChange={(event) => { setPoolSearch(event.target.value); setPoolSuggestionsOpen(true); if (selectedPoolId) { setSelectedPoolId(""); setSelectedPoolPeriodId(""); setSelectedMonitoringPeriodId(""); } }}/>{poolSearch && <button type="button" aria-label="Clear Scorecard" onClick={() => { setPoolSearch(""); setSelectedPoolId(""); setSelectedPoolPeriodId(""); setSelectedMonitoringPeriodId(""); setPoolSuggestionsOpen(true); }}><X size={15}/></button>}{poolSuggestionsOpen && <div className="resolver-pool-suggestions" id="result-entry-pool-suggestions" role="listbox">{scorecardsQuery.isLoading ? <div className="resolver-pool-no-suggestions">Loading Scorecards...</div> : scorecardsQuery.isError ? <div className="resolver-pool-no-suggestions"><strong>Scorecard search unavailable</strong></div> : matchingScorecards.length ? matchingScorecards.map((item) => <button type="button" role="option" aria-selected={false} key={item.id} onMouseDown={(event) => event.preventDefault()} onClick={() => selectResolverScorecard(item.id)}><span><strong>{item.code}</strong><small>{item.name}</small></span></button>) : <div className="resolver-pool-no-suggestions"><strong>No matching Scorecards</strong><span>Try another code or name. Periods are treated as separators.</span></div>}</div>}</div></label>
              <label><span>Input Period</span><div className={`resolver-period-select ${!selectedPoolId ? "waiting-pool" : ""}`} onMouseDown={(event) => { if (!selectedPoolId) { event.preventDefault(); setResolverToast("Select a Scorecard before choosing an Input Period."); } }}><select value={selectedPoolPeriodId} disabled={!selectedPoolId || poolPeriodsQuery.isLoading} onChange={(event) => selectResolverPeriod(event.target.value)}><option value="">Select Input Period</option>{poolPeriodOptions.map((item) => { const materialized = periodsQuery.data?.items.find((period) => period.poolId === selectedPoolId && period.periodStart === item.start); const value = item.poolPeriodId ?? materialized?.poolInputPeriodId ?? item.start; const label = periodDisplay(item, poolPeriodOptions).label; return <option value={value} key={item.start}>{label} — {materialized?.status ?? "Not Available"}</option>; })}</select><ChevronDown size={16}/></div></label>
            </div>
            {(poolsQuery.isLoading || periodsQuery.isLoading || selectedPoolId && poolPeriodsQuery.isLoading) && <div className="resolver-feedback"><LoaderCircle className="spin" size={20}/><span>Loading Pool and Monitoring information...</span></div>}
            {!selectedPoolId && !poolsQuery.isLoading && <div className="resolver-empty"><Search size={28}/><p>Select a KPI Pool and Input Period to continue.</p></div>}
            {selectedPoolId && !selectedPoolPeriod && !poolPeriodsQuery.isLoading && <div className="resolver-empty"><ChevronDown size={28}/><p>Select an Input Period from this Pool.</p></div>}
            {(selectedPoolRecord || resolvedReadiness) && resolvedPeriodStart && <article className={`period-readiness-card ${resolvedReadiness ? resolvedReadiness.status.toLowerCase() : "not-available"}`}>
              <header><div><h3>{new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${resolvedPeriodStart}T00:00:00Z`))}</h3><p><strong>{resolvedReadiness?.status ?? "NOT AVAILABLE"}</strong></p></div></header>
              {resolvedReadiness && readinessSummary ? <><p className="readiness-summary-line">{readinessSummary.expected} Expected · {readinessSummary.entered} Entered · {readinessSummary.pending} Pending</p><div className="readiness-progress"><i style={{ width: `${readinessPercent}%` }}/><span>{readinessPercent}%</span></div><div className="readiness-action"><p>{resolvedReadiness.status === "DRAFT" ? "Result entry is in progress." : resolvedReadiness.status === "SUBMITTED" ? "Results were submitted for validation. Result Entry is read-only." : resolvedReadiness.status === "VALIDATED" ? "Results have been validated. No further changes are allowed." : "Monitoring Period Closed."}</p><button className="entry-primary" onClick={() => setStep(resolvedReadiness.status === "DRAFT" ? 3 : 5)}>{resolvedReadiness.status === "DRAFT" ? "Continue Result Entry" : resolvedReadiness.status === "CLOSED" ? "View Historical Results" : "View Results"}</button></div></> : selectedPoolPeriod ? <div className="readiness-unavailable"><AlertTriangle size={20}/><div><h4>Monitoring results are not available for this Input Period yet.</h4><small>Reason</small><p>{selectedPoolPeriod.dependency.reasonCode === "PREVIOUS_INPUT_PERIOD_NOT_CLOSED" ? "Previous workflow requirements have not been completed." : selectedPoolPeriod.workflowStatus !== "FINALIZED" ? "The Pool composition for this Input Period is not finalized." : "Monitoring readiness has not been published for this Input Period."}</p></div><button className="entry-primary" disabled>Continue</button></div> : null}
            </article>}
            {periodsQuery.isLoading ? <div className="result-entry-live-state"><LoaderCircle className="spin"/><p>Loading Monitoring Periods…</p></div> : periodsQuery.isError ? <div className="result-entry-live-state"><AlertTriangle/><p>Monitoring Periods could not be loaded.</p><button className="entry-secondary" onClick={() => periodsQuery.refetch()}>Retry</button></div> : periodsQuery.data?.items.length ? <div className="result-entry-period-grid">{periodsQuery.data?.items.map((period) => <button type="button" key={period.id} className={selectedMonitoringPeriodId === period.id ? "monitoring-period-card selected" : "monitoring-period-card"} onClick={() => { setSelectedMonitoringPeriodId(period.id); navigate(`/app/monitoring-results/result-entry?monitoringPeriodId=${period.id}`, { replace: true }); }}><div><strong>{period.poolCode}</strong><span>{period.status}</span></div><h3>{period.poolName}</h3><p>{period.periodLabel}</p><dl><div><dt>Expected Results</dt><dd>{period.expected}</dd></div><div><dt>Input Period</dt><dd>{period.periodKey}</dd></div></dl><i>{selectedMonitoringPeriodId === period.id && <Check size={15}/>}</i></button>)}</div> : <div className="result-entry-live-state"><AlertTriangle/><h3>No Monitoring Periods available</h3><p>A READY Pool Input Period must be materialized before continuing.</p></div>}
          </div>
        )}

        {wizardStarted && step === 1 && (
          <div className="input-data-step">
            <header className="result-entry-step-heading"><div><h2>Result Entry — {selectedMonitoringPeriod?.periodLabel}</h2><p>Expected {readinessSummary?.expected ?? 0} · Entered {readinessSummary?.entered ?? 0} · Pending {readinessSummary?.pending ?? 0}</p></div></header>
            <div className="capture-method-switch">
              <span>Enter Results</span>
              <div>
                <button
                  title="Manual Entry — Enter or correct results directly in the system."
                  disabled={readOnly}
                  className={method === "manual" ? "active" : ""}
                  onClick={() => requestMethod("manual")}
                >
                  <Keyboard size={15} />
                  Manual Entry
                </button>
                <button
                  title="Excel Template — Download, complete and upload the period template."
                  disabled={readOnly}
                  className={method === "excel" ? "active" : ""}
                  onClick={() => requestMethod("excel")}
                >
                  <FileSpreadsheet size={15} />
                  Excel Import
                </button>
              </div>
            </div>
            {method === "manual" ? (
              <div className="manual-step">
                <header>
                  <div className="manual-step-heading">
                    <div>
                      <h2>KPI Lines · Manual Entry</h2>
                      <p>Select a KPI and edit its Result and Comment fields.</p>
                    </div>
                    <ManualColumnSelect selected={visibleManualColumns} onChange={setVisibleManualColumns} />
                    <div className="manual-status-summary" aria-label="Manual result status summary">
                      <span className="entered"><i/>{manualStatusCounts.entered} Entered</span>
                      {manualStatusCounts.incorrect > 0 && <span className="incorrect"><i/>{manualStatusCounts.incorrect} Invalid Format</span>}
                      <span className="pending"><i/>{manualStatusCounts.pending} Pending</span>
                    </div>
                  </div>
                </header>
                {draftMessage && (
                  <p className="draft-save-message">
                    <CheckCircle2 size={15} />
                    {draftMessage}
                  </p>
                )}
                <div className="manual-entry-toolbar manual-entry-input-toolbar">
                  <label className="manual-entry-search"><Search size={17}/><input value={manualSearch} onChange={(event) => { setManualSearch(event.target.value); setManualPage(1); }} placeholder="Search KPI code, name, goal or data source..." /></label>
                  <ManualMultiSelect label="All statuses" options={["Entered", "Invalid", "Pending"].map((value) => ({ value, label: value === "Invalid" ? "Invalid Format" : value }))} selected={manualStatuses} onChange={(values) => { setManualStatuses(values); setManualPage(1); }} />
                  <ManualMultiSelect label="All measurement units" options={manualUnitOptions} selected={manualUnits} onChange={(values) => { setManualUnits(values); setManualPage(1); }} />
                  <ManualMultiSelect label="All data sources" options={manualSourceOptions} selected={manualSources} onChange={(values) => { setManualSources(values); setManualPage(1); }} />
                </div>
                <div className="manual-entry-table-shell stable-table-shell">
                  <div className="manual-entry-table-wrap">
                    <table className="manual-entry-table manual-entry-input-table">
                      <thead><tr>
                        {visibleManualColumns.includes("code") && <SortableTableHeader active={manualSort.key === "code"} direction={manualSort.direction} onSort={() => sortManualRows("code")}>KPI Code</SortableTableHeader>}
                        {visibleManualColumns.includes("name") && <SortableTableHeader active={manualSort.key === "name"} direction={manualSort.direction} onSort={() => sortManualRows("name")}>KPI Name</SortableTableHeader>}
                        {visibleManualColumns.includes("goal") && <SortableTableHeader active={manualSort.key === "goal"} direction={manualSort.direction} onSort={() => sortManualRows("goal")}>Goal</SortableTableHeader>}
                        {visibleManualColumns.includes("unit") && <SortableTableHeader active={manualSort.key === "unit"} direction={manualSort.direction} onSort={() => sortManualRows("unit")}><>Measurement<br/>Unit</></SortableTableHeader>}
                        {visibleManualColumns.includes("dataSource") && <SortableTableHeader active={manualSort.key === "dataSource"} direction={manualSort.direction} onSort={() => sortManualRows("dataSource")}>Data Source</SortableTableHeader>}
                        {visibleManualColumns.includes("result") && <SortableTableHeader active={manualSort.key === "result"} direction={manualSort.direction} onSort={() => sortManualRows("result")}>Result</SortableTableHeader>}
                        {visibleManualColumns.includes("comment") && <SortableTableHeader active={manualSort.key === "comment"} direction={manualSort.direction} onSort={() => sortManualRows("comment")}>Comment (Optional)</SortableTableHeader>}
                        {visibleManualColumns.includes("status") && <SortableTableHeader active={manualSort.key === "status"} direction={manualSort.direction} onSort={() => sortManualRows("status")}>Result Status</SortableTableHeader>}
                      </tr></thead>
                      <tbody>{manualRows.length ? manualRows.map((kpi) => {
                        const resultStatus = manualStatus(kpi.code);
                        return <tr key={kpi.code} data-kpi-code={kpi.code}>
                          {visibleManualColumns.includes("code") && <td><span className="code-pill">{kpi.code}</span></td>}
                          {visibleManualColumns.includes("name") && <td className="manual-kpi-name">{kpi.name}</td>}
                          {visibleManualColumns.includes("goal") && <td>{goalWithUnit(kpi.goal, kpi.unit)}</td>}
                          {visibleManualColumns.includes("unit") && <td><span className="manual-unit-label" title={measurementUnitLabel(kpi.unit)}>{measurementUnitShort(kpi.unit)}</span></td>}
                          {visibleManualColumns.includes("dataSource") && <td>{kpi.dataSource}</td>}
                          {visibleManualColumns.includes("result") && <td><input className="manual-inline-input result" disabled={readOnly} value={draft.results[kpi.code] ?? ""} onFocus={() => setEditingResultCode(kpi.code)} onBlur={() => setEditingResultCode(null)} onChange={(event) => updateManualField(kpi.code, "result", event.target.value)} placeholder="Enter result" /></td>}
                          {visibleManualColumns.includes("comment") && <td><CompactCommentTextarea disabled={readOnly} value={draft.comments[kpi.code] ?? ""} onChange={(value) => updateManualField(kpi.code, "comment", value)} onExpand={() => setExpandedCommentCode(kpi.code)} /></td>}
                          {visibleManualColumns.includes("status") && <td><span className={`manual-result-status ${resultStatus.toLowerCase()}`}><i/>{resultStatus === "Invalid" ? "Invalid Format" : resultStatus}</span></td>}
                        </tr>;
                      }) : <tr><td colSpan={visibleManualColumns.length} className="manual-entry-empty">No KPI results match the selected filters.</td></tr>}</tbody>
                    </table>
                  </div>
                  <footer className="manual-entry-pagination">
                    <span>Showing <strong>{manualFilteredRows.length ? manualPageStart + 1 : 0}-{Math.min(manualPageStart + manualPageSize, manualFilteredRows.length)}</strong> of <strong>{manualFilteredRows.length}</strong> KPI results</span>
                    <RowsPerPageSelect value={manualPageSize} onChange={(value) => { setManualPageSize(value); setManualPage(1); }} />
                    <PaginationControls page={manualPage} totalPages={manualTotalPages} onPage={setManualPage} label="Manual results pagination" className="manual-pagination-controls" />
                  </footer>
                </div>
              </div>
            ) : (
              <div className="excel-step">
                <header>
                  <h2>Result Entry · Excel Template</h2>
                  <p>
                    The file complements the same Draft used by Manual Entry.
                  </p>
                </header>
                <div className="template-card">
                  <span>
                    <FileSpreadsheet size={34} />
                  </span>
                  <div>
                    <small>PERIOD TEMPLATE</small>
                    <strong>
                      {pool.code}_{inputPeriod.replace(" ", "-")}.xlsx
                    </strong>
                    <p>
                      {pool.kpiLines} KPI lines · Editable fields: Result and
                      Comment
                    </p>
                  </div>
                  <button disabled={readOnly || excelBusy} onClick={downloadExcelTemplate}>
                    <Download size={15} />
                    Download Template
                  </button>
                </div>
                <label className="upload-zone">
                  <input
                    disabled={readOnly}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => {
                      if (event.target.files?.[0]) previewExcelFile(event.target.files[0]);
                      event.target.value = "";
                    }}
                  />
                  <span><Upload size={31} /></span>
                  <strong>Upload completed results</strong>
                  <p>Choose an Excel file to compare it with the current shared results.</p>
                </label>
                {excelError && <p className="result-entry-live-error" role="alert">{excelError}</p>}
              </div>
            )}
          </div>
        )}

        {wizardStarted && step === 2 && (
          <div className="validate-step">
            <header>
              <h2>Check Results</h2>
              <p>
                Run a preliminary validation while the entry remains in Draft.
                You can correct data and run it again before submission.
              </p>
            </header>
            <div className="validation-version-banner">
              <span className={validationRun ? "current" : "pending"}>
                {persistedValidationRun?.status === "STALE"
                  ? "Results changed after the last validation. Run Check Results again before submitting."
                  : validationRun
                  ? `Last checked: ${resultEntryQuery.data?.monitoringPeriod.validationRunAt ? new Date(resultEntryQuery.data.monitoringPeriod.validationRunAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "just now"}`
                  : "Run checks before Review & Submit"}
              </span>
              <button
                disabled={workflowBusy || !canValidate || status !== "Draft"}
                onClick={runValidation}
              >
                <ShieldCheck size={16} />
                {validationRun ? "Run Again" : "Run Check"}
              </button>
            </div>
            <div className="validation-metric-grid" aria-label="Check results summary">
              <button className="passed" onClick={() => setFindingSeverityFilter("ALL")}><span>Passed</span><strong>{validationValidCount}</strong></button>
              <button className="warnings" onClick={() => setFindingSeverityFilter("WARNING")}><span>Warnings</span><strong>{validationWarningCount}</strong></button>
              <button className="errors" onClick={() => setFindingSeverityFilter("ERROR")}><span>Errors</span><strong>{persistedValidation?.errors ?? 0}</strong></button>
              <button className="errors" onClick={() => setFindingSeverityFilter("CRITICAL")}><span>Critical</span><strong>{persistedValidation?.critical ?? 0}</strong></button>
              <button className="missing" onClick={() => setFindingSeverityFilter("MISSING")}><span>Missing</span><strong>{persistedValidation?.missing ?? 0}</strong></button>
            </div>
            <div className="validation-layout">
              <div className="validation-summary">
                <h3>Validation Summary</h3>
                <p className="validation-summary-help">
                  Critical errors must be corrected. Warnings require review.
                  Missing results may continue but affect closure.
                </p>
                <h4>
                  <span>Critical Errors</span>
                  <button className="validation-info" type="button" aria-label="About critical errors" aria-describedby="critical-errors-help">
                    <CircleHelp size={14} />
                    <span id="critical-errors-help" role="tooltip">
                      <strong>Critical Error</strong>
                      Structural or invalid data, such as an invalid KPI code,
                      format, duplicate row, Pool, period, or required column.
                      Blocks submission and progression until corrected.
                    </span>
                  </button>
                </h4>
                <p className={criticalKpis.length ? "invalid" : "valid"}>
                  {(persistedValidation?.critical ?? 0) ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}{" "}
                  {persistedValidation?.critical ?? 0} not calculable KPI{persistedValidation?.critical === 1 ? "" : "s"}
                </p>
                <h4>
                  <span>Warnings</span>
                  <button className="validation-info" type="button" aria-label="About validation warnings" aria-describedby="warnings-help">
                    <CircleHelp size={14} />
                    <span id="warnings-help" role="tooltip">
                      <strong>Warning</strong>
                      A result can be processed but needs review, such as an
                      unusual value, range issue, or potential outlier. It does
                      not necessarily block submission.
                    </span>
                  </button>
                </h4>
                <p className="valid">
                  <CheckCircle2 size={16} />
                  {validationWarningCount} warning{validationWarningCount === 1 ? "" : "s"}
                </p>
                <h4>
                  <span>Missing Results</span>
                  <button className="validation-info" type="button" aria-label="About missing results" aria-describedby="missing-results-help">
                    <CircleHelp size={14} />
                    <span id="missing-results-help" role="tooltip">
                      <strong>Missing Result</strong>
                      Expected KPI results are absent. Preview and submission
                      may continue, but closure can require Close With
                      Exceptions and a justification.
                    </span>
                  </button>
                </h4>
                <p className="warning">
                  <AlertTriangle size={16} />
                  {persistedValidation?.missing ?? 0} missing result{persistedValidation?.missing === 1 ? "" : "s"}
                </p>
              </div>
              <div className={validationFindings.length ? "validation-errors" : "validation-errors clear"}>
                <h3>{validationFindings.length ? "Validation Results" : "Validation Passed"}</h3>
                {validationRun && !persistedValidationRun?.findings.length && <div className="validation-success-state"><CheckCircle2 size={34}/><strong>Validation Passed</strong><p>{validationValidCount} results passed. {persistedValidation?.scoring.calculated ?? 0} Calculated · {persistedValidation?.scoring.missing ?? 0} Missing · {persistedValidation?.scoring.notCalculable ?? 0} Not Calculable.</p><button className="entry-primary" onClick={() => setStep(3)}>Review &amp; Submit</button></div>}
                <div className="schedule-table-wrap">
                  <table className="scorecard-table validation-findings-table">
                    <thead>
                      <tr>
                        <SortableTableHeader active={validationSort.key === "row"} direction={validationSort.direction} onSort={() => sortValidationFindings("row")}>Row</SortableTableHeader>
                        <SortableTableHeader active={validationSort.key === "code"} direction={validationSort.direction} onSort={() => sortValidationFindings("code")}>KPI Code</SortableTableHeader>
                        <SortableTableHeader active={validationSort.key === "category"} direction={validationSort.direction} onSort={() => sortValidationFindings("category")}>Category</SortableTableHeader>
                        <SortableTableHeader active={validationSort.key === "error"} direction={validationSort.direction} onSort={() => sortValidationFindings("error")}>Error</SortableTableHeader>
                        <SortableTableHeader active={validationSort.key === "currentValue"} direction={validationSort.direction} onSort={() => sortValidationFindings("currentValue")}>Current Value</SortableTableHeader>
                        <SortableTableHeader active={validationSort.key === "expected"} direction={validationSort.direction} onSort={() => sortValidationFindings("expected")}>Expected</SortableTableHeader>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {validationFindings.map((finding) => (
                          <tr key={finding.id}>
                            <td>{finding.row}</td>
                            <td>{finding.code}</td>
                            <td>
                              <span
                                className={`validation-kind ${finding.category.toLowerCase()}`}
                              >
                                {finding.category}
                              </span>
                            </td>
                            <td>{finding.error}</td>
                            <td>{finding.currentValue}</td>
                            <td>{finding.expected}</td>
                            <td><button className="entry-secondary" onClick={() => focusFindingKpi(finding.code)}>Fix</button></td>
                          </tr>
                        ))}
                      {validationRun && !persistedValidationRun?.findings.length && (
                        <tr>
                          <td colSpan={7} className="validation-clear">
                            <CheckCircle2 size={16} />
                            No validation findings detected
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                {status === "Draft" ? (
                  <button
                    className="correction-button"
                    onClick={() => {
                      const code = validationFindings[0]?.code;
                      if (code) focusFindingKpi(code); else setStep(1);
                    }}
                  >
                    Back to Result Entry
                  </button>
                ) : status !== "Closed" ? (
                  <button
                    className="correction-button"
                    onClick={() =>
                      returnForCorrection(
                        criticalKpis[0]?.code ?? missingKpis[0]?.code,
                      )
                    }
                  >
                    Return for Correction
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {wizardStarted && step === 3 && (
          <div className="preview-step">
            <header>
              <div>
                <h2>Review &amp; Submit</h2>
                <p>
                  Review the captured results and validation findings before
                  submission.
                </p>
              </div>
              <div className="preview-view-filter">
                <span className="preview-view-label">Result View</span>
                <div className="preview-tabs" role="group" aria-label="Result view">
                <button
                  className={previewTab === "kpis" ? "active" : ""}
                  onClick={() => setPreviewTab("kpis")}
                >
                  KPI Results
                </button>
                <button
                  className={previewTab === "scorecards" ? "active" : ""}
                  onClick={() => setPreviewTab("scorecards")}
                >
                  ScoreCards Impact
                </button>
                </div>
              </div>
            </header>
            <div className="preview-metrics">
              <div className="validation-metric">
                <small>Validation</small>
                <strong>{validationLabel}</strong>
              </div>
              <div className="score-metric">
                <small>Estimated Pool Score</small>
                <strong>{estimatedPoolScore === null ? "—" : `${estimatedPoolScore.toFixed(2)}%`}</strong>
              </div>
              <div className="impact-metric">
                <small>ScoreCards Impacted</small>
                <strong>{liveScorecards.length}</strong>
              </div>
            </div>
            {previewTab === "kpis" ? (
              <div className="preview-kpi-results">
                <div className="manual-step-heading preview-table-heading">
                  <div><h3>KPI Results</h3><p>Review captured KPI values and their calculated status.</p></div>
                  <PreviewColumnSelect selected={visiblePreviewColumns} onChange={setVisiblePreviewColumns} onLimit={() => setShowPreviewColumnLimit(true)} />
                  <div className="manual-status-summary" aria-label="Preview result status summary">
                    <span className="entered"><i/>{manualStatusCounts.entered} Entered</span>
                    {manualStatusCounts.incorrect > 0 && <span className="incorrect"><i/>{manualStatusCounts.incorrect} Invalid Format</span>}
                    <span className="pending"><i/>{manualStatusCounts.pending} Pending</span>
                  </div>
                </div>
                <div className="manual-entry-toolbar preview-kpi-toolbar">
                  <label className="manual-entry-search"><Search size={17}/><input value={previewSearch} onChange={(event) => { setPreviewSearch(event.target.value); setPreviewPage(1); }} placeholder="Search KPI code, name, goal or data source..." /></label>
                  <ManualMultiSelect label="All traffic lights" options={[...new Set(activeKpiResults.map((kpi) => kpi.trafficLight))].sort().map((value) => ({ value, label: value }))} selected={previewTrafficLights} onChange={(values) => { setPreviewTrafficLights(values); setPreviewPage(1); }} />
                  <ManualMultiSelect label="All statuses" options={["Entered", "Invalid", "Pending"].map((value) => ({ value, label: value === "Invalid" ? "Invalid Format" : value }))} selected={previewStatuses} onChange={(values) => { setPreviewStatuses(values); setPreviewPage(1); }} />
                  <ManualMultiSelect label="All measurement units" options={manualUnitOptions} selected={previewUnits} onChange={(values) => { setPreviewUnits(values); setPreviewPage(1); }} />
                  <ManualMultiSelect label="All data sources" options={manualSourceOptions} selected={previewSources} onChange={(values) => { setPreviewSources(values); setPreviewPage(1); }} />
                </div>
                <div className="manual-entry-table-shell stable-table-shell">
                  <div className="manual-entry-table-wrap">
                <table className="manual-entry-table preview-results-table">
                  <colgroup>{previewColumns.filter((column) => visiblePreviewColumns.includes(column.key)).map((column) => <col className={`preview-column-${column.key}`} key={column.key}/>)}</colgroup>
                  <thead>
                    <tr>
                      {visiblePreviewColumns.includes("code") && <SortableTableHeader active={previewSort.key === "code"} direction={previewSort.direction} onSort={() => sortPreviewRows("code")}>KPI Code</SortableTableHeader>}
                      {visiblePreviewColumns.includes("name") && <SortableTableHeader active={previewSort.key === "name"} direction={previewSort.direction} onSort={() => sortPreviewRows("name")}>KPI Name</SortableTableHeader>}
                      {visiblePreviewColumns.includes("goal") && <SortableTableHeader active={previewSort.key === "goal"} direction={previewSort.direction} onSort={() => sortPreviewRows("goal")}>Goal</SortableTableHeader>}
                      {visiblePreviewColumns.includes("unit") && <SortableTableHeader active={previewSort.key === "unit"} direction={previewSort.direction} onSort={() => sortPreviewRows("unit")}>Measurement Unit</SortableTableHeader>}
                      {visiblePreviewColumns.includes("dataSource") && <SortableTableHeader active={previewSort.key === "dataSource"} direction={previewSort.direction} onSort={() => sortPreviewRows("dataSource")}>Data Source</SortableTableHeader>}
                      {visiblePreviewColumns.includes("result") && <SortableTableHeader active={previewSort.key === "result"} direction={previewSort.direction} onSort={() => sortPreviewRows("result")}>Result</SortableTableHeader>}
                      {visiblePreviewColumns.includes("compliance") && <SortableTableHeader active={previewSort.key === "compliance"} direction={previewSort.direction} onSort={() => sortPreviewRows("compliance")}>Compliance</SortableTableHeader>}
                      {visiblePreviewColumns.includes("score") && <SortableTableHeader active={previewSort.key === "score"} direction={previewSort.direction} onSort={() => sortPreviewRows("score")}>Score</SortableTableHeader>}
                      {visiblePreviewColumns.includes("comment") && <SortableTableHeader active={previewSort.key === "comment"} direction={previewSort.direction} onSort={() => sortPreviewRows("comment")}>Comment</SortableTableHeader>}
                      {visiblePreviewColumns.includes("trafficLight") && <SortableTableHeader active={previewSort.key === "trafficLight"} direction={previewSort.direction} onSort={() => sortPreviewRows("trafficLight")}>Traffic Light</SortableTableHeader>}
                      {visiblePreviewColumns.includes("status") && <SortableTableHeader active={previewSort.key === "status"} direction={previewSort.direction} onSort={() => sortPreviewRows("status")}>Result Status</SortableTableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((kpi) => {
                      const resultStatus = manualStatus(kpi.code);
                      return (
                      <tr key={kpi.code}>
                        {visiblePreviewColumns.includes("code") && <td><span className="code-pill">{kpi.code}</span></td>}
                        {visiblePreviewColumns.includes("name") && <td className="manual-kpi-name">{kpi.name}</td>}
                        {visiblePreviewColumns.includes("goal") && <td>{kpi.goal}</td>}
                        {visiblePreviewColumns.includes("unit") && <td><span className="manual-unit-label">{measurementUnitLabel(kpi.unit)}</span></td>}
                        {visiblePreviewColumns.includes("dataSource") && <td>{kpi.dataSource}</td>}
                        {visiblePreviewColumns.includes("result") && <td>{draft.results[kpi.code] || "—"}</td>}
                        {visiblePreviewColumns.includes("compliance") && <td>
                          {kpi.compliance === null ? "—" : `${kpi.compliance}%`}
                        </td>}
                        {visiblePreviewColumns.includes("score") && <td>{kpi.score === null ? "—" : `${kpi.score}%`}</td>}
                        {visiblePreviewColumns.includes("comment") && <td className="preview-comment-cell"><div className="preview-comment-readonly"><span title={draft.comments[kpi.code] ?? ""}>{draft.comments[kpi.code] || "—"}</span>{(draft.comments[kpi.code]?.length ?? 0) > 80 && <button type="button" onClick={() => { setCommentPreviewReadOnly(true); setExpandedCommentCode(kpi.code); }} aria-label={`Open full comment for ${kpi.code}`} title="View full comment"><Maximize2 size={15}/></button>}</div></td>}
                        {visiblePreviewColumns.includes("trafficLight") && <td>
                          <span
                            className={`traffic-status ${kpi.trafficLight.toLowerCase()}`}
                          >
                            <i />
                            {kpi.trafficLight}
                          </span>
                        </td>}
                        {visiblePreviewColumns.includes("status") && <td><span className={`manual-result-status ${resultStatus.toLowerCase()}`}><i/>{resultStatus}</span></td>}
                      </tr>
                    );})}
                    {!previewRows.length && <tr><td colSpan={visiblePreviewColumns.length} className="manual-entry-empty">No KPI results match the selected filters.</td></tr>}
                  </tbody>
                </table>
                  </div>
                  <footer className="manual-entry-pagination">
                    <span>Showing <strong>{previewFilteredRows.length ? previewPageStart + 1 : 0}-{Math.min(previewPageStart + previewPageSize, previewFilteredRows.length)}</strong> of <strong>{previewFilteredRows.length}</strong> KPI results</span>
                    <RowsPerPageSelect value={previewPageSize} onChange={(value) => { setPreviewPageSize(value); setPreviewPage(1); }} />
                    <PaginationControls page={previewPage} totalPages={previewTotalPages} onPage={setPreviewPage} label="Preview results pagination" className="preview-pagination-controls" />
                  </footer>
                </div>
              </div>
            ) : (
              <div className="preview-kpi-results scorecard-impact-results">
                <div className="manual-step-heading preview-table-heading">
                  <div><h3>ScoreCards Impact</h3><p>ScoreCards that consume KPIs from this Pool and their result-entry progress.</p></div>
                  <ScorecardPreviewColumnSelect selected={visibleScorecardColumns} onChange={setVisibleScorecardColumns} />
                  <div className="manual-status-summary scorecard-progress-summary" aria-label="ScoreCard KPI progress summary">
                    <span className="entered"><i/>{scorecardCompletedCount} Completed</span>
                    <span className="pending"><i/>{scorecardMissingCount} With Missing</span>
                  </div>
                </div>
                <div className="manual-entry-toolbar scorecard-impact-toolbar">
                  <label className="manual-entry-search"><Search size={17}/><input value={scorecardSearch} onChange={(event) => { setScorecardSearch(event.target.value); setScorecardPage(1); }} placeholder="Search ScoreCard code, name or department..." /></label>
                  <ManualMultiSelect label="All departments" options={scorecardDepartmentOptions} selected={scorecardDepartments} onChange={(values) => { setScorecardDepartments(values); setScorecardPage(1); }} />
                  <ManualMultiSelect label="All statuses" options={scorecardStatusOptions} selected={scorecardStatuses} onChange={(values) => { setScorecardStatuses(values); setScorecardPage(1); }} />
                  <ManualMultiSelect label="All KPI progress" options={["Completed", "With Missing"].map((value) => ({ value, label: value }))} selected={scorecardKpiStatuses} onChange={(values) => { setScorecardKpiStatuses(values); setScorecardPage(1); }} />
                </div>
                <div className="manual-entry-table-shell stable-table-shell"><div className="manual-entry-table-wrap">
                <table className="manual-entry-table scorecard-impact-table">
                  <thead>
                    <tr>
                      <th className="scorecard-expand-heading">Expand</th>
                      {visibleScorecardColumns.includes("scorecard") && <SortableTableHeader active={scorecardSort.key === "scorecard"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("scorecard")}>ScoreCard</SortableTableHeader>}
                      {visibleScorecardColumns.includes("departments") && <SortableTableHeader active={scorecardSort.key === "departments"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("departments")}>Departments</SortableTableHeader>}
                      {visibleScorecardColumns.includes("expected") && <SortableTableHeader active={scorecardSort.key === "expected"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("expected")}>KPIs Expected</SortableTableHeader>}
                      {visibleScorecardColumns.includes("entered") && <SortableTableHeader active={scorecardSort.key === "entered"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("entered")}>KPIs Entered</SortableTableHeader>}
                      {visibleScorecardColumns.includes("missing") && <SortableTableHeader active={scorecardSort.key === "missing"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("missing")}>Missing</SortableTableHeader>}
                      {visibleScorecardColumns.includes("previewScore") && <SortableTableHeader active={scorecardSort.key === "previewScore"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("previewScore")}>Preview Score</SortableTableHeader>}
                      {visibleScorecardColumns.includes("status") && <SortableTableHeader active={scorecardSort.key === "status"} direction={scorecardSort.direction} onSort={() => sortScorecardRows("status")}>Status</SortableTableHeader>}
                    </tr>
                  </thead>
                  <tbody>
                    {pagedScorecardRows.map((row) => {
                      const expanded = expandedScorecards.includes(row.scorecard.code);
                      const kpiSearch = scorecardKpiSearches[row.scorecard.code] ?? "";
                      const kpiSort = scorecardKpiSorts[row.scorecard.code] ?? { key: "code" as const, direction: "asc" as const };
                      const kpiSortValue = (kpi: (typeof row.scorecard.kpis)[number], key: ScorecardKpiSortKey) => {
                        if (key === "result") return draft.results[kpi.code] ?? "";
                        if (key === "weight") return kpi.weight ?? -1;
                        if (key === "weightedValue") return kpi.score === null || kpi.weight === null ? -1 : (kpi.score * kpi.weight) / 100;
                        if (key === "entryStatus") return manualStatus(kpi.code);
                        return kpi[key] ?? "";
                      };
                      const visibleScorecardKpis = row.scorecard.kpis.filter((kpi) => !kpiSearch.trim() || `${kpi.code} ${kpi.name} ${kpi.unit} ${kpi.goal} ${draft.results[kpi.code] ?? ""} ${manualStatus(kpi.code)} ${kpi.trafficLight}`.toLowerCase().includes(kpiSearch.trim().toLowerCase())).sort((left, right) => compareSortValues(kpiSortValue(left, kpiSort.key), kpiSortValue(right, kpiSort.key), kpiSort.direction));
                      const sortScorecardKpis = (key: ScorecardKpiSortKey) => setScorecardKpiSorts((current) => ({ ...current, [row.scorecard.code]: { key, direction: kpiSort.key === key && kpiSort.direction === "asc" ? "desc" : "asc" } }));
                      return <Fragment key={row.scorecard.code}>
                      <tr>
                        <td className="scorecard-expand-cell"><button type="button" className={expanded ? "scorecard-expand-button expanded" : "scorecard-expand-button"} aria-label={`${expanded ? "Collapse" : "Expand"} ${row.scorecard.name}`} aria-expanded={expanded} onClick={() => setExpandedScorecards((current) => current.includes(row.scorecard.code) ? current.filter((code) => code !== row.scorecard.code) : [...current, row.scorecard.code])}>{expanded ? <ChevronDown size={17}/> : <ChevronRight size={17}/>}</button></td>
                        {visibleScorecardColumns.includes("scorecard") && <td><span className="code-pill">{row.scorecard.code}</span><strong className="scorecard-impact-name">{row.scorecard.name}</strong></td>}
                        {visibleScorecardColumns.includes("departments") && <td>{row.scorecard.departments.join(", ")}</td>}
                        {visibleScorecardColumns.includes("expected") && <td>{row.expected}</td>}
                        {visibleScorecardColumns.includes("entered") && <td>{row.entered}</td>}
                        {visibleScorecardColumns.includes("missing") && <td>{row.missing}</td>}
                        {visibleScorecardColumns.includes("previewScore") && <td>{row.scorecard.previewScore.toFixed(2)}%</td>}
                        {visibleScorecardColumns.includes("status") && <td><span className={`manual-result-status ${row.kpiStatus === "Completed" ? "entered" : "pending"}`}><i/>{row.kpiStatus}</span></td>}
                      </tr>
                      {expanded && <tr className="scorecard-kpi-detail-row"><td colSpan={visibleScorecardColumns.length + 1}>
                        <section className="scorecard-kpi-detail">
                          <header><div><h4>Selected KPIs</h4><p>KPIs consumed by this ScoreCard <span className={`scorecard-results-entered-badge ${row.missing ? "pending" : "completed"}`}>{row.entered} of {row.expected} results entered</span></p></div></header>
                          <label className="attached-kpi-search scorecard-impact-kpi-search"><Search size={16}/><input value={kpiSearch} onChange={(event) => setScorecardKpiSearches((current) => ({ ...current, [row.scorecard.code]: event.target.value }))} placeholder="Search KPIs in this Scorecard..."/>{kpiSearch && <button type="button" onClick={() => setScorecardKpiSearches((current) => ({ ...current, [row.scorecard.code]: "" }))} aria-label={`Clear KPI search for ${row.scorecard.code}`}><X size={15}/></button>}</label>
                          <div className="scorecard-kpi-detail-table-wrap"><table className="scorecard-kpi-detail-table"><thead><tr>
                            <SortableTableHeader active={kpiSort.key === "code"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("code")}>KPI Code</SortableTableHeader><SortableTableHeader active={kpiSort.key === "name"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("name")}>KPI Name</SortableTableHeader><SortableTableHeader active={kpiSort.key === "unit"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("unit")}>Unit</SortableTableHeader><SortableTableHeader active={kpiSort.key === "goal"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("goal")}>Goal</SortableTableHeader><SortableTableHeader active={kpiSort.key === "result"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("result")}>Current Result</SortableTableHeader><SortableTableHeader active={kpiSort.key === "score"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("score")}>Score</SortableTableHeader><SortableTableHeader active={kpiSort.key === "weight"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("weight")}>Assigned Weight</SortableTableHeader><SortableTableHeader active={kpiSort.key === "weightedValue"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("weightedValue")}>Weighted Value</SortableTableHeader><SortableTableHeader active={kpiSort.key === "entryStatus"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("entryStatus")}>Entry Status</SortableTableHeader><SortableTableHeader active={kpiSort.key === "trafficLight"} direction={kpiSort.direction} onSort={() => sortScorecardKpis("trafficLight")}>Traffic Light</SortableTableHeader>
                          </tr></thead><tbody>
                            {visibleScorecardKpis.map((kpi) => { const resultStatus = manualStatus(kpi.code); const weightedValue = kpi.score === null || kpi.weight === null ? null : (kpi.score * kpi.weight) / 100; return <tr key={kpi.code}><td><span className="code-pill">{kpi.code}</span></td><td>{kpi.name}</td><td>{kpi.unit}</td><td>{kpi.goal}</td><td>{draft.results[kpi.code] || "—"}</td><td>{kpi.score === null ? "—" : `${kpi.score.toFixed(2)}%`}</td><td>{kpi.weight === null ? <span className="no-weight">Not assigned</span> : <strong>{kpi.weight}%</strong>}</td><td>{weightedValue === null ? "—" : `${weightedValue.toFixed(2)}%`}</td><td><span className={`kpi-entry-status-badge ${resultStatus.toLowerCase()}`}><i/>{resultStatus}</span></td><td><span className={`traffic-status ${kpi.trafficLight.toLowerCase()}`}><i/>{kpi.trafficLight}</span></td></tr>; })}
                          </tbody></table>{!visibleScorecardKpis.length && <p className="schedule-no-results">No KPIs match this search.</p>}</div>
                        </section>
                      </td></tr>}
                      </Fragment>;
                    })}
                    {!pagedScorecardRows.length && <tr><td colSpan={visibleScorecardColumns.length + 1} className="manual-entry-empty">No ScoreCards match the selected filters.</td></tr>}
                  </tbody>
                </table>
                  </div>
                  <footer className="manual-entry-pagination">
                    <span>Showing <strong>{filteredScorecardRows.length ? scorecardPageStart + 1 : 0}-{Math.min(scorecardPageStart + scorecardPageSize, filteredScorecardRows.length)}</strong> of <strong>{filteredScorecardRows.length}</strong> ScoreCards</span>
                    <RowsPerPageSelect value={scorecardPageSize} onChange={(value) => { setScorecardPageSize(value); setScorecardPage(1); }} />
                    <PaginationControls page={scorecardPage} totalPages={scorecardTotalPages} onPage={setScorecardPage} label="ScoreCards pagination" className="scorecard-entry-pagination-controls" />
                  </footer>
                </div>
              </div>
            )}
          </div>
        )}

        {wizardStarted && step === 4 && (
          <div className="validation-workflow-step">
            <header><span><CheckCircle2 size={23}/></span><div><h2>Approval</h2><p>Review the submitted Monitoring Period and decide whether it is ready for closure.</p></div></header>
            {status === "Submitted" ? <div className="validation-decision-card"><span className="result-draft-state status-submitted">SUBMITTED</span><h3>Results submitted</h3><p>Waiting for approval. Results cannot be modified unless they are returned for correction.</p><label className="validation-return-reason"><span>Correction request</span><textarea value={returnReason} onChange={(event)=>setReturnReason(event.target.value)} placeholder="Describe the changes required before resubmission..."/></label><div><button className="entry-secondary" disabled={workflowBusy||returnReason.trim().length<10} onClick={() => returnForCorrection()}>Return for Correction</button><button className="entry-primary validate-submitted" disabled={workflowBusy||!canValidate || hasBlockingErrors} onClick={approveSubmittedResults}>Approve Results</button></div></div> : status === "Validated" ? <div className="validation-decision-card validated"><CheckCircle2 size={38}/><h3>Results approved</h3><p>This Monitoring Period is ready to be closed.</p><button className="entry-primary" onClick={() => setStep(5)}>Continue to Close Period</button></div> : status === "Closed" ? <div className="validation-decision-card validated"><LockKeyhole size={38}/><h3>Period closed</h3><p>Approval and results are historical and read-only.</p><button className="entry-primary" onClick={() => setStep(5)}>View Closure</button></div> : <div className="validation-decision-card"><AlertTriangle size={32}/><h3>Submission required</h3><p>Review and submit results before approval.</p><button className="entry-secondary" onClick={() => setStep(3)}>Back to Review &amp; Submit</button></div>}
          </div>
        )}

        {wizardStarted && step === 5 && (
          <div className="close-step">
            <header>
              <span>
                <LockKeyhole size={23} />
              </span>
              <div>
                <h2>
                  {status === "Closed"
                    ? "Period Closed"
                    : "Close Period Confirmation"}
                </h2>
                <p>
                  {status === "Closed"
                    ? "Results are locked and available for historical consultation."
                    : `Review final coverage for ${pool.name} · ${inputPeriod}.`}
                </p>
              </div>
            </header>
            {status === "Closed" ? (
              <div className="closure-success">
                <CheckCircle2 size={42} />
                <h3>{inputPeriod} closed successfully</h3>
                <p>The period and its historical results are now read-only.</p>
                <button
                  onClick={() => navigate("/app/monitoring-results/overview")}
                >
                  Return to Monitoring Overview
                </button>
              </div>
            ) : (
              <>
                {hasBlockingErrors ? (
                  <div className="closure-blocked">
                    <XCircle size={18} />
                    <span>Resolve validation errors before closing.</span>
                  </div>
                ) : (
                  <div className="closure-warning">
                    <AlertTriangle size={18} />
                    <span>
                      After closing, results become read-only historical data.
                    </span>
                  </div>
                )}
                <div className="closure-overview-sections">
                  <section className="closure-overview-section">
                    <header><h3>Results &amp; Validation</h3><span>Period snapshot</span></header>
                    <dl>
                      <div><dt>Entered KPI Results</dt><dd>{entered}/{activeKpiResults.length}</dd></div>
                      <div><dt>Missing Results</dt><dd>{missing}</dd></div>
                      <div className="full validation-status-fact"><dt>Validation Status</dt><dd><span>{validationLabel}</span></dd></div>
                    </dl>
                  </section>
                  <section className="closure-overview-section">
                    <header><h3>Score &amp; Closure</h3><span>Closure context</span></header>
                    <dl>
                      <div><dt>Estimated Pool Score</dt><dd>{estimatedPoolScore === null ? "—" : `${estimatedPoolScore.toFixed(2)}%`}</dd></div>
                      <div><dt>Attached ScoreCards</dt><dd>{liveScorecards.length}</dd></div>
                      <div className={`full closure-mode-fact ${missing ? "exception" : "normal"}`}><dt>Closure Mode</dt><dd><span>{missing ? "With Exceptions" : "Normal"}</span></dd></div>
                    </dl>
                  </section>
                </div>
                <section className={showMissingDetails ? "closure-missing-detail-link expanded" : "closure-missing-detail-link"}><div><strong>Missing Results ({missing})</strong><span>{missing ? "Review the KPIs that will remain without a result." : "All expected KPI results have been entered."}</span></div><button type="button" disabled={!missing} aria-expanded={showMissingDetails} onClick={() => setShowMissingDetails((current) => !current)}>{showMissingDetails ? "Hide details" : "View details"}<ChevronDown size={15}/></button></section>
                {showMissingDetails && <div className="inline-missing-results"><table><thead><tr>{([ ["code", "KPI Code"], ["name", "KPI Name"], ["unit", "Measurement Unit"], ["goal", "Goal"], ["dataSource", "Data Source"], ["result", "Result"], ["validation", "Validation"], ["trafficLight", "Traffic Light"] ] as const).map(([key, label]) => <SortableTableHeader key={key} active={missingResultSort.key === key} direction={missingResultSort.direction} onSort={() => setMissingResultSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }))}>{label}</SortableTableHeader>)}</tr></thead><tbody>{sortedMissingKpis.map((kpi) => <tr key={kpi.code}><td><span className="code-pill">{kpi.code}</span></td><td>{kpi.name}</td><td>{kpi.unit}</td><td>{kpi.goal}</td><td>{kpi.dataSource}</td><td>{draft.results[kpi.code]?.trim() || "—"}</td><td><span className="validation-kind missing">Missing</span></td><td><span className={`traffic-status ${kpi.trafficLight.toLowerCase()}`}><i/>{kpi.trafficLight}</span></td></tr>)}</tbody></table></div>}
                <section className="closure-visual-summary" aria-labelledby="closure-visual-summary-title">
                  <header>
                    <div><h3 id="closure-visual-summary-title">Visual Summary</h3><p>Review the current period from the perspective you need.</p></div>
                    <div className="closure-preview-tabs" role="group" aria-label="Visual summary view">
                      {([ ["COMPLETION", "Results Completion"], ["TRAFFIC_LIGHT", "Traffic Light Summary"], ["VALIDATION", "Validation Summary"], ["ALL", "View All"] ] as const).map(([value, label]) => <button key={value} type="button" className={closurePreview === value ? "active" : ""} aria-pressed={closurePreview === value} onClick={() => setClosurePreview(value)}>{label}</button>)}
                    </div>
                  </header>
                  <div className={closurePreview === "ALL" ? "closure-preview-content all" : "closure-preview-content"}>
                {(closurePreview === "COMPLETION" || closurePreview === "ALL") && <section className="closure-completion" aria-labelledby="results-completion-title">
                  <header><div><h3 id="results-completion-title">Results Completion</h3><p>{entered} entered · {missing} missing</p></div><strong>{entered}/{activeKpiResults.length} · {completionPercentage}%</strong></header>
                  <div className="closure-completion-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercentage} aria-label={`${completionPercentage}% results completed`}><span style={{ width: `${completionPercentage}%` }}/></div>
                </section>}
                <div className="closure-visual-grid">
                  {(closurePreview === "TRAFFIC_LIGHT" || closurePreview === "ALL") && <section className="closure-visual-card traffic"><header><h3>Traffic Light Summary</h3><span className="visual-count-badge">{activeKpiResults.length} KPIs</span></header><div className="closure-stacked-bar" aria-label={`${trafficLightCounts.green} green, ${trafficLightCounts.yellow} yellow, ${trafficLightCounts.red} red`}><i className="green" style={{ flex: trafficLightCounts.green }}/><i className="yellow" style={{ flex: trafficLightCounts.yellow }}/><i className="red" style={{ flex: trafficLightCounts.red }}/></div><dl><div><dt><i className="green"/>Green KPIs</dt><dd>{trafficLightCounts.green}</dd></div><div><dt><i className="yellow"/>Yellow KPIs</dt><dd>{trafficLightCounts.yellow}</dd></div><div><dt><i className="red"/>Red KPIs</dt><dd>{trafficLightCounts.red}</dd></div></dl></section>}
                  {(closurePreview === "VALIDATION" || closurePreview === "ALL") && <section className="closure-visual-card validation"><header><h3>Validation Summary</h3><span className={`visual-validation-badge ${hasBlockingErrors ? "critical" : validationWarningCount || missing ? "warning" : "valid"}`}>{validationLabel}</span></header><dl><div className="valid"><dt>Valid</dt><dd>{validationValidCount}</dd></div><div className="warnings"><dt>Warnings</dt><dd>{validationWarningCount}</dd></div><div className="missing"><dt>Missing</dt><dd>{missing}</dd></div><div className="critical"><dt>Critical Errors</dt><dd>{criticalKpis.length}</dd></div></dl></section>}
                </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </section>

      {resolverToast && <ActionToast message={resolverToast} tone="warning" onClose={() => setResolverToast("")} />}

      {wizardStarted && status !== "Closed" && (
        <footer className="entry-footer">
          <div className="entry-footer-state">
            {step === 1 && (unsavedChangeCount ? <strong>{unsavedChangeCount} unsaved change{unsavedChangeCount === 1 ? "" : "s"}</strong> : <span><CheckCircle2 size={15}/> All changes saved</span>)}
          </div>
          <div className="entry-footer-actions">
          {step > 1 && step < 4 && <button className="entry-secondary" onClick={() => setStep(step === 2 ? 1 : 2)}>{step === 2 ? "Back to Result Entry" : "Back to Check Results"}</button>}
          {step === 1 && <button className="entry-secondary" disabled={workflowBusy || readOnly || unsavedChangeCount === 0} onClick={() => setShowSaveAllConfirm(true)}>Save Changes</button>}
          {step < 3 && (
            <button
              className="entry-primary"
              disabled={!stepAvailable(step + 1) || (step === 1 && unsavedChangeCount > 0)}
              onClick={goNext}
            >
              Next: {step === 1 ? "Check Results" : "Review & Submit"}
            </button>
          )}
          {step === 3 && status === "Draft" && <button className="entry-primary" disabled={workflowBusy || !validationRun || hasBlockingErrors} onClick={() => setShowSubmitConfirmation(true)}>Submit Results</button>}
          {step === 3 && status !== "Draft" && <button className="entry-primary" onClick={() => setStep(4)}>Continue to Approval</button>}
          {step === 4 && status === "Validated" && (
            <button
              className="entry-primary"
              disabled={!stepAvailable(5)}
              onClick={() => setStep(5)}
            >
              Continue to Close Period
            </button>
          )}
          {step === 5 && (
            <button
              className={missing ? "entry-close exception" : "entry-close"}
              disabled={workflowBusy || !stepAvailable(5) || !canClose || (missing > 0 && !canCloseWithExceptions)}
              onClick={() => { setCloseDialogPosition({ x: 0, y: 0 }); setShowCloseConfirmation(true); }}
            >
              {missing ? "Close with Exceptions" : "Close Period"}
            </button>
          )}
          </div>
        </footer>
      )}

      {showSubmitConfirmation && selectedMonitoringPeriod && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSubmitConfirmation(false); }}>
          <section className="entry-dialog submit-results-dialog" role="dialog" aria-modal="true" aria-labelledby="submit-results-title" onKeyDown={(event) => { if (event.key === "Escape") setShowSubmitConfirmation(false); }}>
            <button className="entry-dialog-close" aria-label="Cancel submission" onClick={() => setShowSubmitConfirmation(false)}><X size={17}/></button>
            <CheckCircle2 size={32}/><h2 id="submit-results-title">Submit {selectedMonitoringPeriod.periodLabel} Results?</h2><p>After submission, results become read-only. They can only be modified again if the Monitoring Period is returned for correction.</p>
            <footer><button className="entry-secondary" onClick={() => setShowSubmitConfirmation(false)}>Cancel</button><button className="entry-primary" onClick={submitResults}>Submit Results</button></footer>
          </section>
        </div>
      )}

      {showCloseConfirmation && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCloseConfirmation(false); }}>
          <section className={`entry-dialog close-period-dialog ${missing ? "with-exceptions" : "normal"}`} style={{ transform: `translate(${closeDialogPosition.x}px, ${closeDialogPosition.y}px)` }} role="dialog" aria-modal="true" aria-labelledby="close-period-dialog-title" onKeyDown={(event) => { if (event.key === "Escape") setShowCloseConfirmation(false); }}>
            <button className="entry-dialog-close" aria-label="Cancel period closure" onClick={() => setShowCloseConfirmation(false)}><X size={17}/></button>
            <div className="close-dialog-drag-handle" onPointerDown={(event) => { closeDialogDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: closeDialogPosition.x, originY: closeDialogPosition.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { const drag = closeDialogDrag.current; if (!drag || drag.pointerId !== event.pointerId) return; setCloseDialogPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }); }} onPointerUp={(event) => { closeDialogDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { closeDialogDrag.current = null; }}>
              {missing ? <AlertTriangle size={30}/> : <LockKeyhole size={30}/>}<h2 id="close-period-dialog-title">{missing ? "Close Period With Exceptions?" : "Close Period?"}</h2>
            </div>
            <div className="close-dialog-context"><strong>{pool.name}</strong><span>{inputPeriod}</span></div>
            {missing ? <p className="close-dialog-alert"><AlertTriangle size={17}/>{missing} KPI result{missing === 1 ? " is" : "s are"} still missing.</p> : <p className="close-dialog-complete"><CheckCircle2 size={17}/>{entered} / {activeKpiResults.length} results entered</p>}
            <dl className="close-dialog-summary"><div><dt>Results entered</dt><dd>{entered}/{activeKpiResults.length}</dd></div>{missing > 0 && <div><dt>Missing results</dt><dd>{missing}</dd></div>}<div><dt>Validation</dt><dd>{missing ? validationLabel : "Validated"}</dd></div><div><dt>Estimated score</dt><dd>{estimatedPoolScore === null ? "—" : `${estimatedPoolScore.toFixed(2)}%`}</dd></div></dl>
            {missing ? <label className="close-dialog-justification"><span>Exception justification</span><textarea autoFocus value={closureComment} onChange={(event) => setClosureComment(event.target.value)} placeholder="Explain why this period can be closed with missing results..."/></label> : <p className="close-dialog-note">After closing, results will become read-only historical data.</p>}
            {missing > 0 && <p className="close-dialog-note">Closing with exceptions will preserve the missing results and justification in the historical record.</p>}
            <footer><button type="button" className="entry-secondary" onClick={() => setShowCloseConfirmation(false)}>Cancel</button><button type="button" className={missing ? "entry-close exception" : "entry-close"} disabled={missing > 0 && !closureComment.trim()} onClick={closePeriod}>{missing ? "Close With Exceptions" : "Close Period"}</button></footer>
          </section>
        </div>
      )}

      {showPreviewColumnLimit && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPreviewColumnLimit(false); }}>
          <section className="entry-dialog preview-column-limit-dialog" role="dialog" aria-modal="true" aria-labelledby="preview-column-limit-title" onKeyDown={(event) => { if (event.key === "Escape") setShowPreviewColumnLimit(false); }}>
            <button className="entry-dialog-close" aria-label="Close column limit message" onClick={() => setShowPreviewColumnLimit(false)}><X size={17}/></button>
            <AlertTriangle size={30}/>
            <h2 id="preview-column-limit-title">Column Limit Reached</h2>
            <p>You can display up to 9 columns at a time. Hide one of the currently visible columns before selecting another.</p>
            <div className="preview-column-limit-count"><Settings2 size={18}/><span><strong>{visiblePreviewColumns.length} of 9</strong> columns selected</span></div>
            <footer><button type="button" className="entry-primary" onClick={() => setShowPreviewColumnLimit(false)}>Got It</button></footer>
          </section>
        </div>
      )}

      {showSaveAllConfirm && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSaveAllConfirm(false); }}>
          <section className="entry-dialog manual-save-dialog" role="dialog" aria-modal="true" aria-labelledby="save-all-title" onKeyDown={(event) => { if (event.key === "Escape") setShowSaveAllConfirm(false); }}>
            <button className="entry-dialog-close" aria-label="Close save confirmation" onClick={() => setShowSaveAllConfirm(false)}><X size={17}/></button>
            <CheckCircle2 size={28}/>
            <h2 id="save-all-title">Save Result Changes?</h2>
            <p>Review this quick summary before saving the current Result and Comment changes to the Draft.</p>
            <div className="manual-save-summary">
              <article className="entered"><strong>{manualStatusCounts.entered}</strong><span>Entered</span></article>
              <article className="incorrect"><strong>{manualStatusCounts.incorrect}</strong><span>Invalid Format</span></article>
              <article className="pending"><strong>{manualStatusCounts.pending}</strong><span>Pending</span></article>
            </div>
            <p className="manual-save-note">Invalid formats need correction. Pending results may continue but affect validation and closure.</p>
            <footer><button className="entry-secondary" onClick={() => setShowSaveAllConfirm(false)}>Cancel</button><button className="entry-primary" onClick={saveAllManualChanges}>Save Changes</button></footer>
          </section>
        </div>
      )}

      {expandedCommentKpi && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setExpandedCommentCode(null); setCommentPreviewReadOnly(false); } }}>
          <section className="entry-dialog comment-dialog" role="dialog" aria-modal="true" aria-labelledby="comment-dialog-title" onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setExpandedCommentCode(null); setCommentPreviewReadOnly(false); } }}>
            <button className="entry-dialog-close" aria-label="Close comment editor" onClick={() => { setExpandedCommentCode(null); setCommentPreviewReadOnly(false); }}><X size={17}/></button>
            <Maximize2 size={25}/>
            <h2 id="comment-dialog-title">Edit Comment · {expandedCommentKpi.code}</h2>
            <p>{expandedCommentKpi.name}</p>
            <textarea autoFocus readOnly={commentPreviewReadOnly} value={draft.comments[expandedCommentKpi.code] ?? ""} onChange={(event) => updateManualField(expandedCommentKpi.code, "comment", event.target.value)} placeholder="Add optional comment..." />
            <footer>
              <button className="entry-secondary" onClick={() => { setExpandedCommentCode(null); setCommentPreviewReadOnly(false); }}>{commentPreviewReadOnly ? "Close" : "Cancel"}</button>
              {!commentPreviewReadOnly && <button className="entry-primary" onClick={() => setExpandedCommentCode(null)}>Save Comment</button>}
            </footer>
          </section>
        </div>
      )}

      {switchTarget && (
        <div className="entry-dialog-backdrop" role="presentation">
          <section
            className="entry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-title"
          >
            <button
              className="entry-dialog-close"
              aria-label="Close dialog"
              onClick={() => setSwitchTarget(null)}
            >
              <X size={17} />
            </button>
            <AlertTriangle size={28} />
            <h2 id="unsaved-title">You have unsaved changes.</h2>
            <p>
              Choose how to handle the current manual edits before switching
              capture method.
            </p>
            <footer>
              <button
                className="entry-secondary"
                onClick={() => setSwitchTarget(null)}
              >
                Cancel
              </button>
              <button
                className="entry-secondary danger"
                onClick={discardAndSwitch}
              >
                Discard Changes
              </button>
            </footer>
          </section>
        </div>
      )}

      {showImportSummary && (
        <div className="entry-dialog-backdrop" role="presentation">
          <section
            className="entry-dialog import-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="import-title"
          >
            <button
              className="entry-dialog-close"
              aria-label="Close dialog"
              onClick={() => setShowImportSummary(false)}
            >
              <X size={17} />
            </button>
            <FileSpreadsheet size={29} />
            <h2 id="import-title">Import Summary</h2>
            <div className="import-summary-counts">
              <span>
                <strong>{excelPreview?.summary.newValues ?? 0}</strong> new results
              </span>
              <span>
                <strong>{excelPreview?.summary.existingSame ?? 0}</strong> unchanged
              </span>
              <span>
                <strong>{excelPreview?.summary.existingDifferent ?? 0}</strong> existing result
                {excelPreview?.summary.existingDifferent === 1 ? "" : "s"} will be updated
              </span>
            </div>
            <div className="import-change-list">
              {excelPreview?.rows.filter((item) => item.classification === "NEW_VALUE" || item.classification === "DIFFERENT_VALUE").map((item) => (
                <div key={item.configCode}>
                  <strong>{item.configCode} · {item.kpiCode}</strong>
                  <span>{item.classification === "NEW_VALUE" ? "New value" : "Existing value will change"}</span>
                  <span>Excel: {item.resultValue}</span>
                </div>
              ))}
            </div>
            <p>{excelPreview?.summary.blankPending ?? 0} blank/pending · {excelPreview?.summary.invalidRows ?? 0} invalid. Empty Excel rows do not delete existing Draft values.</p>
            {excelError && <p className="result-entry-live-error" role="alert">{excelError}</p>}
            <footer>
              <button
                className="entry-secondary"
                onClick={() => setShowImportSummary(false)}
              >
                Cancel Import
              </button>
              <button className="entry-primary" disabled={excelBusy || !excelPreview?.changes.length || Boolean(excelPreview?.summary.invalidRows)} onClick={confirmImport}>
                {excelBusy ? "Importing…" : "Confirm Import"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
