import { FormEvent, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Database,
  MoreVertical,
  Pencil,
  Plus,
  Ruler,
  Search,
  Shapes,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/http-client";
import {
  catalogManagementService as service,
  type CatalogUsageItem,
  type DataSourceItem,
  type MeasurementUnitItem,
  type SubjectTypeItem,
  type SubjectValueItem,
} from "./catalog-management.service";
import "./catalog-management.css";

type Tab = "subjects" | "units" | "sources";
type Editor =
  | { kind: "subjectType"; item?: SubjectTypeItem }
  | { kind: "subjectValue"; item?: SubjectValueItem }
  | { kind: "unit"; item?: MeasurementUnitItem }
  | { kind: "source"; item?: DataSourceItem };

const label = (active: boolean) => (
  <span className={`catalog-status ${active ? "active" : "inactive"}`}>
    <i />
    {active ? "Active" : "Inactive"}
  </span>
);
const normalizedCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/[^A-Z0-9_-]/g, "");

export function CatalogManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("subjects");
  const [subjectType, setSubjectType] = useState<SubjectTypeItem | null>(null);
  const [search, setSearch] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [confirmItem, setConfirmItem] = useState<{
    kind: Editor["kind"];
    id: string;
    name: string;
    active: boolean;
    references: number;
  } | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL");
  const [sourceTypeFilter, setSourceTypeFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [usage, setUsage] = useState<{
    kind: "subject-type" | "subject-value" | "measurement-unit" | "data-source";
    id: string;
    name: string;
  } | null>(null);

  const subjectTypes = useQuery({
    queryKey: ["catalog-management", "subject-types"],
    queryFn: service.subjectTypes,
  });
  const subjectValues = useQuery({
    queryKey: ["catalog-management", "subject-values", subjectType?.code],
    queryFn: () => service.subjectValues(subjectType!.code),
    enabled: Boolean(subjectType),
  });
  const units = useQuery({
    queryKey: ["catalog-management", "measurement-units"],
    queryFn: service.measurementUnits,
  });
  const sources = useQuery({
    queryKey: ["catalog-management", "data-sources"],
    queryFn: service.dataSources,
  });
  const current =
    tab === "units"
      ? units
      : tab === "sources"
        ? sources
        : subjectType
          ? subjectValues
          : subjectTypes;

  const toggle = useMutation({
    mutationFn: async (item: NonNullable<typeof confirmItem>) => {
      if (item.kind === "subjectType")
        return service.toggleSubjectType(item.id);
      if (item.kind === "subjectValue")
        return service.toggleSubjectValue(item.id);
      if (item.kind === "unit") return service.toggleMeasurementUnit(item.id);
      return service.toggleDataSource(item.id);
    },
    onSuccess: async () => {
      setNotice(
        `${confirmItem?.name} was ${confirmItem?.active ? "deactivated" : "activated"}. Historical references remain unchanged.`,
      );
      setConfirmItem(null);
      await queryClient.invalidateQueries({ queryKey: ["catalog-management"] });
      await queryClient.invalidateQueries({ queryKey: ["kpi-config-lookups"] });
    },
  });

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    let rows = (current.data ?? []) as Array<{
      code: string;
      name: string;
      isActive: boolean;
      sourceType?: string;
    }>;
    if (term)
      rows = rows.filter((row) =>
        `${row.code} ${row.name}`.toLowerCase().includes(term),
      );
    if (status !== "ALL")
      rows = rows.filter((row) => row.isActive === (status === "ACTIVE"));
    if (tab === "sources" && sourceTypeFilter !== "ALL")
      rows = rows.filter((row) => row.sourceType === sourceTypeFilter);
    return rows;
  }, [current.data, search, sourceTypeFilter, status, tab]);

  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filtered.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const chooseTab = (next: Tab) => {
    setTab(next);
    setSubjectType(null);
    setSearch("");
    setStatus("ALL");
    setSourceTypeFilter("ALL");
    setPage(1);
    setNotice(null);
  };
  const openToggle = (
    kind: Editor["kind"],
    item: {
      id: string;
      name: string;
      isActive: boolean;
      referenceCount: number;
    },
  ) =>
    setConfirmItem({
      kind,
      id: item.id,
      name: item.name,
      active: item.isActive,
      references: item.referenceCount,
    });
  const addLabel =
    tab === "units"
      ? "Add Measurement Unit"
      : tab === "sources"
        ? "Add Data Source"
        : subjectType
          ? `Add ${subjectType.name}`
          : "Add Subject Type";
  const addKind: Editor["kind"] =
    tab === "units"
      ? "unit"
      : tab === "sources"
        ? "source"
        : subjectType
          ? "subjectValue"
          : "subjectType";

  return (
    <main className="catalog-page">
      <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
        <Link to="/app/kpi-management">KPI Management</Link>
        <span>/</span>
        <span aria-current="page">Catalog Management</span>
      </nav>
      <header className="catalog-page-header">
        <button
          type="button"
          className="button secondary catalog-back"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft size={17} /> Back
        </button>
        <div>
          <span className="catalog-eyebrow">KPI CATALOGS</span>
          <h1>Catalog Management</h1>
          <p>
            Manage reusable subjects, measurement units and data sources used by
            KPI Configurations.
          </p>
        </div>
      </header>

      <div className="catalog-layout">
        <aside className="catalog-tabs" aria-label="Catalog sections">
          <button
            className={tab === "subjects" ? "active" : ""}
            onClick={() => chooseTab("subjects")}
          >
            <Shapes size={19} />
            <span>
              <strong>Subject Catalog</strong>
              <small>Types and entity values</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button
            className={tab === "units" ? "active" : ""}
            onClick={() => chooseTab("units")}
          >
            <Ruler size={19} />
            <span>
              <strong>Measurement Units</strong>
              <small>Units and precision</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button
            className={tab === "sources" ? "active" : ""}
            onClick={() => chooseTab("sources")}
          >
            <Database size={19} />
            <span>
              <strong>Data Sources</strong>
              <small>Origin of KPI results</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </aside>

        <section className="catalog-content">
          <header className="catalog-section-header">
            <div>
              {subjectType && tab === "subjects" && (
                <button
                  className="catalog-inline-back"
                  onClick={() => {
                    setSubjectType(null);
                    setSearch("");
                  }}
                >
                  <ArrowLeft size={15} /> Subject Types
                </button>
              )}
              <h2>
                {tab === "units"
                  ? "Measurement Units"
                  : tab === "sources"
                    ? "Data Sources"
                    : subjectType
                      ? `${subjectType.code} — ${subjectType.name}`
                      : "Subject Types"}
              </h2>
              <p>
                {subjectType
                  ? "Subject Values"
                  : tab === "subjects"
                    ? "Define which kinds of entities can be evaluated by a KPI."
                    : tab === "units"
                      ? "Define the units available for Goals, Results and Measurement Inputs."
                      : "Define where official KPI Results originate."}
              </p>
            </div>
            <button
              className="button catalog-primary"
              onClick={() => setEditor({ kind: addKind })}
            >
              <Plus size={16} />
              {addLabel}
            </button>
          </header>
          <div className="catalog-toolbar">
            <label className="catalog-search">
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${subjectType ? "values" : tab === "subjects" ? "subject types" : tab === "units" ? "units" : "data sources"}...`}
              />
              {search && (
                <button onClick={() => setSearch("")} aria-label="Clear search">
                  <X size={15} />
                </button>
              )}
            </label>
            <div className="catalog-filters">
              <label>
                <span>Status</span>
                <select
                  value={status}
                  onChange={(event) => {
                    setStatus(event.target.value as typeof status);
                    setPage(1);
                  }}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </label>
              {tab === "sources" && (
                <label>
                  <span>Type</span>
                  <select
                    value={sourceTypeFilter}
                    onChange={(event) => {
                      setSourceTypeFilter(event.target.value);
                      setPage(1);
                    }}
                  >
                    <option value="ALL">All</option>
                    <option value="MANUAL">Manual</option>
                    <option value="SYSTEM">System</option>
                    <option value="DATABASE">Database</option>
                    <option value="API">API</option>
                    <option value="FILE">File</option>
                  </select>
                </label>
              )}
            </div>
          </div>
          {notice && (
            <div className="catalog-notice" role="status">
              {notice}
              <button onClick={() => setNotice(null)} aria-label="Dismiss">
                <X size={15} />
              </button>
            </div>
          )}
          {current.isLoading ? (
            <div className="catalog-state">Loading catalog…</div>
          ) : current.isError ? (
            <div className="catalog-state error">
              The catalog could not be loaded. Verify that the KPI Management
              service is running.
            </div>
          ) : (
            <>
              <CatalogTable
                tab={tab}
                subjectType={subjectType}
                rows={pagedRows}
                onSubjectType={(item) => {
                  setSubjectType(item);
                  setSearch("");
                  setStatus("ALL");
                  setPage(1);
                }}
                onEdit={setEditor}
                onToggle={openToggle}
                onUsage={setUsage}
              />
              <div className="catalog-pagination">
                <span>
                  Showing {filtered.length ? (safePage - 1) * pageSize + 1 : 0}–
                  {Math.min(safePage * pageSize, filtered.length)} of{" "}
                  {filtered.length}
                </span>
                <div>
                  <button
                    disabled={safePage <= 1}
                    onClick={() => setPage((value) => value - 1)}
                    aria-label="Previous page"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <strong>
                    {safePage} / {totalPages}
                  </strong>
                  <button
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((value) => value + 1)}
                    aria-label="Next page"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      {editor && (
        <CatalogEditor
          editor={editor}
          subjectType={subjectType}
          onClose={() => setEditor(null)}
          onSaved={async (message) => {
            setEditor(null);
            setNotice(message);
            await queryClient.invalidateQueries({
              queryKey: ["catalog-management"],
            });
            await queryClient.invalidateQueries({
              queryKey: ["kpi-config-lookups"],
            });
          }}
        />
      )}
      {confirmItem && (
        <ConfirmToggle
          item={confirmItem}
          pending={toggle.isPending}
          error={toggle.error}
          onCancel={() => setConfirmItem(null)}
          onConfirm={() => toggle.mutate(confirmItem)}
        />
      )}
      {usage && <UsageDialog usage={usage} onClose={() => setUsage(null)} />}
    </main>
  );
}

function CatalogTable({
  tab,
  subjectType,
  rows,
  onSubjectType,
  onEdit,
  onToggle,
  onUsage,
}: {
  tab: Tab;
  subjectType: SubjectTypeItem | null;
  rows: Array<any>;
  onSubjectType: (item: SubjectTypeItem) => void;
  onEdit: (editor: Editor) => void;
  onToggle: (kind: Editor["kind"], item: any) => void;
  onUsage: (usage: {
    kind: "subject-type" | "subject-value" | "measurement-unit" | "data-source";
    id: string;
    name: string;
  }) => void;
}) {
  if (!rows.length)
    return (
      <div className="catalog-state">No catalog items match your search.</div>
    );
  if (tab === "subjects" && !subjectType)
    return (
      <div className="catalog-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Values</th>
              <th>Used by</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {(rows as SubjectTypeItem[]).map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="catalog-code">{item.code}</span>
                </td>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>{label(item.isActive)}</td>
                <td>
                  <button
                    className="catalog-values-link"
                    onClick={() => onSubjectType(item)}
                  >
                    {item.activeValueCount} active / {item.valueCount} total{" "}
                    <ChevronRight size={14} />
                  </button>
                </td>
                <td>
                  <UsageButton
                    count={item.referenceCount}
                    onClick={() =>
                      onUsage({
                        kind: "subject-type",
                        id: item.id,
                        name: item.name,
                      })
                    }
                  />
                </td>
                <td>
                  <RowActions
                    onView={() => onSubjectType(item)}
                    onEdit={() => onEdit({ kind: "subjectType", item })}
                    onToggle={() => onToggle("subjectType", item)}
                    active={item.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (tab === "subjects")
    return (
      <div className="catalog-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Used by</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {(rows as SubjectValueItem[]).map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="catalog-code">{item.code}</span>
                </td>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>{label(item.isActive)}</td>
                <td>
                  <UsageButton
                    count={item.referenceCount}
                    onClick={() =>
                      onUsage({
                        kind: "subject-value",
                        id: item.id,
                        name: item.name,
                      })
                    }
                  />
                </td>
                <td>
                  <RowActions
                    onEdit={() => onEdit({ kind: "subjectValue", item })}
                    onToggle={() => onToggle("subjectValue", item)}
                    active={item.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  if (tab === "units")
    return (
      <div className="catalog-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Symbol</th>
              <th>Precision</th>
              <th>Status</th>
              <th>Used by</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {(rows as MeasurementUnitItem[]).map((item) => (
              <tr key={item.id}>
                <td>
                  <span className="catalog-code">{item.code}</span>
                  {item.duplicateOf && (
                    <span className="catalog-duplicate">
                      Possible duplicate of {item.duplicateOf.code}
                    </span>
                  )}
                </td>
                <td>
                  <strong>{item.name}</strong>
                </td>
                <td>{item.symbol}</td>
                <td>{item.decimalPlaces} decimals</td>
                <td>{label(item.isActive)}</td>
                <td>
                  <UsageButton
                    count={item.referenceCount}
                    onClick={() =>
                      onUsage({
                        kind: "measurement-unit",
                        id: item.id,
                        name: item.name,
                      })
                    }
                  />
                </td>
                <td>
                  <RowActions
                    onEdit={() => onEdit({ kind: "unit", item })}
                    onToggle={() => onToggle("unit", item)}
                    active={item.isActive}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  return (
    <div className="catalog-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Code</th>
            <th>Name / Description</th>
            <th>Source Type</th>
            <th>Integration Mode</th>
            <th>Status</th>
            <th>Used by</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {(rows as DataSourceItem[]).map((item) => (
            <tr key={item.id}>
              <td>
                <span className="catalog-code">{item.code}</span>
              </td>
              <td>
                <strong>{item.name}</strong>
                {item.description && (
                  <small className="catalog-description">
                    {item.description}
                  </small>
                )}
              </td>
              <td>{item.sourceType.replace(/_/g, " ")}</td>
              <td>{item.supportsAutomation ? "Automated" : "Manual"}</td>
              <td>{label(item.isActive)}</td>
              <td>
                <UsageButton
                  count={item.referenceCount}
                  onClick={() =>
                    onUsage({
                      kind: "data-source",
                      id: item.id,
                      name: item.name,
                    })
                  }
                />
              </td>
              <td>
                <RowActions
                  onEdit={() => onEdit({ kind: "source", item })}
                  onToggle={() => onToggle("source", item)}
                  active={item.isActive}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function UsageButton({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) {
  return (
    <button className="catalog-usage-link" disabled={!count} onClick={onClick}>
      {count} revision{count === 1 ? "" : "s"}
    </button>
  );
}
function RowActions({
  onView,
  onEdit,
  onToggle,
  active,
}: {
  onView?: () => void;
  onEdit: () => void;
  onToggle: () => void;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="catalog-row-actions">
      {onView && (
        <button className="catalog-view-action" onClick={onView}>
          View Values
        </button>
      )}
      <div className="catalog-more">
        <button
          className="catalog-more-trigger"
          onClick={() => setOpen((value) => !value)}
          aria-label="More actions"
          aria-expanded={open}
        >
          <MoreVertical size={16} />
        </button>
        {open && (
          <div className="catalog-more-menu">
            <button onClick={onEdit}>
              <Pencil size={14} /> Edit
            </button>
            <button
              className={active ? "deactivate" : "activate"}
              onClick={onToggle}
            >
              {active ? "Deactivate" : "Activate"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function CatalogEditor({
  editor,
  subjectType,
  onClose,
  onSaved,
}: {
  editor: Editor;
  subjectType: SubjectTypeItem | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const item = editor.item;
  const [code, setCode] = useState(item?.code ?? "");
  const [name, setName] = useState(item?.name ?? "");
  const unit = editor.kind === "unit" ? editor.item : undefined;
  const source = editor.kind === "source" ? editor.item : undefined;
  const [symbol, setSymbol] = useState(unit?.symbol ?? "");
  const [description, setDescription] = useState(
    unit?.description ?? source?.description ?? "",
  );
  const [decimalPlaces, setDecimalPlaces] = useState(unit?.decimalPlaces ?? 2);
  const [isPercentage, setIsPercentage] = useState(unit?.isPercentage ?? false);
  const [sourceType, setSourceType] = useState(source?.sourceType ?? "MANUAL");
  const [isExternal, setIsExternal] = useState(source?.isExternal ?? false);
  const [supportsAutomation, setSupportsAutomation] = useState(
    source?.supportsAutomation ?? false,
  );
  const mutation = useMutation({
    mutationFn: async () => {
      if (editor.kind === "subjectType")
        return item
          ? service.updateSubjectType(item.id, { code, name })
          : service.createSubjectType({ code, name });
      if (editor.kind === "subjectValue")
        return item
          ? service.updateSubjectValue(item.id, { code, name })
          : service.createSubjectValue(subjectType!.code, { code, name });
      if (editor.kind === "unit") {
        const value = {
          code,
          name,
          symbol,
          description: description || null,
          decimalPlaces,
          isPercentage,
        };
        return item
          ? service.updateMeasurementUnit(item.id, value)
          : service.createMeasurementUnit(value);
      }
      const value = {
        code,
        name,
        description: description || null,
        sourceType,
        isExternal,
        supportsAutomation,
      };
      return item
        ? service.updateDataSource(item.id, value)
        : service.createDataSource(value);
    },
    onSuccess: () =>
      onSaved(`${name} was ${item ? "updated" : "added"} successfully.`),
  });
  const title = `${item ? "Edit" : "Add"} ${editor.kind === "subjectType" ? "Subject Type" : editor.kind === "subjectValue" ? (subjectType?.name ?? "Subject Value") : editor.kind === "unit" ? "Measurement Unit" : "Data Source"}`;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    mutation.mutate();
  };
  return (
    <div
      className="catalog-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        className="catalog-modal"
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-editor-title"
      >
        <header>
          <div>
            <h2 id="catalog-editor-title">{title}</h2>
            <p>
              {item
                ? "Codes cannot be changed because they identify historical references."
                : "Create a reusable catalog entry for KPI Configuration."}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        <div className="catalog-form-grid">
          <label>
            <span>Code</span>
            <input
              required
              minLength={2}
              value={code}
              disabled={Boolean(item)}
              onChange={(event) => setCode(normalizedCode(event.target.value))}
              placeholder={
                editor.kind === "subjectValue" ? "CUS-001" : "CATALOG_CODE"
              }
            />
            <small>Permanent identifier; cannot be edited later.</small>
          </label>
          <label>
            <span>Name</span>
            <input
              required
              minLength={2}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Display name"
            />
          </label>
          {editor.kind === "unit" && (
            <>
              <label>
                <span>Symbol</span>
                <input
                  required
                  value={symbol}
                  onChange={(event) => setSymbol(event.target.value)}
                  placeholder="%, km, USD"
                />
              </label>
              <label>
                <span>Decimal Places</span>
                <input
                  type="number"
                  min={0}
                  max={8}
                  value={decimalPlaces}
                  onChange={(event) =>
                    setDecimalPlaces(Number(event.target.value))
                  }
                />
              </label>
              <label className="catalog-check">
                <input
                  type="checkbox"
                  checked={isPercentage}
                  onChange={(event) => setIsPercentage(event.target.checked)}
                />
                <span>Percentage unit</span>
              </label>
            </>
          )}
          {editor.kind === "source" && (
            <>
              <label>
                <span>Source Type</span>
                <select
                  value={sourceType}
                  onChange={(event) => setSourceType(event.target.value)}
                >
                  <option value="MANUAL">Manual</option>
                  <option value="SYSTEM">System</option>
                  <option value="DATABASE">Database</option>
                  <option value="API">API</option>
                  <option value="FILE">File</option>
                </select>
              </label>
              <label className="catalog-check">
                <input
                  type="checkbox"
                  checked={isExternal}
                  onChange={(event) => setIsExternal(event.target.checked)}
                />
                <span>External source</span>
              </label>
              <label className="catalog-check">
                <input
                  type="checkbox"
                  checked={supportsAutomation}
                  onChange={(event) =>
                    setSupportsAutomation(event.target.checked)
                  }
                />
                <span>Supports automation</span>
              </label>
            </>
          )}
          {(editor.kind === "unit" || editor.kind === "source") && (
            <label className="catalog-form-wide">
              <span>Description</span>
              <textarea
                value={description ?? ""}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
              />
            </label>
          )}
        </div>
        {mutation.error && (
          <p className="catalog-form-error">
            {mutation.error instanceof ApiError
              ? mutation.error.message
              : "The catalog entry could not be saved."}
          </p>
        )}
        <footer>
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="button catalog-primary"
            disabled={mutation.isPending}
          >
            {mutation.isPending
              ? "Saving…"
              : item
                ? "Save Changes"
                : "Add Item"}
          </button>
        </footer>
      </form>
    </div>
  );
}

function UsageDialog({
  usage,
  onClose,
}: {
  usage: {
    kind: "subject-type" | "subject-value" | "measurement-unit" | "data-source";
    id: string;
    name: string;
  };
  onClose: () => void;
}) {
  const query = useQuery({
    queryKey: ["catalog-management", "usage", usage.kind, usage.id],
    queryFn: () => service.usage(usage.kind, usage.id),
  });
  return (
    <div
      className="catalog-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="catalog-modal catalog-usage-modal"
        role="dialog"
        aria-modal="true"
      >
        <header>
          <div>
            <h2>Used By — {usage.name}</h2>
            <p>
              KPI Configuration revisions currently referencing this catalog
              item.
            </p>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={19} />
          </button>
        </header>
        {query.isLoading ? (
          <div className="catalog-state">Loading references…</div>
        ) : query.isError ? (
          <div className="catalog-state error">
            References could not be loaded.
          </div>
        ) : (
          <div className="catalog-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Configuration</th>
                  <th>KPI</th>
                  <th>Revision</th>
                  <th>Effective Period</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(query.data as CatalogUsageItem[]).map((item) => (
                  <tr key={`${item.configurationId}-${item.revisionNumber}`}>
                    <td>
                      <Link
                        to={`/app/kpi-management/config/detail-record?id=${item.configurationId}`}
                      >
                        {item.configCode}
                      </Link>
                    </td>
                    <td>
                      <strong>{item.kpiCode}</strong>
                      <small className="catalog-description">
                        {item.kpiName}
                      </small>
                    </td>
                    <td>Rev. {item.revisionNumber}</td>
                    <td>
                      {item.effectiveFrom} — {item.effectiveTo ?? "Current"}
                    </td>
                    <td>{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <footer>
          <button className="button secondary" onClick={onClose}>
            Close
          </button>
        </footer>
      </section>
    </div>
  );
}

function ConfirmToggle({
  item,
  pending,
  error,
  onCancel,
  onConfirm,
}: {
  item: { name: string; active: boolean; references: number };
  pending: boolean;
  error: Error | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="catalog-modal-backdrop">
      <section
        className="catalog-modal catalog-confirm"
        role="alertdialog"
        aria-modal="true"
      >
        <header>
          <div>
            <h2>
              {item.active ? "Deactivate" : "Activate"} “{item.name}”?
            </h2>
            <p>
              {item.active
                ? "It will no longer be available for new KPI configurations."
                : "It will become available for new KPI configurations."}
            </p>
          </div>
        </header>
        {item.references > 0 && (
          <div className="catalog-impact-warning">
            <strong>
              Currently referenced {item.references} time
              {item.references === 1 ? "" : "s"}.
            </strong>
            <span>
              Existing configurations, finalized Scorecards, Monitoring and
              historical reports remain unchanged.
            </span>
          </div>
        )}
        {error && (
          <p className="catalog-form-error">The status could not be changed.</p>
        )}
        <footer>
          <button className="button secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            className={`button ${item.active ? "danger" : "catalog-primary"}`}
            disabled={pending}
            onClick={onConfirm}
          >
            {pending ? "Updating…" : item.active ? "Deactivate" : "Activate"}
          </button>
        </footer>
      </section>
    </div>
  );
}
