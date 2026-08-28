import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Eye,
  Link2,
  Search,
  Target,
  X,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  compareSortValues,
  SortableTableHeader,
  type SortDirection,
} from "../../components/SortableTableHeader";
import {
  scorecardService,
  ScorecardApiError,
  type AvailableLinkedScorecard,
  type AvailableScorecardKpi,
} from "./scorecard.service";
import { PoolOverviewMultiSelect } from "../kpi-pool/PoolOverviewMultiSelect";
import "../kpi-pool/kpi-pool.css";
import "../kpi-pool/manage-pool-selector.css";
import "./scorecard-assignment.css";
import "./select-assignment-items.css";

type KpiOption = AvailableScorecardKpi;
type LinkOption = AvailableLinkedScorecard;
type Option = KpiOption | LinkOption;
type AvailabilityFilter =
  "ALL" | "AVAILABLE" | "SELECTED" | "OCCUPIED" | "WAITING" | "NOT_AVAILABLE";
type LinkDetailCategory = "AVAILABLE" | "SELECTED" | "NOT_AVAILABLE";
type Conflict = {
  kpiConfigurationCode?: string;
  kpiName?: string;
  linkedScorecardId?: string;
  scorecardCode?: string;
  scorecardName?: string;
  reasonCode: string;
  periodKey: string;
};

const formatPeriod = (periodKey: string, bullet = false) => {
  const [year, month] = periodKey.split("-").map(Number);
  if (!year || !month) return periodKey;
  const monthName = new Intl.DateTimeFormat("en", {
    month: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
  return `${monthName}${bullet ? " • " : " "}${year}`;
};
const title = (value: string) =>
  value
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
const linkReason = (code?: string | null) =>
  ({
    SELF_REFERENCE: "Self-reference is not allowed",
    CIRCULAR_REFERENCE: "Circular dependency",
    INACTIVE_SCORECARD: "Inactive Scorecard",
    INPUT_PERIOD_NOT_AVAILABLE: "Input Period unavailable",
    LINKED_COMPOSITION_NOT_AVAILABLE: "Period composition unavailable",
  })[code ?? ""] ?? "Not available";

function AssignmentSingleSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  const choose = (nextValue: string) => {
    onChange(nextValue);
    setOpen(false);
  };
  return (
    <div
      className="pool-overview-multiselect assignment-single-select"
      ref={rootRef}
    >
      <button
        type="button"
        className={open ? "open" : ""}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {selected ? (
          <span className="pool-filter-chip">
            <span>{selected.label}</span>
            <span
              className="pool-filter-chip-remove"
              role="button"
              tabIndex={0}
              aria-label={`Clear ${label}`}
              onClick={(event) => {
                event.stopPropagation();
                choose("ALL");
              }}
            >
              <X size={12} />
            </span>
          </span>
        ) : (
          <span className="pool-filter-placeholder">{label}</span>
        )}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="pool-filter-options" role="listbox">
          <button
            type="button"
            className={value === "ALL" ? "selected" : ""}
            onClick={() => choose("ALL")}
          >
            <i>{value === "ALL" && <Check size={12} />}</i>All
          </button>
          {options.map((option) => (
            <button
              type="button"
              className={value === option.value ? "selected" : ""}
              key={option.value}
              onClick={() => choose(option.value)}
            >
              <i>{value === option.value && <Check size={12} />}</i>
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function SelectAssignmentItems({ type: routeType }: { type?: string }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const scorecardId = Number(params.get("scorecardId") ?? 0);
  const periodKey = params.get("period") ?? "";
  const type =
    (routeType ?? params.get("type")) === "linked" ? "linked" : "kpi";
  const isKpi = type === "kpi";
  const [search, setSearch] = useState("");
  const [availability, setAvailability] = useState<AvailabilityFilter>("ALL");
  const [kpiAvailabilitySelected, setKpiAvailabilitySelected] = useState<
    string[]
  >(["AVAILABLE"]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([]);
  const [dataSourceFilter, setDataSourceFilter] = useState<string[]>([]);
  const [measurementUnitFilter, setMeasurementUnitFilter] = useState<string[]>(
    [],
  );
  const [periodCompositionFilter, setPeriodCompositionFilter] = useState("ALL");
  const [departmentsSelected, setDepartmentsSelected] = useState<string[]>([]);
  const [linkDetails, setLinkDetails] = useState<LinkDetailCategory | null>(
    null,
  );
  const [selectionToast, setSelectionToast] = useState("");
  const [linkedSort, setLinkedSort] = useState<{
    key: "availability" | "scorecard" | "departments" | "composition";
    direction: SortDirection;
  }>({ key: "scorecard", direction: "asc" });
  const [kpiSort, setKpiSort] = useState<{
    key:
      | "availability"
      | "configuration"
      | "category"
      | "goal"
      | "unit"
      | "dataSource"
      | "usedBy";
    direction: SortDirection;
  }>({ key: "configuration", direction: "asc" });
  const [selected, setSelected] = useState<string[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [unlinked, setUnlinked] = useState<string[]>([]);
  const [unlinkConfirmOpen, setUnlinkConfirmOpen] = useState(false);
  const [conflicts, setConflicts] = useState<Conflict[] | null>(null);
  const assignmentUrl = `/app/scorecards/assignment?scorecardId=${scorecardId}&period=${encodeURIComponent(periodKey)}`;
  useEffect(() => {
    if (!selectionToast) return;
    const timeout = window.setTimeout(() => setSelectionToast(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [selectionToast]);
  const scorecard = useQuery({
    queryKey: ["scorecard", scorecardId],
    queryFn: () => scorecardService.getById(scorecardId),
    enabled: scorecardId > 0,
  });
  const scorecardDirectory = useQuery({
    queryKey: ["scorecards"],
    queryFn: scorecardService.list,
    enabled: !isKpi,
    staleTime: 60 * 1000,
  });
  const composition = useQuery({
    queryKey: ["scorecard-composition", scorecardId, periodKey],
    queryFn: () => scorecardService.composition(scorecardId, periodKey),
    enabled: scorecardId > 0 && Boolean(periodKey),
  });
  const items = useQuery<Option[]>({
    queryKey: ["scorecard-available", type, scorecardId, periodKey],
    queryFn: async () =>
      isKpi
        ? scorecardService.availableKpis(scorecardId, periodKey)
        : scorecardService.availableLinks(scorecardId, periodKey),
    enabled: scorecardId > 0 && Boolean(periodKey),
  });
  const category = (row: Option): AvailabilityFilter => {
    if (isKpi) {
      if ("definitionCode" in row && row.status === "INACTIVE") return "NOT_AVAILABLE";
      return row.selectionStatus === "AVAILABLE_TO_SELECT"
        ? "AVAILABLE"
        : row.selectionStatus === "SELECTED_IN_SCORECARD"
          ? "SELECTED"
          : row.selectionStatus === "ASSIGNED_TO_ANOTHER_SCORECARD"
            ? "OCCUPIED"
            : "NOT_AVAILABLE";
    }
    return row.selectionStatus === "AVAILABLE_TO_LINK"
      ? "AVAILABLE"
      : row.selectionStatus === "LINKED_THIS_PERIOD" ||
          row.selectionStatus === "SELECTED_IN_SCORECARD" ||
          row.selectionStatus === "LINKED_WAITING_FOR_FINALIZATION"
        ? "SELECTED"
        : "NOT_AVAILABLE";
  };
  const visible = useMemo(
    () =>
      (items.data ?? []).filter((row) => {
        const text = [
          JSON.stringify(row),
          category(row),
          "definitionCode" in row
            ? `${row.definitionCode} ${row.definitionName} ${row.configurationCode} ${row.categoryName ?? ""} ${row.goal ?? ""} ${row.measurementUnit ?? ""} ${row.dataSource ?? ""} ${row.status ?? ""} ${row.assignedScorecard?.code ?? ""} ${row.assignedScorecard?.name ?? ""} ${category(row) === "SELECTED" ? `This Scorecard ${scorecard.data?.code ?? ""} ${scorecard.data?.name ?? ""}` : ""}`
            : `${row.code} ${row.name} ${row.status} ${row.compositionStatus ?? "NOT_STARTED"} ${(row.departments ?? []).join(" ")} ${linkReason(row.reasonCode)}`,
        ]
          .join(" ")
          .toLowerCase();
        const kpi = "definitionCode" in row ? row : null;
        const linked = "definitionCode" in row ? null : row;
        return (
          (!isKpi && linked && linked.id === String(scorecardId)
            ? false
            : true) &&
          text.includes(search.trim().toLowerCase()) &&
          (isKpi
            ? !kpiAvailabilitySelected.length ||
              kpiAvailabilitySelected.includes(category(row))
            : availability === "ALL" || category(row) === availability) &&
          (!kpi ||
            !categoryFilter.length ||
            (kpi.categoryName && categoryFilter.includes(kpi.categoryName))) &&
          (!kpi ||
            !dataSourceFilter.length ||
            (kpi.dataSource && dataSourceFilter.includes(kpi.dataSource))) &&
          (!kpi ||
            !measurementUnitFilter.length ||
            (kpi.measurementUnit &&
              measurementUnitFilter.includes(kpi.measurementUnit))) &&
          (!linked ||
            !departmentsSelected.length ||
            linked.departments?.some((department) =>
              departmentsSelected.includes(department),
            )) &&
          (!linked ||
            periodCompositionFilter === "ALL" ||
            (linked.compositionStatus ?? "NOT_STARTED") ===
              periodCompositionFilter)
        );
      }),
    [
      items.data,
      search,
      availability,
      kpiAvailabilitySelected,
      isKpi,
      categoryFilter,
      dataSourceFilter,
      measurementUnitFilter,
      departmentsSelected,
      periodCompositionFilter,
      scorecard.data?.code,
      scorecard.data?.name,
    ],
  );
  const count = (filter: AvailabilityFilter) =>
    (items.data ?? []).filter((row) => category(row) === filter).length;
  const linkCandidates = !isKpi
    ? (items.data ?? []).filter(
        (row): row is LinkOption =>
          !("definitionCode" in row) && row.id !== String(scorecardId),
      )
    : [];
  const linkCount = (filter: AvailabilityFilter) =>
    linkCandidates.filter((row) => category(row) === filter).length;
  const availableCount = isKpi ? count("AVAILABLE") : linkCount("AVAILABLE");
  const includedCount = isKpi
    ? count("SELECTED") + count("WAITING")
    : linkCount("SELECTED");
  const restrictedCount = isKpi
    ? count("OCCUPIED") + count("NOT_AVAILABLE")
    : linkCount("NOT_AVAILABLE");
  const usedElsewhereCount = isKpi ? count("OCCUPIED") : 0;
  const notAvailableCount = isKpi ? count("NOT_AVAILABLE") : 0;
  const kpiTotal = isKpi
    ? includedCount + usedElsewhereCount + availableCount + notAvailableCount
    : 0;
  const kpiPercent = (value: number) =>
    kpiTotal ? Math.round((value / kpiTotal) * 100) : 0;
  const refresh = async () =>
    Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["scorecard-composition", scorecardId, periodKey],
      }),
      queryClient.invalidateQueries({
        queryKey: ["scorecard-available", type, scorecardId, periodKey],
      }),
    ]);
  const add = useMutation({
    mutationFn: async () => {
      if (!isKpi)
        return scorecardService.addLinks(
          scorecardId,
          periodKey,
          selected.map((linkedScorecardId) => ({
            linkedScorecardId,
            weight: 0,
          })),
        );
      if (selected.length)
        await scorecardService.addKpis(
          scorecardId,
          periodKey,
          selected.map((poolMembershipExternalId) => ({
            poolMembershipExternalId,
            weight: 0,
          })),
        );
      await Promise.all(
        removed.map((configurationId) =>
          scorecardService.removeKpi(scorecardId, periodKey, configurationId),
        ),
      );
    },
    onSuccess: async () => {
      await refresh();
      navigate(assignmentUrl);
    },
    onError: async (error) => {
      if (
        error instanceof ScorecardApiError &&
        error.status === 409 &&
        [
          "SCORECARD_KPI_ASSIGNMENT_CONFLICT",
          "LINKED_SCORECARD_CONFLICT",
        ].includes(error.code)
      ) {
        const details = error.details as { conflicts?: Conflict[] } | undefined;
        setConflicts(details?.conflicts ?? []);
        setSelected([]);
        await refresh();
      }
    },
  });
  const unlink = useMutation({
    mutationFn: async () => {
      for (const linkedScorecardId of unlinked)
        await scorecardService.removeLink(
          scorecardId,
          periodKey,
          linkedScorecardId,
        );
    },
    onSuccess: async () => {
      setUnlinked([]);
      setUnlinkConfirmOpen(false);
      await refresh();
      navigate(assignmentUrl);
    },
  });
  const pageTitle = isKpi
    ? "Select KPIs from Pool"
    : "Select Linked Scorecards";
  const filters = isKpi
    ? [
        ["ALL", "All"],
        ["AVAILABLE", "Available"],
        ["SELECTED", "Selected by this Scorecard"],
        ["OCCUPIED", "Used by another Scorecard"],
        ["NOT_AVAILABLE", "Not Available"],
      ]
    : [
        ["ALL", "All"],
        ["AVAILABLE", "Available to Link"],
        ["SELECTED", "Linked This Period"],
        ["NOT_AVAILABLE", "Unavailable to Link"],
      ];
  const kpiOptions = isKpi
    ? (items.data ?? []).filter(
        (row): row is KpiOption => "definitionCode" in row,
      )
    : [];
  const categories = [
    ...new Set(
      kpiOptions
        .map((row) => row.categoryName)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const dataSources = [
    ...new Set(
      kpiOptions
        .map((row) => row.dataSource)
        .filter((value): value is string => Boolean(value)),
    ),
  ].sort();
  const measurementUnits = [
    ...new Set(
      kpiOptions.flatMap((row) =>
        row.measurementUnit ? [row.measurementUnit] : [],
      ),
    ),
  ].sort();
  const otherScorecardAllocations = [
    ...kpiOptions
      .reduce((groups, row) => {
        if (category(row) !== "OCCUPIED" || !row.assignedScorecard)
          return groups;
        const owner = row.assignedScorecard;
        const key = String(owner.id);
        const current = groups.get(key);
        groups.set(key, {
          code: owner.code,
          name: owner.name,
          count: (current?.count ?? 0) + 1,
        });
        return groups;
      }, new Map<string, { code: string; name: string; count: number }>())
      .values(),
  ];
  const allocationColors = [
    "#d39636",
    "#be6f3d",
    "#9a70c2",
    "#4f8eb8",
    "#cf6680",
  ];
  const changeCount = selected.length + removed.length;
  const candidateScorecards = linkCandidates.length;
  const linkedReadyCount = linkCandidates.filter(
    (row) =>
      category(row) === "SELECTED" && row.compositionStatus === "FINALIZED",
  ).length;
  const linkedWaitingCount = linkCandidates.filter(
    (row) =>
      category(row) === "SELECTED" && row.compositionStatus !== "FINALIZED",
  ).length;
  const departmentOptions = [
    ...new Set(linkCandidates.flatMap((row) => row.departments ?? [])),
  ]
    .sort()
    .map((department) => ({ value: department, label: department }));
  const detailRows = linkDetails
    ? linkCandidates.filter((row) => category(row) === linkDetails)
    : [];
  const selectedUnlinkRows = linkCandidates.filter((row) =>
    unlinked.includes(row.id),
  );
  const sortedVisible = useMemo(
    () =>
      isKpi
        ? [...visible].sort((left, right) => {
            if (!("definitionCode" in left) || !("definitionCode" in right))
              return 0;
            const value = (row: KpiOption) =>
              kpiSort.key === "availability"
                ? category(row)
                : kpiSort.key === "configuration"
                  ? `${row.configurationCode} ${row.definitionCode} ${row.definitionName}`
                  : kpiSort.key === "category"
                    ? (row.categoryName ?? "")
                    : kpiSort.key === "goal"
                      ? (row.goal ?? "")
                      : kpiSort.key === "unit"
                        ? (row.measurementUnit ?? "")
                        : kpiSort.key === "dataSource"
                          ? (row.dataSource ?? "")
                          : `${row.assignedScorecard?.code ?? ""} ${row.assignedScorecard?.name ?? ""}`;
            return compareSortValues(
              value(left),
              value(right),
              kpiSort.direction,
            );
          })
        : [...visible].sort((left, right) => {
            if ("definitionCode" in left || "definitionCode" in right) return 0;
            const leftDepartments = left.departments?.join(", ") ?? "";
            const rightDepartments = right.departments?.join(", ") ?? "";
            const value = (row: LinkOption, departments: string) =>
              linkedSort.key === "availability"
                ? category(row)
                : linkedSort.key === "scorecard"
                  ? `${row.code} ${row.name}`
                  : linkedSort.key === "departments"
                    ? departments
                    : (row.compositionStatus ?? "NOT_STARTED");
            return compareSortValues(
              value(left, leftDepartments),
              value(right, rightDepartments),
              linkedSort.direction,
            );
          }),
    [visible, isKpi, linkedSort, kpiSort],
  );
  const sortKpiBy = (key: typeof kpiSort.key) =>
    setKpiSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));
  const sortLinkedBy = (key: typeof linkedSort.key) =>
    setLinkedSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "asc" ? "desc" : "asc",
    }));

  return (
    <main className="pool-page manage-kpis-page assignment-selection-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/scorecards/overview">Scorecards</Link>
        <span>/</span>
        <Link to={assignmentUrl}>Scorecard Assignment</Link>
        <span>/</span>
        <span aria-current="page">{pageTitle}</span>
      </nav>
      <header className="pool-page-header assignment-selection-header">
        <div>
          <h1>{pageTitle}</h1>
          <p>
            {isKpi
              ? "Choose KPI Configurations from the finalized Pool Composition for this Input Period."
              : "Choose eligible Scorecards for this exact Input Period."}
          </p>
        </div>
      </header>
      {scorecard.data && (
        <>
          <section
            className="manage-pool-identity-card"
            aria-label="Current Scorecard"
          >
            <span>Scorecard</span>
            <strong>
              {scorecard.data.code}
              <span aria-hidden="true"> · </span>
              {scorecard.data.name}
            </strong>
          </section>
          <section
            className="linked-selection-context"
            aria-label={
              isKpi ? "KPI assignment context" : "Linked Scorecard context"
            }
          >
            <div>
              <span>Input Period</span>
              <strong>{formatPeriod(periodKey, true)}</strong>
            </div>
            <div>
              <span>Pool Source</span>
              <strong>{scorecard.data.poolSource}</strong>
            </div>
          </section>
        </>
      )}
      {isKpi ? (
        <section
          className="selection-summary assignment-kpi-summary"
          aria-label="Selection summary"
        >
          <div className="manage-section-heading period-section-heading">
            <div>
              <h2>Selection Summary — {formatPeriod(periodKey)}</h2>
              <p>
                {kpiTotal} KPI Configurations in the finalized Pool composition.
              </p>
            </div>
          </div>
          <div className="assignment-kpi-summary-metrics">
            <button
              type="button"
              className={kpiAvailabilitySelected.includes("AVAILABLE") ? "active" : ""}
              aria-pressed={kpiAvailabilitySelected.includes("AVAILABLE")}
              onClick={() => setKpiAvailabilitySelected((current) => current.includes("AVAILABLE") ? [] : ["AVAILABLE"])}
            >
              <span>KPIs Available</span>
              <strong>{availableCount}</strong>
              <small>{kpiPercent(availableCount)}%</small>
            </button>
            <button
              type="button"
              className={
                kpiAvailabilitySelected.includes("SELECTED") ? "active" : ""
              }
              aria-pressed={kpiAvailabilitySelected.includes("SELECTED")}
              onClick={() =>
                setKpiAvailabilitySelected((current) =>
                  current.includes("SELECTED") ? [] : ["SELECTED"],
                )
              }
            >
              <span>KPIs Selected Here</span>
              <strong>{includedCount}</strong>
              <small>{kpiPercent(includedCount)}%</small>
            </button>
            <button
              type="button"
              className={
                kpiAvailabilitySelected.includes("OCCUPIED") ? "active" : ""
              }
              aria-pressed={kpiAvailabilitySelected.includes("OCCUPIED")}
              onClick={() =>
                setKpiAvailabilitySelected((current) =>
                  current.includes("OCCUPIED") ? [] : ["OCCUPIED"],
                )
              }
            >
              <span>KPIs Used by Other Scorecards</span>
              <strong>{usedElsewhereCount}</strong>
              <small>{kpiPercent(usedElsewhereCount)}%</small>
            </button>
            <button
              type="button"
              className={
                kpiAvailabilitySelected.includes("NOT_AVAILABLE") ? "active" : ""
              }
              aria-pressed={kpiAvailabilitySelected.includes("NOT_AVAILABLE")}
              onClick={() =>
                setKpiAvailabilitySelected((current) =>
                  current.includes("NOT_AVAILABLE") ? [] : ["NOT_AVAILABLE"],
                )
              }
            >
              <span>KPIs Not Available</span>
              <strong>{notAvailableCount}</strong>
              <small>{kpiPercent(notAvailableCount)}%</small>
            </button>
          </div>
          <section
            className="assignment-kpi-allocation-card"
            aria-label="Pool KPI allocation breakdown"
          >
            <header>
              <div>
                <h3>Pool KPI Allocation — {formatPeriod(periodKey)}</h3>
                <p>Composition Breakdown</p>
              </div>
              <strong>{kpiTotal} KPIs</strong>
            </header>
            <div
              className="assignment-kpi-distribution"
              role="img"
              aria-label={`${includedCount} selected here, ${usedElsewhereCount} used by other Scorecards, ${availableCount} available`}
            >
              {includedCount > 0 && (
                <span
                  className="mine"
                  title={`Selected by ${scorecard.data?.code ?? "this Scorecard"}: ${includedCount} KPIs · ${kpiPercent(includedCount)}%`}
                  style={{ flexGrow: includedCount, flexBasis: 0 }}
                />
              )}
              {otherScorecardAllocations.map((owner, index) => (
                <span
                  className="others scorecard-segment"
                  key={owner.code}
                  title={`${owner.code} · ${owner.name}: ${owner.count} KPIs · ${kpiPercent(owner.count)}%`}
                  style={{
                    flexGrow: owner.count,
                    flexBasis: 0,
                    backgroundColor:
                      allocationColors[index % allocationColors.length],
                  }}
                />
              ))}
              {availableCount > 0 && (
                <span
                  className="free"
                  title={`Available and unassigned: ${availableCount} KPIs · ${kpiPercent(availableCount)}%`}
                  style={{ flexGrow: availableCount, flexBasis: 0 }}
                />
              )}
            </div>
            <div className="assignment-kpi-scorecard-legend">
              <span>
                <i className="mine" />
                <b>{scorecard.data?.code ?? "This Scorecard"}</b>
                <small>{scorecard.data?.name ?? "Current Scorecard"}</small>
                <em>{includedCount} KPIs</em>
              </span>
              {otherScorecardAllocations.map((owner, index) => (
                <span key={owner.code} title={owner.name}>
                  <i
                    style={{
                      backgroundColor:
                        allocationColors[index % allocationColors.length],
                    }}
                  />
                  <b>{owner.code}</b>
                  <small>{owner.name}</small>
                  <em>{owner.count} KPIs</em>
                </span>
              ))}
              <span>
                <i className="free" />
                <b>Available</b>
                <small>Not assigned to any Scorecard</small>
                <em>{availableCount} KPIs</em>
              </span>
            </div>
            <div className="assignment-kpi-breakdown">
              <article className="mine">
                <i />
                <div>
                  <strong>{includedCount}</strong>
                  <span>KPIs selected by this Scorecard</span>
                </div>
              </article>
              <article className="others">
                <i />
                <div>
                  <strong>{usedElsewhereCount}</strong>
                  <span>KPIs used by other Scorecards</span>
                </div>
              </article>
              <article className="free">
                <i />
                <div>
                  <strong>{availableCount}</strong>
                  <span>KPIs available and not assigned to anyone</span>
                </div>
              </article>
            </div>
          </section>
        </section>
      ) : (
        <section
          className="selection-summary linked-selection-summary"
          aria-label="Selection summary"
        >
          <div className="manage-section-heading period-section-heading">
            <div>
              <h2>Selection Summary — {formatPeriod(periodKey)}</h2>
              <p>Choose a card to filter the records below.</p>
            </div>
          </div>
          <div className="availability-cards linked-availability-cards">
            <div
              role="button"
              tabIndex={0}
              className={`availability-card available ${availability === "AVAILABLE" ? "active" : ""}`}
              aria-pressed={availability === "AVAILABLE"}
              onClick={() =>
                setAvailability((current) =>
                  current === "AVAILABLE" ? "ALL" : "AVAILABLE",
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setAvailability((current) =>
                    current === "AVAILABLE" ? "ALL" : "AVAILABLE",
                  );
              }}
            >
              <span className="availability-card-icon">
                <Check size={17} />
              </span>
              <span>
                <small>Available to Link</small>
                <strong>{availableCount}</strong>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setLinkDetails("AVAILABLE");
                  }}
                >
                  View details
                </button>
              </span>
            </div>
            <div
              role="button"
              tabIndex={0}
              className={`availability-card in_pool ${availability === "SELECTED" ? "active" : ""}`}
              aria-pressed={availability === "SELECTED"}
              onClick={() =>
                setAvailability((current) =>
                  current === "SELECTED" ? "ALL" : "SELECTED",
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setAvailability((current) =>
                    current === "SELECTED" ? "ALL" : "SELECTED",
                  );
              }}
            >
              <span className="availability-card-icon">
                <Link2 size={17} />
              </span>
              <span>
                <small>Linked This Period</small>
                <strong>{includedCount}</strong>
                <em>
                  Ready <b>{linkedReadyCount}</b> · Waiting{" "}
                  <b>{linkedWaitingCount}</b>
                </em>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setLinkDetails("SELECTED");
                  }}
                >
                  View details
                </button>
              </span>
            </div>
            <div
              role="button"
              tabIndex={0}
              className={`availability-card not_available ${availability === "NOT_AVAILABLE" ? "active" : ""}`}
              aria-pressed={availability === "NOT_AVAILABLE"}
              onClick={() =>
                setAvailability((current) =>
                  current === "NOT_AVAILABLE" ? "ALL" : "NOT_AVAILABLE",
                )
              }
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ")
                  setAvailability((current) =>
                    current === "NOT_AVAILABLE" ? "ALL" : "NOT_AVAILABLE",
                  );
              }}
            >
              <span className="availability-card-icon">
                <AlertTriangle size={17} />
              </span>
              <span>
                <small>Unavailable to Link</small>
                <strong>{restrictedCount}</strong>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setLinkDetails("NOT_AVAILABLE");
                  }}
                >
                  View details
                </button>
              </span>
            </div>
          </div>
        </section>
      )}
      {!isKpi && composition.data?.status === "FINALIZED" && (
        <section className="linked-read-only-notice">
          <Check size={18} />
          <div>
            <strong>Linked Scorecards are read-only</strong>
            <span>
              This composition is finalized for {formatPeriod(periodKey)} and
              its links can no longer be modified.
            </span>
          </div>
        </section>
      )}
      {items.isError ? (
        <section className="scorecard-empty-state">
          <h2>Eligible records could not be loaded</h2>
          <p>{(items.error as Error).message}</p>
        </section>
      ) : (
        <section className="manage-table-section assignment-selection-records">
          <div className="manage-section-heading manage-table-heading">
            <div>
              <h2>
                {pageTitle} for {formatPeriod(periodKey)}
              </h2>
              <p>
                {isKpi
                  ? "The exact finalized Pool Composition is the only source of KPIs."
                  : "Lifecycle and period composition are shown separately."}
              </p>
            </div>
            <span className="assignment-selection-heading-icon">
              {isKpi ? <Target size={19} /> : <Link2 size={19} />}
            </span>
          </div>
          <div
            className={`manage-toolbar assignment-selection-toolbar ${isKpi ? "kpi-selection-filters" : ""}`}
          >
            <label className="pool-search">
              <Search size={17} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={
                  isKpi ? "Search KPI Configuration..." : "Search Scorecard..."
                }
              />
            </label>
            {isKpi ? (
              <PoolOverviewMultiSelect
                label="Availability"
                selected={kpiAvailabilitySelected}
                onChange={setKpiAvailabilitySelected}
                options={filters
                  .filter(([value]) => value !== "ALL")
                  .map(([value, label]) => ({ value, label }))}
              />
            ) : (
              <AssignmentSingleSelect
                label="Availability"
                value={availability}
                onChange={(value) =>
                  setAvailability(value as AvailabilityFilter)
                }
                options={filters
                  .filter(([value]) => value !== "ALL")
                  .map(([value, label]) => ({ value, label }))}
              />
            )}{" "}
            {isKpi && (
              <>
                <PoolOverviewMultiSelect
                  label="Category"
                  selected={categoryFilter}
                  onChange={setCategoryFilter}
                  options={categories.map((value) => ({ value, label: value }))}
                />
                <PoolOverviewMultiSelect
                  label="Data Source"
                  selected={dataSourceFilter}
                  onChange={setDataSourceFilter}
                  options={dataSources.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
                <PoolOverviewMultiSelect
                  label="Measurement Unit"
                  selected={measurementUnitFilter}
                  onChange={setMeasurementUnitFilter}
                  options={measurementUnits.map((value) => ({
                    value,
                    label: value,
                  }))}
                />
              </>
            )}
          </div>
          {!isKpi && (
            <div className="linked-secondary-filters">
              <PoolOverviewMultiSelect
                label="Department"
                options={departmentOptions}
                selected={departmentsSelected}
                onChange={setDepartmentsSelected}
              />
              <AssignmentSingleSelect
                label="Period Composition"
                value={periodCompositionFilter}
                onChange={setPeriodCompositionFilter}
                options={[
                  { value: "PREPARING", label: "Preparing" },
                  { value: "FINALIZED", label: "Finalized" },
                  { value: "NOT_STARTED", label: "Not Started" },
                ]}
              />
            </div>
          )}
          <div className="pool-inner-table manage-kpi-table-wrap stable-table-shell">
            <table
              className={`kpi-table manage-kpi-table editable-table assignment-selection-table ${isKpi ? "kpi-assignment-table" : "linked-assignment-table"}`}
            >
              <thead>
                <tr>
                  <th>Select</th>
                  {isKpi ? (
                    <>
                      {(
                        [
                          ["availability", "Availability"],
                          ["configuration", "KPI Configuration"],
                          ["category", "Category"],
                          ["goal", "Goal"],
                          ["unit", "Unit"],
                          ["dataSource", "Data Source"],
                          ["usedBy", "Used By"],
                        ] as const
                      ).map(([key, label]) => (
                        <SortableTableHeader
                          key={key}
                          active={kpiSort.key === key}
                          direction={kpiSort.direction}
                          onSort={() => sortKpiBy(key)}
                        >
                          {label}
                        </SortableTableHeader>
                      ))}
                    </>
                  ) : (
                    <>
                      <SortableTableHeader
                        active={linkedSort.key === "availability"}
                        direction={linkedSort.direction}
                        onSort={() => sortLinkedBy("availability")}
                      >
                        Availability
                      </SortableTableHeader>
                      <SortableTableHeader
                        active={linkedSort.key === "scorecard"}
                        direction={linkedSort.direction}
                        onSort={() => sortLinkedBy("scorecard")}
                      >
                        Scorecard
                      </SortableTableHeader>
                      <SortableTableHeader
                        active={linkedSort.key === "departments"}
                        direction={linkedSort.direction}
                        onSort={() => sortLinkedBy("departments")}
                      >
                        Departments
                      </SortableTableHeader>
                      <SortableTableHeader
                        active={linkedSort.key === "composition"}
                        direction={linkedSort.direction}
                        onSort={() => sortLinkedBy("composition")}
                      >
                        <span className="period-composition-heading">
                          Period
                          <br />
                          Composition
                        </span>
                      </SortableTableHeader>
                      <th>Actions</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {items.isLoading ? (
                  <tr>
                    <td colSpan={isKpi ? 8 : 6}>Loading eligible records...</td>
                  </tr>
                ) : (
                  sortedVisible.map((row) => {
                    const kpi = "definitionCode" in row;
                    const id = kpi ? row.poolMembershipExternalId : row.id;
                    const state = category(row);
                    const already = state === "SELECTED" || state === "WAITING";
                    const isRemoved =
                      kpi && removed.includes(row.kpiConfigurationExternalId);
                    const isUnlinked = !kpi && unlinked.includes(row.id);
                    const disabled =
                      state === "OCCUPIED" ||
                      state === "NOT_AVAILABLE" ||
                      (!kpi && composition.data?.status !== "PREPARING") ||
                      (kpi &&
                        already &&
                        composition.data?.status !== "PREPARING");
                    const checked =
                      kpi && already
                        ? !isRemoved
                        : !kpi && already
                          ? !isUnlinked
                          : selected.includes(id);
                    const label = kpi
                      ? state === "SELECTED"
                        ? "Selected by this Scorecard"
                        : state === "OCCUPIED"
                          ? "Used by another Scorecard"
                          : state === "AVAILABLE"
                            ? "Available"
                            : "Not Available"
                      : already
                        ? "Linked This Period"
                        : state === "AVAILABLE"
                          ? "Available to Link"
                          : "Unavailable to Link";
                    const periodComposition = kpi
                      ? ""
                      : (row.compositionStatus ?? "NOT_STARTED");
                    const assignmentTitle = kpi
                      ? state === "SELECTED"
                        ? `This KPI is currently selected by this Scorecard for ${formatPeriod(periodKey)}.`
                        : row.assignedScorecard
                          ? `This KPI is already used by ${row.assignedScorecard.code} for ${formatPeriod(periodKey)}.`
                          : undefined
                      : undefined;
                    const toggle = () => {
                      if (kpi && already)
                        setRemoved((current) =>
                          current.includes(row.kpiConfigurationExternalId)
                            ? current.filter(
                                (value) =>
                                  value !== row.kpiConfigurationExternalId,
                              )
                            : [...current, row.kpiConfigurationExternalId],
                        );
                      else if (!kpi && already)
                        setUnlinked((current) =>
                          current.includes(row.id)
                            ? current.filter((value) => value !== row.id)
                            : [...current, row.id],
                        );
                      else
                        setSelected((current) =>
                          current.includes(id)
                            ? current.filter((value) => value !== id)
                            : [...current, id],
                        );
                    };
                    const linkedDepartments = !kpi
                      ? row.departments?.length
                        ? row.departments
                        : (scorecardDirectory.data?.find(
                            (candidate) => String(candidate.id) === row.id,
                          )?.departments ?? [])
                      : [];
                    const departmentLines = linkedDepartments.reduce<
                      string[][]
                    >((lines, department, index) => {
                      const lineIndex = Math.floor(index / 4);
                      if (!lines[lineIndex]) lines[lineIndex] = [];
                      lines[lineIndex].push(department);
                      return lines;
                    }, []);
                    const blockedSelectionMessage = !kpi
                      ? row.reasonCode
                        ? `No se puede seleccionar: ${linkReason(row.reasonCode)}.`
                        : composition.data?.status !== "PREPARING"
                          ? `No se puede seleccionar porque la composición de ${formatPeriod(periodKey)} no está disponible para edición.`
                          : "Este Scorecard todavía no se puede seleccionar."
                      : state === "OCCUPIED" && row.assignedScorecard
                        ? `${row.configurationCode} ya está seleccionado por ${row.assignedScorecard.code} · ${row.assignedScorecard.name}. Primero debe liberarse de ese Scorecard antes de poder seleccionarlo aquí.`
                        : "Este KPI no se puede seleccionar en su estado actual.";
                    return (
                      <tr
                        key={id}
                        title={assignmentTitle}
                        className="assignment-neutral-row"
                      >
                        <td>
                          <input
                            type="checkbox"
                            aria-disabled={disabled}
                            className={
                              disabled
                                ? `explanatory-disabled-checkbox ${state === "OCCUPIED" ? "occupied-kpi-checkbox" : ""}`
                                : undefined
                            }
                            checked={checked}
                            aria-label={label}
                            onChange={() => {
                              if (disabled) {
                                setSelectionToast(blockedSelectionMessage);
                                return;
                              }
                              toggle();
                            }}
                          />
                        </td>
                        <td>
                          <span
                            className={`availability-label ${state.toLowerCase()}`}
                          >
                            <strong>{label}</strong>
                            {!kpi && already && (
                              <small>
                                {periodComposition === "FINALIZED"
                                  ? "Ready"
                                  : "Waiting for Finalization"}
                              </small>
                            )}
                            {!kpi && row.reasonCode && (
                              <small>{linkReason(row.reasonCode)}</small>
                            )}
                          </span>
                        </td>
                        {kpi ? (
                          <>
                            <td className="kpi-configuration-cell">
                              <strong>{row.configurationCode}</strong>
                              <span>{row.definitionCode}</span>
                              <small>{row.definitionName}</small>
                            </td>
                            <td>{row.categoryName || "—"}</td>
                            <td>{row.goal || "—"}</td>
                            <td>{row.measurementUnit || "—"}</td>
                            <td>{row.dataSource || "—"}</td>
                            <td>
                              <span
                                className={`assignment-owner ${state.toLowerCase()}`}
                              >
                                {state === "SELECTED" ? (
                                  <>
                                    <strong>This Scorecard</strong>
                                    <small>{scorecard.data?.code}</small>
                                  </>
                                ) : row.assignedScorecard ? (
                                  <>
                                    <strong>
                                      {row.assignedScorecard.code}
                                    </strong>
                                    <small>{row.assignedScorecard.name}</small>
                                  </>
                                ) : (
                                  <strong>—</strong>
                                )}
                              </span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="linked-scorecard-identity">
                              <strong>{row.name}</strong>
                              <span className="code-pill">{row.code}</span>
                            </td>
                            <td>
                              <span className="linked-departments-text">
                                {departmentLines.length
                                  ? departmentLines.map((line, index) => (
                                      <span key={index}>{line.join(", ")}</span>
                                    ))
                                  : "—"}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`assignment-period-composition ${periodComposition.toLowerCase()}`}
                              >
                                {title(periodComposition)}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className="icon-button view"
                                title="View Scorecard Details"
                                onClick={() =>
                                  navigate(
                                    `/app/scorecards/detail?scorecardId=${row.id}`,
                                  )
                                }
                              >
                                <Eye size={14} />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })
                )}
                {!items.isLoading && !visible.length && (
                  <tr>
                    <td colSpan={isKpi ? 8 : 6}>
                      <div className="assignment-selection-empty">
                        <Search size={24} />
                        <strong>No matching records found</strong>
                        <span>Try another search or availability filter.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <footer className="manage-actions assignment-selection-actions">
              <span>
                <strong>
                  {isKpi ? changeCount : selected.length + unlinked.length}
                </strong>{" "}
                {isKpi
                  ? "changes"
                  : `${selected.length + unlinked.length === 1 ? "row" : "rows"} selected`}
              </span>
              <button
                type="button"
                className="button secondary manage-back-button"
                onClick={() => navigate(assignmentUrl)}
              >
                <ArrowLeft size={16} /> Back to Assignment
              </button>
              <div>
                {!isKpi && (
                  <button
                    className="button unlink-selected"
                    disabled={
                      !unlinked.length ||
                      unlink.isPending ||
                      composition.data?.status !== "PREPARING"
                    }
                    onClick={() => setUnlinkConfirmOpen(true)}
                  >{`Unlink Selected (${unlinked.length})`}</button>
                )}
                <button
                  className="button pool-link-selected"
                  disabled={
                    !(isKpi ? changeCount : selected.length) ||
                    add.isPending ||
                    (!isKpi && composition.data?.status !== "PREPARING")
                  }
                  onClick={() => add.mutate()}
                >
                  {isKpi ? <Check size={16} /> : <Link2 size={16} />}{" "}
                  {add.isPending
                    ? "Saving..."
                    : isKpi
                      ? `Apply Selection (${changeCount})`
                      : `Link Selected (${selected.length})`}
                </button>
              </div>
            </footer>
          </div>
          {add.error && !conflicts && (
            <p className="scorecard-form-error">
              {(add.error as Error).message}
            </p>
          )}
          {unlink.error && (
            <p className="scorecard-form-error">
              {(unlink.error as Error).message}
            </p>
          )}
        </section>
      )}
      {selectionToast && (
        <div
          className="linked-selection-toast"
          role="alert"
          aria-live="assertive"
        >
          <AlertTriangle size={17} />
          <span>{selectionToast}</span>
          <button
            type="button"
            aria-label="Cerrar notificación"
            onClick={() => setSelectionToast("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {linkDetails && (
        <div
          className="assignment-conflict-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setLinkDetails(null);
          }}
        >
          <section
            className="assignment-conflict-dialog link-evaluation-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="link-evaluation-title"
          >
            <header>
              <span>
                {linkDetails === "AVAILABLE" ? (
                  <Check size={21} />
                ) : linkDetails === "SELECTED" ? (
                  <Link2 size={21} />
                ) : (
                  <AlertTriangle size={21} />
                )}
              </span>
              <div>
                <h2 id="link-evaluation-title">
                  {linkDetails === "AVAILABLE"
                    ? "Available Scorecards"
                    : linkDetails === "SELECTED"
                      ? "Linked Scorecards"
                      : "Unavailable Scorecards"}{" "}
                  — {formatPeriod(periodKey)}
                </h2>
                <p>
                  {linkDetails === "AVAILABLE"
                    ? "These Scorecards can be linked without creating an invalid dependency."
                    : linkDetails === "SELECTED"
                      ? "These Scorecards are already linked for this period."
                      : `${detailRows.length} Scorecard${detailRows.length === 1 ? " cannot" : "s cannot"} be linked because a business rule prevents it.`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setLinkDetails(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="link-evaluation-guide">
              <span>
                <b>Available to Link</b>Can be added.
              </span>
              <span>
                <b>Linked This Period</b>Already linked.
              </span>
              <span>
                <b>Unavailable to Link</b>Blocked by a rule.
              </span>
            </div>
            {linkDetails === "SELECTED" && (
              <div
                className="link-readiness-legend"
                aria-label="Readiness color guide"
              >
                <span className="ready">
                  <Check size={14} /> Ready
                </span>
                <span className="waiting">
                  <AlertTriangle size={14} /> Waiting for Finalization
                </span>
              </div>
            )}
            <div className="link-evaluation-list">
              {detailRows.length ? (
                detailRows.map((row) => {
                  const compositionStatus =
                    row.compositionStatus ?? "NOT_STARTED";
                  const ready = compositionStatus === "FINALIZED";
                  return (
                    <article
                      key={row.id}
                      className={
                        linkDetails === "SELECTED"
                          ? `readiness-card ${ready ? "ready" : "waiting"}`
                          : undefined
                      }
                    >
                      <header>
                        <div>
                          <span className="code-pill">{row.code}</span>
                          <strong>{row.name}</strong>
                        </div>
                        <button
                          type="button"
                          className="icon-button view"
                          title="View Scorecard Details"
                          onClick={() =>
                            navigate(
                              `/app/scorecards/detail?scorecardId=${row.id}`,
                            )
                          }
                        >
                          <Eye size={14} />
                        </button>
                      </header>
                      {linkDetails === "AVAILABLE" && (
                        <div className="link-evaluation-facts">
                          <span>
                            <small>Departments</small>
                            <b>{row.departments?.length ?? 0}</b>
                          </span>
                          <span>
                            <small>Composition</small>
                            <b>{title(compositionStatus)}</b>
                          </span>
                          <span>
                            <small>Availability</small>
                            <b>Available to Link</b>
                          </span>
                        </div>
                      )}
                      {linkDetails === "SELECTED" && (
                        <>
                          <div className="link-readiness-detail">
                            <span>
                              <small>Readiness</small>
                              <b
                                className={`link-readiness ${ready ? "ready" : "waiting"}`}
                              >
                                {ready ? "Ready" : "Waiting for Finalization"}
                              </b>
                            </span>
                          </div>
                          <p className="link-readiness-explanation">
                            {ready
                              ? "This linked Scorecard has finalized its composition and the dependency is ready."
                              : `${row.code} is linked correctly, but its ${formatPeriod(periodKey)} composition is still being prepared and blocks finalization of ${scorecard.data?.code}. It becomes Ready automatically after finalization.`}
                          </p>
                        </>
                      )}
                      {linkDetails === "NOT_AVAILABLE" && (
                        <>
                          <div className="link-evaluation-reason">
                            <small>Reason</small>
                            <strong>{linkReason(row.reasonCode)}</strong>
                            <p>
                              {row.reasonCode === "CIRCULAR_REFERENCE"
                                ? `${row.code} already has a dependency path back to ${scorecard.data?.code}. Adding this link would close that path and create a cycle.`
                                : linkReason(row.reasonCode)}
                            </p>
                          </div>
                          {row.reasonCode === "CIRCULAR_REFERENCE" && (
                            <div className="dependency-path">
                              <small>Dependency path</small>
                              <b>
                                {row.code} → … → {scorecard.data?.code} →{" "}
                                {row.code}
                              </b>
                              <span>
                                A circular dependency cannot be created because
                                calculations and finalization require a
                                one-directional dependency chain.
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="link-evaluation-empty">
                  No Scorecards are currently included in this category.
                </div>
              )}
            </div>
            <footer>
              <button
                type="button"
                className="button secondary"
                onClick={() => setLinkDetails(null)}
              >
                Close
              </button>
            </footer>
          </section>
        </div>
      )}
      {conflicts && (
        <div className="assignment-conflict-backdrop" role="presentation">
          <section
            className="assignment-conflict-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="selection-conflict-title"
          >
            <header>
              <span>
                <AlertTriangle size={21} />
              </span>
              <div>
                <h2 id="selection-conflict-title">
                  {isKpi
                    ? "Selection changed"
                    : "Linked Scorecard selection changed"}
                </h2>
                <p>
                  {isKpi
                    ? `One or more KPIs are no longer available for ${formatPeriod(periodKey)}.`
                    : "We couldn't save this selection because one or more Scorecards are no longer eligible."}
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setConflicts(null)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="assignment-conflict-period">
              {formatPeriod(periodKey, true)}
            </div>
            <div className="assignment-conflict-list">
              {conflicts.map((conflict, index) => (
                <article
                  key={`${conflict.kpiConfigurationCode ?? conflict.linkedScorecardId}-${index}`}
                >
                  <strong>
                    {conflict.kpiConfigurationCode ??
                      conflict.scorecardCode ??
                      "Selection conflict"}
                  </strong>
                  {conflict.kpiName && <span>{conflict.kpiName}</span>}
                  <small>
                    Reason:{" "}
                    {conflict.reasonCode === "ASSIGNED_TO_ANOTHER_SCORECARD"
                      ? "Assigned to another Scorecard"
                      : linkReason(conflict.reasonCode)}
                  </small>
                  {conflict.scorecardCode && (
                    <b>
                      Currently Used By: {conflict.scorecardCode} ·{" "}
                      {conflict.scorecardName}
                    </b>
                  )}
                </article>
              ))}
            </div>
            <p className="assignment-conflict-atomic">No changes were saved.</p>
            <footer>
              <button
                type="button"
                className="button primary"
                onClick={() => setConflicts(null)}
              >
                Review Selection
              </button>
            </footer>
          </section>
        </div>
      )}
      {unlinkConfirmOpen && (
        <div
          className="assignment-conflict-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !unlink.isPending)
              setUnlinkConfirmOpen(false);
          }}
        >
          <section
            className="assignment-conflict-dialog unlink-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="unlink-confirm-title"
          >
            <header>
              <span>
                <AlertTriangle size={21} />
              </span>
              <div>
                <h2 id="unlink-confirm-title">Unlink selected Scorecards?</h2>
                <p>
                  The selected links and their assigned weight contributions
                  will be removed from {formatPeriod(periodKey)}.
                </p>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={unlink.isPending}
                onClick={() => setUnlinkConfirmOpen(false)}
              >
                <X size={18} />
              </button>
            </header>
            <div className="assignment-conflict-list">
              {selectedUnlinkRows.map((row) => (
                <article key={row.id}>
                  <strong>{row.code}</strong>
                  <span>{row.name}</span>
                </article>
              ))}
            </div>
            <p className="assignment-conflict-atomic">
              Review Composition Weight after unlinking these Scorecards.
            </p>
            <footer>
              <button
                type="button"
                className="button secondary"
                disabled={unlink.isPending}
                onClick={() => setUnlinkConfirmOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="button unlink-selected"
                disabled={unlink.isPending}
                onClick={() => unlink.mutate()}
              >
                {unlink.isPending
                  ? "Unlinking..."
                  : `Unlink ${unlinked.length} Scorecard${unlinked.length === 1 ? "" : "s"}`}
              </button>
            </footer>
          </section>
        </div>
      )}
    </main>
  );
}
