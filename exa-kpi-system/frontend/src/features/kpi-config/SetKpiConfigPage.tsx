import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus, Search, ShieldAlert, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiDefinitionKeys, kpiDefinitionService } from "../kpi-definition/kpi-definition.service";
import { ApiError } from "../../api/http-client";
import type { LegacyKpiDefinitionOption } from "../kpi-definition/kpi-definition.types";
import { kpiConfigService } from "./kpi-config.service";
import { TrafficLightEditor } from "./TrafficLightEditor";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import type { KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import "./kpi-config.css";

const defaultRanges: TrafficLightRanges = {
  redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100,
};

const measurementUnitOptions = ["%", "USD", "km", "Incidents", "Units"];
const dataSourceOptions = ["EMS", "SAP", "GPS", "Excel Import", "Manual Entry", "API"];

export function SetKpiConfigPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const definitionSearchRef = useRef<HTMLDivElement>(null);
  const initializedEditRef = useRef<number | null>(null);
  const openedFromDefinitionOverview = searchParams.get("from") === "definition-overview";
  const requestedDefinitionId = searchParams.get("kpiDefinitionId") ?? "";
  const requestedConfigId = Number(searchParams.get("kpiConfigId"));
  const isEditing = Number.isFinite(requestedConfigId) && requestedConfigId > 0;
  const editMode = searchParams.get("mode") === "POOL_PERIOD_EDIT" ? "POOL_PERIOD_EDIT" : isEditing ? "GLOBAL_EDIT" : "CREATE";
  const requestedPoolId = Number(searchParams.get("poolId"));
  const requestedInputPeriodId = searchParams.get("inputPeriodId") ?? "";
  const requestedPeriod = searchParams.get("period") ?? "";
  const requestedPeriodLabel = /^\d{4}-\d{2}/.test(requestedPeriod)
    ? new Date(`${requestedPeriod.slice(0, 7)}-01T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" })
    : requestedPeriod || "Current period";
  const definitionLocked = Boolean(requestedDefinitionId) || isEditing;
  const storedDefinitionId = window.localStorage.getItem("exa:kpi-config-selected-draft") ?? "";
  const initialDefinitionId = requestedDefinitionId || (!openedFromDefinitionOverview ? storedDefinitionId : "");
  const [searchTerm, setSearchTerm] = useState(() => definitionLocked ? "" : window.localStorage.getItem("exa:kpi-config-search-draft") ?? "");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selected, setSelected] = useState<LegacyKpiDefinitionOption | null>(null);
  const [lastSelectedDefinitionId, setLastSelectedDefinitionId] = useState<string | null>(() => {
    const stored = window.localStorage.getItem("exa:last-kpi-definition");
    return stored || null;
  });
  const [goal, setGoal] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [ranges, setRanges] = useState(defaultRanges);
  const [error, setError] = useState("");
  const [lockedFieldNotice, setLockedFieldNotice] = useState<{ title:string; detail:string } | null>(null);
  const lockedFieldTimerRef = useRef<number | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(() => { const next = new Date(); next.setUTCMonth(next.getUTCMonth() + 1, 1); return next.toISOString().slice(0, 7); });
  const [changeReason, setChangeReason] = useState("");
  const [applyToFuturePeriods, setApplyToFuturePeriods] = useState(true);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [resetConfirmationOpen, setResetConfirmationOpen] = useState(false);

  const requestedDefinitionQuery = useQuery({
    queryKey: ["kpi-definitions", "detail", initialDefinitionId],
    queryFn: () => kpiDefinitionService.get(initialDefinitionId),
    enabled: !isEditing && Boolean(initialDefinitionId),
  });
  const selectedDefinitionLabel = selected ? `${selected.code} — ${selected.name}` : "";
  const searchQueryTerm = autocompleteQueryTerm(debouncedSearchTerm, selectedDefinitionLabel);
  const definitionsSearchQuery = useQuery({
    queryKey: ["kpi-definitions", "search", searchQueryTerm],
    queryFn: () => kpiDefinitionService.searchActiveOptions(searchQueryTerm),
    enabled: !definitionLocked && suggestionsOpen,
    staleTime: 60 * 1000,
  });
  const editConfigQuery = useQuery({
    queryKey: ["kpi-config-detail", requestedConfigId],
    queryFn: () => kpiConfigService.getDetail(requestedConfigId),
    enabled: isEditing,
    staleTime: 30 * 1000,
  });
  const poolEffectiveQuery = useQuery({ queryKey: ["pool-effective-kpi-settings", requestedPoolId, requestedInputPeriodId, requestedConfigId], queryFn: () => kpiPoolService.getEffectiveSettings(requestedPoolId, requestedInputPeriodId, String(requestedConfigId)), enabled: editMode === "POOL_PERIOD_EDIT" && requestedPoolId > 0 && Boolean(requestedInputPeriodId) && isEditing });
  const poolContextQuery = useQuery({ queryKey:["kpi-pool-basic",requestedPoolId], queryFn:()=>kpiPoolService.getBasic(requestedPoolId), enabled:editMode === "POOL_PERIOD_EDIT" && requestedPoolId > 0 });
  const eligiblePeriodsQuery = useQuery({ queryKey:["global-edit-eligible-periods",requestedConfigId], queryFn:()=>kpiPoolService.getEligibleGlobalEditPeriods(String(requestedConfigId)), enabled:editMode === "GLOBAL_EDIT" && isEditing });

  useEffect(()=>{ const first=eligiblePeriodsQuery.data?.data[0]; if(first) setEffectiveFrom(first.periodKey); },[eligiblePeriodsQuery.data]);

  useEffect(() => {
    const definition = requestedDefinitionQuery.data;
    if (isEditing || !definition?.isActive || selected) return;
    const option: LegacyKpiDefinitionOption = { id: definition.id, code: definition.kpiCode, name: definition.kpiName, objective: definition.description, status: definition.status };
    setSelected(option);
    setSearchTerm(`${option.code} — ${option.name}`);
  }, [isEditing, requestedDefinitionQuery.data, selected]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearchTerm(searchTerm), 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const config = editConfigQuery.data;
    if (!isEditing || !config || initializedEditRef.current === config.id) return;
    const definition = {
      id: String(config.definitionId),
      code: config.definitionCode,
      name: config.definitionName,
      objective: "",
      status: "ACTIVE" as const,
    };

    initializedEditRef.current = config.id;
    setSelected(definition);
    setSearchTerm(`${definition.code} — ${definition.name}`);
    setGoal(String(config.goal));
    setMeasurementUnit(config.measurementUnit);
    setDataSource(config.dataSource);
    setIsActive(config.isActive ?? config.status !== "INACTIVE");
    setRanges({ ...config.ranges });
  }, [editConfigQuery.data, isEditing]);

  useEffect(() => {
    const resolved = poolEffectiveQuery.data;
    if (editMode !== "POOL_PERIOD_EDIT" || !resolved) return;
    setGoal(String(resolved.effective.goal ?? ""));
    const byCode = new Map((resolved.effective.thresholds ?? []).map((item: any) => [item.code, item]));
    const red:any=byCode.get("RED"), yellow:any=byCode.get("YELLOW"), green:any=byCode.get("GREEN");
    if (red && yellow && green) setRanges({ redFrom:Number(red.rangeMinPercent), redTo:Number(red.rangeMaxPercent), yellowFrom:Number(yellow.rangeMinPercent), yellowTo:Number(yellow.rangeMaxPercent), greenFrom:Number(green.rangeMinPercent), greenTo:Number(green.rangeMaxPercent) });
  }, [editMode, poolEffectiveQuery.data]);

  useEffect(() => {
    const closeSuggestions = () => {
      setSuggestionsOpen(false);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (!definitionSearchRef.current?.contains(event.target as Node)) {
        closeSuggestions();
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeSuggestions();
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const suggestions = definitionsSearchQuery.data ?? [];
  const proposedPoolThresholds = [{ code:"RED" as const,rangeMinPercent:ranges.redFrom,rangeMaxPercent:ranges.redTo,includesMin:true,includesMax:true },{ code:"YELLOW" as const,rangeMinPercent:ranges.yellowFrom,rangeMaxPercent:ranges.yellowTo,includesMin:true,includesMax:true },{ code:"GREEN" as const,rangeMinPercent:ranges.greenFrom,rangeMaxPercent:ranges.greenTo,includesMin:true,includesMax:true }];
  const currentPoolThresholds = (poolEffectiveQuery.data?.effective.thresholds ?? []).map((item:any) => ({ code:item.code,rangeMinPercent:Number(item.rangeMinPercent),rangeMaxPercent:Number(item.rangeMaxPercent),includesMin:item.includesMin,includesMax:item.includesMax }));
  const poolGoalChanged = editMode === "POOL_PERIOD_EDIT" && Number(goal) !== Number(poolEffectiveQuery.data?.effective.goal);
  const poolTrafficChanged = editMode === "POOL_PERIOD_EDIT" && JSON.stringify(proposedPoolThresholds) !== JSON.stringify(currentPoolThresholds);
  const poolScopeChanged = editMode === "POOL_PERIOD_EDIT" && applyToFuturePeriods !== true;
  const poolHasChanges = poolGoalChanged || poolTrafficChanged || poolScopeChanged;
  const poolSettingsFrozen = editMode === "POOL_PERIOD_EDIT" && poolEffectiveQuery.data?.editability?.frozen === true;
  const poolOverrideFields = editMode === "POOL_PERIOD_EDIT" ? ([...(poolEffectiveQuery.data?.sources.GOAL === "POOL_OVERRIDE" ? ["GOAL" as const] : []), ...(poolEffectiveQuery.data?.sources.TRAFFIC_LIGHT_THRESHOLDS === "POOL_OVERRIDE" ? ["TRAFFIC_LIGHT_THRESHOLDS" as const] : [])]) : [];

  const saveMutation = useMutation({
    mutationFn: () => {
      if (editMode === "POOL_PERIOD_EDIT") {
        return kpiPoolService.saveConfigurationOverride(requestedPoolId, requestedInputPeriodId, String(requestedConfigId), { ...((poolGoalChanged || (poolScopeChanged && !poolTrafficChanged)) ? { goal:Number(goal) } : {}), ...(poolTrafficChanged ? { trafficLightThresholds:proposedPoolThresholds } : {}), applyToFuturePeriods, reason:changeReason }).then(() => editConfigQuery.data!);
      }
      return isEditing
        ? kpiConfigService.update(
            requestedConfigId,
            {
              definitionId: selected!.id,
              goal: Number(goal),
              measurementUnit,
              dataSource,
              ranges,
              isActive,
              effectiveFrom: `${effectiveFrom}-01`,
              changeReason,
            },
            { code: selected!.code, name: selected!.name },
          )
        : kpiConfigService.create(
            {
              definitionId: selected!.id,
              goal: Number(goal),
              measurementUnit,
              dataSource,
              ranges,
              isActive,
            },
            { code: selected!.code, name: selected!.name },
          );
    },
    onSuccess: (savedConfiguration) => {
      if (editMode === "POOL_PERIOD_EDIT") { void queryClient.invalidateQueries({ queryKey: ["kpi-pool-composition", requestedPoolId] }); navigate(`/app/pool-kpis/detail/${requestedPoolId}?period=${encodeURIComponent(searchParams.get("period") ?? "")}`); return; }
      window.localStorage.removeItem("exa:kpi-config-selected-draft");
      window.localStorage.removeItem("exa:kpi-config-search-draft");
      queryClient.setQueryData<KpiConfigRecord[]>(["kpi-configurations"], (current) => current
        ? [savedConfiguration, ...current.filter((configuration) => configuration.id !== savedConfiguration.id)]
        : [savedConfiguration]);
      const createdQuery = new URLSearchParams({ created: String(savedConfiguration.id), createdCode: savedConfiguration.code });
      navigate(`/app/kpi-management/config/overview?${createdQuery}`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["kpi-configurations"], refetchType: "active" }),
        queryClient.invalidateQueries({ queryKey: kpiDefinitionKeys.configurations(selected!.id), refetchType: "active" }),
      ]);
    },
    onError: (mutationError) => {
      setError(mutationError instanceof ApiError ? mutationError.message : "KPI Configuration could not be saved.");
    },
  });
  const resetMutation = useMutation({
    mutationFn: () => kpiPoolService.resetConfigurationOverride(requestedPoolId, requestedInputPeriodId, String(requestedConfigId), { fields:poolOverrideFields, applyToFuturePeriods, reason:changeReason }),
    onSuccess: async () => { setChangeReason(""); await poolEffectiveQuery.refetch(); void queryClient.invalidateQueries({ queryKey:["kpi-pool-composition",requestedPoolId] }); },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "Pool Overrides could not be reset."),
  });

  const selectDefinition = (definition: LegacyKpiDefinitionOption) => {
    setSelected(definition);
    setLastSelectedDefinitionId(definition.id);
    window.localStorage.setItem("exa:last-kpi-definition", String(definition.id));
    const selectedLabel = `${definition.code} — ${definition.name}`;
    setSearchTerm(selectedLabel);
    if (!definitionLocked) {
      window.localStorage.setItem("exa:kpi-config-selected-draft", String(definition.id));
      window.localStorage.setItem("exa:kpi-config-search-draft", selectedLabel);
    }
    setSuggestionsOpen(false);
    setError("");
  };

  const showLockedFieldNotice = (field: "definition" | "unit" | "source" | "status") => {
    if (lockedFieldTimerRef.current !== null) window.clearTimeout(lockedFieldTimerRef.current);
    const notices = {
      definition: { title:"KPI Definition is read-only", detail:"A Pool override cannot change the KPI Definition linked to this Configuration." },
      unit: { title:"Measurement Unit is read-only", detail:"Changing the measurement meaning belongs to the Global KPI Configuration." },
      source: { title:"Data Source is read-only", detail:"Pool Period overrides currently support only Goal and Traffic Light settings." },
      status: { title:"Configuration Status is read-only", detail:"Status is controlled by KPI Management and cannot be changed from a Pool Period override." },
    };
    setLockedFieldNotice(notices[field]);
    lockedFieldTimerRef.current = window.setTimeout(() => { setLockedFieldNotice(null); lockedFieldTimerRef.current = null; }, 4000);
  };

  const clearDefinition = () => {
    if (definitionLocked) {
      showLockedFieldNotice("definition");
      return;
    }
    setSelected(null);
    setLastSelectedDefinitionId(null);
    window.localStorage.removeItem("exa:last-kpi-definition");
    window.localStorage.removeItem("exa:kpi-config-selected-draft");
    window.localStorage.removeItem("exa:kpi-config-search-draft");
    setSearchTerm("");
    setSuggestionsOpen(false);
    setError("");
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!selected || !goal || !measurementUnit || !dataSource) {
      setError("Select a KPI Definition and complete Goal, Measurement Unit and Data Source.");
      return;
    }
    if (editMode === "POOL_PERIOD_EDIT" && poolSettingsFrozen) { setError("This KPI setting is frozen because a Scorecard composition for this period has been finalized."); return; }
    if (editMode === "POOL_PERIOD_EDIT" && !poolHasChanges) { setError("Change Goal, Traffic Light or Period Scope before saving a Pool Override."); return; }
    const ordered =
      ranges.redFrom === 0 &&
      ranges.redFrom <= ranges.redTo &&
      ranges.yellowFrom === ranges.redTo + 1 &&
      ranges.yellowFrom <= ranges.yellowTo &&
      ranges.greenFrom === ranges.yellowTo + 1 &&
      ranges.greenFrom <= ranges.greenTo &&
      ranges.greenTo === 100;
    if (!ordered) {
      setError("Traffic light ranges must be continuous from Red 0 through Yellow to Green 100, without gaps or overlaps.");
      return;
    }
    setError("");
    if (editMode === "CREATE") saveMutation.mutate(); else setConfirmationOpen(true);
  };

  if (isEditing && editConfigQuery.isLoading) {
    return (
      <main className="kpi-config-page set-kpi-config-page">
        <div className="config-edit-loading" role="status">Loading KPI Configuration…</div>
      </main>
    );
  }

  return (
    <main className="kpi-config-page set-kpi-config-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/kpi-management">KPI Management</Link><span>/</span>
        <Link to="/app/kpi-management/config/overview">KPI Config</Link><span>/</span>
        <Link to="/app/kpi-management/config/set" aria-current="page">Set KPI Config</Link>
      </nav>

      <header className="config-page-header">
        <div>
          <h1>{editMode === "POOL_PERIOD_EDIT" ? "Edit Pool KPI Settings" : isEditing ? "Edit Global KPI Configuration" : "Set KPI Config"}</h1>
          <p>{editMode === "POOL_PERIOD_EDIT" ? "Create compatible overrides for this Pool and Input Period." : isEditing ? "Create a new effective revision of the global KPI Configuration." : "Select an existing KPI Definition and define how it will be measured."}</p>
        </div>
      </header>

      {isEditing && <div className="config-revision-notice" role="note"><ShieldAlert size={18}/><div><strong>{editMode === "POOL_PERIOD_EDIT" ? "Pool period override" : "Period-safe global revision"}</strong><span>FINALIZED Scorecard compositions and Monitoring snapshots remain unchanged.</span></div></div>}
      {poolSettingsFrozen && <div className="config-revision-notice" role="alert"><ShieldAlert size={18}/><div><strong>This period is finalized for this KPI setting.</strong><span>These settings are read-only because a FINALIZED Scorecard composition already consumes them.</span></div></div>}
      {editMode === "POOL_PERIOD_EDIT" && poolEffectiveQuery.data && <section className="config-card effective-goal-card"><header><div className="pool-title-with-period"><strong>{poolContextQuery.data?.code ?? `POOL-${requestedPoolId}`} · {poolContextQuery.data?.name ?? "Pool"}</strong><span className="pool-period-badge">{requestedPeriodLabel}</span></div></header><div className="effective-goal-summary"><div><span>Global Goal</span><strong>{poolEffectiveQuery.data.global.goal ?? "—"} {measurementUnit}</strong></div><div><span>Pool Override</span><strong>{poolEffectiveQuery.data.sources.GOAL === "POOL_OVERRIDE" ? `${poolEffectiveQuery.data.effective.goal} ${measurementUnit}` : "—"}</strong></div><span className="effective-goal-arrow" aria-hidden="true">→</span><div className="effective-goal-result"><span>Effective Goal</span><strong>{poolEffectiveQuery.data.effective.goal ?? "—"} {measurementUnit}</strong><small>{poolEffectiveQuery.data.sources.GOAL === "POOL_OVERRIDE" ? "Pool Override" : "Global Configuration"}</small></div></div></section>}

      <form className="config-form" onSubmit={submit}>
        <section className="config-card">
          <div className="config-section-heading">
            <span className="step-number">1</span>
            <div>
              <h2>{editMode === "POOL_PERIOD_EDIT" ? "KPI Definition" : "Select KPI Definition"}</h2>
              <p>{editMode === "POOL_PERIOD_EDIT" ? "This Pool override remains linked to the original KPI Configuration." : "Only active definitions can be configured."}</p>
            </div>
          </div>
          <div className="definition-search-row">
          <div className="definition-autocomplete" ref={definitionSearchRef}>
            {editMode === "POOL_PERIOD_EDIT" ? <ShieldAlert size={17} /> : <Search size={17} />}
            <input
              value={searchTerm}
              readOnly={definitionLocked}
              aria-readonly={definitionLocked}
              aria-label={editMode === "POOL_PERIOD_EDIT" ? "KPI Definition (read-only)" : "KPI Definition"}
              onFocus={() => { if (!definitionLocked) setSuggestionsOpen(true); }}
              onClick={() => { if (definitionLocked) showLockedFieldNotice("definition"); }}
              onKeyDown={(event) => {
                if (selected && (event.key === "Backspace" || event.key === "Delete")) {
                  if (definitionLocked) {
                    event.preventDefault();
                    showLockedFieldNotice("definition");
                  }
                }
              }}
              onChange={(event) => {
                if (definitionLocked) {
                  showLockedFieldNotice("definition");
                  return;
                }
                const value = event.target.value;
                setSearchTerm(value);
                window.localStorage.setItem("exa:kpi-config-search-draft", value);
                if (selected && !isCompatibleWithSelection(value, selected)) {
                  setSelected(null);
                  window.localStorage.removeItem("exa:kpi-config-selected-draft");
                }
                setSuggestionsOpen(true);
              }}
              placeholder="Search by KPI code, name or objective..."
            />
            {editMode !== "POOL_PERIOD_EDIT" && (!definitionLocked || selected) && (
              <button
                type="button"
                className={`definition-clear-button ${definitionLocked ? "locked" : ""}`}
                onClick={clearDefinition}
                aria-label={definitionLocked ? "KPI Definition locked" : "Clear KPI Definition"}
                aria-disabled={definitionLocked}
                title={definitionLocked ? "This KPI Definition cannot be removed from here" : "Clear selection"}
              >
                {definitionLocked ? <ShieldAlert size={16} /> : <X size={16} />}
              </button>
            )}
            {suggestionsOpen && !definitionLocked && (!selected || searchTerm !== selectedDefinitionLabel) && (
              <div className="definition-suggestions">
                {definitionsSearchQuery.isFetching || debouncedSearchTerm !== searchTerm ? (
                  <div className="no-suggestions"><Search size={20} /><strong>Searching KPI Definitions...</strong></div>
                ) : suggestions.length ? suggestions.map((definition) => (
                  <button type="button" key={definition.id} onClick={() => selectDefinition(definition)}>
                    <span className="suggestion-code">{definition.code}</span>
                    <span><strong>{definition.name}</strong><small>{definition.objective}{definition.id === lastSelectedDefinitionId ? " · Last selected" : ""}</small></span>
                    {selected?.id === definition.id && <Check size={15} />}
                  </button>
                )) : (
                  <div className="no-suggestions"><Search size={20} /><strong>No matching active KPI Definitions</strong><span>Try another code, name or objective.</span></div>
                )}
              </div>
            )}
          </div>
          {editMode !== "POOL_PERIOD_EDIT" && (
            <button type="button" className="button new-definition-button" onClick={() => navigate("/app/kpi-management/definition/overview")}>
              <Plus size={15} /> KPI Definition
            </button>
          )}
          </div>
        </section>

        <section className="config-card">
          <div className="config-section-heading">
            <span className="step-number">2</span>
            <div><h2>Measurement Setup</h2><p>Configure the target and source for this reusable variant.</p></div>
          </div>
          <div className="config-fields-grid">
            <label><span>Goal</span><input disabled={poolSettingsFrozen} type="number" inputMode="decimal" value={goal} onKeyDown={(event) => { if (event.key === "e" || event.key === "E") event.preventDefault(); }} onChange={(e) => setGoal(e.target.value)} placeholder="Enter a numeric goal, e.g. 3700" /></label>
            <label><span>Measurement Unit</span><select aria-disabled={editMode === "POOL_PERIOD_EDIT"} value={measurementUnit} onMouseDown={(event)=>{if(editMode === "POOL_PERIOD_EDIT"){event.preventDefault();showLockedFieldNotice("unit");}}} onKeyDown={(event)=>{if(editMode === "POOL_PERIOD_EDIT"){event.preventDefault();showLockedFieldNotice("unit");}}} onChange={(e) => {if(editMode === "POOL_PERIOD_EDIT"){showLockedFieldNotice("unit");return;}setMeasurementUnit(e.target.value);}}><option value="">Select unit</option>{measurementUnit && !measurementUnitOptions.includes(measurementUnit) && <option value={measurementUnit}>{measurementUnit}</option>}<option value="%">Percentage (%)</option><option value="USD">US Dollars (USD)</option><option value="km">Kilometers (km)</option><option value="Incidents">Incidents</option><option value="Units">Units</option></select></label>
            <label><span>Data Source</span><select aria-disabled={editMode === "POOL_PERIOD_EDIT"} value={dataSource} onMouseDown={(event)=>{if(editMode === "POOL_PERIOD_EDIT"){event.preventDefault();showLockedFieldNotice("source");}}} onKeyDown={(event)=>{if(editMode === "POOL_PERIOD_EDIT"){event.preventDefault();showLockedFieldNotice("source");}}} onChange={(e) => {if(editMode === "POOL_PERIOD_EDIT"){showLockedFieldNotice("source");return;}setDataSource(e.target.value);}}><option value="">Select source</option>{dataSource && !dataSourceOptions.includes(dataSource) && <option value={dataSource}>{dataSource}</option>}{dataSourceOptions.map((source) => <option value={source} key={source}>{source}</option>)}</select></label>
          </div>
        </section>

        <section className="config-card"><TrafficLightEditor value={ranges} onChange={setRanges} disabled={poolSettingsFrozen} /></section>
        {editMode === "GLOBAL_EDIT" && <section className="config-card"><div className="config-section-heading"><div><h2>Revision Effective Period</h2><p>Select the first eligible Input Period for the new global standard.</p></div></div><div className="config-fields-grid"><label><span>Effective From Input Period</span><select value={effectiveFrom} onChange={(event)=>setEffectiveFrom(event.target.value)}>{eligiblePeriodsQuery.data?.data.map((period)=><option key={period.periodKey} value={period.periodKey}>{new Date(`${period.periodStart}T00:00:00Z`).toLocaleDateString("en-US",{month:"long",year:"numeric",timeZone:"UTC"})}</option>)}</select></label><label><span>Change reason</span><input value={changeReason} onChange={(event)=>setChangeReason(event.target.value)} placeholder="Optional audit note"/></label></div>{eligiblePeriodsQuery.data && !eligiblePeriodsQuery.data.data.length && <p className="config-error">No eligible Input Period is currently available. FINALIZED consumers remain frozen.</p>}</section>}
        <section className="config-card configuration-status-card">
          <div className="config-section-heading">
            <span className="step-number">4</span>
            <div><h2>Configuration Status</h2></div>
          </div>
          <div className={`configuration-status-layout ${editMode === "POOL_PERIOD_EDIT" ? "with-period-scope" : ""}`}>
            {editMode === "POOL_PERIOD_EDIT" && (
              <div className="pool-override-scope-card">
              <fieldset disabled={poolSettingsFrozen}>
                <legend>Period Scope</legend>
                <div className="pool-scope-options">
                  <label className="pool-scope-option">
                    <input type="radio" name="pool-override-scope" checked={!applyToFuturePeriods} onChange={() => setApplyToFuturePeriods(false)} />
                    <span><strong>Only this Input Period</strong><small>Apply the override only to the selected period.</small></span>
                  </label>
                  <label className="pool-scope-option">
                    <input type="radio" name="pool-override-scope" checked={applyToFuturePeriods} onChange={() => setApplyToFuturePeriods(true)} />
                    <span><strong>This and future eligible periods</strong><small>Continue the setting into later editable periods until another change supersedes it.</small></span>
                  </label>
                </div>
              </fieldset>
              {poolOverrideFields.length > 0 && !poolSettingsFrozen && <button type="button" className="button secondary" disabled={resetMutation.isPending} onClick={() => { setChangeReason(""); setResetConfirmationOpen(true); }}>Reset to Global Configuration</button>}
              </div>
            )}
            <div className="configuration-status-content">
              <label className="configuration-status-toggle">
                <span>Status</span>
                <button type="button" className={`status-toggle ${isActive ? "active" : ""}`} role="switch" aria-checked={isActive} aria-readonly={editMode === "POOL_PERIOD_EDIT"} onClick={() => editMode === "POOL_PERIOD_EDIT" ? showLockedFieldNotice("status") : setIsActive((current) => !current)}>
                  <span className="toggle-track" aria-hidden="true"><i /></span>
                  <strong>{isActive ? "Active" : "Inactive"}</strong>
                </button>
              </label>
              <p>{editMode === "POOL_PERIOD_EDIT" ? "Status is inherited from the Global KPI Configuration." : "This configuration will be available for KPI Pools and Scorecards."}</p>
            </div>
          </div>
        </section>
        {error && <div className="config-error">{error}</div>}
        <footer className="config-form-actions">
          <button type="button" className="button secondary" onClick={() => navigate("/app/kpi-management/config/overview")}><ArrowLeft size={15} /> Back to Overview</button>
          <div><button type="button" className="button secondary" onClick={() => navigate(-1)}>Cancel</button>{!poolSettingsFrozen && <button type="submit" className="button primary" disabled={saveMutation.isPending || (editMode === "POOL_PERIOD_EDIT" && !poolHasChanges) || (editMode === "GLOBAL_EDIT" && !eligiblePeriodsQuery.data?.data.length)}>{saveMutation.isPending ? "Saving..." : editMode === "POOL_PERIOD_EDIT" ? "Save Pool Changes" : editMode === "GLOBAL_EDIT" ? "Save Global Changes" : "Save KPI Configuration"}</button>}</div>
        </footer>
      </form>
      {confirmationOpen && selected && <div className="pool-modal-backdrop" role="presentation"><section className="finalize-composition-modal" role="dialog" aria-modal="true"><header><div><h2>{editMode === "POOL_PERIOD_EDIT" ? "Save Pool configuration changes?" : "Save global configuration changes?"}</h2><p>{editConfigQuery.data?.code}</p></div></header><p>{editMode === "POOL_PERIOD_EDIT" ? `You are creating field-level overrides for Pool ${requestedPoolId}, Input Period ${searchParams.get("period")?.slice(0,7)}${applyToFuturePeriods ? " and future eligible periods" : " only"}. FINALIZED Scorecards will not be modified.` : `You are modifying ${editConfigQuery.data?.code} globally from ${effectiveFrom}. Previous FINALIZED compositions and Monitoring history will not be modified.`}</p><dl><div><dt>Goal</dt><dd>{editMode === "POOL_PERIOD_EDIT" ? `${poolEffectiveQuery.data?.effective.goal ?? "—"} → ${goal}` : `${editConfigQuery.data?.goal ?? "—"} → ${goal}`}</dd></div></dl>{editMode === "POOL_PERIOD_EDIT" && <label className="pool-change-reason"><span>Change reason</span><textarea autoFocus value={changeReason} onChange={(event)=>setChangeReason(event.target.value)} placeholder="Target increased for the operational plan"/><small>Briefly explain why this Pool uses settings different from the global KPI configuration.</small></label>}<footer><button type="button" className="button secondary" onClick={()=>setConfirmationOpen(false)}>Cancel</button><button type="button" className="button primary" disabled={saveMutation.isPending || (editMode === "POOL_PERIOD_EDIT" && changeReason.trim().length < 3)} onClick={()=>{setConfirmationOpen(false);saveMutation.mutate();}}>{editMode === "POOL_PERIOD_EDIT" ? "Save Pool Changes" : "Save Global Changes"}</button></footer></section></div>}
      {resetConfirmationOpen && <div className="pool-modal-backdrop" role="presentation"><section className="finalize-composition-modal" role="dialog" aria-modal="true"><header><div><h2>Reset to Global Configuration?</h2><p>{editConfigQuery.data?.code}</p></div></header><p>The selected Pool Overrides will stop being effective for {applyToFuturePeriods ? "this and future eligible periods" : "this Input Period"}. FINALIZED Scorecards remain unchanged.</p><label className="pool-change-reason"><span>Reset reason</span><textarea autoFocus value={changeReason} onChange={(event)=>setChangeReason(event.target.value)} placeholder="Return to the current global KPI standard"/><small>This reason is stored in the override audit history.</small></label><footer><button type="button" className="button secondary" onClick={()=>setResetConfirmationOpen(false)}>Cancel</button><button type="button" className="button primary" disabled={resetMutation.isPending || changeReason.trim().length < 3} onClick={()=>{setResetConfirmationOpen(false);resetMutation.mutate();}}>Reset to Global</button></footer></section></div>}
      {lockedFieldNotice && (
        <div className="config-lock-toast" role="status">
          <ShieldAlert size={19} />
          <div>
            <strong>{lockedFieldNotice.title}</strong>
            <span>{lockedFieldNotice.detail}</span>
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() => setLockedFieldNotice(null)}><X size={15} /></button>
        </div>
      )}
    </main>
  );
}

function normalizeAutocompleteText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[—–·._]/g, " ").replace(/\s+/g, " ").trim();
}

function autocompleteQueryTerm(value: string, selectedLabel: string) {
  if (value === selectedLabel) return "";
  const cleaned = value.trim().replace(/[.]+$/g, "").trim();
  const separator = cleaned.search(/[—–]/);
  if (separator >= 0) {
    const namePart = cleaned.slice(separator + 1).trim();
    if (namePart) return namePart;
    return cleaned.slice(0, separator).trim();
  }
  return cleaned;
}

function isCompatibleWithSelection(value: string, definition: LegacyKpiDefinitionOption) {
  const typed = normalizeAutocompleteText(value);
  if (!typed) return false;
  const label = normalizeAutocompleteText(`${definition.code} ${definition.name}`);
  const code = normalizeAutocompleteText(definition.code);
  const name = normalizeAutocompleteText(definition.name);
  return label.startsWith(typed) || code.startsWith(typed) || name.startsWith(typed) || label.includes(typed);
}
