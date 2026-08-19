import { useEffect, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, CirclePause, Cog, FilePlus2, Eye, Layers3, Pencil, Search, Trash2, X } from "lucide-react";
import { ApiError } from "../../api/http-client";
import { PaginationControls } from "../../components/PaginationControls";
import { RowsPerPageSelect } from "../../components/RowsPerPageSelect";
import { SortableTableHeader, type SortDirection } from "../../components/SortableTableHeader";
import { CheckboxMultiSelect } from "./CheckboxMultiSelect";
import { KpiDefinitionModal } from "./KpiDefinitionModal";
import { kpiDefinitionKeys, kpiDefinitionService } from "./kpi-definition.service";
import type { CreateKpiDefinitionInput, KpiDefinition, KpiDefinitionSortBy, KpiDefinitionStatus, UpdateKpiDefinitionInput } from "./kpi-definition.types";
import "./kpi-definition.css";

type Toast = { message: string; tone: "success" | "info" };
const errorMessage = (error: unknown) => error instanceof ApiError
  ? error.code === "KPI_CODE_CONFLICT" ? "That KPI code already exists."
    : error.code === "KPI_CATEGORY_NOT_AVAILABLE" ? "The selected category is unavailable."
      : error.message
  : "The request could not be completed.";

export function KpiDefinitionOverview() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statuses, setStatuses] = useState<KpiDefinitionStatus[]>([]);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [editing, setEditing] = useState<KpiDefinition | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<KpiDefinition | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [mutationError, setMutationError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<KpiDefinitionSortBy>("kpiCode");
  const [sortOrder, setSortOrder] = useState<SortDirection>("asc");

  useEffect(() => { const timer = window.setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 300); return () => window.clearTimeout(timer); }, [search]);
  const params = { page, pageSize, search: debouncedSearch || undefined, categoryId: categoryIds.length ? categoryIds : undefined, status: statuses.length ? statuses : undefined, sortBy, sortOrder };
  const definitionsQuery = useQuery({ queryKey: kpiDefinitionKeys.list(params), queryFn: () => kpiDefinitionService.list(params), placeholderData: keepPreviousData });
  const categoriesQuery = useQuery({ queryKey: kpiDefinitionKeys.categories, queryFn: kpiDefinitionService.listCategories });
  const activeCountQuery = useQuery({ queryKey: [...kpiDefinitionKeys.all, "count", "ACTIVE"], queryFn: () => kpiDefinitionService.list({ page: 1, pageSize: 1, status: ["ACTIVE"], sortBy: "kpiCode", sortOrder: "asc" }) });
  const inactiveCountQuery = useQuery({ queryKey: [...kpiDefinitionKeys.all, "count", "INACTIVE"], queryFn: () => kpiDefinitionService.list({ page: 1, pageSize: 1, status: ["INACTIVE"], sortBy: "kpiCode", sortOrder: "asc" }) });
  const notify = (message: string, tone: Toast["tone"] = "success") => { setToast({ message, tone }); window.setTimeout(() => setToast(null), 3500); };
  const invalidate = () => queryClient.invalidateQueries({ queryKey: kpiDefinitionKeys.all });

  const saveMutation = useMutation({
    mutationFn: async ({ input, definition, isActive }: { input: CreateKpiDefinitionInput; definition?: KpiDefinition; isActive: boolean }) => {
      if (!definition) return kpiDefinitionService.create({ ...input, isActive });
      const updateInput: UpdateKpiDefinitionInput = {
        kpiName: input.kpiName,
        description: input.description,
        kpiCategoryId: input.kpiCategoryId,
      };
      const updated = await kpiDefinitionService.update(definition.id, updateInput);
      if (isActive === definition.isActive) return updated;
      return isActive ? kpiDefinitionService.activate(definition.id) : kpiDefinitionService.deactivate(definition.id);
    },
    onMutate: () => setMutationError(""),
    onSuccess: (saved, variables) => { void invalidate(); setCreating(false); setEditing(null); notify(variables.definition ? `${saved.kpiCode} was updated successfully.` : `${saved.kpiCode} was created successfully.`); },
    onError: (error) => setMutationError(errorMessage(error)),
  });
  const deleteMutation = useMutation({
    mutationFn: (definition: KpiDefinition) => kpiDefinitionService.softDelete(definition.id),
    onSuccess: (deleted) => { void invalidate(); setDeleting(null); notify(`${deleted.kpiCode} was deleted from the overview.`, "info"); },
    onError: (error) => { setDeleting(null); notify(errorMessage(error), "info"); },
  });
  const data = definitionsQuery.data?.data ?? [];
  const meta = definitionsQuery.data?.meta ?? { page, pageSize, totalItems: 0, totalPages: 0 };
  const totalItems = (activeCountQuery.data?.meta.totalItems ?? 0) + (inactiveCountQuery.data?.meta.totalItems ?? 0);
  const changeSort = (field: KpiDefinitionSortBy) => { setSortOrder((current) => field === sortBy && current === "asc" ? "desc" : "asc"); setSortBy(field); setPage(1); };

  return <main className="kpi-definition-page">
    <header className="kpi-page-header"><div><nav className="kpi-breadcrumb" aria-label="Breadcrumb"><Link to="/app/kpi-management">KPI Management</Link><span>/</span><Link to="/app/kpi-management/definition/overview" aria-current="page">KPI Definition</Link></nav><h1>KPI Definition Overview</h1><p>Create and maintain the reusable identity of each KPI before defining how it will be measured.</p></div></header>
    <section className="kpi-summary-grid" aria-label="KPI Definition summary">
      <button type="button" className={!statuses.length ? "active" : ""} onClick={() => { setStatuses([]); setCategoryIds([]); setPage(1); }}><span className="summary-card-icon total"><Layers3 size={17}/></span><span className="summary-card-copy"><span>Total definitions</span><strong>{totalItems}</strong></span></button>
      <button type="button" className={statuses.length === 1 && statuses[0] === "ACTIVE" ? "active" : ""} onClick={() => { setStatuses(["ACTIVE"]); setCategoryIds([]); setPage(1); }}><span className="summary-card-icon active"><CheckCircle2 size={17}/></span><span className="summary-card-copy"><span>Active</span><strong>{activeCountQuery.data?.meta.totalItems ?? 0}</strong></span></button>
      <button type="button" className={statuses.length === 1 && statuses[0] === "INACTIVE" ? "active" : ""} onClick={() => { setStatuses(["INACTIVE"]); setCategoryIds([]); setPage(1); }}><span className="summary-card-icon inactive"><CirclePause size={17}/></span><span className="summary-card-copy"><span>Inactive</span><strong>{inactiveCountQuery.data?.meta.totalItems ?? 0}</strong></span></button>
    </section>
    <section className="kpi-panel stable-table-panel">
      <div className="kpi-toolbar">
        <label className="search-control"><Search size={18}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name, objective, category or state..." aria-label="Search KPI Definitions"/></label>
        <CheckboxMultiSelect label="All states" selected={statuses} onChange={(values) => { setStatuses(values as KpiDefinitionStatus[]); setPage(1); }} options={[{value:"ACTIVE",label:"Active"},{value:"INACTIVE",label:"Inactive"}]}/>
        <CheckboxMultiSelect label="All categories" selected={categoryIds} onChange={(values) => { setCategoryIds(values); setPage(1); }} options={(categoriesQuery.data ?? []).map((item) => ({value:item.id,label:item.name}))}/>
        <button className="button primary toolbar-new-button" onClick={() => { setMutationError(""); setCreating(true); }} disabled={categoriesQuery.isLoading}><FilePlus2 size={16}/>New KPI Definition</button>
      </div>
      {(definitionsQuery.isError || categoriesQuery.isError) && <p className="table-message" role="alert">{errorMessage(definitionsQuery.error ?? categoriesQuery.error)} <button className="button secondary" onClick={() => { void definitionsQuery.refetch(); void categoriesQuery.refetch(); }}>Retry</button></p>}
      <div className="kpi-table-wrap stable-table-shell"><table className="kpi-table"><colgroup><col className="column-code"/><col className="column-name"/><col className="column-objective"/><col className="column-category"/><col className="column-state"/><col className="column-actions"/></colgroup><thead><tr>
        <SortableTableHeader active={sortBy === "kpiCode"} direction={sortOrder} onSort={() => changeSort("kpiCode")}>KPI Code</SortableTableHeader>
        <SortableTableHeader active={sortBy === "kpiName"} direction={sortOrder} onSort={() => changeSort("kpiName")}>KPI Name</SortableTableHeader>
        <SortableTableHeader active={sortBy === "description"} direction={sortOrder} onSort={() => changeSort("description")}>Objective</SortableTableHeader>
        <SortableTableHeader active={sortBy === "category"} direction={sortOrder} onSort={() => changeSort("category")}>Category</SortableTableHeader>
        <SortableTableHeader active={sortBy === "statusCode"} direction={sortOrder} onSort={() => changeSort("statusCode")}>State</SortableTableHeader><th className="actions-heading">Actions</th>
      </tr></thead><tbody>
        {definitionsQuery.isLoading ? <tr><td colSpan={6} className="table-message">Loading KPI Definitions...</td></tr> : data.length ? data.map((definition) => <tr key={definition.id}>
          <td><span className="code-pill">{definition.kpiCode}</span></td><td className="name-cell">{definition.kpiName}</td><td className="objective-cell">{definition.description}</td><td>{definition.category.name}</td><td><span className={`status-chip ${definition.status.toLowerCase()}`}><i/>{definition.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
          <td><div className="table-actions"><button className="icon-button edit" aria-label={`Edit ${definition.kpiCode}`} title="Edit KPI Definition" onClick={() => { setMutationError(""); setEditing(definition); }}><Pencil size={16}/></button>
          <button className="icon-button delete" aria-label={`Delete ${definition.kpiCode}`} title="Delete" disabled={deleteMutation.isPending} onClick={() => setDeleting(definition)}><Trash2 size={16}/></button>
          <button className="icon-button configure" aria-label={`Configure ${definition.kpiCode}`} title={definition.isActive ? "Ready to configure" : "Activate this KPI before configuring it"} disabled={!definition.isActive} onClick={() => navigate(`/app/kpi-management/config/set?kpiDefinitionId=${definition.id}&code=${definition.kpiCode}&from=definition-overview`)}><Cog size={18}/></button>
          <button className="icon-button view" aria-label={`View details for ${definition.kpiCode}`} title="View KPI Definition details" onClick={() => navigate(`/app/kpi-management/definition/detail/${definition.id}`)}><Eye size={16}/></button></div></td>
        </tr>) : <tr><td colSpan={6} className="table-message">No KPI Definitions match the selected filters.</td></tr>}
      </tbody></table></div>
      <footer className="kpi-table-footer"><span>Showing <strong>{meta.totalItems ? (meta.page-1)*meta.pageSize+1 : 0}-{Math.min(meta.page*meta.pageSize,meta.totalItems)}</strong> of <strong>{meta.totalItems}</strong> definitions {definitionsQuery.isFetching && !definitionsQuery.isLoading ? "· Refreshing..." : ""}</span><RowsPerPageSelect value={pageSize} onChange={(value) => {setPageSize(value);setPage(1);}}/><PaginationControls page={meta.page} totalPages={Math.max(1,meta.totalPages)} onPage={setPage} label="KPI Definitions pagination"/></footer>
    </section>
    {(creating || editing) && <KpiDefinitionModal definition={editing ?? undefined} categories={categoriesQuery.data ?? []} isSaving={saveMutation.isPending} serverError={mutationError} onClose={() => {setCreating(false);setEditing(null);setMutationError("");}} onSubmit={(input, isActive) => saveMutation.mutate({input,definition:editing ?? undefined,isActive})}/>}
    {deleting && <div className="kpi-modal-backdrop" role="presentation"><section className="confirmation-dialog delete-confirmation-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-kpi-title"><button type="button" className="confirmation-dialog-close" aria-label="Close delete confirmation" title="Close" disabled={deleteMutation.isPending} onClick={() => setDeleting(null)}><X size={19}/></button><div className="danger-icon"><Trash2 size={24}/></div><h2 id="delete-kpi-title">Delete KPI Definition?</h2><p><strong>{deleting.kpiCode}</strong> will disappear from KPI Definition Overview but remain stored in the database for audit history.</p><div className="kpi-modal-actions"><button className="button secondary" onClick={() => setDeleting(null)} disabled={deleteMutation.isPending}>Cancel</button><button className="button danger" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(deleting)}>{deleteMutation.isPending ? "Deleting..." : "Delete Definition"}</button></div></section></div>}
    {toast && <div className={`kpi-toast ${toast.tone}`} role="status"><CheckCircle2 size={20}/><span>{toast.message}</span><button aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={16}/></button></div>}
  </main>;
}
