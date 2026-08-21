import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarDays, CalendarPlus, CalendarRange, Check, CheckCircle2, ChevronDown, Clock3, FileText, Layers3, LockKeyhole, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import type { KpiPoolInput } from "./kpi-pool.types";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import { deriveInputPeriods } from "./pool-schedule";
import "./kpi-pool.css";
import "./pool-info-schedule.css";

const emptyForm: KpiPoolInput = {
  name: "", companies: [], companyIds: [], poolAreaIds: [], frequency: "", inputFrequencyId: "", validFrom: "", validTo: "", description: "",
};
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function KpiPoolInfo() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const poolId = Number(params.get("poolId")) || undefined;
  const openedFromKpiConfig = params.get("from") === "kpi-config" && !poolId;
  const pendingConfigurationIds = openedFromKpiConfig ? readPendingConfigurationIds() : [];
  const [form, setForm] = useState<KpiPoolInput>(emptyForm);
  const [error, setError] = useState("");
  const [companiesOpen, setCompaniesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [validityOpen, setValidityOpen] = useState(false);
  const [validityYear, setValidityYear] = useState(2026);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [extendValidityOpen, setExtendValidityOpen] = useState(false);
  const [extendThrough, setExtendThrough] = useState("");
  const companiesRef = useRef<HTMLDivElement>(null);
  const areasRef = useRef<HTMLDivElement>(null);
  const validityRef = useRef<HTMLDivElement>(null);
  const visibleCompanyCount = useMultiSelectVisibleCount(companiesRef, form.companies);
  const visibleCompanies = form.companies.slice(0, visibleCompanyCount);
  const hiddenCompanyCount = form.companies.length - visibleCompanies.length;
  const poolQuery = useQuery({ queryKey: ["kpi-pool", poolId], queryFn: () => kpiPoolService.get(poolId!), enabled: Boolean(poolId) });
  const poolStatus = poolQuery.data?.status ?? "DRAFT";
  const structureLocked = Boolean(poolId) && poolStatus !== "DRAFT";
  const lookupsQuery = useQuery({ queryKey: ["kpi-pool-lookups"], queryFn: kpiPoolService.lookups });
  useEffect(() => {
    if (poolQuery.data) {
      const { name, companies, companyIds, areaIds, frequency, inputFrequencyId, validFrom, validTo, description } = poolQuery.data;
      setForm({ name, companies, companyIds: companyIds ?? [], poolAreaIds: areaIds ?? [], frequency, inputFrequencyId: inputFrequencyId ?? "", validFrom, validTo, description });
      const start = new Date(`${validFrom}T00:00:00`);
      const end = new Date(`${validTo}T00:00:00`);
      setValidityYear(start.getFullYear());
      if (start.getFullYear() === end.getFullYear()) {
        setSelectedMonths(Array.from({ length: end.getMonth() - start.getMonth() + 1 }, (_, index) => start.getMonth() + index));
      }
    }
  }, [poolQuery.data]);
  useEffect(() => {
    const closePopovers = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!companiesRef.current?.contains(target)) setCompaniesOpen(false);
      if (!areasRef.current?.contains(target)) setAreasOpen(false);
      if (!validityRef.current?.contains(target)) setValidityOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompaniesOpen(false);
        setAreasOpen(false);
        setValidityOpen(false);
      }
    };
    document.addEventListener("mousedown", closePopovers);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closePopovers);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);
  useEffect(() => {
    if (!validityOpen || structureLocked) return;
    const revealTimer = window.setTimeout(() => {
      validityRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 120);
    return () => window.clearTimeout(revealTimer);
  }, [validityOpen, structureLocked]);
  const save = useMutation({
    mutationFn: async ({ manage }: { manage: boolean }) => {
      const pool = await kpiPoolService.save(form, poolId);
      return { pool, manage };
    },
    onSuccess: ({ pool, manage }) => {
      window.localStorage.removeItem("exa:kpi-config:pool-draft-ids");
      queryClient.invalidateQueries({ queryKey: ["kpi-configurations"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pools"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pool", pool.id] });
      navigate(manage ? `/app/pool-kpis/manage-kpis?poolId=${pool.id}` : `/app/pool-kpis/detail/${pool.id}`);
    },
  });
  const extendValidity = useMutation({
    mutationFn: () => kpiPoolService.extendValidity(poolId!, extendThrough),
    onSuccess: async ({ pool }) => {
      setExtendValidityOpen(false);
      setExtendThrough("");
      setField("validTo", pool.validTo);
      await queryClient.invalidateQueries({ queryKey: ["kpi-pool", poolId] });
      await queryClient.invalidateQueries({ queryKey: ["kpi-pool-periods", poolId] });
      await queryClient.invalidateQueries({ queryKey: ["kpi-pools"] });
    },
  });
  const selectedFrequency = lookupsQuery.data?.inputFrequencies.find((item) => item.id === form.inputFrequencyId);
  const frequencyMonths = frequencyMonthsFromCode(selectedFrequency?.code);
  const extensionOptions = structureLocked ? buildValidityExtensionOptions(form.validFrom, form.validTo, frequencyMonths) : [];
  const extensionPreview = extendThrough ? buildAddedPeriods(form.validTo, extendThrough, frequencyMonths) : [];
  const generatedInputPeriods = deriveInputPeriods(form.validFrom, form.validTo, selectedFrequency?.code);
  const setField = <K extends keyof KpiPoolInput>(key: K, value: KpiPoolInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const monthsAreConsecutive = selectedMonths.every((month, index) => index === 0 || month === selectedMonths[index - 1] + 1);
  const syncValidity = (year: number, monthSelection: number[]) => {
    if (structureLocked) return;
    const sorted = [...monthSelection].sort((left, right) => left - right);
    setValidityYear(year);
    setSelectedMonths(sorted);
    if (!sorted.length) {
      setField("validFrom", "");
      setField("validTo", "");
      return;
    }
    const first = sorted[0] + 1;
    const last = sorted[sorted.length - 1] + 1;
    const lastDay = new Date(year, last, 0).getDate();
    setField("validFrom", `${year}-${String(first).padStart(2, "0")}-01`);
    setField("validTo", `${year}-${String(last).padStart(2, "0")}-${lastDay}`);
  };
  const toggleMonth = (month: number) => { if (!structureLocked) syncValidity(validityYear, selectedMonths.includes(month) ? selectedMonths.filter((item) => item !== month) : [...selectedMonths, month]); };
  const toggleCompany = (id: string) => {
    if (structureLocked) return;
    const company = lookupsQuery.data?.companies.find((item) => item.id === id);
    if (!company) return;
    const selected = form.companyIds.includes(id);
    setForm((current) => ({ ...current, companyIds: selected ? current.companyIds.filter((item) => item !== id) : [...current.companyIds, id], companies: selected ? current.companies.filter((item) => item !== company.name) : [...current.companies, company.name] }));
  };
  const toggleArea = (id: string) => { if (!structureLocked) setField("poolAreaIds", form.poolAreaIds.includes(id) ? form.poolAreaIds.filter((item) => item !== id) : [...form.poolAreaIds, id]); };
  const submit = (event: FormEvent, manage = false) => {
    event.preventDefault();
    if (!form.name.trim() || !form.poolAreaIds.length || !form.companyIds.length || !form.inputFrequencyId || !form.validFrom || !form.validTo) {
      setError("Pool Name, areas, companies, frequency and validity period are required.");
      return;
    }
    if (!monthsAreConsecutive) {
      setError("The selected validity months must be consecutive.");
      return;
    }
    if (form.validTo < form.validFrom) {
      setError("Validity end date must be after the start date.");
      return;
    }
    setError("");
    save.mutate({ manage });
  };

  return (
    <main className="pool-page pool-info-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/pool-kpis/overview">KPI Pool</Link><span>/</span><Link to="/app/pool-kpis/create-pool-info" aria-current="page">{poolId ? "Edit Pool Info" : "Create Pool Info"}</Link></nav>
      <header className="pool-page-header"><div><h1>{poolId ? "Editing Pool Information" : "Pool Information"}</h1><p>Define the general context, validity and organizational scope of this KPI Pool.</p></div></header>
      {openedFromKpiConfig && <div className="pool-config-transfer-notice"><CheckCircle2 size={19} /><div><strong>{pendingConfigurationIds.length} KPI Configuration{pendingConfigurationIds.length === 1 ? "" : "s"} pending</strong><span>Pool Info will be saved now. KPI membership remains in the separate Manage KPIs prototype.</span></div></div>}
      <form className="pool-info-card" onSubmit={submit}>
        {structureLocked && <div className="pool-structure-lock-note"><LockKeyhole size={18}/><span><strong>Pool structure is locked.</strong> Only Pool Name and Pool Description can be edited. Validity, frequency, companies, areas and the remaining structural scope cannot change after activation.</span></div>}
        <section className="pool-general-information" aria-labelledby="pool-general-information-title">
        <div className="pool-form-heading"><span><Layers3 size={20} /></span><div><h2 id="pool-general-information-title">General information</h2><p>Fields marked as required must be completed before saving.</p></div></div>
        <fieldset className={structureLocked ? "pool-form-grid pool-structure-fields locked" : "pool-form-grid pool-structure-fields"}>
          <div className="pool-form-column">
          <label className="pool-field"><span><FileText size={15} /> Pool Name *</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Example: KPI Pool EXA June 2026" /></label>
          <label className="pool-field pool-description"><span><FileText size={15} /> Description</span><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Add context about the purpose of this Pool." /></label>
          </div>
          <div className="pool-form-column">
          <div className="pool-field company-multiselect" ref={companiesRef}><span><Building2 size={15} /> Applies to companies *</span><button type="button" className={`company-trigger ${companiesOpen ? "open" : ""}`} onClick={() => setCompaniesOpen((open) => !open)}><span className={`company-trigger-content ${hiddenCompanyCount > 0 ? "has-more" : ""}`}>{form.companies.length ? <>{visibleCompanies.map((company) => { const option = lookupsQuery.data?.companies.find((item) => item.name === company); return <span className="company-chip" key={company}><span>{company}</span><span className="chip-remove" role="button" tabIndex={0} aria-label={`Remove ${company}`} onClick={(event) => { event.stopPropagation(); if (option) toggleCompany(option.id); }}><X size={12} /></span></span>; })}</> : <span className="trigger-placeholder">Select companies...</span>}</span><ChevronDown size={16} /></button>{companiesOpen && <div className="company-options">{lookupsQuery.data?.companies.map((company) => <button type="button" className={form.companyIds.includes(company.id) ? "selected" : ""} key={company.id} onClick={() => toggleCompany(company.id)}><span className="company-checkbox">{form.companyIds.includes(company.id) && <Check size={13} />}</span>{company.code} · {company.name}</button>)}</div>}</div>
          <div className="pool-field company-multiselect" ref={areasRef}><span><Layers3 size={15} /> Pool Areas *</span><button type="button" className={`company-trigger ${areasOpen ? "open" : ""}`} onClick={() => setAreasOpen((open) => !open)}><span className="company-trigger-content">{form.poolAreaIds.length ? lookupsQuery.data?.areas.filter((area) => form.poolAreaIds.includes(area.id)).map((area) => <span className="company-chip" key={area.id}><span>{area.name}</span><span className="chip-remove" role="button" tabIndex={0} onClick={(event) => { event.stopPropagation(); toggleArea(area.id); }}><X size={12} /></span></span>) : <span className="trigger-placeholder">Select Pool Areas...</span>}</span><ChevronDown size={16} /></button>{areasOpen && <div className="company-options">{lookupsQuery.data?.areas.map((area) => <button type="button" className={form.poolAreaIds.includes(area.id) ? "selected" : ""} key={area.id} onClick={() => toggleArea(area.id)}><span className="company-checkbox">{form.poolAreaIds.includes(area.id) && <Check size={13} />}</span>{area.code} · {area.name}</button>)}</div>}</div>
          <div className="pool-field"><span><CheckCircle2 size={15} /> Status</span><div className="pool-status-readonly-input" role="textbox" aria-readonly="true" aria-label={`Pool status: ${formatPoolStatus(poolStatus)}`}><span className={`status-chip ${poolStatus.toLowerCase()}`}><i />{formatPoolStatus(poolStatus)}</span></div></div>
          </div>
        </fieldset>
        </section>
        <section className="pool-info-schedule" aria-labelledby="pool-info-schedule-title">
          <div className="pool-form-heading"><span><CalendarRange size={20}/></span><div><h2 id="pool-info-schedule-title">KPI Pool Schedule</h2><p>Input periods are generated automatically from the Pool validity and frequency.</p></div></div>
          <div className={structureLocked ? "pool-schedule-fields pool-structure-fields locked" : "pool-schedule-fields pool-structure-fields"}>
            <div className="pool-schedule-validity-control"><div className="pool-field validity-field validity-popover" ref={validityRef}><span><CalendarDays size={15} /> Validity *</span><button type="button" className={`validity-trigger ${validityOpen ? "open" : ""}`} onClick={() => setValidityOpen((open) => !open)}><span className="validity-trigger-content">{structureLocked ? <strong className="locked-validity-range">{formatMonthYear(form.validFrom)} – {formatMonthYear(form.validTo)}</strong> : selectedMonths.length ? <><span className="validity-year-chip">{validityYear}</span>{selectedMonths.map((month) => <span className="company-chip" key={month}>{months[month]}<span className="chip-remove" role="button" tabIndex={0} aria-label={`Remove ${months[month]}`} onClick={(event) => { event.stopPropagation(); toggleMonth(month); }}><X size={12} /></span></span>)}</> : <span className="trigger-placeholder">Select year and consecutive months...</span>}</span><ChevronDown size={16} /></button>{validityOpen && !structureLocked && <div className="validity-panel"><div className="validity-selector"><div className="validity-panel-header"><label>Year<input type="number" min="2020" max="2100" value={validityYear} onChange={(event) => syncValidity(Number(event.target.value), selectedMonths)} /></label><label className="validity-select-all"><input type="checkbox" checked={selectedMonths.length === months.length} onChange={(event) => syncValidity(validityYear, event.target.checked ? months.map((_, index) => index) : [])} /><span>{selectedMonths.length === months.length && <Check size={12} />}</span>Select all months</label></div><div className="month-checkbox-grid">{months.map((month, index) => <label className={selectedMonths.includes(index) ? "selected" : ""} key={month}><input type="checkbox" checked={selectedMonths.includes(index)} onChange={() => toggleMonth(index)} /><span className="month-check">{selectedMonths.includes(index) && <Check size={12} />}</span>{month}</label>)}</div></div><div className={`validity-warning ${selectedMonths.length && !monthsAreConsecutive ? "error" : ""}`}><AlertTriangle size={15} /><span>{selectedMonths.length && !monthsAreConsecutive ? "The selected months are not consecutive. Adjust the selection before saving." : "You must select one or more consecutive months within the same year."}</span></div></div>}</div>{structureLocked && poolStatus === "ACTIVE" && <button type="button" className="button secondary extend-validity-button" disabled={!extensionOptions.length} onClick={() => { setExtendThrough(extensionOptions[0]?.value ?? ""); setExtendValidityOpen(true); }}><CalendarPlus size={16}/> Extend Validity</button>}</div>
            <label className="pool-field"><span><Clock3 size={15} /> Input Frequency *</span><span className="pool-schedule-frequency-select"><select disabled={structureLocked} value={form.inputFrequencyId} onChange={(event) => { const selected = lookupsQuery.data?.inputFrequencies.find((item) => item.id === event.target.value); setForm((current) => ({ ...current, inputFrequencyId: event.target.value, frequency: selected?.name ?? "" })); }}><option value="">Select frequency...</option>{lookupsQuery.data?.inputFrequencies.map((frequency) => <option key={frequency.id} value={frequency.id}>{formatInputFrequencyOption(frequency.code)}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></span></label>
            <label className="pool-field"><span><CalendarRange size={15}/> Generated Input Periods</span><input readOnly tabIndex={-1} value={generatedInputPeriods.length} aria-label="Generated Input Periods"/></label>
          </div>
          <div className="pool-info-period-preview"><strong>Results will be required in</strong>{generatedInputPeriods.length ? <div>{generatedInputPeriods.map((period) => <span key={period.start}>{period.label}</span>)}</div> : <p>Select validity and input frequency to preview the generated Input Periods.</p>}</div>
        </section>
        {error && <div className="pool-form-error">{error}</div>}
        <div className="pool-form-actions">
          <button type="button" className="button secondary" onClick={() => { if (openedFromKpiConfig) window.localStorage.removeItem("exa:kpi-config:pool-draft-ids"); navigate(openedFromKpiConfig ? "/app/kpi-management/config/overview" : "/app/pool-kpis/overview"); }}>Cancel</button>
          <button type="submit" className="button primary" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Pool"}</button>
          <button type="button" className="button pool-manage-button" disabled={save.isPending} onClick={(event) => submit(event as unknown as FormEvent, true)}>Save and Manage KPIs</button>
        </div>
      </form>
      {extendValidityOpen && <div className="pool-modal-backdrop" role="presentation"><section className="extend-validity-modal" role="dialog" aria-modal="true" aria-labelledby="extend-validity-title"><header><span><CalendarPlus size={21}/></span><div><h2 id="extend-validity-title">Extend Pool Validity</h2><p>The current start date and all existing Input Periods will remain unchanged.</p></div><button type="button" aria-label="Close Extend Validity" onClick={() => setExtendValidityOpen(false)} disabled={extendValidity.isPending}><X size={18}/></button></header><div className="extend-validity-fields"><label><span>Current End</span><strong>{formatMonthYear(form.validTo)}</strong></label><label><span>Extend Through</span><span className="extend-through-select"><select value={extendThrough} onChange={(event) => setExtendThrough(event.target.value)}>{extensionOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select><ChevronDown size={16} aria-hidden="true"/></span></label></div><section className="extension-period-preview"><h3>New Input Periods</h3>{extensionPreview.length ? <ul>{extensionPreview.map((period) => <li key={period.start}><CalendarDays size={14}/><span>{formatPeriodRange(period.start, period.end)}</span></li>)}</ul> : <p>Select a later end period to preview the extension.</p>}</section>{extendValidity.error && <div className="pool-form-error">{extendValidity.error instanceof Error ? extendValidity.error.message : "Pool validity could not be extended."}</div>}<footer><button className="button secondary" type="button" onClick={() => setExtendValidityOpen(false)} disabled={extendValidity.isPending}>Cancel</button><button className="button primary" type="button" disabled={!extendThrough || extendValidity.isPending} onClick={() => extendValidity.mutate()}>{extendValidity.isPending ? "Extending…" : "Extend Validity"}</button></footer></section></div>}
    </main>
  );
}

function readPendingConfigurationIds() {
  try {
    const value = JSON.parse(window.localStorage.getItem("exa:kpi-config:pool-draft-ids") ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is number => Number.isInteger(item)) : [];
  } catch {
    return [];
  }
}

function formatPoolStatus(status: "DRAFT" | "ACTIVE" | "INACTIVE") {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

function formatInputFrequencyOption(code: string) {
  const labels: Record<string, string> = {
    MONTHLY: "Monthly",
    QUARTERLY: "Trimestral",
    FOUR_MONTHLY: "Cuatrimestral",
    FOUR_MONTH: "Cuatrimestral",
    SEMIANNUAL: "Semestral",
    SEMI_ANNUAL: "Semestral",
    ANNUAL: "Anual",
  };
  return labels[code.toUpperCase()] ?? code;
}

function frequencyMonthsFromCode(code?: string) {
  return ({ MONTHLY: 1, QUARTERLY: 3, FOUR_MONTHLY: 4, SEMIANNUAL: 6, ANNUAL: 12 } as Record<string, number>)[code ?? ""] ?? 1;
}

function buildValidityExtensionOptions(validFrom: string, validTo: string, monthsPerPeriod: number) {
  if (!validFrom || !validTo) return [];
  const start = new Date(`${validFrom}T00:00:00.000Z`);
  const currentEnd = new Date(`${validTo}T00:00:00.000Z`);
  const maximumEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 12, 0));
  const options: Array<{ value: string; label: string }> = [];
  let nextEnd = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth() + monthsPerPeriod + 1, 0));
  while (nextEnd <= maximumEnd) {
    const value = nextEnd.toISOString().slice(0, 10);
    options.push({ value, label: formatMonthYear(value) });
    nextEnd = new Date(Date.UTC(nextEnd.getUTCFullYear(), nextEnd.getUTCMonth() + monthsPerPeriod + 1, 0));
  }
  return options;
}

function buildAddedPeriods(currentValidTo: string, requestedValidTo: string, monthsPerPeriod: number) {
  const periods: Array<{ start: string; end: string }> = [];
  const currentEnd = new Date(`${currentValidTo}T00:00:00.000Z`);
  const requestedEnd = new Date(`${requestedValidTo}T00:00:00.000Z`);
  let start = new Date(Date.UTC(currentEnd.getUTCFullYear(), currentEnd.getUTCMonth() + 1, 1));
  while (start <= requestedEnd) {
    const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthsPerPeriod, 0));
    periods.push({ start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) });
    start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + monthsPerPeriod, 1));
  }
  return periods;
}

function formatMonthYear(value: string) {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(date);
}

function formatPeriodRange(start: string, end: string) {
  return start.slice(0, 7) === end.slice(0, 7) ? formatMonthYear(start) : `${formatMonthYear(start)} – ${formatMonthYear(end)}`;
}
