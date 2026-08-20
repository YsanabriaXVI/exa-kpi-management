import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Ban, Check, Layers3, Plus, Search, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import type { KpiPoolRecord } from "../kpi-pool/kpi-pool.types";
import { kpiConfigService } from "./kpi-config.service";
import type { KpiConfigRecord } from "./kpi-config.types";

type ModalStep = "select" | "success";

export function SendToPoolModal({ configurations, pools, onClose, onAssigned }: {
  configurations: KpiConfigRecord[];
  pools: KpiPoolRecord[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items] = useState(configurations);
  const [step, setStep] = useState<ModalStep>("select");
  const [poolSearch, setPoolSearch] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ pool: KpiPoolRecord; addedCount: number } | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const activePools = useMemo(() => pools.filter((pool) => pool.status === "ACTIVE" &&
    (!poolSearch.trim() || `${pool.code} ${pool.name} ${pool.companies.join(" ")}`.toLowerCase().includes(poolSearch.trim().toLowerCase()))
  ), [poolSearch, pools]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !assignMutation.isPending) onClose();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  const assignMutation = useMutation({
    mutationFn: async (pool: KpiPoolRecord) => {
      const assignment = await kpiPoolService.addConfigurations(pool.id, items);
      await kpiConfigService.markAssignedToPool(items.map((config) => config.id), pool.name);
      return assignment;
    },
    onSuccess: (assignment) => {
      setResult(assignment);
      setStep("success");
      onAssigned();
      queryClient.invalidateQueries({ queryKey: ["kpi-configurations"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pool-configuration-usage"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pools"] });
      queryClient.invalidateQueries({ queryKey: ["kpi-pool", assignment.pool.id] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "The KPI Configurations could not be sent."),
  });

  const submitExisting = (event: FormEvent) => {
    event.preventDefault();
    const pool = pools.find((item) => item.id === selectedPoolId);
    if (!pool) {
      setError("Select a KPI Pool to continue.");
      return;
    }
    const conflict = findDefinitionConflict(pool, items);
    if (conflict) {
      setError(`${conflict.definitionCode} is already represented in this Pool. Select only one configuration per KPI Definition.`);
      return;
    }
    setError("");
    assignMutation.mutate(pool);
  };

  const pending = assignMutation.isPending;
  const openCreatePoolInfo = () => {
    window.localStorage.setItem("exa:kpi-config:pool-draft-ids", JSON.stringify(items.map((config) => config.id)));
    navigate("/app/pool-kpis/create-pool-info?from=kpi-config");
  };
  const startDrag = (event: React.PointerEvent<HTMLElement>) => {
    if ((event.target as HTMLElement).closest("button")) return;
    dragRef.current = { startX: event.clientX, startY: event.clientY, originX: modalPosition.x, originY: modalPosition.y };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent<HTMLElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setModalPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };
  const stopDrag = (event: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div className="send-pool-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
      <section className={`send-pool-modal ${dragging ? "dragging" : ""}`} style={{ transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)` }} role="dialog" aria-modal="true" aria-labelledby="send-pool-title">
        <header onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} title="Drag to move">
          <div className="send-pool-heading-icon">{step === "success" ? <Check size={21} /> : <Send size={20} />}</div>
          <div>
            <span>KPI Config · Bulk action</span>
            <h2 id="send-pool-title">{step === "success" ? "KPIs sent successfully" : "Send KPIs to a Pool"}</h2>
            <p>{step === "success" ? "The selected configurations are now available in the Pool." : `${items.length} KPI ${items.length === 1 ? "Configuration is" : "Configurations are"} ready to send.`}</p>
          </div>
          <button type="button" className="send-pool-close" onClick={onClose} disabled={pending} aria-label="Close"><X size={19} /></button>
        </header>

        {step === "select" && <form onSubmit={submitExisting}>
          <div className="send-pool-body">
            <div className="send-pool-selected-summary">
              <strong>{items.length} selected</strong>
              <span>{items.map((config) => config.code).join(" · ")}</span>
            </div>
            <label className="send-pool-search"><Search size={16} /><input value={poolSearch} onChange={(event) => setPoolSearch(event.target.value)} placeholder="Search Pool by code, name or company..." /></label>
            <div className="send-pool-options" role="radiogroup" aria-label="Available KPI Pools">
              {activePools.length ? activePools.map((pool) => {
                const alreadyIncluded = items.filter((config) => pool.kpis.some((kpi) => kpi.configCode === config.code)).length;
                const conflict = findDefinitionConflict(pool, items);
                return <button type="button" role="radio" aria-checked={selectedPoolId === pool.id} aria-disabled={Boolean(conflict)} className={`${selectedPoolId === pool.id ? "selected" : ""} ${conflict ? "definition-conflict" : ""}`} key={pool.id} onClick={() => { if (conflict) { setError(`${conflict.definitionCode} is already represented in ${pool.name}.`); return; } setSelectedPoolId(pool.id); setError(""); }}>
                  <i>{conflict ? <Ban size={20} /> : selectedPoolId === pool.id && <Check size={13} />}</i>
                  <span><strong>{pool.name}</strong><small>{pool.code} · {pool.companies.join(", ")} · {pool.kpis.length} KPIs{alreadyIncluded && !conflict ? ` · ${alreadyIncluded} already included` : ""}</small>{conflict && <em className="pool-definition-conflict-message">{conflict.definitionCode} already has a KPI Configuration in this Pool</em>}</span>
                </button>;
              }) : <div className="send-pool-empty"><Layers3 size={25} /><strong>No active KPI Pools found</strong><span>Create one and the selected KPIs will be added automatically.</span></div>}
            </div>
            <button type="button" className="send-pool-create-link" onClick={openCreatePoolInfo}><Plus size={16} /> Create a new KPI Pool with these KPIs</button>
            {error && <div className="send-pool-error">{error}</div>}
          </div>
          <footer><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={!selectedPoolId || pending}><Send size={15} /> {pending ? "Sending..." : "Send to Pool"}</button></footer>
        </form>}

        {step === "success" && result && <div className="send-pool-success">
          <div className="send-pool-success-mark"><Check size={30} /></div>
          <h3>{result.pool.name}</h3>
          <p>{result.addedCount === items.length ? `All ${result.addedCount} KPI Configurations were added.` : `${result.addedCount} new KPI Configurations were added; ${items.length - result.addedCount} were already in this Pool.`}</p>
          <div><span>{result.pool.code}</span><span>{result.pool.kpis.length} KPIs in Pool</span></div>
          <footer><button type="button" className="button secondary" onClick={onClose}><ArrowLeft size={15} /> Back to KPI Config</button><button type="button" className="button primary" onClick={() => navigate(`/app/pool-kpis/detail/${result.pool.id}`)}>View KPI Pool</button></footer>
        </div>}
      </section>
    </div>
  );
}

function findDefinitionConflict(pool: KpiPoolRecord, configurations: KpiConfigRecord[]) {
  const assignedDefinitionIds = new Set(pool.kpis.map((kpi) => kpi.definitionId));
  const incomingDefinitionIds = new Set<string>();
  return configurations.find((configuration) => {
    const definitionId = String(configuration.definitionId);
    if (assignedDefinitionIds.has(definitionId) || incomingDefinitionIds.has(definitionId)) return true;
    incomingDefinitionIds.add(definitionId);
    return false;
  });
}
