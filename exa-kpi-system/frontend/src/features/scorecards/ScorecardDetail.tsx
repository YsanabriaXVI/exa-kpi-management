import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Eye,
  Layers3,
  Link2,
  Search,
  Target,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import {
  SortableTableHeader,
  compareSortValues,
  type SortDirection,
} from "../../components/SortableTableHeader";
import { PoolOverviewMultiSelect } from "../kpi-pool/PoolOverviewMultiSelect";
import { scorecardService } from "./scorecard.service";
import "../kpi-pool/kpi-pool.css";
import "./scorecard-assignment.css";
import "./scorecards.css";

const formatPeriod = (value: string) => {
  const [year, month] = value.split("-").map(Number);
  return year && month
    ? `${new Intl.DateTimeFormat("en", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, 1)))} • ${year}`
    : value;
};
const formatMonth = (value: string) =>
  new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
const formatAuditDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("en", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "Not updated yet";

export function ScorecardDetail() {
  const [params] = useSearchParams();
  const id = Number(params.get("scorecardId") ?? 0);
  const [periodKey, setPeriodKey] = useState(params.get("periodKey") ?? "");
  const [search, setSearch] = useState("");
  const [measurementUnits, setMeasurementUnits] = useState<string[]>([]);
  const [dataSources, setDataSources] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [donutTooltip, setDonutTooltip] = useState("");
  const [scopeDetailsOpen, setScopeDetailsOpen] = useState(false);
  const [activeScopeDepartment, setActiveScopeDepartment] = useState("");
  const [kpiSort, setKpiSort] = useState<{
    key:
      | "configuration"
      | "kpi"
      | "weight"
      | "category"
      | "goal"
      | "unit"
      | "source"
      | "state";
    direction: SortDirection;
  }>({ key: "configuration", direction: "asc" });
  const [linkSort, setLinkSort] = useState<{
    key: "code" | "name" | "companies" | "departments" | "weight";
    direction: SortDirection;
  }>({ key: "code", direction: "asc" });
  const scorecard = useQuery({
    queryKey: ["scorecard", id],
    queryFn: () => scorecardService.getById(id),
    enabled: id > 0,
  });
  const periods = useQuery({
    queryKey: ["scorecard-periods", id],
    queryFn: () => scorecardService.periods(id),
    enabled: id > 0,
  });
  useEffect(() => {
    if (!periodKey && periods.data?.length)
      setPeriodKey(
        periods.data.find(
          (row) => row.scorecardCompositionStatus !== "UNAVAILABLE",
        )?.periodKey ?? periods.data[0].periodKey,
      );
  }, [periodKey, periods.data]);
  const period = periods.data?.find((row) => row.periodKey === periodKey);
  const composition = useQuery({
    queryKey: ["scorecard-composition", id, periodKey],
    queryFn: () => scorecardService.composition(id, periodKey),
    enabled:
      id > 0 &&
      Boolean(periodKey) &&
      period?.scorecardCompositionStatus !== "UNAVAILABLE",
    retry: false,
  });
  const availableKpis = useQuery({
    queryKey: ["scorecard-available", "kpi", id, periodKey],
    queryFn: () => scorecardService.availableKpis(id, periodKey),
    enabled:
      id > 0 &&
      Boolean(periodKey) &&
      period?.scorecardCompositionStatus !== "UNAVAILABLE",
  });
  const kpiState = (configurationId: string) =>
    availableKpis.data?.find(
      (row) => row.kpiConfigurationExternalId === configurationId,
    )?.status ?? "ACTIVE";
  const query = search.trim().toLowerCase();
  const filteredKpis = useMemo(
    () =>
      (composition.data?.kpis ?? [])
        .filter(
          (row) =>
            JSON.stringify(row).toLowerCase().includes(query) &&
            (!measurementUnits.length ||
              Boolean(
                row.measurementUnit &&
                measurementUnits.includes(row.measurementUnit),
              )) &&
            (!dataSources.length ||
              Boolean(
                row.dataSource && dataSources.includes(row.dataSource),
              )) &&
            (!categories.length ||
              Boolean(
                row.categoryName && categories.includes(row.categoryName),
              )) &&
            (!states.length ||
              states.includes(kpiState(row.kpiConfigurationExternalId))),
        )
        .sort((left, right) => {
          const value = (row: typeof left) =>
            kpiSort.key === "configuration"
              ? row.configurationCode
              : kpiSort.key === "kpi"
                ? `${row.definitionCode} ${row.definitionName}`
                : kpiSort.key === "weight"
                  ? Number(row.weight)
                  : kpiSort.key === "category"
                    ? (row.categoryName ?? "")
                    : kpiSort.key === "goal"
                      ? (row.goal ?? "")
                      : kpiSort.key === "unit"
                        ? (row.measurementUnit ?? "")
                        : kpiSort.key === "source"
                          ? (row.dataSource ?? "")
                          : kpiState(row.kpiConfigurationExternalId);
          return compareSortValues(
            value(left),
            value(right),
            kpiSort.direction,
          );
        }),
    [
      composition.data?.kpis,
      query,
      measurementUnits,
      dataSources,
      categories,
      states,
      kpiSort,
      availableKpis.data,
    ],
  );
  const filteredLinks = useMemo(
    () =>
      (composition.data?.linkedScorecards ?? [])
        .filter(
          (row) =>
            Number(row.weight) > 0 &&
            JSON.stringify(row).toLowerCase().includes(query),
        )
        .sort((left, right) => {
          const value = (row: typeof left) =>
            linkSort.key === "code"
              ? row.code
              : linkSort.key === "name"
                ? row.name
                : linkSort.key === "companies"
                  ? row.companies.join(" ")
                  : linkSort.key === "departments"
                    ? row.departments.join(" ")
                    : Number(row.weight);
          return compareSortValues(
            value(left),
            value(right),
            linkSort.direction,
          );
        }),
    [composition.data?.linkedScorecards, query, linkSort],
  );

  if (scorecard.isLoading)
    return (
      <main className="scorecard-page scorecard-detail-page">
        <div className="scorecard-detail-loading">Loading Scorecard...</div>
      </main>
    );
  if (scorecard.isError || periods.isError)
    return (
      <main className="scorecard-page scorecard-detail-page">
        <section className="scorecard-detail-error">
          <h1>Scorecard details could not be loaded</h1>
          <p>{((scorecard.error ?? periods.error) as Error).message}</p>
          <Link className="primary-button" to="/app/scorecards/overview">
            Back to Scorecard Overview
          </Link>
        </section>
      </main>
    );
  if (!scorecard.data)
    return (
      <main className="scorecard-page scorecard-detail-page">
        <h1>Scorecard not found</h1>
      </main>
    );

  const item = scorecard.data;
  const kpis = composition.data?.kpis ?? [];
  const links = (composition.data?.linkedScorecards ?? []).filter(
    (row) => Number(row.weight) > 0,
  );
  const scopeDepartments = item.scopeDepartments ?? [];
  const activeDepartmentScope =
    scopeDepartments.find(
      (department) => department.name === activeScopeDepartment,
    ) ?? scopeDepartments[0];
  const measurementUnitOptions = [
    ...new Set(
      kpis.flatMap((row) => (row.measurementUnit ? [row.measurementUnit] : [])),
    ),
  ]
    .sort()
    .map((value) => ({ value, label: value }));
  const dataSourceOptions = [
    ...new Set(kpis.flatMap((row) => (row.dataSource ? [row.dataSource] : []))),
  ]
    .sort()
    .map((value) => ({ value, label: value }));
  const categoryOptions = [
    ...new Set(
      kpis.flatMap((row) => (row.categoryName ? [row.categoryName] : [])),
    ),
  ]
    .sort()
    .map((value) => ({ value, label: value }));
  const stateOptions = [
    ...new Set(kpis.map((row) => kpiState(row.kpiConfigurationExternalId))),
  ]
    .sort()
    .map((value) => ({
      value,
      label: value
        .toLowerCase()
        .replace(/^./, (letter) => letter.toUpperCase()),
    }));
  const sortKpisBy = (key: typeof kpiSort.key) =>
    setKpiSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const sortLinksBy = (key: typeof linkSort.key) =>
    setLinkSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const kpiWeight = Number(composition.data?.weights.kpis ?? 0);
  const linkedWeight = Number(composition.data?.weights.linkedScorecards ?? 0);
  const totalWeight = Number(composition.data?.weights.total ?? 0);
  const kpiShare = totalWeight ? (kpiWeight / totalWeight) * 100 : 0;
  const linkedColors = [
    "#13ae78",
    "#f59e0b",
    "#ef5b5b",
    "#8b5cf6",
    "#0ea5e9",
    "#ec4899",
  ];
  let linkedOffset = kpiShare;
  const linkedSegments = links.map((row, index) => {
    const share = totalWeight ? (Number(row.weight) / totalWeight) * 100 : 0;
    const segment = {
      row,
      share,
      offset: linkedOffset,
      color: linkedColors[index % linkedColors.length],
    };
    linkedOffset += share;
    return segment;
  });
  const status =
    composition.data?.status ??
    period?.scorecardCompositionStatus ??
    "UNAVAILABLE";
  const schedule = item.poolSchedule
    ? `${formatMonth(item.poolSchedule.validFrom)} – ${formatMonth(item.poolSchedule.validTo)} · ${item.poolSchedule.frequency}`
    : "Schedule unavailable";

  return (
    <main className="scorecard-page scorecard-detail-page">
      <nav className="kpi-breadcrumb">
        <Link to="/app/scorecards/overview">ScoreCards</Link>
        <span>/</span>
        <span>Scorecard Detail</span>
      </nav>
      <header className="scorecard-detail-hero">
        <div>
          <div className="scorecard-detail-title-line">
            <span className="code-pill">{item.code}</span>
            <span className={`scorecard-status ${item.status.toLowerCase()}`}>
              <i />
              {item.status}
            </span>
          </div>
          <h1>{item.name}</h1>
          <p>Scorecard identity, scope and period composition.</p>
        </div>
        <Link
          className="button scorecard-edit-assignment"
          to={`/app/scorecards/assignment?scorecardId=${id}&period=${encodeURIComponent(periodKey)}`}
        >
          Edit Assignment
        </Link>
      </header>
      <section className="scorecard-detail-info">
        <header>
          <div>
            <Layers3 size={18} />
            <span>
              <strong>Scorecard Header</strong>
              <small>General information and selected Input Period.</small>
            </span>
          </div>
          <span className="read-only-badge">Detail View</span>
        </header>
        <div className="scorecard-detail-info-grid">
          <Fact
            icon={<Target size={17} />}
            label="Scorecard Name"
            value={item.name}
            extra={item.code}
          />
          <Fact
            icon={<Building2 size={17} />}
            label="Companies"
            value={item.company || "Not available"}
          />
          <Fact
            icon={<Target size={17} />}
            label="KPI Pool Source"
            value={item.poolSource}
          />
          <Fact
            icon={<CalendarRange size={17} />}
            label="Pool Schedule"
            value={schedule}
          />
          <Fact
            icon={<UsersRound size={17} />}
            label="Scope"
            value={`${item.departments.length} Departments · ${item.collaborators} Collaborators`}
            extra={item.departments.join(", ") || "No departments"}
            action={
              <button
                type="button"
                className="scorecard-view-scope"
                onClick={() => {
                  setActiveScopeDepartment(scopeDepartments[0]?.name ?? "");
                  setScopeDetailsOpen(true);
                }}
              >
                View Scope
              </button>
            }
          />
          <article className="scorecard-detail-fact scorecard-detail-period-fact">
            <span>
              <CalendarDays size={17} />
            </span>
            <div>
              <small>Input Period</small>
              <div className="assignment-period-select-row scorecard-detail-period-row">
                <span className="assignment-period-select-control scorecard-detail-period-control">
                  <select
                    className="scorecard-detail-period-select"
                    value={periodKey}
                    onChange={(event) => {
                      setPeriodKey(event.target.value);
                      setSearch("");
                    }}
                  >
                    {periods.data?.map((row) => (
                      <option value={row.periodKey} key={row.periodKey}>
                        {formatPeriod(row.periodKey)}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={16} aria-hidden="true" />
                </span>
                <b
                  className={`scorecard-detail-period-status ${(period?.scorecardCompositionStatus ?? "UNAVAILABLE").toLowerCase()}`}
                >
                  {(
                    period?.scorecardCompositionStatus ?? "UNAVAILABLE"
                  ).replace(/_/g, " ")}
                </b>
              </div>
            </div>
          </article>
        </div>
      </section>
      <section className="scorecard-audit-info">
        <header>
          <div>
            <Clock3 size={18} />
            <span>
              <strong>Audit Information</strong>
              <small>Creation and latest update traceability.</small>
            </span>
          </div>
        </header>
        <div className="scorecard-audit-grid">
          <Fact
            icon={<CalendarDays size={17} />}
            label="Created At"
            value={formatAuditDate(item.createdAt)}
          />
          <Fact
            icon={<CalendarDays size={17} />}
            label="Updated At"
            value={formatAuditDate(item.updatedAt)}
          />
          <Fact
            icon={<UserRound size={17} />}
            label="Created By"
            value={item.createdBy ?? "System"}
          />
          <Fact
            icon={<UserRound size={17} />}
            label="Updated By"
            value={item.updatedBy ?? "System"}
          />
        </div>
      </section>
      {period?.scorecardCompositionStatus === "UNAVAILABLE" ? (
        <section className="scorecard-empty-state">
          <CalendarDays size={28} />
          <h2>Composition unavailable</h2>
          <p>
            The source Pool Composition has not been finalized for this Input
            Period.
          </p>
        </section>
      ) : (
        <>
          <div className="scorecard-composition-overview">
            <section className="scorecard-composition-card">
              <header>
                <div>
                  <h2>Scorecard Summary</h2>
                  <p>{formatPeriod(periodKey)} composition.</p>
                </div>
                <div className="scorecard-summary-badges">
                  <strong>{status}</strong>
                  <b className={totalWeight === 100 ? "complete" : ""}>
                    {totalWeight < 100
                      ? `${100 - totalWeight}% remaining to target`
                      : totalWeight === 100
                        ? "Target 100% reached"
                        : `${totalWeight - 100}% over target`}
                  </b>
                </div>
              </header>
              <div className="scorecard-composition-chart">
                <div className="scorecard-donut scorecard-donut-interactive">
                  <svg
                    viewBox="0 0 120 120"
                    role="img"
                    aria-label={`Total Weight ${totalWeight}%`}
                  >
                    <circle
                      className="scorecard-donut-track"
                      cx="60"
                      cy="60"
                      r="48"
                      pathLength="100"
                    />
                    {kpiShare > 0 && (
                      <circle
                        className="scorecard-donut-segment kpis"
                        cx="60"
                        cy="60"
                        r="48"
                        pathLength="100"
                        strokeDasharray={`${kpiShare} ${100 - kpiShare}`}
                        onMouseEnter={() =>
                          setDonutTooltip(
                            `KPIs Included: ${kpis.length} · ${kpiWeight}% weight`,
                          )
                        }
                        onMouseLeave={() => setDonutTooltip("")}
                      >
                        <title>
                          KPIs Included: {kpis.length} · {kpiWeight}% weight
                        </title>
                      </circle>
                    )}
                    {linkedSegments.map(({ row, share, offset, color }) => (
                      <circle
                        key={row.id}
                        className="scorecard-donut-segment linked"
                        cx="60"
                        cy="60"
                        r="48"
                        pathLength="100"
                        style={{ stroke: color }}
                        strokeDasharray={`${share} ${100 - share}`}
                        strokeDashoffset={-offset}
                        onMouseEnter={() =>
                          setDonutTooltip(
                            `${row.code} · ${row.name}: ${Number(row.weight)}% weight`,
                          )
                        }
                        onMouseLeave={() => setDonutTooltip("")}
                      >
                        <title>
                          {row.code} · {row.name}: {Number(row.weight)}% weight
                        </title>
                      </circle>
                    ))}
                  </svg>
                  {donutTooltip && (
                    <div className="scorecard-donut-tooltip" role="tooltip">
                      {donutTooltip}
                    </div>
                  )}
                  <span>
                    <strong>{totalWeight}%</strong>
                    <small>Total Weight</small>
                  </span>
                </div>
                <div className="scorecard-composition-totals">
                  <div>
                    <i className="composition-dot" />
                    <span>
                      <small>KPIs Included</small>
                      <strong>
                        {kpis.length} · {kpiWeight}%
                      </strong>
                    </span>
                  </div>
                  <div>
                    <i className="composition-dot linked" />
                    <span>
                      <small>Linked Scorecards</small>
                      <strong>
                        {links.length} · {linkedWeight}%
                      </strong>
                    </span>
                  </div>
                  <div className="scorecard-total-weight">
                    <span>
                      <small>Total Weight</small>
                      <strong>{totalWeight}%</strong>
                    </span>
                  </div>
                </div>
              </div>
            </section>
            <section className="scorecard-breakdown-card">
              <header>
                <div>
                  <h2>Composition Breakdown</h2>
                  <p>Weight distribution for the selected Input Period.</p>
                </div>
              </header>
              <div className="scorecard-breakdown-columns">
                <section className="kpi-performance">
                  <header>
                    <i />
                    <div>
                      <strong>KPI Performance Weight</strong>
                      <small>
                        {kpis.length} KPI Configurations selected from the Pool
                      </small>
                    </div>
                    <b>{kpiWeight}%</b>
                  </header>
                  <p>
                    Performance contributed directly by the KPIs assigned to
                    this Scorecard.
                  </p>
                </section>
                <section className="linked-performance">
                  <header className="linked-performance-total">
                    <div>
                      <strong>Total Linked Scorecard Performance Weight</strong>
                      <small>
                        {links.length} linked Scorecard
                        {links.length === 1 ? "" : "s"}
                      </small>
                    </div>
                    <b>{linkedWeight}%</b>
                  </header>
                  <div className="linked-performance-list">
                    {links.map((row, index) => (
                      <div key={row.id}>
                        <i
                          className="linked-scorecard-color"
                          style={{
                            backgroundColor:
                              linkedColors[index % linkedColors.length],
                          }}
                        />
                        <span>
                          <strong>{row.code}</strong>
                          <small>{row.name}</small>
                        </span>
                        <b>{Number(row.weight)}%</b>
                      </div>
                    ))}
                    {!links.length && (
                      <p>
                        No Linked Scorecards contribute to this composition.
                      </p>
                    )}
                  </div>
                </section>
              </div>
            </section>
          </div>
          <section className="scorecard-detail-data">
            <header className="scorecard-detail-unified-header">
              <div>
                <Target size={18} />
                <span>
                  <strong>Composition Details</strong>
                  <small>
                    KPI Configurations and Linked Scorecards in one view.
                  </small>
                </span>
              </div>
              <span>{kpis.length + links.length} items</span>
            </header>
            <div className="scorecard-detail-tabs-header">
              <div className="scorecard-detail-table-tools">
                <label>
                  <Search size={16} />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search KPI or Linked Scorecard..."
                  />
                </label>
                <PoolOverviewMultiSelect
                  label="Measurement Unit"
                  options={measurementUnitOptions}
                  selected={measurementUnits}
                  onChange={setMeasurementUnits}
                />
                <PoolOverviewMultiSelect
                  label="Data Source"
                  options={dataSourceOptions}
                  selected={dataSources}
                  onChange={setDataSources}
                />
                <PoolOverviewMultiSelect
                  label="Category"
                  options={categoryOptions}
                  selected={categories}
                  onChange={setCategories}
                />
                <PoolOverviewMultiSelect
                  label="State"
                  options={stateOptions}
                  selected={states}
                  onChange={setStates}
                />
              </div>
            </div>
            <CompositionSection
              title="KPI Configurations"
              count={filteredKpis.length}
              period={periodKey}
              icon={<Target size={17} />}
            >
              <table className="kpi-table scorecard-detail-table">
                <thead>
                  <tr>
                    {(
                      [
                        ["configuration", "Config Code"],
                        ["kpi", "KPI"],
                        ["weight", "Weight"],
                        ["category", "Category"],
                        ["goal", "Goal"],
                        ["unit", "Measurement Unit"],
                        ["source", "Data Source"],
                        ["state", "State"],
                      ] as const
                    ).map(([key, label]) => (
                      <SortableTableHeader
                        key={key}
                        active={kpiSort.key === key}
                        direction={kpiSort.direction}
                        onSort={() => sortKpisBy(key)}
                      >
                        {label}
                      </SortableTableHeader>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredKpis.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="code-pill">
                          {row.configurationCode}
                        </span>
                      </td>
                      <td>
                        <strong className="scorecard-detail-kpi-name">
                          {row.definitionName}
                        </strong>
                        <small className="scorecard-detail-kpi-code">
                          {row.definitionCode}
                        </small>
                      </td>
                      <td>
                        <span className="weight-pill">
                          {Number(row.weight)}%
                        </span>
                      </td>
                      <td>{row.categoryName || "—"}</td>
                      <td>{row.goal || "—"}</td>
                      <td>{row.measurementUnit || "—"}</td>
                      <td>{row.dataSource || "—"}</td>
                      <td>
                        <span
                          className={`scorecard-kpi-state ${kpiState(row.kpiConfigurationExternalId).toLowerCase()}`}
                        >
                          {kpiState(row.kpiConfigurationExternalId)
                            .toLowerCase()
                            .replace(/^./, (letter) => letter.toUpperCase())}
                        </span>
                      </td>
                      <td>
                        <Link
                          className="icon-button view"
                          title="View KPI Configuration"
                          to={`/app/kpi-management/config/detail-record?kpiConfigCode=${encodeURIComponent(row.configurationCode)}`}
                        >
                          <Eye size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filteredKpis.length && (
                    <tr>
                      <td colSpan={9}>
                        No KPI Configurations match this view.
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={9}>
                      <span className="scorecard-table-total-weight">
                    Total Assigned Weight: <strong>{kpiWeight}%</strong>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CompositionSection>
            <CompositionSection
              title="Linked Scorecards"
              count={filteredLinks.length}
              period={periodKey}
              icon={<Link2 size={17} />}
              linked
            >
              <table className="kpi-table scorecard-detail-table linked-scorecard-table">
                <thead>
                  <tr>
                    {(
                      [
                        ["code", "Code"],
                        ["name", "Linked Scorecard"],
                        ["companies", "Companies"],
                        ["departments", "Departments"],
                        ["weight", "Weight"],
                      ] as const
                    ).map(([key, label]) => (
                      <SortableTableHeader
                        key={key}
                        active={linkSort.key === key}
                        direction={linkSort.direction}
                        onSort={() => sortLinksBy(key)}
                      >
                        {label}
                      </SortableTableHeader>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLinks.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <span className="code-pill">{row.code}</span>
                      </td>
                      <td>
                        <strong className="scorecard-detail-kpi-name">
                          {row.name}
                        </strong>
                        <small className="scorecard-detail-kpi-code">
                          Linked composition
                        </small>
                      </td>
                      <td>{row.companies.join(", ") || "—"}</td>
                      <td>{row.departments.join(", ") || "—"}</td>
                      <td>
                        <span className="weight-pill linked">
                          {Number(row.weight)}%
                        </span>
                      </td>
                      <td>
                        <Link
                          className="icon-button view"
                          title="View Linked Scorecard"
                          to={`/app/scorecards/detail?scorecardId=${row.linkedScorecardId}`}
                        >
                          <Eye size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!filteredLinks.length && (
                    <tr>
                      <td colSpan={6}>No Linked Scorecards match this view.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>
                      <span className="scorecard-table-total-weight linked">
                    Total Assigned Weight: <strong>{linkedWeight}%</strong>
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CompositionSection>
            <footer className="scorecard-detail-table-footer">
              <span>
                {kpis.length} KPI Configurations · {links.length} Linked
                Scorecards
              </span>
              <span>{totalWeight}% total composition weight</span>
            </footer>
          </section>
        </>
      )}
      {scopeDetailsOpen && (
        <div
          className="assignment-scope-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget)
              setScopeDetailsOpen(false);
          }}
        >
          <section
            className="assignment-scope-dialog scorecard-detail-scope-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="scorecard-detail-scope-title"
          >
            <header>
              <div>
                <span>
                  <UsersRound size={21} />
                </span>
                <div>
                  <h2 id="scorecard-detail-scope-title">
                    Computed Scope Details
                  </h2>
                  <p>
                    Read-only organizational scope inherited from the selected
                    KPI Pool.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setScopeDetailsOpen(false)}
                aria-label="Close scope details"
              >
                <X size={18} />
              </button>
            </header>
            {activeDepartmentScope ? (
              <div className="assignment-scope-browser">
                <nav aria-label="Associated departments">
                  <small>Departments</small>
                  {scopeDepartments.map((department) => (
                    <button
                      type="button"
                      className={
                        department.name === activeDepartmentScope.name
                          ? "active"
                          : ""
                      }
                      key={department.name}
                      onClick={() => setActiveScopeDepartment(department.name)}
                    >
                      <span>
                        <strong>{department.name}</strong>
                        <small>
                          {department.employees.length} collaborators
                        </small>
                      </span>
                      <ChevronRight size={16} />
                    </button>
                  ))}
                </nav>
                <section>
                  <header>
                    <div>
                      <strong>{activeDepartmentScope.name}</strong>
                      <small>
                        {activeDepartmentScope.employees.length} associated
                        collaborators
                      </small>
                    </div>
                  </header>
                  <div>
                    {activeDepartmentScope.employees.map((employee) => (
                      <article key={employee.id}>
                        <span>
                          {employee.name
                            .split(" ")
                            .map((part) => part[0])
                            .slice(0, 2)
                            .join("")}
                        </span>
                        <div>
                          <strong>{employee.name}</strong>
                          <small>{employee.company}</small>
                        </div>
                        <span className="assignment-scope-check">
                          <Check size={12} />
                        </span>
                      </article>
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <div className="assignment-scope-empty">
                No collaborator details are available for this Scorecard.
              </div>
            )}
            <div className="scope-summary-metrics">
              <article>
                <span>
                  <Building2 size={17} />
                </span>
                <div>
                  <strong>
                    {item.company ? item.company.split(",").length : 0}
                  </strong>
                  <small>Companies</small>
                </div>
              </article>
              <article>
                <span>
                  <Layers3 size={17} />
                </span>
                <div>
                  <strong>{item.departments.length}</strong>
                  <small>Departments</small>
                </div>
              </article>
              <article>
                <span>
                  <UsersRound size={17} />
                </span>
                <div>
                  <strong>{item.collaborators}</strong>
                  <small>Collaborators</small>
                </div>
              </article>
            </div>
            <div className="scope-summary-body">
              <div className="scope-company-summary">
                <header>
                  <h3>Companies</h3>
                  <p>{item.company || "No companies available"}</p>
                </header>
              </div>
              <div className="scope-summary-paths">
                <section>
                  <header>
                    <div>
                      <span className="scope-department-chip tone-0">
                        Scope
                      </span>
                      <small>Departments included in this Scorecard</small>
                    </div>
                    <strong>{item.departments.length} Departments</strong>
                  </header>
                  <div className="scope-company-groups">
                    <article className="scope-company-group">
                      <header>
                        <span>
                          <Building2 size={14} />
                          {item.company || "Company unavailable"}
                        </span>
                        <small>{item.collaborators} Collaborators</small>
                      </header>
                      <div className="scorecard-detail-scope-departments">
                        {item.departments.map((department) => (
                          <span key={department}>{department}</span>
                        ))}
                      </div>
                    </article>
                  </div>
                </section>
              </div>
            </div>
            <footer>
              <span>
                This information is read-only. Update the Scorecard assignment
                to change its organizational scope.
              </span>
              <button
                type="button"
                className="button secondary"
                onClick={() => setScopeDetailsOpen(false)}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
      <Link className="scorecard-detail-back" to="/app/scorecards/overview">
        <ArrowLeft size={15} /> Back to Scorecard Overview
      </Link>
    </main>
  );
}

function Fact({
  icon,
  label,
  value,
  extra,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  extra?: string;
  action?: React.ReactNode;
}) {
  return (
    <article className="scorecard-detail-fact">
      <span>{icon}</span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        {extra && <em>{extra}</em>}
        {action}
      </div>
    </article>
  );
}
function CompositionSection({
  title,
  count,
  period,
  icon,
  linked = false,
  children,
}: {
  title: string;
  count: number;
  period: string;
  icon: React.ReactNode;
  linked?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section
      className={`scorecard-detail-unified-section ${linked ? "linked" : ""}`}
    >
      <header>
        <div>
          {icon}
          <span>
            <strong>{title}</strong>
            <small>
              {count} records for {formatPeriod(period)}
            </small>
          </span>
        </div>
      </header>
      <div className="scorecard-detail-table-wrap">{children}</div>
    </section>
  );
}
