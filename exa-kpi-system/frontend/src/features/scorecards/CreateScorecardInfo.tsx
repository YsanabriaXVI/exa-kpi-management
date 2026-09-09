import { FormEvent, PointerEvent as ReactPointerEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Building2, CalendarDays, CalendarRange, Check, ChevronDown, ChevronRight, CircleAlert, Clock3, Eye, Save, UsersRound, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ScorecardMultiSelect } from "./ScorecardMultiSelect";
import { scorecardService } from "./scorecard.service";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { deriveInputPeriods, formatScheduleFrequency, formatScheduleValidity } from "../kpi-pool/pool-schedule";
import { temporaryOrganizationScope, type OrganizationDepartmentOption } from "./organization-fixtures";
import "./scorecards.css";
import "./scorecard-assignment.css";
import "./scorecard-pool-schedule.css";

// Compatibility adapter for the existing Assignment scope presentation.
const exaDepartments = temporaryOrganizationScope([{ id: "1", name: "EXA" }]);
export const poolScopes: Record<string, { companies: string[]; departments: typeof exaDepartments }> = {
  "OPS-04-2026 · Pool EXA 3er Cuatrimestre 2026": { companies: ["EXA"], departments: exaDepartments },
  "Pool EXA 3er Cuatrimestre 2026": { companies: ["EXA"], departments: exaDepartments },
};

export function CreateScorecardInfo() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scorecardId = Number(searchParams.get("scorecardId"));
  const isEditing = Number.isInteger(scorecardId) && scorecardId > 0;
  const [name, setName] = useState("");
  const [poolSource, setPoolSource] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [collaboratorsOpen, setCollaboratorsOpen] = useState(false);
  const [collaboratorMenuPosition, setCollaboratorMenuPosition] = useState({ x: 0, y: 0 });
  const [draggingCollaboratorMenu, setDraggingCollaboratorMenu] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState("");
  const [scopeOpen, setScopeOpen] = useState(false);
  const [error, setError] = useState("");
  const [poolSelectionToast, setPoolSelectionToast] = useState(false);
  const collaboratorMenuRef = useRef<HTMLDivElement>(null);
  const formActionsRef = useRef<HTMLElement>(null);
  const poolsQuery = useQuery({
    queryKey: ["kpi-pools", "scorecard-source", "DRAFT_ACTIVE"],
    queryFn: () => kpiPoolService.list().then((pools) =>
      pools.filter((pool) => pool.status === "DRAFT" || pool.status === "ACTIVE")
        .sort((left, right) => left.name.localeCompare(right.name)),
    ),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const scorecardQuery = useQuery({
    queryKey: ["scorecards", "detail", scorecardId],
    queryFn: () => scorecardService.getById(scorecardId),
    enabled: isEditing,
  });
  const structureLocked = isEditing && scorecardQuery.data?.status !== "DRAFT";
  useEffect(() => {
    if (scorecardQuery.data) {
      setName(scorecardQuery.data.name);
      setPoolSource(String(scorecardQuery.data.poolId ?? ""));
      setDepartments(scorecardQuery.data.departments);
      setCollaborators(scorecardQuery.data.scopeDepartments?.flatMap((department) => department.employees.map((employee) => employee.id)) ?? []);
    }
  }, [scorecardQuery.data]);
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
  const currentPool = poolsQuery.data?.find((pool) => String(pool.id) === poolSource);
  const availableDepartments = currentPool ? temporaryOrganizationScope((currentPool.companyIds ?? []).map((id, index) => ({ id, name: currentPool.companies[index] ?? `Company ${id}` }))) : [];
  const inheritedPeriods = currentPool ? deriveInputPeriods(currentPool.validFrom, currentPool.validTo, currentPool.frequency) : [];
  const selectedDepartmentScopes = availableDepartments.filter((department) => departments.includes(department.name));
  const inheritedCompanies = currentPool?.companies ?? [];
  const activeDepartmentScope = selectedDepartmentScopes.find((department) => department.name === activeDepartment) ?? selectedDepartmentScopes[0];
  const readOnlyDepartmentScopes = selectedDepartmentScopes.map((department) => ({
    ...department,
    employees: department.employees.filter((employee) => collaborators.includes(employee.id)),
  }));
  const activeReadOnlyDepartmentScope = readOnlyDepartmentScopes.find((department) => department.name === activeDepartment)
    ?? readOnlyDepartmentScopes.find((department) => department.employees.length > 0)
    ?? readOnlyDepartmentScopes[0];
  const create = useMutation({ mutationFn: ({ compose }: { compose: boolean }) => {
    if (structureLocked) return scorecardService.updateInfo(scorecardId, { name: name.trim() }).then((item) => ({ item, compose: false }));
    if (!currentPool) throw new Error("Select a KPI Pool first.");
    const companyIds = currentPool.companyIds ?? [];
    const selectedScopes = availableDepartments.filter((department) => departments.includes(department.name));
    const departmentPayload = selectedScopes.map((department, index) => ({
      externalDepartmentId: department.id,
      companyExternalId: department.companyExternalId ?? companyIds[index % companyIds.length] ?? companyIds[0],
      code: department.name.toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 50), name: department.name,
    }));
    const departmentIdByName = new Map(departmentPayload.map((department) => [department.name, department.externalDepartmentId]));
    const collaboratorPayload = selectedScopes.flatMap((department) => department.employees.filter((employee) => collaborators.includes(employee.id)).map((employee) => ({
      externalEmployeeId: /^\d+$/.test(employee.id) ? employee.id : String(900000 + employee.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)),
      departmentExternalId: departmentIdByName.get(department.name)!, code: `EMP-${employee.id}`.slice(0, 50), name: employee.name,
    })));
    if (isEditing) return scorecardService.updateInfo(scorecardId, { name: name.trim(), departments: departmentPayload, collaborators: collaboratorPayload }).then((item) => ({ item, compose: false }));
    return scorecardService.create({ name: name.trim(), kpiPoolExternalId: String(currentPool.id), departments: departmentPayload, collaborators: collaboratorPayload }).then((item) => ({ item, compose }));
  },
  onSuccess: ({ item, compose }) => navigate(compose ? `/app/scorecards/assignment?scorecardId=${item.id}` : "/app/scorecards/overview"),
  onError: (cause) => setError(cause instanceof Error ? cause.message : "ScoreCard Info could not be saved."),
  });
  const save = (compose: boolean) => {
    if (create.isPending) return;
    if (!name.trim() || (!structureLocked && (!currentPool || !departments.length || !collaborators.length))) {
      setError("ScoreCard Name, KPI Pool Source, departments and at least one collaborator are required.");
      formActionsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    create.mutate({ compose });
  };
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); save(false); };
  const changeDepartments = (next: string[]) => {
    setDepartments(next);
    if (!next.includes(activeDepartment)) setActiveDepartment(next[0] ?? "");
    const allowedEmployees = new Set(availableDepartments.filter((department) => next.includes(department.name)).flatMap((department) => department.employees.map((employee) => employee.id)));
    setCollaborators((current) => current.filter((employeeId) => allowedEmployees.has(employeeId)));
  };
  const toggleEmployee = (employeeId: string) => setCollaborators((current) => current.includes(employeeId) ? current.filter((id) => id !== employeeId) : [...current, employeeId]);
  const toggleDepartmentEmployees = (department: OrganizationDepartmentOption) => {
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
    <form className={`scorecard-info-form ${structureLocked ? "scorecard-name-only-edit" : ""}`} onSubmit={submit}>
      <section className="scorecard-info-section"><div className="scorecard-section-title"><span><Building2 size={19} /></span><div><h2>General Information</h2><p>Define the Pool source and operational scope.</p></div></div>
        <div className="scorecard-info-grid">
          <label className="scorecard-field"><span>ScoreCard Name *</span><input value={name} onChange={(event) => setName(event.target.value)} placeholder="Example: EXA Operations ScoreCard 2026" /></label>
          <div className="scorecard-field department-scope-field"><span>Applies to (Departments) *</span><ScorecardMultiSelect label={poolSource ? "Select departments..." : "Select a KPI Pool first"} options={availableDepartments.map((department) => ({ value: department.name, label: department.name }))} selected={departments} onChange={changeDepartments} blocked={structureLocked || !poolSource} onBlockedClick={structureLocked ? undefined : showPoolSelectionToast} /></div>
          <label className="scorecard-field"><span>KPI Pool Source *</span><div className="scorecard-select-with-chevron"><select value={poolSource} disabled={poolsQuery.isLoading} onChange={(event) => { setPoolSource(event.target.value); setDepartments([]); setCollaborators([]); setActiveDepartment(""); setCollaboratorsOpen(false); }}><option value="">{poolsQuery.isLoading ? "Loading active KPI Pools..." : poolsQuery.isError ? "Active KPI Pools could not be loaded" : "Select KPI Pool..."}</option>{poolsQuery.data?.map((pool) => <option value={pool.id} key={pool.id}>{pool.code} · {pool.name}</option>)}</select><ChevronDown size={15} /></div></label>
          <div className="scorecard-field collaborator-scope-field" ref={collaboratorMenuRef}>
            <span>Collaborators Assigned</span>
            <div className="collaborator-control">
              <strong><UsersRound size={15} /> {collaborators.length} collaborators selected</strong>
              {!structureLocked && <button type="button" className={`manage-collaborators-button ${collaboratorsOpen ? "active" : ""}`} disabled={!departments.length} onClick={() => { setActiveDepartment((current) => departments.includes(current) ? current : departments[0]); if (!collaboratorsOpen) setCollaboratorMenuPosition({ x: 0, y: 0 }); setCollaboratorsOpen((value) => !value); }}><UsersRound size={14} /> Manage Collaborators</button>}
              <button type="button" className="scope-button" disabled={!departments.length} onClick={() => {
                const initialDepartment = selectedDepartmentScopes.find((department) => department.employees.some((employee) => collaborators.includes(employee.id))) ?? selectedDepartmentScopes[0];
                setActiveDepartment(initialDepartment?.name ?? "");
                setScopeOpen(true);
              }}><Eye size={14} /> View details</button>
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
          <label className="scorecard-field"><span>Companies</span><input readOnly value={inheritedCompanies.join(", ")} placeholder="Computed from KPI Pool" /><small>Inherited from KPI Pool</small></label>
          <div className="scorecard-field"><span>Scorecard Status</span><div className="scorecard-status-readonly"><span className={`scorecard-status ${(isEditing ? scorecardQuery.data?.status ?? "DRAFT" : "DRAFT").toLowerCase()}`}><i />{isEditing ? (scorecardQuery.data?.status ? scorecardQuery.data.status.charAt(0) + scorecardQuery.data.status.slice(1).toLowerCase() : "Loading...") : "Draft"}</span></div></div>
        </div>
      </section>
      {currentPool && <section className="scorecard-pool-schedule" aria-labelledby="scorecard-pool-schedule-title">
        <div className="scorecard-pool-schedule-heading"><span className="scorecard-pool-schedule-icon"><CalendarDays size={20}/></span><div><h2 id="scorecard-pool-schedule-title">KPI Pool Schedule</h2><p>Schedule inherited from {currentPool.code}. These values are read-only.</p></div></div>
        <div className="scorecard-pool-schedule-fields">
          <label><span><CalendarDays size={15}/> Validity</span><input readOnly tabIndex={-1} value={formatScheduleValidity(currentPool.validFrom, currentPool.validTo)}/></label>
          <label><span><Clock3 size={15}/> Input Frequency</span><input readOnly tabIndex={-1} value={formatScheduleFrequency(currentPool.frequency)}/></label>
          <label><span><CalendarRange size={15}/> Generated Input Periods</span><input readOnly tabIndex={-1} value={inheritedPeriods.length}/></label>
        </div>
        <div className="scorecard-pool-periods"><strong>Results will be required in</strong><div>{inheritedPeriods.map((period) => <span key={period.start}>{period.label}</span>)}</div></div>
      </section>}
      {error && <div className="scorecard-error">{error}</div>}
      <footer className="scorecard-form-actions" ref={formActionsRef}><Link className="button danger" to="/app/scorecards/overview">Cancel</Link><button type="submit" className="button primary" disabled={create.isPending || scorecardQuery.isLoading}><Save size={15} /> {create.isPending ? "Saving..." : "Save ScoreCard Info"}</button>{!isEditing && <button type="button" className="button scorecard-compose-button" disabled={create.isPending} onClick={() => save(true)}>{create.isPending ? "Saving..." : "Save and Set Composition"}</button>}</footer>
    </form>
    {scopeOpen && <div className="assignment-scope-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setScopeOpen(false); }}>
      <section className="assignment-scope-dialog scorecard-create-scope-modal" role="dialog" aria-modal="true" aria-labelledby="scope-summary-title">
        <header>
          <div><span><UsersRound size={21} /></span><div><h2 id="scope-summary-title">Computed Scope Details</h2><p>Read-only organizational scope inherited from the selected KPI Pool.</p></div></div>
          <button type="button" onClick={() => setScopeOpen(false)} aria-label="Close computed scope details"><X size={18} /></button>
        </header>
        {activeReadOnlyDepartmentScope ? <div className="assignment-scope-browser">
          <nav aria-label="Associated departments"><small>Departments</small>
            {readOnlyDepartmentScopes.map((department) => <button type="button" className={department.name === activeReadOnlyDepartmentScope.name ? "active" : ""} key={department.name} onClick={() => setActiveDepartment(department.name)}>
              <span><strong>{department.name}</strong><small>{department.employees.length} associated {department.employees.length === 1 ? "collaborator" : "collaborators"}</small></span>
              <ChevronRight size={15} />
            </button>)}
          </nav>
          <section>
            <header><div><strong>{activeReadOnlyDepartmentScope.name}</strong><small>{activeReadOnlyDepartmentScope.employees.length} associated {activeReadOnlyDepartmentScope.employees.length === 1 ? "collaborator" : "collaborators"}</small></div></header>
            <div>{activeReadOnlyDepartmentScope.employees.length ? activeReadOnlyDepartmentScope.employees.map((employee) => <article key={employee.id}>
              <span>{employee.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</span>
              <div><strong>{employee.name}</strong><small>{employee.company}</small></div>
              <span className="assignment-scope-check"><Check size={13} /></span>
            </article>) : <div className="assignment-scope-empty">No collaborators from this department are assigned to the Scorecard.</div>}</div>
          </section>
        </div> : <div className="assignment-scope-empty">No collaborator details are available for this Scorecard.</div>}
        <footer><span>{collaborators.length} associated {collaborators.length === 1 ? "collaborator" : "collaborators"} in {readOnlyDepartmentScopes.length} {readOnlyDepartmentScopes.length === 1 ? "department" : "departments"}</span><button type="button" className="button primary" onClick={() => setScopeOpen(false)}>Done</button></footer>
      </section>
    </div>}
    {poolSelectionToast && <div className="scorecard-pool-toast" role="status">
      <CircleAlert size={19} />
      <div><strong>Select a KPI Pool first</strong><span>Choose a KPI Pool Source before selecting the departments that apply.</span></div>
      <button type="button" aria-label="Dismiss notification" onClick={() => setPoolSelectionToast(false)}><X size={16} /></button>
    </div>}
  </main>;
}
