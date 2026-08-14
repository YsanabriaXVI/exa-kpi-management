import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Plus, Search, ShieldAlert, X } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { kpiDefinitionService } from "../kpi-definition/kpi-definition.service";
import type { KpiDefinition } from "../kpi-definition/kpi-definition.types";
import { kpiConfigService } from "./kpi-config.service";
import { TrafficLightEditor } from "./TrafficLightEditor";
import type { TrafficLightRanges } from "./kpi-config.types";
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
  const requestedConfigId = Number(searchParams.get("kpiConfigId"));
  const isEditing = Number.isFinite(requestedConfigId) && requestedConfigId > 0;
  const definitionLocked = openedFromDefinitionOverview || isEditing;
  const [search, setSearch] = useState(() => definitionLocked ? "" : window.localStorage.getItem("exa:kpi-config-search-draft") ?? "");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [selected, setSelected] = useState<KpiDefinition | null>(null);
  const [lastSelectedDefinitionId, setLastSelectedDefinitionId] = useState<number | null>(() => {
    const stored = window.localStorage.getItem("exa:last-kpi-definition");
    return stored ? Number(stored) : null;
  });
  const [goal, setGoal] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [dataSource, setDataSource] = useState("");
  const [ranges, setRanges] = useState(defaultRanges);
  const [error, setError] = useState("");
  const [lockedDefinitionNotice, setLockedDefinitionNotice] = useState(false);

  const definitionsQuery = useQuery({
    queryKey: ["kpi-definitions"],
    queryFn: kpiDefinitionService.list,
  });
  const editConfigQuery = useQuery({
    queryKey: ["kpi-config-detail", requestedConfigId],
    queryFn: () => kpiConfigService.getDetail(requestedConfigId),
    enabled: isEditing,
  });

  useEffect(() => {
    if (isEditing) return;
    const requestedId = Number(searchParams.get("kpiDefinitionId"));
    const draftId = Number(window.localStorage.getItem("exa:kpi-config-selected-draft"));
    const definitionId = requestedId || (!openedFromDefinitionOverview ? draftId : 0);
    const match = definitionsQuery.data?.find((definition) => definition.id === definitionId);
    if (match && !selected) {
      setSelected(match);
      setSearch(`${match.code} — ${match.name}`);
    }
  }, [definitionsQuery.data, isEditing, openedFromDefinitionOverview, searchParams, selected]);

  useEffect(() => {
    const config = editConfigQuery.data;
    if (!isEditing || !config || initializedEditRef.current === config.id) return;
    const definition = definitionsQuery.data?.find((item) => item.id === config.definitionId);
    if (!definition) return;

    initializedEditRef.current = config.id;
    setSelected(definition);
    setSearch(`${definition.code} — ${definition.name}`);
    setGoal(String(config.goal));
    setMeasurementUnit(config.measurementUnit);
    setDataSource(config.dataSource);
    setRanges({ ...config.ranges });
  }, [definitionsQuery.data, editConfigQuery.data, isEditing]);

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

  const normalizeDefinitionText = (value: string) => value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[—–·-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const selectedDefinitionLabel = selected ? `${selected.code} — ${selected.name}` : "";
  const normalizedSearch = normalizeDefinitionText(search);
  const isExactSelectedLabel = Boolean(selectedDefinitionLabel)
    && normalizedSearch === normalizeDefinitionText(selectedDefinitionLabel);
  const suggestions = useMemo(() => {
    if (!normalizedSearch || isExactSelectedLabel) return [];
    return (definitionsQuery.data ?? [])
      .filter((definition) =>
        definition.status === "ACTIVE" &&
        normalizeDefinitionText(`${definition.code} ${definition.name} ${definition.objective}`)
          .includes(normalizedSearch),
      )
      .sort((a, b) => Number(b.id === lastSelectedDefinitionId) - Number(a.id === lastSelectedDefinitionId))
      .slice(0, 6);
  }, [definitionsQuery.data, isExactSelectedLabel, lastSelectedDefinitionId, normalizedSearch]);

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
            },
            { code: selected!.code, name: selected!.name },
          ),
    onSuccess: () => {
      window.localStorage.removeItem("exa:kpi-config-selected-draft");
      window.localStorage.removeItem("exa:kpi-config-search-draft");
      queryClient.invalidateQueries({ queryKey: ["kpi-configurations"] });
      navigate("/app/kpi-management/config/overview?created=1");
    },
  });

  const selectDefinition = (definition: KpiDefinition) => {
    setSelected(definition);
    setLastSelectedDefinitionId(definition.id);
    window.localStorage.setItem("exa:last-kpi-definition", String(definition.id));
    const selectedLabel = `${definition.code} — ${definition.name}`;
    setSearch(selectedLabel);
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
    setSearch("");
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
      ranges.redFrom <= ranges.redTo &&
      ranges.redTo < ranges.yellowFrom &&
      ranges.yellowFrom <= ranges.yellowTo &&
      ranges.yellowTo < ranges.greenFrom &&
      ranges.greenFrom <= ranges.greenTo;
    if (!ordered) {
      setError("Traffic light ranges must be ordered and cannot overlap.");
      return;
    }
    saveMutation.mutate();
  };

  if (isEditing && (editConfigQuery.isLoading || definitionsQuery.isLoading)) {
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
              value={search}
              readOnly={definitionLocked}
              aria-readonly={definitionLocked}
              onFocus={() => { if (!definitionLocked) setSuggestionsOpen(true); }}
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
                setSearch(value);
                window.localStorage.setItem("exa:kpi-config-search-draft", value);
                const selectedCode = normalizeDefinitionText(selected?.code ?? "");
                const nextValue = normalizeDefinitionText(value);
                const keepsSelectedCode = Boolean(selectedCode)
                  && (nextValue === selectedCode || nextValue.startsWith(`${selectedCode} `));
                if (selected && !keepsSelectedCode) {
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
            {suggestionsOpen && !isExactSelectedLabel && (
              <div className="definition-suggestions">
                {definitionsQuery.isLoading ? (
                  <div className="no-suggestions"><Search size={20} /><strong>Searching KPI Definitions...</strong></div>
                ) : !normalizedSearch ? (
                  <div className="no-suggestions"><Search size={20} /><strong>Type to see suggestions</strong><span>Search by KPI code, name or objective.</span></div>
                ) : suggestions.length ? suggestions.map((definition) => (
                  <button type="button" key={definition.id} onClick={() => selectDefinition(definition)}>
                    <span className="suggestion-code">{definition.code}</span>
                    <span><strong>{definition.name}</strong><small>{definition.objective}{definition.id === lastSelectedDefinitionId ? " · Last selected" : ""}</small></span>
                    {selected?.id === definition.id && <Check size={15} />}
                  </button>
                )) : (
                  <div className="no-suggestions"><Search size={20} /><strong>No KPI Definition Found</strong><span>Try another code or name.</span></div>
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
