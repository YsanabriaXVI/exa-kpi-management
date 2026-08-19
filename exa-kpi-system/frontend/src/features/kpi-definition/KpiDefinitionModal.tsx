import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { kpiDefinitionSchema, type KpiDefinitionFormErrors } from "./kpi-definition.schema";
import type { CreateKpiDefinitionInput, KpiCategory, KpiDefinition } from "./kpi-definition.types";

type Props = {
  definition?: KpiDefinition;
  categories: KpiCategory[];
  isSaving: boolean;
  serverError?: string;
  onClose: () => void;
  onSubmit: (input: CreateKpiDefinitionInput, isActive: boolean) => void;
};

const emptyForm: CreateKpiDefinitionInput = { kpiName: "", description: "", kpiCategoryId: "" };

export function KpiDefinitionModal({ definition, categories, isSaving, serverError, onClose, onSubmit }: Props) {
  const [form, setForm] = useState<CreateKpiDefinitionInput>(definition ? {
    kpiName: definition.kpiName,
    description: definition.description, kpiCategoryId: definition.category.id,
  } : emptyForm);
  const [errors, setErrors] = useState<KpiDefinitionFormErrors>({});
  const [isActive, setIsActive] = useState(definition?.isActive ?? true);
  const updateField = <K extends keyof CreateKpiDefinitionInput>(field: K, value: CreateKpiDefinitionInput[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const parsed = kpiDefinitionSchema.safeParse(form);
    if (!parsed.success) {
      const next: KpiDefinitionFormErrors = {};
      parsed.error.issues.forEach((issue) => { const field = issue.path[0] as keyof KpiDefinitionFormErrors; next[field] ??= issue.message; });
      setErrors(next);
      return;
    }
    onSubmit(parsed.data, isActive);
  };

  return <div className="kpi-modal-backdrop" role="presentation">
    <section className="kpi-modal" role="dialog" aria-modal="true" aria-labelledby="kpi-modal-title">
      <div className="kpi-modal-header"><div><p className="kpi-modal-eyebrow">KPI Management</p><h2 id="kpi-modal-title">{definition ? "Edit KPI Definition" : "Create New KPI Definition"}</h2><p>Define the reusable identity of the KPI. Measurement rules are added later in KPI Config.</p></div><button type="button" className="icon-button neutral" aria-label="Close dialog" onClick={onClose} disabled={isSaving}><X size={19} /></button></div>
      <form className="kpi-form" onSubmit={submit}>
        <label className="form-field compact"><span>KPI Code</span><input value={definition?.kpiCode ?? "Generated automatically"} readOnly aria-readonly="true" /></label>
        <label className="form-field"><span>KPI Name</span><input autoFocus value={form.kpiName} onChange={(e) => updateField("kpiName", e.target.value)} placeholder="e.g. Crecimiento de ventas del Grupo EXA" aria-invalid={Boolean(errors.kpiName)} />{errors.kpiName && <small className="field-error">{errors.kpiName}</small>}</label>
        <label className="form-field"><span>Objective</span><textarea rows={4} value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Describe the business purpose of this KPI." aria-invalid={Boolean(errors.description)} />{errors.description && <small className="field-error">{errors.description}</small>}</label>
        <div className="form-row category-status-row">
          <label className="form-field"><span>Category</span><select value={form.kpiCategoryId} onChange={(e) => updateField("kpiCategoryId", e.target.value)} aria-invalid={Boolean(errors.kpiCategoryId)}><option value="">Select a category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select>{errors.kpiCategoryId && <small className="field-error">{errors.kpiCategoryId}</small>}</label>
          <label className="form-field"><span>State</span><button type="button" className={`status-toggle ${isActive ? "active" : ""}`} role="switch" aria-checked={isActive} onClick={() => setIsActive((current) => !current)}><span className="toggle-track" aria-hidden="true"><i /></span><strong>{isActive ? "Active" : "Inactive"}</strong></button><small className="field-hint">Controls whether this KPI can be used in new configurations.</small></label>
        </div>
        {serverError && <p className="field-error" role="alert">{serverError}</p>}
        <div className="kpi-modal-actions"><button type="button" className="button secondary" onClick={onClose} disabled={isSaving}>Cancel</button><button type="submit" className="button primary" disabled={isSaving}>{isSaving ? "Saving..." : definition ? "Save Changes" : "Create KPI Definition"}</button></div>
      </form>
    </section>
  </div>;
}
