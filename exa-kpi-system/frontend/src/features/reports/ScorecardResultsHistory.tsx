import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Check, ChevronDown, ChevronLeft, ChevronRight, Download, Eye, FileText, Search, TrendingDown, TrendingUp, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { reportScorecards, scorecardHistory } from "./reports.data";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import { compareSortValues, SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import "./reports.css";
import "./scorecard-results-history.css";
import "./scorecard-results-history-overrides.css";
import "./multiselect-selection-overrides.css";
import "./report-table-refresh.css";

type Option = { value: string; label: string };
type ScorecardSelectorOption = { type: "scorecard"; value: string; label: string; detail: string };
function HistoryMultiSelect({ placeholder, options, selected, onChange }: { placeholder: string; options: Option[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const chosen = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, chosen.map((option) => option.label));
  const visibleOptions = chosen.slice(0, visibleCount);
  const hiddenCount = chosen.length - visibleOptions.length;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <div className="history-multiselect" ref={rootRef}>
    <button type="button" className={open ? "open" : ""} onClick={() => setOpen((value) => !value)}>
      {!chosen.length ? <span className="history-filter-placeholder">{placeholder}</span> : <span className={`history-filter-chips ${hiddenCount > 0 ? "has-more" : ""}`}>
        {visibleOptions.map((option) => <span className="history-filter-chip" key={option.value}><span>{option.label}</span><i onClick={(event) => { event.stopPropagation(); toggle(option.value); }}><X size={12} /></i></span>)}
        {hiddenCount > 0 && <span className="history-filter-chip more"><span>+{hiddenCount} more</span><i onClick={(event) => { event.stopPropagation(); onChange(visibleOptions.map((option) => option.value)); }}><X size={12} /></i></span>}
      </span>}<ChevronDown size={16} />
    </button>
    {open && <div className="history-filter-options">
      <button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}><i>{!selected.length && <Check size={13} />}</i>All</button>
      {options.map((option) => <button type="button" className={selected.includes(option.value) ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><i>{selected.includes(option.value) && <Check size={13} />}</i>{option.label}</button>)}
    </div>}
  </div>;
}

function HistoryMonthSelect({ options, selected, years, onChange }: { options: readonly Option[]; selected: string[]; years: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = selected.map((value) => options.find((option) => option.value === value)).filter((option): option is Option => Boolean(option));
  const yearLabel = years.join(" · ");
  const selectedLabelsKey = selectedOptions.map((option) => option.label).join("\u0000");
  const [visibleMonthCount, setVisibleMonthCount] = useState(selectedOptions.length);
  useLayoutEffect(() => {
    const trigger = rootRef.current?.querySelector<HTMLButtonElement>(":scope > button");
    if (!trigger || !selectedOptions.length) return;
    const calculate = () => {
      const context = document.createElement("canvas").getContext("2d");
      if (!context) return;
      const style = getComputedStyle(trigger);
      context.font = style.font;
      const textWidth = (text: string) => Math.ceil(context.measureText(text).width);
      const padding = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
      const available = trigger.clientWidth - padding - 30;
      const yearWidth = textWidth(yearLabel) + 20;
      const monthWidth = (label: string) => textWidth(label) + 40;
      const gap = 6;
      let nextCount = 1;
      for (let count = selectedOptions.length; count >= 1; count -= 1) {
        const hidden = selectedOptions.length - count;
        const monthsWidth = selectedOptions.slice(0, count).reduce((total, option) => total + monthWidth(option.label), 0);
        const moreWidth = hidden ? textWidth(`+${hidden} more`) + 40 : 0;
        const itemCount = 1 + count + (hidden ? 1 : 0);
        if (yearWidth + monthsWidth + moreWidth + gap * (itemCount - 1) <= available) {
          nextCount = count;
          break;
        }
      }
      setVisibleMonthCount(nextCount);
    };
    calculate();
    const observer = new ResizeObserver(calculate);
    observer.observe(trigger);
    return () => observer.disconnect();
  }, [selectedLabelsKey, selectedOptions.length, yearLabel]);
  const visibleMonths = selectedOptions.slice(0, visibleMonthCount);
  const hiddenMonthCount = selectedOptions.length - visibleMonths.length;
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const toggle = (month: string) => {
    const next = selected.includes(month) ? selected.filter((item) => item !== month) : [...selected, month];
    onChange(next);
  };
  return <div className="history-month-picker" ref={rootRef} onKeyDown={(event) => { if (event.key === "Escape") { event.stopPropagation(); setOpen(false); } }}>
    <button type="button" className={`history-month-trigger ${open ? "open" : ""}`} onClick={() => setOpen((value) => !value)}><span className="history-month-trigger-content"><span className="history-month-year-chip">{yearLabel}</span>{visibleMonths.map((month) => <span className="history-month-chip" key={month.value}>{month.label}<span className="history-month-chip-remove" role="button" tabIndex={0} aria-label={`Remove ${month.label}`} onClick={(event) => { event.stopPropagation(); toggle(month.value); }}><X size={13}/></span></span>)}{hiddenMonthCount > 0 && <span className="history-month-chip more">+{hiddenMonthCount} more<span className="history-month-chip-remove" role="button" tabIndex={0} aria-label="Remove additional month selections" onClick={(event) => { event.stopPropagation(); onChange(visibleMonths.map((month) => month.value)); }}><X size={13}/></span></span>}</span><ChevronDown size={16}/></button>
    {open && <div className="history-month-panel"><div className="history-month-panel-header"><label><span>Year</span><input readOnly value={years.join(" · ")} /></label><label className="history-month-select-all"><input type="checkbox" checked={selected.length === options.length} onChange={(event) => onChange(event.target.checked ? options.map((option) => option.value) : [])}/><i>{selected.length === options.length && <Check size={12}/>}</i>Select all months</label></div><div className="history-month-grid">{options.map((month) => <label className={selected.includes(month.value) ? "selected" : ""} key={month.value}><input type="checkbox" checked={selected.includes(month.value)} onChange={() => toggle(month.value)}/><i>{selected.includes(month.value) && <Check size={12}/>}</i>{month.label}</label>)}</div><div className="history-month-message"><AlertTriangle size={15}/><span>Select any combination of months, or leave all months unselected.</span></div></div>}
  </div>;
}

const monthOptions = [
  { value: "JAN", label: "January" }, { value: "FEB", label: "February" }, { value: "MAR", label: "March" },
  { value: "APR", label: "April" }, { value: "MAY", label: "May" }, { value: "JUN", label: "June" },
  { value: "JUL", label: "July" }, { value: "AUG", label: "August" }, { value: "SEP", label: "September" },
  { value: "OCT", label: "October" }, { value: "NOV", label: "November" }, { value: "DEC", label: "December" },
] as const;
type MonthKey = (typeof monthOptions)[number]["value"];
const months = monthOptions.map((month) => month.label);
const allMonthKeys = monthOptions.map((month) => month.value);
const availableYears = ["2024", "2025", "2026"];
const values = (items: string[]) => items.map((value) => ({ value, label: value }));

export function ScorecardResultsHistory() {
  const pageSize = 5;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialDepartments = useMemo(
    () => [...new Set(searchParams.getAll("department").filter(Boolean))],
    [searchParams],
  );
  const now = useMemo(() => new Date(), []);
  const currentYear = now.getFullYear();
  const currentMonth = allMonthKeys[now.getMonth()];
  const currentYearIsAvailable = availableYears.includes(String(currentYear));
  const defaultYear = currentYearIsAvailable ? String(currentYear) : availableYears[availableYears.length - 1];
  const initialFilteredScorecardCodes = useMemo(
    () => initialDepartments.length
      ? [...new Set(scorecardHistory
        .filter((item) => item.year === defaultYear)
        .filter((item) => initialDepartments.some((department) =>
          item.departments.split(",").map((value) => value.trim()).includes(department),
        ))
        .map((item) => item.code))]
      : [],
    [defaultYear, initialDepartments],
  );
  const tableScrollRef = useRef<HTMLDivElement>(null);
  const scorecardSearchRef = useRef<HTMLElement>(null);
  const [scorecardQuery, setScorecardQuery] = useState("");
  const [tableSearch, setTableSearch] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [individualScorecardCodes, setIndividualScorecardCodes] = useState<string[]>([]);
  const [filteredScorecardCodes, setFilteredScorecardCodes] = useState<string[]>(initialFilteredScorecardCodes);
  const [filterMenuVersion, setFilterMenuVersion] = useState(0);
  const [addNotice, setAddNotice] = useState<{ id: number; message: string } | null>(null);
  const [frequencies, setFrequencies] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>(initialDepartments);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [years, setYears] = useState<string[]>([defaultYear]);
  const [activeYear, setActiveYear] = useState(defaultYear);
  const [selectedMonths, setSelectedMonths] = useState<MonthKey[]>([...allMonthKeys]);
  const [focusMonth, setFocusMonth] = useState<MonthKey | null>(null);
  const [focusClearedManually, setFocusClearedManually] = useState(true);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<{ key: HistorySortKey; direction: SortDirection }>({ key: "code", direction: "asc" });
  const selectedScorecardCodes = useMemo(() => [...new Set([...individualScorecardCodes, ...filteredScorecardCodes])], [filteredScorecardCodes, individualScorecardCodes]);
  const visibleMonths = monthOptions.filter((month) => selectedMonths.includes(month.value));
  const focusIndex = focusMonth ? Math.max(0, visibleMonths.findIndex((month) => month.value === focusMonth)) : 0;
  const availableDepartments = useMemo(() => [...new Set([
    ...initialDepartments,
    ...scorecardHistory
      .filter((item) => years.includes(item.year))
      .flatMap((item) => item.departments.split(",").map((department) => department.trim())),
  ])], [initialDepartments, years]);
  const scorecardSuggestions = useMemo<ScorecardSelectorOption[]>(() => {
    const query = scorecardQuery.trim().toLowerCase();
    return scorecardHistory
      .filter((item) => years.includes(item.year))
      .filter((item) => !selectedScorecardCodes.includes(item.code))
      .filter((item) => `${item.code} ${item.name} ${item.departments}`.toLowerCase().includes(query))
      .map((item) => ({ type: "scorecard" as const, value: item.code, label: item.name, detail: `${item.code} · ${item.departments}` }));
  }, [scorecardQuery, selectedScorecardCodes, years]);
  const rows = useMemo(() => scorecardHistory.filter((item) =>
    (!tableSearch || `${item.code} ${item.name} ${item.departments}`.toLowerCase().includes(tableSearch.toLowerCase())) &&
    selectedScorecardCodes.includes(item.code) && item.year === activeYear,
  ).sort((left, right) => compareSortValues(historySortValue(left, sort.key), historySortValue(right, sort.key), sort.direction)), [activeYear, selectedScorecardCodes, sort, tableSearch]);
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const paginatedRows = rows.slice(pageStart, pageStart + pageSize);
  useEffect(() => setPage(1), [departments, frequencies, selectedScorecardCodes, statuses, tableSearch, years]);
  useEffect(() => {
    if (!addNotice) return;
    const timeout = window.setTimeout(() => setAddNotice(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [addNotice]);
  useEffect(() => {
    if (!suggestionsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!scorecardSearchRef.current?.contains(event.target as Node)) setSuggestionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSuggestionsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [suggestionsOpen]);
  useEffect(() => {
    if (years.includes(activeYear)) return;
    setActiveYear(years.includes(String(currentYear)) ? String(currentYear) : years[years.length - 1]);
  }, [activeYear, currentYear, years]);
  useEffect(() => {
    if (!selectedMonths.length) {
      if (focusMonth !== null) setFocusMonth(null);
      if (focusClearedManually) setFocusClearedManually(false);
      return;
    }
    if (focusMonth && selectedMonths.includes(focusMonth)) return;
    if (focusClearedManually) return;
    if (!focusMonth) {
      setFocusMonth(activeYear === String(currentYear) && selectedMonths.includes(currentMonth) ? currentMonth : selectedMonths[0]);
      return;
    }
    const focusedCalendarIndex = allMonthKeys.indexOf(focusMonth);
    const next = selectedMonths.find((month) => allMonthKeys.indexOf(month) > focusedCalendarIndex);
    const previous = [...selectedMonths].reverse().find((month) => allMonthKeys.indexOf(month) < focusedCalendarIndex);
    setFocusMonth(next ?? previous ?? selectedMonths[0]);
  }, [activeYear, currentMonth, currentYear, focusClearedManually, focusMonth, selectedMonths]);
  const changeYears = (nextYears: string[]) => {
    if (nextYears.length) setYears(availableYears.filter((year) => nextYears.includes(year)));
  };
  const changeMonths = (nextMonths: string[]) => {
    setSelectedMonths(allMonthKeys.filter((month) => nextMonths.includes(month)) as MonthKey[]);
  };
  const activeYearIndex = years.indexOf(activeYear);
  const clearFocus = () => {
    setFocusClearedManually(true);
    setFocusMonth(null);
  };
  useEffect(() => {
    const clearOnBlankSpace = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (target.closest("button,input,select,textarea,label,a,th,td,[role='button'],.history-month-picker")) return;
      clearFocus();
    };
    document.addEventListener("click", clearOnBlankSpace);
    return () => document.removeEventListener("click", clearOnBlankSpace);
  }, []);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const container = tableScrollRef.current;
      if (!focusMonth) return;
      const focusedColumn = container?.querySelector<HTMLElement>(`th[data-month="${focusMonth}"]`);
      if (!container || !focusedColumn) return;
      const left = focusedColumn.offsetLeft - (container.clientWidth - focusedColumn.offsetWidth) / 2;
      container.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [activeYear, focusMonth, selectedMonths]);
  const sortBy = (key: HistorySortKey) => {
    setSort((current) => ({ key, direction: current.key === key && current.direction === "asc" ? "desc" : "asc" }));
    setPage(1);
  };
  const openDetail = (name: string) => {
    const scorecard = reportScorecards.find((item) => item.name.includes(name.replace("EXA ", "")));
    navigate(scorecard ? `/app/reports/scorecard-result-detail?scorecardCode=${encodeURIComponent(scorecard.code)}&from=history` : "/app/reports/latest-scorecard-results");
  };
  const addIndividualScorecard = (suggestion: ScorecardSelectorOption) => {
    const alreadySelected = selectedScorecardCodes.includes(suggestion.value);
    if (!alreadySelected) setIndividualScorecardCodes((current) => [...current, suggestion.value]);
    setAddNotice({
      id: Date.now(),
      message: alreadySelected
        ? `${suggestion.label} is already in the historical matrix.`
        : `${suggestion.label} added to ScoreCard History Summarized Matrix.`,
    });
    setScorecardQuery("");
    setSuggestionsOpen(false);
  };
  const applyFilters = () => {
    const matchingCodes = scorecardHistory.filter((item) =>
      years.includes(item.year) &&
      (!frequencies.length || frequencies.includes(item.frequency)) &&
      (!departments.length || departments.some((department) => item.departments.split(",").map((value) => value.trim()).includes(department))) &&
      (!statuses.length || statuses.includes(item.status)),
    ).map((item) => item.code);
    setFilteredScorecardCodes([...new Set(matchingCodes)]);
    setFilterMenuVersion((current) => current + 1);
    setAddNotice({
      id: Date.now(),
      message: matchingCodes.length
        ? `${matchingCodes.length} ScoreCard${matchingCodes.length === 1 ? "" : "s"} match the applied filters.`
        : "No ScoreCards match the selected filters.",
    });
  };
  const clearFilters = () => {
    setFrequencies([]);
    setDepartments([]);
    setStatuses([]);
    setYears([defaultYear]);
    setActiveYear(defaultYear);
    setFilteredScorecardCodes([]);
    setFilterMenuVersion((current) => current + 1);
  };
  const clearScorecardSelection = () => {
    setScorecardQuery("");
    setIndividualScorecardCodes([]);
    setFilteredScorecardCodes([]);
    setSuggestionsOpen(false);
  };

  return <main className="reports-page history-page">
    <nav className="kpi-breadcrumb"><Link to="/app/reports">Reports</Link><span>/</span><span>ScoreCard Results History</span></nav>
    <header className="reports-header"><div><span>HISTORICAL RESULTS</span><h1>ScoreCard Results History</h1><p>Compare summarized ScoreCard results across generated periods and preserve the historical composition used for each calculation.</p></div></header>
    <section className="history-filters" ref={scorecardSearchRef}>
      <header><h2>ScoreCard Result Filtering</h2><p>Use the filters to find and add matching ScoreCards to the historical matrix.</p></header>
      <label className="history-scorecard-filter"><span>ScoreCard</span><div className="history-scorecard-add-row"><div className="history-scorecard-autosuggest"><div className="history-input"><Search size={18}/><input value={scorecardQuery} onFocus={() => setSuggestionsOpen(true)} onChange={(event) => { setScorecardQuery(event.target.value); setSuggestionsOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" && scorecardSuggestions[0]) { event.preventDefault(); addIndividualScorecard(scorecardSuggestions[0]); } }} placeholder="Search Scorecards..." aria-autocomplete="list" aria-expanded={suggestionsOpen}/>{scorecardQuery && <button type="button" className="history-scorecard-clear" onClick={() => setScorecardQuery("")} title="Clear search" aria-label="Clear search"><X size={17}/></button>}</div>{suggestionsOpen && <div className="history-scorecard-suggestions" role="listbox">{scorecardSuggestions.length ? <div className="history-suggestion-group"><strong>INDIVIDUAL SCORECARDS</strong>{scorecardSuggestions.map((suggestion) => { const selected = selectedScorecardCodes.includes(suggestion.value); return <button type="button" className={selected ? "selected" : ""} key={suggestion.value} onMouseDown={(event) => event.preventDefault()} onClick={() => addIndividualScorecard(suggestion)}><span className="code-pill">{suggestion.value}</span><span className="history-suggestion-copy"><strong>{suggestion.label}</strong><small>{suggestion.detail}</small></span>{selected && <Check size={16}/>}</button>; })}</div> : <p>No matching individual ScoreCards.</p>}</div>}</div></div></label>
      <label className="history-frequency-filter"><span>Input Frequency</span><HistoryMultiSelect key={`frequency-${filterMenuVersion}`} placeholder="All frequencies" options={values(["Monthly", "Quarterly", "Four-monthly", "Semiannual", "Annual"])} selected={frequencies} onChange={setFrequencies}/></label>
      <label className="history-department-filter"><span>Departments</span><HistoryMultiSelect key={`department-${filterMenuVersion}`} placeholder="All departments" options={values(availableDepartments)} selected={departments} onChange={setDepartments}/></label>
      <label><span>Result Status</span><HistoryMultiSelect key={`status-${filterMenuVersion}`} placeholder="All statuses" options={values(["Closed", "Closed with Exceptions", "Validated"])} selected={statuses} onChange={setStatuses}/></label>
      <label><span>Year</span><HistoryMultiSelect key={`year-${filterMenuVersion}`} placeholder="Select years" options={values(availableYears)} selected={years} onChange={changeYears}/></label>
      <div className="history-filter-actions"><button type="button" className="history-apply-filters" onClick={applyFilters}><Check size={15}/>Apply Filters</button><button type="button" onClick={clearFilters}><X size={15}/>Clear Filters</button></div>
    </section>
    {addNotice && <div className="history-add-notice" key={addNotice.id} role="status"><Check size={18}/><span>{addNotice.message}</span><button type="button" onClick={() => setAddNotice(null)} aria-label="Close notification"><i><X size={14}/></i></button></div>}
    <section className="history-matrix stable-table-panel" onDoubleClickCapture={(event) => { if ((event.target as HTMLElement).closest("[data-month]")) clearFocus(); }}>
      <header><div><h2>ScoreCard History Summarized Matrix</h2><p>{selectedScorecardCodes.length} ScoreCards across {visibleMonths.length} visible periods.</p></div><div><button type="button" className="history-clear-scorecards" disabled={!selectedScorecardCodes.length} onClick={clearScorecardSelection}><X size={15}/>Clear ScoreCards</button><button className="xls" disabled={!selectedScorecardCodes.length}><Download size={15}/>Export XLS</button><button className="pdf" disabled={!selectedScorecardCodes.length}><FileText size={15}/>Export PDF</button></div></header>
      <div className="history-matrix-tools">
        <label className="history-search"><Search size={16}/><input value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} placeholder="Search ScoreCard or department..." /></label>
        <div className="history-period-select history-month-select"><span>Visible months</span><HistoryMonthSelect options={monthOptions} selected={selectedMonths} years={years} onChange={changeMonths}/></div>
      </div>
      {!selectedScorecardCodes.length ? <div className="history-empty-state"><strong>No ScoreCards selected</strong><span>Use Search ScoreCards or the filters above to add ScoreCards to the matrix.</span></div> : <><div className="report-table-wrap history-table-transition" ref={tableScrollRef} key={`${activeYear}-${visibleMonths.map((month) => month.value).join("-")}`}><table><thead><tr>
        <SortableTableHeader active={sort.key === "code"} direction={sort.direction} onSort={() => sortBy("code")}>ScoreCard Code</SortableTableHeader><SortableTableHeader active={sort.key === "name"} direction={sort.direction} onSort={() => sortBy("name")}>ScoreCard</SortableTableHeader><SortableTableHeader active={sort.key === "departments"} direction={sort.direction} onSort={() => sortBy("departments")}>Departments</SortableTableHeader><SortableTableHeader active={sort.key === "frequency"} direction={sort.direction} onSort={() => sortBy("frequency")}>Input Frequency</SortableTableHeader><SortableTableHeader active={sort.key === "duration"} direction={sort.direction} onSort={() => sortBy("duration")}>Duration</SortableTableHeader><SortableTableHeader active={sort.key === "generated"} direction={sort.direction} onSort={() => sortBy("generated")}>Generated Inputs</SortableTableHeader>
        {visibleMonths.map((month) => <th data-month={month.value} className={`history-period clickable ${month.value === focusMonth ? "focused" : ""}`} key={`${month.value}-${activeYear}`} onClick={() => { setFocusClearedManually(false); setFocusMonth(month.value); }}>{month.label} {activeYear}</th>)}
        <SortableTableHeader active={sort.key === "average"} direction={sort.direction} onSort={() => sortBy("average")}>Average</SortableTableHeader><SortableTableHeader active={sort.key === "trend"} direction={sort.direction} onSort={() => sortBy("trend")}>Trend</SortableTableHeader><th>Action</th>
      </tr></thead><tbody>{paginatedRows.map((item) => {
        const durationParts = item.duration.split("-");
        const periodEnd = durationParts[durationParts.length - 1]?.slice(0, 3) ?? "Jun";
        const annualScores = months.map((month, index) => item.frequency === "Monthly" ? (item.scores[index] ?? null) : month.startsWith(periodEnd) ? item.average : null);
        return <tr key={item.code}><td><strong>{item.code}</strong></td><td>{item.name}</td><td>{item.departments}</td><td>{item.frequency}</td><td>{item.duration}</td><td>{item.generated}</td>
          {visibleMonths.map((month) => { const monthIndex = allMonthKeys.indexOf(month.value); const score = annualScores[monthIndex]; return <td data-month={month.value} className={month.value === focusMonth ? "focused" : ""} key={`${month.value}-${activeYear}`}>{score === null ? <span className="history-no-result">—</span> : <span className="history-score"><strong>{score}%</strong><small>Closed</small></span>}</td>; })}
          <td><strong>{item.average}%</strong></td><td><span className={`history-trend ${item.trend.toLowerCase()}`}>{item.trend === "Declined" ? <TrendingDown size={15}/> : <TrendingUp size={15}/>} {item.trend}</span></td><td><button className="history-view" onClick={() => openDetail(item.name)}><Eye size={15}/></button></td></tr>;
      })}</tbody></table></div>
      <footer className="history-period-slider">
        <div className="history-record-summary"><span>Showing {visibleMonths.length} selected months · {rows.length} records</span><div className="history-record-pagination"><button type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous records"><ChevronLeft size={15}/></button><strong>{currentPage}</strong><button type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)} aria-label="Next records"><ChevronRight size={15}/></button></div></div>
        <label className="history-focus-control"><span>Focus Month</span><div className="history-slider-control"><output className={!focusMonth ? "empty" : ""} style={{ left: `${focusMonth && visibleMonths.length > 1 ? (focusIndex / (visibleMonths.length - 1)) * 100 : 0}%` }}>{focusMonth && visibleMonths.length ? `${visibleMonths[focusIndex]?.label} ${activeYear}` : "No selected"}</output><input type="range" min="0" max={Math.max(0, visibleMonths.length - 1)} value={focusIndex} disabled={!visibleMonths.length} style={{ background: `linear-gradient(to right, #7650a0 0 ${focusMonth && visibleMonths.length > 1 ? (focusIndex / (visibleMonths.length - 1)) * 100 : focusMonth ? 100 : 0}%, #c7ccd4 ${focusMonth && visibleMonths.length > 1 ? (focusIndex / (visibleMonths.length - 1)) * 100 : focusMonth ? 100 : 0}% 100%)` }} onChange={(event) => { const month = visibleMonths[Number(event.target.value)]; if (month) { setFocusClearedManually(false); setFocusMonth(month.value); } }}/></div></label>
        {years.length > 1 && <div className="history-year-navigation"><button type="button" disabled={activeYearIndex <= 0} onClick={() => setActiveYear(years[activeYearIndex - 1])}><ChevronLeft size={22}/>{years[activeYearIndex - 1] ?? String(Number(activeYear) - 1)}</button><strong key={activeYear}>{activeYear}</strong><button type="button" disabled={activeYearIndex >= years.length - 1} onClick={() => setActiveYear(years[activeYearIndex + 1])}>{years[activeYearIndex + 1] ?? String(Number(activeYear) + 1)}<ChevronRight size={22}/></button></div>}
      </footer></>}
    </section>
    <button type="button" className="report-page-back" onClick={() => navigate(-1)}><ArrowLeft size={17}/>Back</button>
  </main>;
}

type HistoryRow = (typeof scorecardHistory)[number];
type HistorySortKey = "code" | "name" | "departments" | "frequency" | "duration" | "generated" | "average" | "trend";
function historySortValue(row: HistoryRow, key: HistorySortKey) { return row[key]; }
