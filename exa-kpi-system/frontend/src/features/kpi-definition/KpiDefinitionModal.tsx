import { FormEvent, useState } from "react";
import { X } from "lucide-react";
import { kpiDefinitionSchema, type KpiDefinitionFormErrors } from "./kpi-definition.schema";
import type {
  KpiDefinition,
  KpiDefinitionInput,
} from "./kpi-definition.types";

const initialCategories = [
  "Financial",
  "Operations",
  "Security",
  "Sustainability",
  "Technology",
  "Customer",
];

type KpiDefinitionModalProps = {
  definition?: KpiDefinition;
  isSaving: boolean;
  onClose: () => void;
  onSubmit: (input: KpiDefinitionInput) => void;
};

const emptyForm: KpiDefinitionInput = {
  name: "",
  objective: "",
  category: "",
  status: "ACTIVE",
};

export function KpiDefinitionModal({
  definition,
  isSaving,
  onClose,
  onSubmit,
}: KpiDefinitionModalProps) {
  const [form, setForm] = useState<KpiDefinitionInput>(definition ?? emptyForm);
  const [errors, setErrors] = useState<KpiDefinitionFormErrors>({});
  const [categories] = useState(initialCategories);

  const updateField = <Key extends keyof KpiDefinitionInput>(
    field: Key,
    value: KpiDefinitionInput[Key],
  ) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const result = kpiDefinitionSchema.safeParse(form);

    if (!result.success) {
      const fieldErrors: KpiDefinitionFormErrors = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0] as keyof KpiDefinitionFormErrors;
        if (!fieldErrors[field]) fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    onSubmit(result.data);
  };

  return (
    <div className="kpi-modal-backdrop" role="presentation">
      <section
        className="kpi-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="kpi-modal-title"
      >
        <div className="kpi-modal-header">
          <div>
            <p className="kpi-modal-eyebrow">KPI Management</p>
            <h2 id="kpi-modal-title">
              {definition ? "Edit KPI Definition" : "Create New KPI Definition"}
            </h2>
            <p>
              Define the reusable identity of the KPI. Measurement rules are added
              later in KPI Config.
            </p>
          </div>
          <button
            type="button"
            className="icon-button neutral"
            aria-label="Close dialog"
            onClick={onClose}
            disabled={isSaving}
          >
            <X size={19} />
          </button>
        </div>

        <form className="kpi-form" onSubmit={handleSubmit}>
          {definition && (
            <label className="form-field compact">
              <span>KPI Code</span>
              <input value={definition.code} readOnly />
            </label>
          )}

          <label className="form-field">
            <span>KPI Name</span>
            <input
              autoFocus
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="e.g. Crecimiento de ventas del Grupo EXA"
              aria-invalid={Boolean(errors.name)}
            />
            {errors.name && <small className="field-error">{errors.name}</small>}
          </label>

          <label className="form-field">
            <span>Objective</span>
            <textarea
              rows={4}
              value={form.objective}
              onChange={(event) => updateField("objective", event.target.value)}
              placeholder="Describe the business purpose of this KPI."
              aria-invalid={Boolean(errors.objective)}
            />
            {errors.objective && (
              <small className="field-error">{errors.objective}</small>
            )}
          </label>

          <div className="form-row">
            <label className="form-field">
              <span>Category</span>
              <select
                value={form.category}
                onChange={(event) => updateField("category", event.target.value)}
                aria-invalid={Boolean(errors.category)}
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
              {errors.category && (
                <small className="field-error">{errors.category}</small>
              )}
            </label>

            <div className="form-field">
              <span>State</span>
              <button
                type="button"
                className={`status-toggle ${form.status === "ACTIVE" ? "active" : ""}`}
                role="switch"
                aria-checked={form.status === "ACTIVE"}
                onClick={() =>
                  updateField(
                    "status",
                    form.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                  )
                }
              >
                <span className="toggle-track">
                  <i />
                </span>
                <strong>{form.status === "ACTIVE" ? "Active" : "Inactive"}</strong>
              </button>
              <small className="field-hint">
                {form.status === "ACTIVE"
                  ? "Available for new KPI configurations."
                  : "Kept for reference but unavailable for configuration."}
              </small>
            </div>
          </div>

          <div className="kpi-modal-actions">
            <button
              type="button"
              className="button secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button type="submit" className="button primary" disabled={isSaving}>
              {isSaving
                ? "Saving..."
                : definition
                  ? "Save Changes"
                  : "Create KPI Definition"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
