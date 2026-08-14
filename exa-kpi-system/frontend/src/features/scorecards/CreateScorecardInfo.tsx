import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { BriefcaseBusiness, Building2, CalendarDays, Check, ChevronDown, ChevronRight, CircleAlert, Eye, Network, Save, UserRoundCheck, UsersRound, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ScorecardMultiSelect } from "./ScorecardMultiSelect";
import { scorecardService } from "./scorecard.service";
import "./scorecards.css";

const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const frequencySize: Record<string, number> = { Monthly: 1, Quarterly: 3, "Four-monthly": 4, Semiannual: 6, Annual: 12 };
const frequencyOptions = Object.keys(frequencySize);
type Employee = { id: string; name: string; company: string };
export type DepartmentScope = { name: string; employees: Employee[] };
export const poolScopes: Record<string, { companies: string[]; departments: DepartmentScope[] }> = {
  "Grupo EXA KPI Pool": {
    companies: ["Grupo EXA", "CONMOXA"],
    departments: [
      { name: "Administration", employees: [{ id: "adm-ana", name: "Ana López", company: "Grupo EXA" }, { id: "adm-carlos", name: "Carlos Gomez", company: "Grupo EXA" }, { id: "adm-marta", name: "Marta Ruiz", company: "CONMOXA" }] },
      { name: "Operations", employees: [{ id: "ops-luis", name: "Luis Hernández", company: "Grupo EXA" }, { id: "ops-sofia", name: "Sofía Torres", company: "CONMOXA" }, { id: "ops-diego", name: "Diego Ramírez", company: "Grupo EXA" }] },
      { name: "Systems", employees: [{ id: "sys-elena", name: "Elena Vázquez", company: "Grupo EXA" }, { id: "sys-jorge", name: "Jorge Cruz", company: "CONMOXA" }] },
    ],
  },
  "Financial KPI Pool": {
    companies: ["EXA"],
    departments: [
      { name: "Finance", employees: [{ id: "fin-mariana", name: "Mariana Silva", company: "EXA" }, { id: "fin-roberto", name: "Roberto Díaz", company: "EXA" }, { id: "fin-camila", name: "Camila Ortega", company: "EXA" }] },
      { name: "Administration", employees: [{ id: "fin-ana", name: "Ana López", company: "EXA" }, { id: "fin-carlos", name: "Carlos Gomez", company: "EXA" }] },
    ],
  },
  "Operations KPI Pool": {
    companies: ["EXA", "TREXA"],
    departments: [
      { name: "Operations", employees: [{ id: "op-miguel", name: "Miguel Santos", company: "EXA" }, { id: "op-laura", name: "Laura Méndez", company: "TREXA" }, { id: "op-daniel", name: "Daniel Flores", company: "EXA" }] },
      { name: "Systems", employees: [{ id: "op-elena", name: "Elena Vázquez", company: "EXA" }, { id: "op-ricardo", name: "Ricardo Peña", company: "TREXA" }] },
      { name: "Process", employees: [{ id: "op-paula", name: "Paula Navarro", company: "EXA" }, { id: "op-andres", name: "Andrés Ríos", company: "TREXA" }] },
    ],
  },
};

export function CreateScorecardInfo() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [poolSource, setPoolSource] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [collaboratorMenuPosition, setCollaboratorMenuPosition] = useState({ x: 0, y: 0 });
  const [draggingCollaboratorMenu, setDraggingCollaboratorMenu] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState("");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [year, setYear] = useState(2026);
  const [selectedMonths, setSelectedMonths] = useState<number[]>([]);
  const [durationOpen, setDurationOpen] = useState(false);
  const [frequency, setFrequency] = useState("Monthly");
  const [frequencyOpen, setFrequencyOpen] = useState(false);
  const [error, setError] = useState("");
  const [poolSelectionToast, setPoolSelectionToast] = useState(false);
  const collaboratorMenuRef = useRef<HTMLDivElement>(null);
  const durationPickerRef = useRef<HTMLDivElement>(null);
  const frequencyPickerRef = useRef<HTMLDivElement>(null);
  const formActionsRef = useRef<HTMLElement>(null);
  const actionScrollAnimationRef = useRef(0);
  const smoothlyRevealFormActions = () => {
    const actions = formActionsRef.current;
    if (!actions) return;
    window.cancelAnimationFrame(actionScrollAnimationRef.current);
    const bounds = actions.getBoundingClientRect();
    const startPosition = window.scrollY;
    const centeredPosition = startPosition + bounds.top - (window.innerHeight - bounds.height) / 2;
    const distance = centeredPosition + 90 - startPosition;
    const startedAt = performance.now();
    const animateScroll = (now: number) => {
      const progress = Math.min((now - startedAt) / 720, 1);
      const easedProgress = progress < .5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      window.scrollTo(0, startPosition + distance * easedProgress);
      if (progress < 1) actionScrollAnimationRef.current = window.requestAnimationFrame(animateScroll);
    };
    actionScrollAnimationRef.current = window.requestAnimationFrame(animateScroll);
  };
  const startCollaboratorMenuDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    event.preventDefault();
    const startPointer = { x: event.clientX, y: event.clientY };
    const startPosition = collaboratorMenuPosition;
    setDraggingCollaboratorMenu(true);
    const move = (moveEvent: PointerEvent) => {
      const maxX = Math.max(80, window.innerWidth / 2 - 90);
      const maxY = Math.max(70, window.innerHeight / 2 - 80);
      setCollaboratorMenuPosition({
        x: Math.max(-maxX, Math.min(maxX, startPosition.x + moveEvent.clientX - startPointer.x)),
        y: Math.max(-maxY, Math.min(maxY, startPosition.y + moveEvent.clientY - startPointer.y)),
      });
    };
    const stop = () => {
      setDraggingCollaboratorMenu(false);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", stop);
    };
    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", stop);
  };
  const poolToastTimerRef = useRef<number>();
  const currentScope = poolScopes[poolSource];
  const availableDepartments = currentScope?.departments ?? [];
  const selectedDepartmentScopes = availableDepartments.filter((department) => departments.includes(department.name));
  const selectedEmployees = selectedDepartmentScopes.flatMap((department) => department.employees).filter((employee) => collaborators.includes(employee.id));
  const companySummaries = (currentScope?.companies ?? []).map((company) => {
    const companyDepartments = selectedDepartmentScopes.filter((department) => department.employees.some((employee) => employee.company === company));
    const availableEmployees = companyDepartments.flatMap((department) => department.employees.filter((employee) => employee.company === company));
    return {
      company,
      departments: companyDepartments.map((department) => department.name),
      availableCount: availableEmployees.length,
      selectedCount: availableEmployees.filter((employee) => collaborators.includes(employee.id)).length,
    };
  });
  const activeDepartmentScope = selectedDepartmentScopes.find((department) => department.name === activeDepartment) ?? selectedDepartmentScopes[0];
  const expectedInputs = Math.floor(selectedMonths.length / frequencySize[frequency]);
  const periods = useMemo(() => selectedMonths.filter((_, index) => index % frequencySize[frequency] === 0).map((month) => frequency === "Monthly" ? `${months[month]} ${year}` : `${months[month]}–${months[Math.min(month + frequencySize[frequency] - 1, 11)]} ${year}`), [frequency, selectedMonths, year]);
  const consecutive = selectedMonths.every((month, index) => index === 0 || month === selectedMonths[index - 1] + 1);
  const create = useMutation({ mutationFn: ({ compose }: { compose: boolean }) => scorecardService.create({ name, departments, durationMonths: selectedMonths, year, inputFrequency: frequency, poolSource, company: currentScope?.companies.join(", ") ?? "", status: "DRAFT", collaborators: collaborators.length }).then((item) => ({ item, compose })), onSuccess: ({ item, compose }) => navigate(compose ? `/app/scorecards/assignment?scorecardId=${item.id}` : "/app/scorecards/overview") });
  const submit = (event: FormEvent, compose = false) => { event.preventDefault(); if (!name.trim() || !poolSource || !departments.length || !selectedMonths.length) { setError("ScoreCard Name, KPI Pool Source, departments and duration are required."); return; } if (!consecutive) { setError("Duration months must be consecutive."); return; } setError(""); create.mutate({ compose }); };
  const toggleMonth = (month: number) => setSelectedMonths((current) => current.includes(month) ? current.filter((item) => item !== month) : [...current, month].sort((a,b) => a-b));
  const changeDepartments = (next: string[]) => {
    setDepartments(next);
    if (!next.includes(activeDepartment)) setActiveDepartment(next[0] ?? "");
    const allowedEmployees = new Set(availableDepartments.filter((department) => next.includes(department.name)).flatMap((department) => department.employees.map((employee) => employee.id)));
    setCollaborators((current) => current.filter((employeeId) => allowedEmployees.has(employeeId)));
  };
  const toggleEmployee = (employeeId: string) => setCollaborators((current) => current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]);
  const toggleDepartmentEmployees = (department: DepartmentScope) => {
    const employeeIds = department.employees.map((employee) => employee.id);
    const allSelected = employeeIds.every((id) => collaborators.includes(id));
    setCollaborators((current) => allSelected ? current.filter((id) => !employeeIds.includes(id)) : [...new Set([...current, ...employeeIds])]);
  };
  const showPoolSelectionToast = () => {
    window.clearTimeout(poolToastTimerRef.current);
    setPoolSelectionToast(true);
    poolToastTimerRef.current = window.setTimeout(() => setPoolSelectionToast(false), 3000);
  };
  useEffect(() => () => window.clearTimeout(poolToastTimerRef.current), []);
  useEffect(() => {
    if (!collaboratorsOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!collaboratorMenuRef.current?.contains(event.target as Node)) setCollaboratorsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setCollaboratorsOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [collaboratorsOpen]);
  useEffect(() => {
    if (!durationOpen) return;
    const scrollTimer = window.setTimeout(() => {
      smoothlyRevealFormActions();
    }, 160);
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!durationPickerRef.current?.contains(event.target as Node)) setDurationOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDurationOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(scrollTimer);
      window.cancelAnimationFrame(actionScrollAnimationRef.current);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [durationOpen]);
  useEffect(() => {
    if (!frequencyOpen) return;
    const scrollTimer = window.setTimeout(smoothlyRevealFormActions, 160);
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!frequencyPickerRef.current?.contains(event.target as Node)) setFrequencyOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFrequencyOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.clearTimeout(scrollTimer);
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [frequencyOpen]);
  useEffect(() => {
    if (!scopeOpen) return;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setScopeOpen(false);
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [scopeOpen]);
  return <main className="scorecard-page scorecard-info-page">
    <nav className="kpi-breadcrumb"><Link to="/app/scorecards/overview">ScoreCards</Link><span>/</span><Link to="/app/scorecards/create-scorecard-info" aria-current="page">Create ScoreCard Info</Link></nav>
    <header className="scorecard-page-header"><div><h1>ScoreCard Information</h1><p>Register the ScoreCard scope before defining its KPI composition.</p></div></header>
    <form className="scorecard-info-form" onSubmit={submit}>
      <section className="scorecard-info-section"><div className="scorecard-section-title"><span><Building2 size={19} /></span><div><h2>General Information</h2><p>Define the Pool source and operational scope.</p></div></div>
        <div className="scorecard-info-grid">
          <label className="scorecard-field"><span>ScoreCard Name *</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: EXA Operations ScoreCard 2026" /></label>
          <div className="scorecard-field department-scope-field"><span>Applies to (Departments) *</span><ScorecardMultiSelect label={poolSource ? "Select departments..." : "Select a KPI Pool first"} options={availableDepartments.map((department) => ({ value: department.name, label: department.name }))} selected={departments} onChange={changeDepartments} blocked={!poolSource} onBlockedClick={showPoolSelectionToast} /></div>
          <label className="scorecard-field"><span>KPI Pool Source *</span><div className="scorecard-select-with-chevron"><select value={poolSource} onChange={(event) => { setPoolSource(event.target.value); setDepartments([]); setCollaborators([]); setActiveDepartment(""); setCollaboratorsOpen(false); }}><option value="">Select KPI Pool...</option>{Object.keys(poolScopes).map((pool) => <option key={pool}>{pool}</option>)}</select><ChevronDown size={15} /></div></label>
          <div className="scorecard-field collaborator-scope-field" ref={collaboratorMenuRef}>
            <span>Collaborators Assigned</span>
            <div className="collaborator-control">
              <strong><UsersRound size={15} /> {collaborators.length} collaborators selected</strong>
              <button type="button" className={`manage-collaborators-button ${collaboratorsOpen ? "active" : ""}`} disabled={!departments.length} onClick={() => { setActiveDepartment((current) => departments.includes(current) ? current : departments[0]); if (!collaboratorsOpen) setCollaboratorMenuPosition({ x: 0, y: 0 }); setCollaboratorsOpen((value) => !value); }}><UsersRound size={14} /> Manage Collaborators</button>
              <button type="button" className="scope-button" disabled={!departments.length} onClick={() => setScopeOpen(true)}><Eye size={14} /> View details</button>
            </div>
            {collaboratorsOpen && activeDepartmentScope && <section className={`collaborator-mega-menu ${draggingCollaboratorMenu ? "dragging" : ""}`} style={{ transform: `translate(calc(-50% + ${collaboratorMenuPosition.x}px), calc(-50% + ${collaboratorMenuPosition.y}px))` }} aria-label="Select collaborators">
              <header onPointerDown={startCollaboratorMenuDrag}>
                <div><span><UsersRound size={18} /></span><div><h2>Select Collaborators</h2><p>Browse by department and select one or more employees.</p></div></div>
                <button type="button" onClick={() => setCollaboratorsOpen(false)} aria-label="Close collaborator selector"><X size={17} /></button>
              </header>
              <div className="collaborator-menu-body">
                <nav className="collaborator-department-nav" aria-label="Selected departments">
                  <small>Departments</small>
                  {selectedDepartmentScopes.map((department) => {
                    const selectedCount = department.employees.filter((employee) => collaborators.includes(employee.id)).length;
                    return <button type="button" className={department.name === activeDepartmentScope.name ? "active" : ""} key={department.name} onClick={() => setActiveDepartment(department.name)}>
                      <span><strong>{department.name}</strong><small>{selectedCount} of {department.employees.length} selected</small></span>
                      <ChevronRight size={15} />
                    </button>;
                  })}
                </nav>
                <div className="collaborator-employee-panel">
                  <div className="collaborator-employee-heading">
                    <div><strong>{activeDepartmentScope.name}</strong><small>{activeDepartmentScope.employees.length} available employees</small></div>
                    <label>
                      <input type="checkbox" checked={activeDepartmentScope.employees.every((employee) => collaborators.includes(employee.id))} onChange={() => toggleDepartmentEmployees(activeDepartmentScope)} />
                      <span className="scope-checkbox">{activeDepartmentScope.employees.every((employee) => collaborators.includes(employee.id)) && <Check size={12} />}</span>
                      Select all
                    </label>
                  </div>
                  <div className="collaborator-employee-list">
                    {activeDepartmentScope.employees.map((employee) => {
                      const checked = collaborators.includes(employee.id);
                      return <label className={checked ? "selected" : ""} key={employee.id}>
                        <input type="checkbox" checked={checked} onChange={() => toggleEmployee(employee.id)} />
                        <span className="scope-checkbox">{checked && <Check size={12} />}</span>
                        <span><strong>{employee.name}</strong><small>{employee.company}</small></span>
                      </label>;
                    })}
                  </div>
                </div>
              </div>
              <footer><span><strong>{collaborators.length}</strong> collaborators selected</span><button type="button" onClick={() => setCollaboratorsOpen(false)}>Done</button></footer>
            </section>}
          </div>
          <label className="scorecard-field"><span>Companies</span><input readOnly value={currentScope?.companies.join(", ") ?? ""} placeholder="Computed from KPI Pool" /></label>
          <label className="scorecard-field"><span>Status</span><input readOnly value="Draft" /></label>
        </div>
      </section>
      <section className="scorecard-info-section"><div className="scorecard-section-title"><span><CalendarDays size={19} /></span><div><h2>ScoreCard Result Schedule</h2><p>Choose a consecutive duration and input frequency.</p></div></div>
        <div className="schedule-grid">
          <div className="scorecard-field duration-picker" ref={durationPickerRef}><span>Period Duration *</span><button type="button" className={durationOpen ? "open" : ""} onClick={() => setDurationOpen((value) => !value)}><span>{selectedMonths.length ? <><b>{year}</b>{selectedMonths.map((month) => <i key={month}><span>{months[month]}</span><span role="button" tabIndex={0} aria-label={`Remove ${months[month]}`} onClick={(event) => { event.stopPropagation(); toggleMonth(month); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggleMonth(month); } }}><X size={11} /></span></i>)}</> : "Select duration..."}</span><ChevronDown size={15} /></button>{durationOpen && <div className="duration-panel"><div className="duration-panel-header"><label>Year<input type="number" value={year} onChange={(event) => setYear(Number(event.target.value))} /></label><label className="duration-select-all"><input type="checkbox" checked={selectedMonths.length === months.length} onChange={(event) => setSelectedMonths(event.target.checked ? months.map((_, index) => index) : [])} /><span>{selectedMonths.length === months.length && <Check size={12} />}</span>Select all months</label></div><div className="duration-month-grid">{months.map((month,index) => <label className={selectedMonths.includes(index) ? "selected" : ""} key={month}><input type="checkbox" checked={selectedMonths.includes(index)} onChange={() => toggleMonth(index)} /><span>{selectedMonths.includes(index) && <Check size={11} />}</span>{month}</label>)}</div>{!consecutive && <p>Select consecutive months only.</p>}</div>}</div>
          <div className="scorecard-field frequency-picker" ref={frequencyPickerRef}><span>Input Frequency</span><button type="button" className={frequencyOpen ? "open" : ""} aria-haspopup="listbox" aria-expanded={frequencyOpen} onClick={() => { setDurationOpen(false); setFrequencyOpen((value) => !value); }}><span>{frequency}</span><ChevronDown size={15} /></button>{frequencyOpen && <div className="frequency-options" role="listbox">{frequencyOptions.map((option) => <button type="button" role="option" aria-selected={frequency === option} className={frequency === option ? "selected" : ""} key={option} onClick={() => { setFrequency(option); setFrequencyOpen(false); smoothlyRevealFormActions(); }}><span>{option}</span>{frequency === option && <Check size={16} />}</button>)}</div>}</div>
          <label className="scorecard-field"><span>Expected Inputs</span><input readOnly value={expectedInputs} /></label>
        </div>
        <div className="result-periods"><strong>Results will be required in</strong><span>{periods.length ? periods.join(" · ") : "Select a duration to generate the expected periods."}</span></div>
      </section>
      {error && <div className="scorecard-error">{error}</div>}
      <footer className="scorecard-form-actions" ref={formActionsRef}><button type="button" className="button danger" onClick={() => navigate("/app/scorecards/overview")}>Cancel</button><button type="submit" className="button primary"><Save size={15} /> Save ScoreCard Info</button><button type="button" className="button scorecard-compose-button" onClick={(event) => submit(event as unknown as FormEvent, true)}>Save and Set Composition</button></footer>
    </form>
    {scopeOpen && <div className="scorecard-scope-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeOpen(false); }}><section className="scope-summary-modal" role="dialog" aria-modal="true" aria-labelledby="scope-summary-title">
      <header><div><span><Eye size={20} /></span><div><h2 id="scope-summary-title">ScoreCard Scope Details</h2><p>Review the organizational reach inherited from the KPI Pool.</p></div></div><button type="button" onClick={() => setScopeOpen(false)} aria-label="Close"><X size={18} /></button></header>
      <div className="scope-summary-metrics">
        <article><span><BriefcaseBusiness size={19} /></span><div><strong>{currentScope?.companies.length ?? 0}</strong><small>Companies</small></div></article>
        <article><span><Network size={19} /></span><div><strong>{departments.length}</strong><small>Departments</small></div></article>
        <article><span><UserRoundCheck size={19} /></span><div><strong>{collaborators.length}</strong><small>Collaborators</small></div></article>
      </div>
      <div className="scope-summary-body">
        <section className="scope-company-summary" aria-labelledby="company-summary-title">
          <header><div><h3 id="company-summary-title">Company summary</h3><p>Departments and affiliated collaborators in the selected scope.</p></div></header>
          <div className="scope-company-summary-grid">{companySummaries.map((summary) => <article key={summary.company}>
            <div className="scope-company-summary-heading"><span><Building2 size={15} /></span><div><strong>{summary.company}</strong><small>{summary.departments.length} {summary.departments.length === 1 ? "department" : "departments"}</small></div><b>{summary.selectedCount}/{summary.availableCount}</b></div>
            <div className="scope-company-summary-departments">{summary.departments.length ? summary.departments.map((department) => <span key={department}>{department}</span>) : <em>No selected departments</em>}</div>
            <footer><UsersRound size={13} /><span><strong>{summary.selectedCount}</strong> selected of <strong>{summary.availableCount}</strong> available affiliates</span></footer>
          </article>)}</div>
        </section>
        <div className="scope-summary-paths">{selectedDepartmentScopes.map((department, departmentIndex) => {
        const employees = department.employees.filter((employee) => collaborators.includes(employee.id));
        const companies = [...new Set(department.employees.map((employee) => employee.company))];
        return <section key={department.name}>
          <header>
            <div><span className={`scope-department-chip tone-${departmentIndex % 4}`}>{department.name}</span><small>{department.employees.length} available collaborators</small></div>
            <strong>{employees.length} {employees.length === 1 ? "collaborator" : "collaborators"} assigned</strong>
          </header>
          <div className="scope-company-groups">{companies.map((company) => {
            const companyEmployees = employees.filter((employee) => employee.company === company);
            return <section className="scope-company-group" key={company}>
              <header><span><Building2 size={13} /> {company}</span><small>{companyEmployees.length} {companyEmployees.length === 1 ? "collaborator" : "collaborators"} assigned</small></header>
              {companyEmployees.length ? <div className="scope-employee-grid">{companyEmployees.map((employee) => <article key={employee.id}><span>{employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span><div><strong>{employee.name}</strong><small>{department.name}</small></div><Check size={13} /></article>)}</div> : <div className="scope-empty-state"><UsersRound size={17} /><span>No collaborators from {company} selected.</span></div>}
            </section>;
          })}</div>
        </section>;
        })}</div>
      </div>
      <footer><span>The information shown here is computed from the selected Pool and departments.</span><button type="button" className="button primary" onClick={() => setScopeOpen(false)}>Done</button></footer>
    </section></div>}
    {poolSelectionToast && <div className="scorecard-pool-toast" role="status">
      <CircleAlert size={19} />
      <div><strong>Select a KPI Pool first</strong><span>Choose a KPI Pool Source before selecting the departments that apply.</span></div>
      <button type="button" aria-label="Dismiss notification" onClick={() => setPoolSelectionToast(false)}><X size={16} /></button>
    </div>}
  </main>;
}
