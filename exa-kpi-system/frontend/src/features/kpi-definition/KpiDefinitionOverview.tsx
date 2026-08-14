import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  CirclePause,
  ChevronLeft,
  ChevronRight,
  Cog,
  FilePlus2,
  Eye,
  Layers3,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { KpiDefinitionModal } from "./KpiDefinitionModal";
import { CheckboxMultiSelect } from "./CheckboxMultiSelect";
import { kpiDefinitionService } from "./kpi-definition.service";
import type {
  KpiDefinition,
  KpiDefinitionInput,
} from "./kpi-definition.types";
import "./kpi-definition.css";

type Toast = {
  message: string;
  tone: "success" | "info";
};

export function KpiDefinitionOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [categoriesSelected, setCategoriesSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<KpiDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<KpiDefinition | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const definitionsQuery = useQuery({
    queryKey: ["kpi-definitions"],
    queryFn: kpiDefinitionService.list,
  });

  const notify = (message: string, tone: Toast["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => setToast(null), 3500);
  };

  const saveMutation = useMutation({
    mutationFn: ({
      input,
      definition,
    }: {
      input: KpiDefinitionInput;
      definition?: KpiDefinition;
    }) =>
      definition
        ? kpiDefinitionService.update(definition.id, input)
        : kpiDefinitionService.create(input),
    onSuccess: (saved, variables) => {
      queryClient.invalidateQueries({ queryKey: ["kpi-definitions"] });
      setCreating(false);
      setEditing(null);
      notify(
        variables.definition
          ? `${saved.code} was updated successfully.`
          : `${saved.code} was created successfully. You can now configure it.`,
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (definition: KpiDefinition) =>
      kpiDefinitionService.softDelete(definition.id),
    onSuccess: (_, definition) => {
      queryClient.invalidateQueries({ queryKey: ["kpi-definitions"] });
      setDeleting(null);
      notify(
        `${definition.code} was removed from the overview. Its historical data was preserved.`,
        "info",
      );
    },
  });

  const definitions = definitionsQuery.data ?? [];
  const categories = [...new Set(definitions.map((item) => item.category))].sort();
  const filteredDefinitions = useMemo(() => {
    const term = search.trim().toLowerCase();
    return definitions.filter((definition) => {
      const matchesSearch =
        !term ||
        [definition.code, definition.name, definition.objective].some((value) =>
          value.toLowerCase().includes(term),
        );
      const matchesStatus =
        statuses.length === 0 || statuses.includes(definition.status);
      const matchesCategory =
        categoriesSelected.length === 0 ||
        categoriesSelected.includes(definition.category);
      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [categoriesSelected, definitions, search, statuses]);

  const filterBySummary = (nextStatuses: string[]) => {
    setStatuses(nextStatuses);
    setCategoriesSelected([]);
  };

  const openConfiguration = (definition: KpiDefinition) => {
    navigate(
      `/app/kpi-management/config/set?kpiDefinitionId=${definition.id}&code=${definition.code}&from=definition-overview`,
    );
  };

  return (
    <main className="kpi-definition-page">
      <header className="kpi-page-header">
        <div>
          <nav className="kpi-breadcrumb" aria-label="Breadcrumb">
            <Link to="/app/kpi-management">KPI Management</Link>
            <span>/</span>
            <Link
              to="/app/kpi-management/definition/overview"
              aria-current="page"
            >
              KPI Definition
            </Link>
          </nav>
          <h1>KPI Definition Overview</h1>
          <p>
            Create and maintain the reusable identity of each KPI before defining
            how it will be measured.
          </p>
        </div>
      </header>

      <section className="kpi-summary-grid" aria-label="KPI Definition summary">
        <button
          type="button"
          className={statuses.length === 0 ? "active" : ""}
          onClick={() => filterBySummary([])}
        >
          <span className="summary-card-icon total">
            <Layers3 size={17} />
          </span>
          <span className="summary-card-copy">
            <span>Total definitions</span>
            <strong>{definitions.length}</strong>
          </span>
        </button>
        <button
          type="button"
          className={
            statuses.length === 1 && statuses[0] === "ACTIVE" ? "active" : ""
          }
          onClick={() => filterBySummary(["ACTIVE"])}
        >
          <span className="summary-card-icon active">
            <CheckCircle2 size={17} />
          </span>
          <span className="summary-card-copy">
            <span>Active</span>
            <strong>
              {definitions.filter((item) => item.status === "ACTIVE").length}
            </strong>
          </span>
        </button>
        <button
          type="button"
          className={
            statuses.length === 1 && statuses[0] === "INACTIVE" ? "active" : ""
          }
          onClick={() => filterBySummary(["INACTIVE"])}
        >
          <span className="summary-card-icon inactive">
            <CirclePause size={17} />
          </span>
          <span className="summary-card-copy">
            <span>Inactive</span>
            <strong>
              {definitions.filter((item) => item.status === "INACTIVE").length}
            </strong>
          </span>
        </button>
      </section>

      <section className="kpi-panel stable-table-panel">
        <div className="kpi-toolbar">
          <label className="search-control">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by code, name or objective..."
              aria-label="Search KPI Definitions"
            />
          </label>

          <CheckboxMultiSelect
            label="All states"
            selected={statuses}
            onChange={setStatuses}
            options={[
              { value: "ACTIVE", label: "Active" },
              { value: "INACTIVE", label: "Inactive" },
            ]}
          />

          <CheckboxMultiSelect
            label="All categories"
            selected={categoriesSelected}
            onChange={setCategoriesSelected}
            options={categories.map((item) => ({ value: item, label: item }))}
          />
          <button
            className="button primary toolbar-new-button"
            onClick={() => setCreating(true)}
          >
            <FilePlus2 size={16} />
            New KPI Definition
          </button>
        </div>

        <div className="kpi-table-wrap stable-table-shell">
          <table className="kpi-table">
            <colgroup>
              <col className="column-code" />
              <col className="column-name" />
              <col className="column-objective" />
              <col className="column-category" />
              <col className="column-state" />
              <col className="column-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>KPI Code</th>
                <th>KPI Name</th>
                <th>Objective</th>
                <th>Category</th>
                <th>State</th>
                <th className="actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {definitionsQuery.isLoading ? (
                <tr>
                  <td colSpan={6} className="table-message">
                    Loading KPI Definitions...
                  </td>
                </tr>
              ) : filteredDefinitions.length ? (
                filteredDefinitions.map((definition) => (
                  <tr key={definition.id}>
                    <td>
                      <span className="code-pill">{definition.code}</span>
                    </td>
                    <td className="name-cell">{definition.name}</td>
                    <td className="objective-cell">{definition.objective}</td>
                    <td>{definition.category}</td>
                    <td>
                      <span
                        className={`status-chip ${definition.status.toLowerCase()}`}
                      >
                        <i />
                        {definition.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          className="icon-button edit"
                          aria-label={`Edit ${definition.code}`}
                          title="Edit KPI Definition"
                          onClick={() => setEditing(definition)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          className="icon-button delete"
                          aria-label={`Remove ${definition.code}`}
                          title="Soft delete"
                          onClick={() => setDeleting(definition)}
                        >
                          <Trash2 size={16} />
                        </button>
                        <button
                          className="icon-button configure"
                          aria-label={`Configure ${definition.code}`}
                          title={
                            definition.status === "ACTIVE"
                              ? "Ready to configure"
                              : "Activate this KPI before configuring it"
                          }
                          disabled={definition.status !== "ACTIVE"}
                          onClick={() => openConfiguration(definition)}
                        >
                          <Cog size={18} strokeWidth={2.25} />
                        </button>
                        <button
                          className="icon-button view"
                          aria-label={`View details for ${definition.code}`}
                          title="View KPI Definition details"
                          onClick={() =>
                            navigate(`/app/kpi-management/definition/detail/${definition.id}`)
                          }
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="table-message">
                    No KPI Definitions match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <footer className="kpi-table-footer">
          <span>
            Showing <strong>{filteredDefinitions.length}</strong> of{" "}
            <strong>{definitions.length}</strong> definitions
          </span>
          <div className="pagination" aria-label="Pagination">
            <button disabled aria-label="Previous page">
              <ChevronLeft size={16} />
            </button>
            <button className="current">1</button>
            <button disabled aria-label="Next page">
              <ChevronRight size={16} />
            </button>
          </div>
        </footer>
      </section>

      {(creating || editing) && (
        <KpiDefinitionModal
          definition={editing ?? undefined}
          isSaving={saveMutation.isPending}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSubmit={(input) =>
            saveMutation.mutate({ input, definition: editing ?? undefined })
          }
        />
      )}

      {deleting && (
        <div
          className="kpi-modal-backdrop"
          role="presentation"
        >
          <section
            className="confirmation-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-kpi-title"
          >
            <div className="danger-icon">
              <Trash2 size={22} />
            </div>
            <h2 id="delete-kpi-title">Remove KPI Definition?</h2>
            <p>
              <strong>{deleting.code}</strong> will disappear from this overview.
              This is a soft delete, so related historical information will remain
              available.
            </p>
            <div className="kpi-modal-actions">
              <button className="button secondary" onClick={() => setDeleting(null)}>
                Cancel
              </button>
              <button
                className="button danger"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deleting)}
              >
                {deleteMutation.isPending ? "Removing..." : "Remove Definition"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className={`kpi-toast ${toast.tone}`} role="status">
          <CheckCircle2 size={20} />
          <span>{toast.message}</span>
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <X size={16} />
          </button>
        </div>
      )}
    </main>
  );
}
