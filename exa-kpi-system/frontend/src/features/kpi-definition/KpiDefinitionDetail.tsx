import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { ArrowLeft, CalendarClock, CheckCircle2, FileCog, Settings2, UserRound } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { kpiDefinitionService } from "./kpi-definition.service";
import "./kpi-definition.css";

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function KpiDefinitionDetail() {
  const navigate = useNavigate();
  const { definitionId } = useParams();
  const id = Number(definitionId);
  const detailQuery = useQuery({
    queryKey: ["kpi-definition-detail", id],
    queryFn: () => kpiDefinitionService.getDetail(id),
    enabled: Number.isFinite(id) && id > 0,
  });
  if (!id) return <main className="kpi-definition-page kpi-definition-detail-page detail-empty-state"><h1>No KPI Definition selected</h1><p>Open a KPI Definition from the Overview to view its details.</p><Link className="button primary" to="/app/kpi-management/definition/overview">Return to Overview</Link></main>;

  if (detailQuery.isLoading) {
    return <main className="kpi-definition-page kpi-definition-detail-page detail-loading">Loading detail...</main>;
  }

  if (!detailQuery.data) {
    return (
      <main className="kpi-definition-page kpi-definition-detail-page detail-empty-state">
        <h1>KPI Definition not found</h1>
        <Link className="button primary" to="/app/kpi-management/definition/overview">
          Return to Overview
        </Link>
      </main>
    );
  }

  const { definition, configurations } = detailQuery.data;
  const configuredCount = configurations.filter(
    (config) => config.status === "CONFIGURED",
  ).length;

  return (
    <main className="kpi-definition-page kpi-definition-detail-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/kpi-management">KPI Management</Link>
        <span>/</span>
        <Link to="/app/kpi-management/definition/overview">KPI Definition</Link>
        <span>/</span>
        <Link to={`/app/kpi-management/definition/detail/${definition.id}`} aria-current="page">
          {definition.code}
        </Link>
      </nav>

      <header className="definition-detail-header detail-hero-card">
        <div>
          <h1>{definition.code} {definition.name}</h1>
        </div>
        <button
          className="button primary"
          disabled={definition.status !== "ACTIVE"}
          onClick={() =>
            navigate(`/app/kpi-management/config/set?kpiDefinitionId=${definition.id}&code=${definition.code}`)
          }
        >
          <Settings2 size={16} />
          {configurations.length
            ? "Create Another KPI Config"
            : "Create First KPI Config"}
        </button>
      </header>

      <section className="detail-stat-grid">
        <article>
          <span className="summary-card-icon total"><FileCog size={17} /></span>
          <div><span>Total KPI Configs</span><strong>{configurations.length}</strong></div>
        </article>
        <article>
          <span className="summary-card-icon active"><CheckCircle2 size={17} /></span>
          <div><span>Configured</span><strong>{configuredCount}</strong></div>
        </article>
        <article className="detail-state-card">
          <div>
            <span>Definition State</span>
            <strong className={`mini-state ${definition.status.toLowerCase()}`}>
              {definition.status === "ACTIVE" ? "Active" : "Inactive"}
            </strong>
          </div>
        </article>
      </section>

      <div className="detail-content-grid">
        <section className="detail-card">
          <div className="detail-section-heading"><h2>Definition Information</h2><span>Base identity</span></div>
          <dl className="definition-data">
            <div><dt>KPI Code</dt><dd>{definition.code}</dd></div>
            <div><dt>KPI Name</dt><dd>{definition.name}</dd></div>
            <div className="full"><dt>Objective</dt><dd>{definition.objective}</dd></div>
            <div><dt>Category</dt><dd>{definition.category}</dd></div>
            <div><dt>State</dt><dd>{definition.status === "ACTIVE" ? "Active" : "Inactive"}</dd></div>
          </dl>
        </section>

        <aside className="detail-card audit-card">
          <div className="detail-section-heading"><h2>Audit Information</h2><span>Read-only</span></div>
          <AuditEntry icon={<CalendarClock size={15} />} label="Created at" value={formatDate(definition.createdAt)} />
          <AuditEntry icon={<UserRound size={15} />} label="Created by" value={definition.createdBy} />
          <AuditEntry icon={<CalendarClock size={15} />} label="Last updated" value={formatDate(definition.updatedAt)} />
          <AuditEntry icon={<UserRound size={15} />} label="Updated by" value={definition.updatedBy} />
        </aside>
      </div>

      <section className="definition-usage-section">
        <div className="usage-heading">
          <div>
            <h2>KPI Configurations using this definition</h2>
            <p>Configurations that inherit this base identity and define their own measurement rules.</p>
          </div>
          <span>{configurations.length} configurations</span>
        </div>
        <div className="kpi-table-wrap detail-table-wrap">
          <table className="kpi-table detail-usage-table">
            <thead>
              <tr><th>Config Code</th><th>Goal</th><th>Unit</th><th>Data Source</th><th>Status</th></tr>
            </thead>
            <tbody>
              {configurations.length ? configurations.map((config) => (
                <tr key={config.id}>
                  <td><span className="code-pill">{config.code}</span></td>
                  <td>{config.goal}</td>
                  <td>{config.measurementUnit}</td>
                  <td>{config.dataSource}</td>
                  <td><span className={`config-status ${config.status.toLowerCase()}`}>{formatStatus(config.status)}</span></td>
                </tr>
              )) : (
                <tr><td className="table-message" colSpan={5}>No KPI Configurations use this definition yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <footer className="detail-page-actions">
        <button
          type="button"
          className="button secondary"
          onClick={() => navigate("/app/kpi-management/definition/overview")}
        >
          <ArrowLeft size={15} />
          Back to Overview
        </button>
      </footer>
    </main>
  );
}

function formatStatus(status: string) {
  return status
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function AuditEntry({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="audit-entry">
      <span className="audit-icon">{icon}</span>
      <div><span>{label}</span><strong>{value}</strong></div>
    </div>
  );
}
