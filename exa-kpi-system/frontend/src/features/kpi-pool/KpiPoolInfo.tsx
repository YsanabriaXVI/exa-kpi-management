import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Building2, CalendarDays, Check, CheckCircle2, ChevronDown, Clock3, FileText, Layers3, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiPoolService } from "./kpi-pool.service";
import { kpiConfigService } from "../kpi-config/kpi-config.service";
import type { KpiPoolInput } from "./kpi-pool.types";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import "./kpi-pool.css";

const emptyForm: KpiPoolInput = {
  name: "", companies: [], frequency: "Monthly", validFrom: "", validTo: "", description: "", status: "ACTIVE",
};
const companyOptions = ["EXA", "CONMOXA", "Grupo EXA"];
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
  const [validityOpen, setValidityOpen] = useState(false);
  const [validityYear, setValidityYear] = useState(2026);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const companiesRef = useRef<HTMLDivElement>(null);
  const validityRef = useRef<HTMLDivElement>(null);
  const visibleCompanyCount = useMultiSelectVisibleCount(companiesRef, form.companies);
  const visibleCompanies = form.companies.slice(0, visibleCompanyCount);
  const hiddenCompanyCount = form.companies.length - visibleCompanies.length;
  const poolQuery = useQuery({ queryKey: ["kpi-pool", poolId], queryFn: () => kpiPoolService.get(poolId!), enabled: Boolean(poolId) });
  useEffect(() => {
    if (poolQuery.data) {
      const { name, companies, frequency, validFrom, validTo, description, status } = poolQuery.data;
      setForm({ name, companies, frequency, validFrom, validTo, description, status });
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
      if (!validityRef.current?.contains(target)) setValidityOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCompaniesOpen(false);
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
  const save = useMutation({
    mutationFn: async ({ manage }: { manage: boolean }) => {
      const pool = await kpiPoolService.save(form, poolId);
      if (openedFromKpiConfig && pendingConfigurationIds.length) {
        const configurations = await kpiConfigService.list();
        const selected = configurations.filter((config) => pendingConfigurationIds.includes(config.id));
        await kpiPoolService.addConfigurations(pool.id, selected);
        await kpiConfigService.markAssignedToPool(selected.map((config) => config.id), pool.name);
      }
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
  const setField = <K extends keyof KpiPoolInput>(key: K, value: KpiPoolInput[K]) => setForm((current) => ({ ...current, [key]: value }));
  const onChange = (nextForm: KpiPoolInput) => setForm(nextForm);
  const monthsAreConsecutive = selectedMonths.every((month, index) => index === 0 || month === selectedMonths[index - 1] + 1);
  const syncValidity = (year: number, monthSelection: number[]) => {
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
  const toggleMonth = (month: number) => syncValidity(validityYear, selectedMonths.includes(month) ? selectedMonths.filter((item) => item !== month) : [...selectedMonths, month]);
  const toggleCompany = (company: string) => setField("companies", form.companies.includes(company) ? form.companies.filter((item) => item !== company) : [...form.companies, company]);
  const submit = (event: FormEvent, manage = false) => {
    event.preventDefault();
    if (!form.name.trim() || !form.companies.length || !form.validFrom || !form.validTo) {
      setError("Pool Name, companies and validity period are required.");
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
      {openedFromKpiConfig && <div className="pool-config-transfer-notice"><CheckCircle2 size={19} /><div><strong>{pendingConfigurationIds.length} KPI Configuration{pendingConfigurationIds.length === 1 ? "" : "s"} ready</strong><span>They will be added automatically when this KPI Pool is saved.</span></div></div>}
      <form className="pool-info-card" onSubmit={submit}>
        <div className="pool-form-heading"><span><Layers3 size={20} /></span><div><h2>General information</h2><p>Fields marked as required must be completed before saving.</p></div></div>
        <div className="pool-form-grid">
          <div className="pool-form-column">
          <label className="pool-field"><span><FileText size={15} /> Pool Name *</span><input value={form.name} onChange={(event) => setField("name", event.target.value)} placeholder="Example: KPI Pool EXA June 2026" /></label>
          <div className="pool-field company-multiselect" ref={companiesRef}><span><Building2 size={15} /> Applies to companies *</span><button type="button" className={`company-trigger ${companiesOpen ? "open" : ""}`} onClick={() => setCompaniesOpen((open) => !open)}><span className={`company-trigger-content ${hiddenCompanyCount > 0 ? "has-more" : ""}`}>{form.companies.length ? <>{visibleCompanies.map((company) => <span className="company-chip" key={company}><span>{company}</span><span className="chip-remove" role="button" tabIndex={0} aria-label={`Remove ${company}`} onClick={(event) => { event.stopPropagation(); toggleCompany(company); }}><X size={12} /></span></span>)}{hiddenCompanyCount > 0 && <span className="company-chip more"><span>+{hiddenCompanyCount} more</span><span className="chip-remove" role="button" tabIndex={0} aria-label="Remove additional company selections" onClick={(event) => { event.stopPropagation(); onChange({ ...form, companies: visibleCompanies }); }}><X size={12} /></span></span>}</> : <span className="trigger-placeholder">Select companies...</span>}</span><ChevronDown size={16} /></button>{companiesOpen && <div className="company-options">{companyOptions.map((company) => <button type="button" className={form.companies.includes(company) ? "selected" : ""} key={company} onClick={() => toggleCompany(company)}><span className="company-checkbox">{form.companies.includes(company) && <Check size={13} />}</span>{company}</button>)}</div>}</div>
          <label className="pool-field pool-description"><span><FileText size={15} /> Description</span><textarea value={form.description} onChange={(event) => setField("description", event.target.value)} placeholder="Add context about the purpose of this Pool." /></label>
          </div>
          <div className="pool-form-column">
          <div className="pool-field validity-field validity-popover" ref={validityRef}><span><CalendarDays size={15} /> Validity *</span><button type="button" className={`validity-trigger ${validityOpen ? "open" : ""}`} onClick={() => setValidityOpen((open) => !open)}><span className="validity-trigger-content">{selectedMonths.length ? <><span className="validity-year-chip">{validityYear}</span>{selectedMonths.map((month) => <span className="company-chip" key={month}>{months[month]}<span className="chip-remove" role="button" tabIndex={0} aria-label={`Remove ${months[month]}`} onClick={(event) => { event.stopPropagation(); toggleMonth(month); }}><X size={12} /></span></span>)}</> : <span className="trigger-placeholder">Select year and consecutive months...</span>}</span><ChevronDown size={16} /></button>{validityOpen && <div className="validity-panel"><div className="validity-selector"><div className="validity-panel-header"><label>Year<input type="number" min="2020" max="2100" value={validityYear} onChange={(event) => syncValidity(Number(event.target.value), selectedMonths)} /></label><label className="validity-select-all"><input type="checkbox" checked={selectedMonths.length === months.length} onChange={(event) => syncValidity(validityYear, event.target.checked ? months.map((_, index) => index) : [])} /><span>{selectedMonths.length === months.length && <Check size={12} />}</span>Select all months</label></div><div className="month-checkbox-grid">{months.map((month, index) => <label className={selectedMonths.includes(index) ? "selected" : ""} key={month}><input type="checkbox" checked={selectedMonths.includes(index)} onChange={() => toggleMonth(index)} /><span className="month-check">{selectedMonths.includes(index) && <Check size={12} />}</span>{month}</label>)}</div></div><div className={`validity-warning ${selectedMonths.length && !monthsAreConsecutive ? "error" : ""}`}><AlertTriangle size={15} /><span>{selectedMonths.length && !monthsAreConsecutive ? "The selected months are not consecutive. Adjust the selection before saving." : "You must select one or more consecutive months within the same year."}</span></div></div>}</div>
          <label className="pool-field"><span><Clock3 size={15} /> Suggested Frequency</span><select value={form.frequency} onChange={(event) => setField("frequency", event.target.value)}><option>Monthly</option><option>Quarterly</option><option>Four-monthly</option><option>Semiannual</option><option>Annual</option></select></label>
          <div className="pool-field"><span><CheckCircle2 size={15} /> Status</span><button type="button" className={`status-toggle ${form.status === "ACTIVE" ? "active" : ""}`} onClick={() => setField("status", form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE")}><span className="toggle-track"><i /></span>{form.status === "ACTIVE" ? "Active" : "Inactive"}</button></div>
          </div>
        </div>
        {error && <div className="pool-form-error">{error}</div>}
        <div className="pool-form-actions">
          <button type="button" className="button secondary" onClick={() => { if (openedFromKpiConfig) window.localStorage.removeItem("exa:kpi-config:pool-draft-ids"); navigate(openedFromKpiConfig ? "/app/kpi-management/config/overview" : "/app/pool-kpis/overview"); }}>Cancel</button>
          <button type="submit" className="button primary" disabled={save.isPending}>{save.isPending ? "Saving..." : "Save Pool"}</button>
          <button type="button" className="button pool-manage-button" disabled={save.isPending} onClick={(event) => submit(event as unknown as FormEvent, true)}>Save and Manage KPIs</button>
        </div>
      </form>
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
