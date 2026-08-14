import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import {
  attachedScorecards,
  kpiResults,
  monitoringPools,
} from "./monitoring-results.data";
import { saveMonitoringPeriodClosure } from "./monitoring-period-state";
import "./monitoring-results.css";

type InputMethod = "manual" | "excel";
type EntryWorkflowStatus = "Draft" | "Submitted" | "Validated" | "Closed";
type ResultSource = "MANUAL" | "EXCEL";
type PermissionCode =
  | "MONITORING_ENTER_RESULTS"
  | "MONITORING_VALIDATE_RESULTS"
  | "MONITORING_CLOSE_PERIOD"
  | "MONITORING_CLOSE_WITH_EXCEPTIONS";
type DraftSnapshot = {
  results: Record<string, string>;
  comments: Record<string, string>;
  sources: Record<string, ResultSource>;
};
type ImportChange = { code: string; current: string; incoming: string };
type ManualSortKey = "code" | "name" | "goal" | "unit" | "dataSource" | "result" | "comment" | "status";
type ManualResultStatus = "Entered" | "Incorrect" | "Pending";
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
  "Input Method",
  "Input Data",
  "Validate",
  "Result Preview",
  "Close Period",
] as const;
const mockPermissions = new Set<PermissionCode>([
  "MONITORING_ENTER_RESULTS",
  "MONITORING_VALIDATE_RESULTS",
  "MONITORING_CLOSE_PERIOD",
  "MONITORING_CLOSE_WITH_EXCEPTIONS",
]);

function initialDraft(): DraftSnapshot {
  return {
    results: Object.fromEntries(
      kpiResults.map((kpi) => [kpi.code, kpi.result === "—" ? "" : kpi.result]),
    ),
    comments: {},
    sources: {},
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

export function ResultEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pool =
    monitoringPools.find(
      (item) => item.id === Number(searchParams.get("poolId")),
    ) ?? monitoringPools[0];
  const inputPeriod = searchParams.get("period") ?? pool.currentPeriod;
  const storageKey = `monitoring-result-draft:${pool.id}:${inputPeriod}`;
  const requestedStep = Number(searchParams.get("step"));
  const initialStatus: EntryWorkflowStatus =
    pool.status === "CLOSED"
      ? "Closed"
      : pool.status === "VALIDATED" || pool.status === "VALIDATED_WITH_WARNINGS"
        ? "Validated"
        : pool.status === "SUBMITTED"
          ? "Submitted"
          : "Draft";
  const initialStep =
    requestedStep === 5 && (initialStatus === "Validated" || initialStatus === "Closed")
      ? 5
      : requestedStep === 4 && initialStatus !== "Draft"
        ? 4
        : requestedStep === 3 && initialStatus !== "Closed"
          ? 3
          : requestedStep === 2 && initialStatus === "Draft"
            ? 2
            : 1;
  const [step, setStep] = useState(
    initialStep,
  );
  const [method, setMethod] = useState<InputMethod>("manual");
  const [selectedKpi, setSelectedKpi] = useState(kpiResults[0].code);
  const [draft, setDraft] = useState<DraftSnapshot>(() => {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return initialDraft();
    try {
      return JSON.parse(stored) as DraftSnapshot;
    } catch {
      return initialDraft();
    }
  });
  const [editorResult, setEditorResult] = useState(
    () => draft.results[selectedKpi] ?? "",
  );
  const [editorComment, setEditorComment] = useState(
    () => draft.comments[selectedKpi] ?? "",
  );
  const [validationRun, setValidationRun] = useState(initialStatus !== "Draft");
  const [status, setStatus] = useState<EntryWorkflowStatus>(initialStatus);
  const [uploaded, setUploaded] = useState(false);
  const [previewTab, setPreviewTab] = useState<"kpis" | "scorecards">("kpis");
  const [closureComment, setClosureComment] = useState("");
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

  const selected = kpiResults.find((kpi) => kpi.code === selectedKpi)!;
  const expandedCommentKpi = expandedCommentCode
    ? kpiResults.find((kpi) => kpi.code === expandedCommentCode)
    : null;
  const entered = Object.values(draft.results).filter((value) =>
    value.trim(),
  ).length;
  const missingKpis = useMemo(
    () => kpiResults.filter((kpi) => !draft.results[kpi.code]?.trim()),
    [draft.results],
  );
  const sortedMissingKpis = useMemo(() => [...missingKpis].sort((left, right) => {
    const value = (kpi: (typeof kpiResults)[number]) => {
      if (missingResultSort.key === "result") return draft.results[kpi.code] ?? "";
      if (missingResultSort.key === "validation") return "Missing";
      return kpi[missingResultSort.key];
    };
    return compareSortValues(value(left), value(right), missingResultSort.direction);
  }), [draft.results, missingKpis, missingResultSort]);
  const criticalKpis = useMemo(
    () =>
      kpiResults.filter((kpi) =>
        isInvalidResult(draft.results[kpi.code] ?? ""),
      ),
    [draft.results],
  );
  const missing = missingKpis.length;
  const hasBlockingErrors = criticalKpis.length > 0;
  const completionPercentage = kpiResults.length ? Math.round((entered / kpiResults.length) * 100) : 0;
  const trafficLightCounts = {
    green: kpiResults.filter((kpi) => kpi.trafficLight === "Excellent").length,
    yellow: kpiResults.filter((kpi) => kpi.trafficLight === "Warning").length,
    red: kpiResults.filter((kpi) => kpi.trafficLight === "Caution").length,
  };
  const validationWarningCount = kpiResults.filter((kpi) => kpi.validation === "Warning" && !criticalKpis.some((critical) => critical.code === kpi.code) && !missingKpis.some((missingKpi) => missingKpi.code === kpi.code)).length;
  const validationValidCount = Math.max(0, kpiResults.length - criticalKpis.length - missingKpis.length - validationWarningCount);
  const validationFindings = useMemo(() => [...criticalKpis, ...missingKpis].map((kpi, index) => {
    const critical = criticalKpis.some((item) => item.code === kpi.code);
    return {
      row: index + 5,
      code: kpi.code,
      category: critical ? "Critical" : "Missing",
      error: critical ? "Invalid result format" : "Missing value",
      currentValue: draft.results[kpi.code] || "Empty",
      expected: critical ? "Valid numeric result" : "Required",
    };
  }).sort((left, right) => compareSortValues(left[validationSort.key], right[validationSort.key], validationSort.direction)), [criticalKpis, draft.results, missingKpis, validationSort]);
  const manualDirty = false;
  const readOnly = status !== "Draft";
  const canEnter = mockPermissions.has("MONITORING_ENTER_RESULTS");
  const canValidate = mockPermissions.has("MONITORING_VALIDATE_RESULTS");
  const canClose = mockPermissions.has("MONITORING_CLOSE_PERIOD");
  const canCloseWithExceptions = mockPermissions.has(
    "MONITORING_CLOSE_WITH_EXCEPTIONS",
  );
  const manualStatus = (code: string): ManualResultStatus => {
    const value = draft.results[code] ?? "";
    if (!value.trim()) return "Pending";
    return isInvalidResult(value) ? "Incorrect" : "Entered";
  };
  const manualFilteredRows = useMemo(() => kpiResults.filter((kpi) => {
    const term = manualSearch.trim().toLowerCase();
    const resultStatus = manualStatus(kpi.code);
    return (!term || `${kpi.code} ${kpi.name} ${kpi.goal} ${kpi.unit} ${kpi.dataSource}`.toLowerCase().includes(term))
      && (!manualStatuses.length || manualStatuses.includes(resultStatus) || editingResultCode === kpi.code)
      && (!manualUnits.length || manualUnits.includes(kpi.unit))
      && (!manualSources.length || manualSources.includes(kpi.dataSource));
  }).sort((left, right) => {
    const value = (item: (typeof kpiResults)[number]) => {
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
    entered: kpiResults.filter((kpi) => manualStatus(kpi.code) === "Entered").length,
    incorrect: kpiResults.filter((kpi) => manualStatus(kpi.code) === "Incorrect").length,
    pending: kpiResults.filter((kpi) => manualStatus(kpi.code) === "Pending").length,
  };
  const manualUnitOptions = [...new Set(kpiResults.map((kpi) => kpi.unit))].sort().map((value) => ({ value, label: measurementUnitLabel(value) }));
  const manualSourceOptions = [...new Set(kpiResults.map((kpi) => kpi.dataSource))].sort().map((value) => ({ value, label: value }));
  const previewFilteredRows = useMemo(() => kpiResults.filter((kpi) => {
    const term = previewSearch.trim().toLowerCase();
    const resultStatus = manualStatus(kpi.code);
    return (!term || `${kpi.code} ${kpi.name} ${kpi.goal} ${kpi.unit} ${kpi.dataSource} ${kpi.trafficLight}`.toLowerCase().includes(term))
      && (!previewStatuses.length || previewStatuses.includes(resultStatus))
      && (!previewTrafficLights.length || previewTrafficLights.includes(kpi.trafficLight))
      && (!previewUnits.length || previewUnits.includes(kpi.unit))
      && (!previewSources.length || previewSources.includes(kpi.dataSource));
  }).sort((left, right) => {
    const value = (item: (typeof kpiResults)[number]) => {
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
  const scorecardPreviewRows = useMemo(() => attachedScorecards.map((scorecard) => {
    const enteredCount = scorecard.kpis.filter((kpi) => Boolean(draft.results[kpi.code]?.trim())).length;
    const missingCount = scorecard.kpis.length - enteredCount;
    return { scorecard, expected: scorecard.kpis.length, entered: enteredCount, missing: missingCount, kpiStatus: missingCount ? "With Missing" : "Completed" };
  }), [draft.results]);
  const scorecardCompletedCount = scorecardPreviewRows.filter((row) => row.kpiStatus === "Completed").length;
  const scorecardMissingCount = scorecardPreviewRows.length - scorecardCompletedCount;
  const scorecardDepartmentOptions = [...new Set(attachedScorecards.flatMap((scorecard) => scorecard.departments))].sort().map((value) => ({ value, label: value }));
  const scorecardStatusOptions = [...new Set(attachedScorecards.map((scorecard) => scorecard.entryStatus))].sort().map((value) => ({ value, label: value }));
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

  const importedValues: Record<string, string> = {
    "KPI-049": "20%",
    "KPI-054": "po5",
    "KPI-105": "93%",
  };
  const importChanges: ImportChange[] = Object.entries(importedValues)
    .filter(([, incoming]) => incoming.trim())
    .map(([code, incoming]) => ({
      code,
      current: draft.results[code] ?? "",
      incoming,
    }))
    .filter((item) => item.current !== item.incoming);
  const importNewCount = importChanges.filter((item) => !item.current).length;
  const importUpdateCount = importChanges.length - importNewCount;
  const importUnchangedCount = Object.entries(importedValues).filter(
    ([code, incoming]) => draft.results[code] === incoming,
  ).length;

  const stepAvailable = (number: number) => {
    if (status === "Closed") return number === 4 || number === 5;
    if (number === 1) return status === "Draft" && canEnter;
    if (number === 2) return status === "Draft" && canEnter && Boolean(method);
    if (number === 3) return entered > 0 && canValidate;
    if (number === 4)
      return status !== "Draft" || (validationRun && !hasBlockingErrors);
    return (
      status === "Validated" &&
      !hasBlockingErrors &&
      canClose &&
      (missing === 0 || canCloseWithExceptions)
    );
  };

  const stepComplete = (number: number) => {
    if (number === 1) return Boolean(method);
    if (number === 2) return entered > 0;
    if (number === 3) return validationRun && !hasBlockingErrors;
    if (number === 4)
      return (
        status === "Submitted" || status === "Validated" || status === "Closed"
      );
    return status === "Closed";
  };

  function persistDraft(nextDraft: DraftSnapshot) {
    window.localStorage.setItem(storageKey, JSON.stringify(nextDraft));
    setDraftMessage("Draft saved locally for this Pool and period.");
  }

  function updateManualField(code: string, field: "result" | "comment", value: string) {
    setDraft((current) => {
      const nextDraft: DraftSnapshot = field === "result"
        ? { ...current, results: { ...current.results, [code]: value }, sources: { ...current.sources, [code]: "MANUAL" } }
        : { ...current, comments: { ...current.comments, [code]: value }, sources: { ...current.sources, [code]: "MANUAL" } };
      return nextDraft;
    });
    setManualChangesPending(true);
    setDraftMessage("");
  }

  function saveAllManualChanges() {
    persistDraft(draft);
    setManualChangesPending(false);
    setShowSaveAllConfirm(false);
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
    if (step !== 2 || method !== "manual" || readOnly) return;
    const saveShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && ["s", "g"].includes(event.key.toLowerCase())) {
        event.preventDefault();
        setShowSaveAllConfirm(true);
      }
    };
    window.addEventListener("keydown", saveShortcut);
    return () => window.removeEventListener("keydown", saveShortcut);
  }, [method, readOnly, step]);

  function selectKpi(code: string) {
    setSelectedKpi(code);
    setEditorResult(draft.results[code] ?? "");
    setEditorComment(draft.comments[code] ?? "");
  }

  function saveManualResult(switchAfterSave?: InputMethod) {
    if (!manualDirty) {
      persistDraft(draft);
      if (switchAfterSave) setMethod(switchAfterSave);
      return;
    }
    const nextDraft: DraftSnapshot = {
      results: { ...draft.results, [selectedKpi]: editorResult },
      comments: { ...draft.comments, [selectedKpi]: editorComment },
      sources: { ...draft.sources, [selectedKpi]: "MANUAL" },
    };
    setDraft(nextDraft);
    persistDraft(nextDraft);
    if (switchAfterSave) setMethod(switchAfterSave);
  }

  function requestMethod(nextMethod: InputMethod) {
    if (nextMethod === method || readOnly) return;
    if (method === "manual" && manualDirty) {
      setSwitchTarget(nextMethod);
      return;
    }
    setMethod(nextMethod);
  }

  function discardAndSwitch() {
    if (!switchTarget) return;
    setEditorResult(draft.results[selectedKpi] ?? "");
    setEditorComment(draft.comments[selectedKpi] ?? "");
    setMethod(switchTarget);
    setSwitchTarget(null);
  }

  function saveAndSwitch() {
    if (!switchTarget) return;
    saveManualResult(switchTarget);
    setSwitchTarget(null);
  }

  function confirmImport() {
    const nextResults = { ...draft.results };
    const nextSources = { ...draft.sources };
    for (const [code, value] of Object.entries(importedValues)) {
      if (!value.trim()) continue;
      nextResults[code] = value;
      nextSources[code] = "EXCEL";
    }
    const nextDraft: DraftSnapshot = {
      ...draft,
      results: nextResults,
      sources: nextSources,
    };
    setDraft(nextDraft);
    persistDraft(nextDraft);
    setUploaded(true);
    setShowImportSummary(false);
  }

  function runValidation() {
    if (status !== "Draft" || !canValidate || entered === 0) return;
    setValidationRun(true);
  }

  function returnForCorrection(code?: string) {
    setStatus("Draft");
    setMethod("manual");
    if (code) selectKpi(code);
    setStep(2);
  }

  function navigateStep(number: number) {
    if (!stepAvailable(number) && number !== step) return;
    setStep(number);
  }

  function goNext() {
    if (step === 1 && stepAvailable(2)) setStep(2);
    else if (step === 2 && stepAvailable(3)) setStep(3);
    else if (step === 3 && stepAvailable(4)) setStep(4);
    else if (step === 4 && stepAvailable(5)) setStep(5);
  }

  function submitResults() {
    if (status !== "Draft" || !validationRun || hasBlockingErrors) return;
    setStatus("Submitted");
  }

  function approveSubmittedResults() {
    if (status !== "Submitted" || !canValidate || hasBlockingErrors) return;
    setStatus("Validated");
  }

  function closePeriod() {
    if (!stepAvailable(5)) return;
    if (missing > 0 && !closureComment.trim()) return;
    saveMonitoringPeriodClosure(
      pool.id,
      inputPeriod,
      missing > 0 ? "with-exceptions" : "normal",
    );
    setShowCloseConfirmation(false);
    setStatus("Closed");
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
            Enter, validate, preview and close KPI results for {inputPeriod}.
          </p>
        </div>
      </header>

      <ol className="entry-stepper">
        {steps.map((label, index) => {
          const number = index + 1;
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
                  {complete && number !== step ? <Check size={20} strokeWidth={3.5} /> : number}
                </span>
                <strong>{label}</strong>
              </button>
              {number < steps.length && <i />}
            </li>
          );
        })}
      </ol>

      <section className="entry-context" aria-label="Result entry context">
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
              {status} · {entered}/{kpiResults.length} entered
            </span>
          </header>
          <div className="entry-context-grid">
            <div><small>KPI Lines</small><strong>{pool.kpiLines}</strong></div>
            <div><small>Input Frequency</small><strong>{pool.frequency}</strong></div>
            <div><small>Current Input Method</small><strong>{method === "manual" ? "Manual Entry" : "Excel Template"}</strong></div>
            <div><small>Attached Scorecards</small><strong>{attachedScorecards.length}</strong></div>
          </div>
        </article>
      </section>

      <section className="entry-workspace">
        {step === 1 && (
          <div className="method-step">
            <header>
              <h2>Choose Input Method</h2>
              <p>
                Select how result capture will begin. You can change it in Input
                Data.
              </p>
            </header>
            <div className="method-options">
              <button
                disabled={readOnly}
                className={method === "manual" ? "selected manual" : "manual"}
                onClick={() => requestMethod("manual")}
              >
                <span>
                  <Keyboard size={31} />
                </span>
                <strong>Manual Entry</strong>
                <p>Enter or correct KPI results directly in the system.</p>
                <i>{method === "manual" && <Check size={15} />}</i>
              </button>
              <button
                disabled={readOnly}
                className={method === "excel" ? "selected excel" : "excel"}
                onClick={() => requestMethod("excel")}
              >
                <span>
                  <FileSpreadsheet size={31} />
                </span>
                <strong>Excel Template</strong>
                <p>Download, complete and upload the period template.</p>
                <i>{method === "excel" && <Check size={15} />}</i>
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="input-data-step">
            <div className="capture-method-switch">
              <span>Capture Method</span>
              <div>
                <button
                  disabled={readOnly}
                  className={method === "manual" ? "active" : ""}
                  onClick={() => requestMethod("manual")}
                >
                  <Keyboard size={15} />
                  Manual Entry
                </button>
                <button
                  disabled={readOnly}
                  className={method === "excel" ? "active" : ""}
                  onClick={() => requestMethod("excel")}
                >
                  <FileSpreadsheet size={15} />
                  Excel Template
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
                      <span className="incorrect"><i/>{manualStatusCounts.incorrect} Incorrect</span>
                      <span className="pending"><i/>{manualStatusCounts.pending} Pending</span>
                    </div>
                  </div>
                  <button type="button" className="manual-save-all" disabled={readOnly || !manualChangesPending} data-tooltip="To Save All use combination Ctrl + G or Ctrl + S" onClick={() => setShowSaveAllConfirm(true)}>
                    Save All
                  </button>
                </header>
                {draftMessage && (
                  <p className="draft-save-message">
                    <CheckCircle2 size={15} />
                    {draftMessage}
                  </p>
                )}
                <div className="manual-entry-toolbar manual-entry-input-toolbar">
                  <label className="manual-entry-search"><Search size={17}/><input value={manualSearch} onChange={(event) => { setManualSearch(event.target.value); setManualPage(1); }} placeholder="Search KPI code, name, goal or data source..." /></label>
                  <ManualMultiSelect label="All statuses" options={["Entered", "Incorrect", "Pending"].map((value) => ({ value, label: value }))} selected={manualStatuses} onChange={(values) => { setManualStatuses(values); setManualPage(1); }} />
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
                        return <tr key={kpi.code}>
                          {visibleManualColumns.includes("code") && <td><span className="code-pill">{kpi.code}</span></td>}
                          {visibleManualColumns.includes("name") && <td className="manual-kpi-name">{kpi.name}</td>}
                          {visibleManualColumns.includes("goal") && <td>{kpi.goal}</td>}
                          {visibleManualColumns.includes("unit") && <td><span className="manual-unit-label">{measurementUnitLabel(kpi.unit)}</span></td>}
                          {visibleManualColumns.includes("dataSource") && <td>{kpi.dataSource}</td>}
                          {visibleManualColumns.includes("result") && <td><input className="manual-inline-input result" disabled={readOnly} value={draft.results[kpi.code] ?? ""} onFocus={() => setEditingResultCode(kpi.code)} onBlur={() => setEditingResultCode(null)} onChange={(event) => updateManualField(kpi.code, "result", event.target.value)} placeholder="Enter result" /></td>}
                          {visibleManualColumns.includes("comment") && <td><CompactCommentTextarea disabled={readOnly} value={draft.comments[kpi.code] ?? ""} onChange={(value) => updateManualField(kpi.code, "comment", value)} onExpand={() => setExpandedCommentCode(kpi.code)} /></td>}
                          {visibleManualColumns.includes("status") && <td><span className={`manual-result-status ${resultStatus.toLowerCase()}`}><i/>{resultStatus}</span></td>}
                        </tr>;
                      }) : <tr><td colSpan={visibleManualColumns.length} className="manual-entry-empty">No KPI results match the selected filters.</td></tr>}</tbody>
                    </table>
                  </div>
                  <footer className="manual-entry-pagination">
                    <span>Showing <strong>{manualFilteredRows.length ? manualPageStart + 1 : 0}-{Math.min(manualPageStart + manualPageSize, manualFilteredRows.length)}</strong> of <strong>{manualFilteredRows.length}</strong> KPI results</span>
                    <RowsPerPageSelect value={manualPageSize} onChange={(value) => { setManualPageSize(value); setManualPage(1); }} />
                    <div><button type="button" disabled={manualPage === 1} onClick={() => setManualPage((current) => current - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button><strong className="current" aria-current="page">{manualPage}</strong><button type="button" disabled={manualPage === manualTotalPages} onClick={() => setManualPage((current) => current + 1)} aria-label="Next page"><ChevronRight size={16}/></button></div>
                  </footer>
                </div>
              </div>
            ) : (
              <div className="excel-step">
                <header>
                  <h2>Input Data · Excel Template</h2>
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
                  <button disabled={readOnly}>
                    <Download size={15} />
                    Download Template
                  </button>
                </div>
                <label
                  className={uploaded ? "upload-zone uploaded" : "upload-zone"}
                >
                  <input
                    disabled={readOnly}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(event) => {
                      if (event.target.files?.length)
                        setShowImportSummary(true);
                      event.target.value = "";
                    }}
                  />
                  <span>
                    {uploaded ? (
                      <CheckCircle2 size={31} />
                    ) : (
                      <Upload size={31} />
                    )}
                  </span>
                  <strong>
                    {uploaded
                      ? `results_${pool.code}_${inputPeriod.replace(" ", "-")}.xlsx`
                      : "Upload completed results"}
                  </strong>
                  <p>
                    {uploaded
                      ? "Imported into the shared Draft"
                      : "Choose an Excel file to review its import summary"}
                  </p>
                </label>
                {uploaded && (
                  <div className="upload-meta">
                    <div>
                      <small>Uploaded By</small>
                      <strong>Carlos Gomez</strong>
                    </div>
                    <div>
                      <small>Uploaded At</small>
                      <strong>29 Jul 2026 · 10:42 AM</strong>
                    </div>
                    <div>
                      <small>Status</small>
                      <span>Imported to Draft</span>
                    </div>
                    <button
                      disabled={readOnly}
                      onClick={() => setUploaded(false)}
                    >
                      Remove File
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="validate-step">
            <header>
              <h2>Validation Details</h2>
              <p>
                Run a preliminary validation while the entry remains in Draft.
                You can correct data and run it again before submission.
              </p>
            </header>
            <div className="validation-version-banner">
              <span className={validationRun ? "current" : "pending"}>
                {validationRun
                  ? "Preliminary validation completed"
                  : "Preliminary validation required before submission"}
              </span>
              <button
                disabled={!canValidate || entered === 0 || status !== "Draft"}
                onClick={runValidation}
              >
                <ShieldCheck size={16} />
                Run Validation
              </button>
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
                  {criticalKpis.length ? (
                    <XCircle size={16} />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}{" "}
                  {criticalKpis.length} invalid result format
                  {criticalKpis.length === 1 ? "" : "s"}
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
                  No structural warnings
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
                  {missing} missing result{missing === 1 ? "" : "s"}
                </p>
              </div>
              <div className="validation-errors">
                <h3>Error Details</h3>
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
                      </tr>
                    </thead>
                    <tbody>
                      {validationFindings.map((finding) => (
                          <tr key={finding.code}>
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
                          </tr>
                        ))}
                      {!criticalKpis.length && !missingKpis.length && (
                        <tr>
                          <td colSpan={6} className="validation-clear">
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
                      const code = criticalKpis[0]?.code ?? missingKpis[0]?.code;
                      if (code) selectKpi(code);
                      setStep(2);
                    }}
                  >
                    Back to Input Data
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

        {step === 4 && (
          <div className="preview-step">
            <header>
              <div>
                <h2>Result Entry Preview</h2>
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
                <strong>89.42%</strong>
              </div>
              <div className="impact-metric">
                <small>ScoreCards Impacted</small>
                <strong>{attachedScorecards.length}</strong>
              </div>
            </div>
            {previewTab === "kpis" ? (
              <div className="preview-kpi-results">
                <div className="manual-step-heading preview-table-heading">
                  <div><h3>KPI Results</h3><p>Review captured KPI values and their calculated status.</p></div>
                  <PreviewColumnSelect selected={visiblePreviewColumns} onChange={setVisiblePreviewColumns} onLimit={() => setShowPreviewColumnLimit(true)} />
                  <div className="manual-status-summary" aria-label="Preview result status summary">
                    <span className="entered"><i/>{manualStatusCounts.entered} Entered</span>
                    <span className="incorrect"><i/>{manualStatusCounts.incorrect} Incorrect</span>
                    <span className="pending"><i/>{manualStatusCounts.pending} Pending</span>
                  </div>
                </div>
                <div className="manual-entry-toolbar preview-kpi-toolbar">
                  <label className="manual-entry-search"><Search size={17}/><input value={previewSearch} onChange={(event) => { setPreviewSearch(event.target.value); setPreviewPage(1); }} placeholder="Search KPI code, name, goal or data source..." /></label>
                  <ManualMultiSelect label="All traffic lights" options={[...new Set(kpiResults.map((kpi) => kpi.trafficLight))].sort().map((value) => ({ value, label: value }))} selected={previewTrafficLights} onChange={(values) => { setPreviewTrafficLights(values); setPreviewPage(1); }} />
                  <ManualMultiSelect label="All statuses" options={["Entered", "Incorrect", "Pending"].map((value) => ({ value, label: value }))} selected={previewStatuses} onChange={(values) => { setPreviewStatuses(values); setPreviewPage(1); }} />
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
                    <div><button type="button" disabled={previewPage === 1} onClick={() => setPreviewPage((current) => current - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button><strong className="current" aria-current="page">{previewPage}</strong><button type="button" disabled={previewPage === previewTotalPages} onClick={() => setPreviewPage((current) => current + 1)} aria-label="Next page"><ChevronRight size={16}/></button></div>
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
                    <div><button type="button" disabled={scorecardPage === 1} onClick={() => setScorecardPage((current) => current - 1)} aria-label="Previous page"><ChevronLeft size={16}/></button><strong className="current" aria-current="page">{scorecardPage}</strong><button type="button" disabled={scorecardPage === scorecardTotalPages} onClick={() => setScorecardPage((current) => current + 1)} aria-label="Next page"><ChevronRight size={16}/></button></div>
                  </footer>
                </div>
              </div>
            )}
            <div className="preview-submit-actions">
              <button
                className="entry-secondary"
                disabled={status !== "Draft"}
                onClick={() => setStep(2)}
              >
                Back to Input Data
              </button>
              {status === "Draft" && (
                <button
                  className="entry-primary"
                  disabled={!validationRun || hasBlockingErrors}
                  onClick={submitResults}
                >
                  Submit Results
                </button>
              )}
              {status === "Submitted" && (
                <>
                  <span>Submitted · Validation Status: Pending Validation</span>
                  <button
                    className="entry-primary validate-submitted"
                    disabled={!canValidate || hasBlockingErrors}
                    onClick={approveSubmittedResults}
                  >
                    Validate Submitted Results
                  </button>
                  <button
                    className="entry-secondary"
                    onClick={() => returnForCorrection()}
                  >
                    Return for Correction
                  </button>
                </>
              )}
              {status === "Validated" && (
                <>
                  <span className="submitted-state">
                    <CheckCircle2 size={16} />
                    Results validated and ready for closure.
                  </span>
                  <button
                    className="entry-secondary"
                    onClick={() => returnForCorrection()}
                  >
                    Return for Correction
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {step === 5 && (
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
                      <div><dt>Entered KPI Results</dt><dd>{entered}/{kpiResults.length}</dd></div>
                      <div><dt>Missing Results</dt><dd>{missing}</dd></div>
                      <div className="full validation-status-fact"><dt>Validation Status</dt><dd><span>{validationLabel}</span></dd></div>
                    </dl>
                  </section>
                  <section className="closure-overview-section">
                    <header><h3>Score &amp; Closure</h3><span>Closure context</span></header>
                    <dl>
                      <div><dt>Estimated Pool Score</dt><dd>89.42%</dd></div>
                      <div><dt>Attached ScoreCards</dt><dd>{attachedScorecards.length}</dd></div>
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
                  <header><div><h3 id="results-completion-title">Results Completion</h3><p>{entered} entered · {missing} missing</p></div><strong>{entered}/{kpiResults.length} · {completionPercentage}%</strong></header>
                  <div className="closure-completion-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionPercentage} aria-label={`${completionPercentage}% results completed`}><span style={{ width: `${completionPercentage}%` }}/></div>
                </section>}
                <div className="closure-visual-grid">
                  {(closurePreview === "TRAFFIC_LIGHT" || closurePreview === "ALL") && <section className="closure-visual-card traffic"><header><h3>Traffic Light Summary</h3><span className="visual-count-badge">{kpiResults.length} KPIs</span></header><div className="closure-stacked-bar" aria-label={`${trafficLightCounts.green} green, ${trafficLightCounts.yellow} yellow, ${trafficLightCounts.red} red`}><i className="green" style={{ flex: trafficLightCounts.green }}/><i className="yellow" style={{ flex: trafficLightCounts.yellow }}/><i className="red" style={{ flex: trafficLightCounts.red }}/></div><dl><div><dt><i className="green"/>Green KPIs</dt><dd>{trafficLightCounts.green}</dd></div><div><dt><i className="yellow"/>Yellow KPIs</dt><dd>{trafficLightCounts.yellow}</dd></div><div><dt><i className="red"/>Red KPIs</dt><dd>{trafficLightCounts.red}</dd></div></dl></section>}
                  {(closurePreview === "VALIDATION" || closurePreview === "ALL") && <section className="closure-visual-card validation"><header><h3>Validation Summary</h3><span className={`visual-validation-badge ${hasBlockingErrors ? "critical" : validationWarningCount || missing ? "warning" : "valid"}`}>{validationLabel}</span></header><dl><div className="valid"><dt>Valid</dt><dd>{validationValidCount}</dd></div><div className="warnings"><dt>Warnings</dt><dd>{validationWarningCount}</dd></div><div className="missing"><dt>Missing</dt><dd>{missing}</dd></div><div className="critical"><dt>Critical Errors</dt><dd>{criticalKpis.length}</dd></div></dl></section>}
                </div>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </section>

      {status !== "Closed" && (
        <footer className="entry-footer">
          <button
            className="entry-secondary"
            onClick={() =>
              step === 1
                ? navigate("/app/monitoring-results/overview")
                : setStep((current) => Math.max(1, current - 1))
            }
          >
            {step === 1 ? "Go Back to Overview" : "Back"}
          </button>
          {step < 4 && (
            <button
              className="entry-primary"
              disabled={!stepAvailable(step + 1)}
              onClick={goNext}
            >
              Next: {steps[step]}
            </button>
          )}
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
              disabled={
                !stepAvailable(5)
              }
              onClick={() => { setCloseDialogPosition({ x: 0, y: 0 }); setShowCloseConfirmation(true); }}
            >
              {missing ? "Close with Exceptions" : "Close Period"}
            </button>
          )}
        </footer>
      )}

      {showCloseConfirmation && (
        <div className="entry-dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCloseConfirmation(false); }}>
          <section className={`entry-dialog close-period-dialog ${missing ? "with-exceptions" : "normal"}`} style={{ transform: `translate(${closeDialogPosition.x}px, ${closeDialogPosition.y}px)` }} role="dialog" aria-modal="true" aria-labelledby="close-period-dialog-title" onKeyDown={(event) => { if (event.key === "Escape") setShowCloseConfirmation(false); }}>
            <button className="entry-dialog-close" aria-label="Cancel period closure" onClick={() => setShowCloseConfirmation(false)}><X size={17}/></button>
            <div className="close-dialog-drag-handle" onPointerDown={(event) => { closeDialogDrag.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: closeDialogPosition.x, originY: closeDialogPosition.y }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { const drag = closeDialogDrag.current; if (!drag || drag.pointerId !== event.pointerId) return; setCloseDialogPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY }); }} onPointerUp={(event) => { closeDialogDrag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} onPointerCancel={() => { closeDialogDrag.current = null; }}>
              {missing ? <AlertTriangle size={30}/> : <LockKeyhole size={30}/>}<h2 id="close-period-dialog-title">{missing ? "Close Period With Exceptions?" : "Close Period?"}</h2>
            </div>
            <div className="close-dialog-context"><strong>{pool.name}</strong><span>{inputPeriod}</span></div>
            {missing ? <p className="close-dialog-alert"><AlertTriangle size={17}/>{missing} KPI result{missing === 1 ? " is" : "s are"} still missing.</p> : <p className="close-dialog-complete"><CheckCircle2 size={17}/>{entered} / {kpiResults.length} results entered</p>}
            <dl className="close-dialog-summary"><div><dt>Results entered</dt><dd>{entered}/{kpiResults.length}</dd></div>{missing > 0 && <div><dt>Missing results</dt><dd>{missing}</dd></div>}<div><dt>Validation</dt><dd>{missing ? validationLabel : "Validated"}</dd></div><div><dt>Estimated score</dt><dd>89.42%</dd></div></dl>
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
            <h2 id="save-all-title">Save All Manual Results?</h2>
            <p>Review this quick summary before saving the current Result and Comment changes to the Draft.</p>
            <div className="manual-save-summary">
              <article className="entered"><strong>{manualStatusCounts.entered}</strong><span>Entered</span></article>
              <article className="incorrect"><strong>{manualStatusCounts.incorrect}</strong><span>Incorrect</span></article>
              <article className="pending"><strong>{manualStatusCounts.pending}</strong><span>Pending</span></article>
            </div>
            <p className="manual-save-note">Incorrect results need correction. Pending results may continue but affect validation and closure.</p>
            <footer><button className="entry-secondary" onClick={() => setShowSaveAllConfirm(false)}>Cancel</button><button className="entry-primary" onClick={saveAllManualChanges}>Save All</button></footer>
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
              <button className="entry-primary" onClick={saveAndSwitch}>
                Save Draft & Switch
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
                <strong>{importNewCount}</strong> new results
              </span>
              <span>
                <strong>{importUnchangedCount}</strong> unchanged
              </span>
              <span>
                <strong>{importUpdateCount}</strong> existing result
                {importUpdateCount === 1 ? "" : "s"} will be updated
              </span>
            </div>
            <div className="import-change-list">
              {importChanges.map((item) => (
                <div key={item.code}>
                  <strong>{item.code}</strong>
                  <span>Current: {item.current || "Empty"}</span>
                  <span>Excel: {item.incoming}</span>
                </div>
              ))}
            </div>
            <p>Empty Excel rows do not delete existing Draft values.</p>
            <footer>
              <button
                className="entry-secondary"
                onClick={() => setShowImportSummary(false)}
              >
                Cancel Import
              </button>
              <button className="entry-primary" onClick={confirmImport}>
                Import & Update
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
