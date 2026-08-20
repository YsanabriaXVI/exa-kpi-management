import { FormEvent, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus, Search, ShieldAlert, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiDefinitionKeys, kpiDefinitionService } from "../kpi-definition/kpi-definition.service";
import { ApiError } from "../../api/http-client";
import type { LegacyKpiDefinitionOption } from "../kpi-definition/kpi-definition.types";
import { kpiConfigService } from "./kpi-config.service";
import { TrafficLightEditor } from "./TrafficLightEditor";
import type { KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import "./kpi-config.css";

const defaultRanges: TrafficLightRanges = {
  redFrom: 0, redTo: 64, yellowFrom: 65, yellowTo: 79, greenFrom: 80, greenTo: 100,
};

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
  const [lockedDefinitionNotice, setLockedDefinitionNotice] = useState(false);

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

  const saveMutation = useMutation({
    mutationFn: () =>
      isEditing
        ? kpiConfigService.update(
            requestedConfigId,
            {
              definitionId: selected!.id,
              goal: Number(goal),
              measurementUnit,
              dataSource,
              ranges,
              isActive,
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
          ),
    onSuccess: (savedConfiguration) => {
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

  const showLockedDefinitionNotice = () => {
    setLockedDefinitionNotice(true);
    window.setTimeout(() => setLockedDefinitionNotice(false), 4000);
  };

  const clearDefinition = () => {
    if (definitionLocked) {
      showLockedDefinitionNotice();
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
    saveMutation.mutate();
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
          <h1>{isEditing ? "Edit KPI Config" : "Set KPI Config"}</h1>
          <p>{isEditing ? "Update the measurement settings for this KPI Configuration." : "Select an existing KPI Definition and define how it will be measured."}</p>
        </div>
      </header>

      <form className="config-form" onSubmit={submit}>
        <section className="config-card">
          <div className="config-section-heading">
            <span className="step-number">1</span>
            <div><h2>Select KPI Definition</h2><p>Only active definitions can be configured.</p></div>
          </div>
          <div className="definition-search-row">
          <div className="definition-autocomplete" ref={definitionSearchRef}>
            <Search size={17} />
            <input
              value={searchTerm}
              readOnly={definitionLocked}
              aria-readonly={definitionLocked}
              onFocus={() => { if (!definitionLocked) setSuggestionsOpen(true); }}
              onClick={() => { if (definitionLocked) showLockedDefinitionNotice(); }}
              onKeyDown={(event) => {
                if (selected && (event.key === "Backspace" || event.key === "Delete")) {
                  if (definitionLocked) {
                    event.preventDefault();
                    showLockedDefinitionNotice();
                  }
                }
              }}
              onChange={(event) => {
                if (definitionLocked) {
                  showLockedDefinitionNotice();
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
            {(!definitionLocked || selected) && (
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
          <button type="button" className="button new-definition-button" onClick={() => navigate("/app/kpi-management/definition/overview")}>
            <Plus size={15} /> KPI Definition
          </button>
          </div>
        </section>

        <section className="config-card">
          <div className="config-section-heading">
            <span className="step-number">2</span>
            <div><h2>Measurement Setup</h2><p>Configure the target and source for this reusable variant.</p></div>
          </div>
          <div className="config-fields-grid">
            <label><span>Goal</span><input type="number" inputMode="decimal" value={goal} onKeyDown={(event) => { if (event.key === "e" || event.key === "E") event.preventDefault(); }} onChange={(e) => setGoal(e.target.value)} placeholder="Enter a numeric goal, e.g. 3700" /></label>
            <label><span>Measurement Unit</span><select value={measurementUnit} onChange={(e) => setMeasurementUnit(e.target.value)}><option value="">Select unit</option><option value="%">Percentage (%)</option><option value="USD">US Dollars (USD)</option><option value="km">Kilometers (km)</option><option value="Incidents">Incidents</option><option value="Units">Units</option></select></label>
            <label><span>Data Source</span><select value={dataSource} onChange={(e) => setDataSource(e.target.value)}><option value="">Select source</option><option>EMS</option><option>SAP</option><option>GPS</option><option>Excel Import</option><option>Manual Entry</option><option>API</option></select></label>
          </div>
        </section>

        <section className="config-card"><TrafficLightEditor value={ranges} onChange={setRanges} /></section>
        <section className="config-card configuration-status-card">
          <div className="config-section-heading">
            <span className="step-number">4</span>
            <div><h2>Configuration Status</h2></div>
          </div>
          <div className="configuration-status-content">
            <p>This configuration will be available for KPI Pools and Scorecards.</p>
            <label className="configuration-status-toggle">
              <span>Status</span>
              <button type="button" className={`status-toggle ${isActive ? "active" : ""}`} role="switch" aria-checked={isActive} onClick={() => setIsActive((current) => !current)}>
                <span className="toggle-track" aria-hidden="true"><i /></span>
                <strong>{isActive ? "Active" : "Inactive"}</strong>
              </button>
            </label>
          </div>
        </section>
        {error && <div className="config-error">{error}</div>}
        <footer className="config-form-actions">
          <button type="button" className="button secondary" onClick={() => navigate("/app/kpi-management/config/overview")}><ArrowLeft size={15} /> Back to Overview</button>
          <div><button type="button" className="button secondary" onClick={() => navigate("/app/kpi-management/config/overview")}>Cancel</button><button type="submit" className="button primary" disabled={saveMutation.isPending}>{saveMutation.isPending ? "Saving..." : isEditing ? "Save Changes" : "Save KPI Configuration"}</button></div>
        </footer>
      </form>
      {lockedDefinitionNotice && (
        <div className="config-lock-toast" role="status">
          <ShieldAlert size={19} />
          <div>
            <strong>No se puede eliminar ni cambiar desde aquí.</strong>
            <span>Modificar la KPI Definition desde este flujo podría alterar la información relacionada con su configuración.</span>
          </div>
          <button type="button" aria-label="Dismiss notification" onClick={() => setLockedDefinitionNotice(false)}><X size={15} /></button>
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
