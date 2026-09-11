import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Ban, Check, Clock3, Layers3, Plus, Search, Send, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { kpiPoolService, type PoolAssignmentEligibility } from "../kpi-pool/kpi-pool.service";
import type { KpiPoolRecord } from "../kpi-pool/kpi-pool.types";
import type { KpiConfigRecord } from "./kpi-config.types";

type ModalStep = "select" | "success";

export function SendToPoolModal({ configurations, onClose, onAssigned }: {
  configurations: KpiConfigRecord[];
  onClose: () => void;
  onAssigned: () => void;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [items] = useState(configurations);
  const [step, setStep] = useState<ModalStep>("select");
  const [poolSearch, setPoolSearch] = useState("");
  const [selectedPoolId, setSelectedPoolId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ pool: KpiPoolRecord; addedCount: number; alreadyIncludedCount: number; periodStart: string; periodEnd: string } | null>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const configurationIds = useMemo(() => items.map((config) => String(config.id)), [items]);
  const eligibilityQuery = useQuery({
    queryKey: ["kpi-pool-assignment-eligibility", configurationIds.join(",")],
    queryFn: () => kpiPoolService.getAssignmentEligibility(configurationIds),
  });
  const visiblePools = useMemo(() => (eligibilityQuery.data ?? [])
    .filter((pool) => !poolSearch.trim() || `${pool.poolCode} ${pool.poolName} ${pool.companies.join(" ")}`.toLowerCase().includes(poolSearch.trim().toLowerCase()))
    .sort((left, right) => eligibilityRank(left.eligibility) - eligibilityRank(right.eligibility) || left.poolName.localeCompare(right.poolName)), [eligibilityQuery.data, poolSearch]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape" && !assignMutation.isPending) onClose(); };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  });

  const assignMutation = useMutation({
    mutationFn: async (pool: PoolAssignmentEligibility) => {
      if (!pool.targetPeriod || !pool.availableConfigurationIds.length) throw new Error("This Pool has no KPI Configurations available to add.");
      const assignment = await kpiPoolService.addConfigurations(Number(pool.poolId), pool.availableConfigurationIds, pool.targetPeriod.start);
      return { ...assignment, alreadyIncludedCount: pool.alreadyIncludedConfigurationIds.length, periodStart: pool.targetPeriod.start, periodEnd: pool.targetPeriod.end };
    },
    onSuccess: (assignment) => {
      setResult(assignment);
      setStep("success");
      onAssigned();
      void queryClient.invalidateQueries({ queryKey: ["kpi-configurations"] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool-configuration-usage"] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pools"] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool", assignment.pool.id] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool-basic", assignment.pool.id] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool-periods", assignment.pool.id] });
      void queryClient.invalidateQueries({ queryKey: ["pool-manage-kpis", assignment.pool.id] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool-composition", assignment.pool.id] });
      void queryClient.invalidateQueries({ queryKey: ["kpi-pool-assignment-eligibility"] });
    },
    onError: (mutationError) => setError(mutationError instanceof Error ? mutationError.message : "The KPI Configurations could not be sent."),
  });

  const submitExisting = (event: FormEvent) => {
    event.preventDefault();
    const pool = eligibilityQuery.data?.find((item) => item.poolId === selectedPoolId);
    if (!pool) return setError("Select a KPI Pool to continue.");
    if (pool.eligibility === "NOT_ELIGIBLE" || pool.eligibility === "ALREADY_INCLUDED") return setError(pool.issues[0]?.message ?? "This Pool cannot accept the selected KPI Configurations.");
    setError("");
    assignMutation.mutate(pool);
  };

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
    if (drag) setModalPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };
  const stopDrag = (event: React.PointerEvent<HTMLElement>) => {
    dragRef.current = null;
    setDragging(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const pending = assignMutation.isPending;

  return <div className="send-pool-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !pending) onClose(); }}>
    <section className={`send-pool-modal ${dragging ? "dragging" : ""}`} style={{ transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)` }} role="dialog" aria-modal="true" aria-labelledby="send-pool-title">
      <header onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} title="Drag to move">
        <div className="send-pool-heading-icon">{step === "success" ? <Check size={21} /> : <Send size={20} />}</div>
        <div><span>KPI Config · Bulk action</span><h2 id="send-pool-title">{step === "success" ? "KPIs sent successfully" : "Send KPIs to a Pool"}</h2><p>{step === "success" ? "The selected configurations are included in the target Pool period." : `${items.length} KPI ${items.length === 1 ? "Configuration is" : "Configurations are"} ready to send.`}</p></div>
        <button type="button" className="send-pool-close" onClick={onClose} disabled={pending} aria-label="Close"><X size={19} /></button>
      </header>

      {step === "select" && <form onSubmit={submitExisting}>
        <div className="send-pool-body">
          <div className="send-pool-selected-summary"><strong>{items.length} selected</strong><span>{items.map((config) => config.code).join(" · ")}</span></div>
          <label className="send-pool-search"><Search size={16} /><input value={poolSearch} onChange={(event) => setPoolSearch(event.target.value)} placeholder="Search Pool by code, name or company..." /></label>
          <div className="send-pool-options" role="radiogroup" aria-label="Available KPI Pools">
            {eligibilityQuery.isLoading && <EmptyState icon={<Clock3 size={25} />} title="Checking available KPI Pools..." detail="Validating status, period, frequency and KPI Definition conflicts." />}
            {eligibilityQuery.isError && <EmptyState icon={<AlertTriangle size={25} />} title="Pool eligibility could not be loaded" detail={(eligibilityQuery.error as Error).message} />}
            {!eligibilityQuery.isLoading && !eligibilityQuery.isError && visiblePools.map((pool) => {
              const blocked = pool.eligibility === "NOT_ELIGIBLE" || pool.eligibility === "ALREADY_INCLUDED";
              const label = eligibilityLabel(pool);
              return <button type="button" role="radio" aria-checked={selectedPoolId === pool.poolId} aria-disabled={blocked} className={`${selectedPoolId === pool.poolId ? "selected" : ""} ${blocked ? "definition-conflict" : ""}`} key={pool.poolId} onClick={() => { if (blocked) return setError(label); setSelectedPoolId(pool.poolId); setError(""); }}>
                <i>{blocked ? <Ban size={20} /> : selectedPoolId === pool.poolId && <Check size={13} />}</i>
                <span><strong>{pool.poolName}</strong><small>{pool.poolCode} · {pool.companies.join(", ")} · {pool.inputFrequencyCode} · {pool.poolStatus}{pool.targetPeriod ? ` · Effective ${pool.targetPeriod.start}` : ""}</small><em className={blocked ? "pool-definition-conflict-message" : "pool-eligibility-message"}>{label}</em>{pool.issues.slice(1).map((issue) => <em className="pool-definition-conflict-message" key={`${issue.configurationId}-${issue.code}`}>{issue.message}</em>)}</span>
              </button>;
            })}
            {!eligibilityQuery.isLoading && !eligibilityQuery.isError && !visiblePools.length && <EmptyState icon={<Layers3 size={25} />} title="No KPI Pools found" detail="Create one and the selected KPIs will be added automatically." />}
          </div>
          <button type="button" className="send-pool-create-link" onClick={openCreatePoolInfo}><Plus size={16} /> Create a new KPI Pool with these KPIs</button>
          {error && <div className="send-pool-error">{error}</div>}
        </div>
        <footer><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button type="submit" className="button primary" disabled={!selectedPoolId || pending}><Send size={15} /> {pending ? "Sending..." : "Send to Pool"}</button></footer>
      </form>}

      {step === "success" && result && <div className="send-pool-success">
        <div className="send-pool-success-mark"><Check size={30} /></div><h3>{result.pool.name}</h3>
        <p>{result.addedCount} KPI Configuration{result.addedCount === 1 ? " was" : "s were"} added{result.alreadyIncludedCount ? `; ${result.alreadyIncludedCount} already existed in this Pool` : ""}.</p>
        <div><span>{result.pool.code}</span><span>{result.periodStart} &ndash; {result.periodEnd}</span><span>{result.addedCount} new KPIs</span></div>
        <footer><button type="button" className="button secondary" onClick={onClose}><ArrowLeft size={15} /> Back to KPI Config</button><button type="button" className="button primary" onClick={() => navigate(`/app/pool-kpis/manage-kpis?poolId=${result.pool.id}&period=${encodeURIComponent(result.periodStart)}&view=included`)}>Manage KPIs</button></footer>
      </div>}
    </section>
  </div>;
}

function EmptyState({ icon, title, detail }: { icon: React.ReactNode; title: string; detail: string }) {
  return <div className="send-pool-empty">{icon}<strong>{title}</strong><span>{detail}</span></div>;
}

function eligibilityLabel(pool: PoolAssignmentEligibility) {
  if (pool.eligibility === "ELIGIBLE") return `Available · ${pool.availableConfigurationIds.length} KPI${pool.availableConfigurationIds.length === 1 ? "" : "s"} can be added`;
  if (pool.eligibility === "PARTIAL") return `${pool.availableConfigurationIds.length} can be added · ${pool.alreadyIncludedConfigurationIds.length} already included`;
  if (pool.eligibility === "ALREADY_INCLUDED") return "All selected KPIs are already included";
  return pool.issues[0]?.message ?? "Not available";
}

function eligibilityRank(value: PoolAssignmentEligibility["eligibility"]) {
  return { ELIGIBLE: 0, PARTIAL: 1, ALREADY_INCLUDED: 2, NOT_ELIGIBLE: 3 }[value];
}
