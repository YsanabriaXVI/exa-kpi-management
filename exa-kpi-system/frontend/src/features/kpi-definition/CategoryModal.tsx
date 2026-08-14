import { FormEvent, useState } from "react";
import { Tags, X } from "lucide-react";
import type { KpiDefinitionStatus } from "./kpi-definition.types";

type CategoryModalProps = {
  existingCategories: string[];
  onClose: () => void;
  onCreated: (category: {
    name: string;
    remarks: string;
    status: KpiDefinitionStatus;
  }) => void;
};

export function CategoryModal({
  existingCategories,
  onClose,
  onCreated,
}: CategoryModalProps) {
  const [name, setName] = useState("");
  const [remarks, setRemarks] = useState("");
  const [status, setStatus] = useState<KpiDefinitionStatus>("ACTIVE");
  const [error, setError] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const normalizedName = name.trim();

    if (normalizedName.length < 2) {
      setError("Enter a descriptive category name.");
      return;
    }
    if (
      existingCategories.some(
        (category) => category.toLowerCase() === normalizedName.toLowerCase(),
      )
    ) {
      setError("A category with this name already exists.");
      return;
    }

    onCreated({ name: normalizedName, remarks: remarks.trim(), status });
  };

  return (
    <div className="nested-modal-backdrop" role="presentation">
      <section
        className="category-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
      >
        <div className="catalog-modal-heading">
          <span className="catalog-icon">
            <Tags size={19} />
          </span>
          <div>
            <h3 id="category-modal-title">Create New Category</h3>
            <p>Add a reusable category for KPI Definitions.</p>
          </div>
          <button
            type="button"
            className="icon-button neutral"
            aria-label="Close category dialog"
            onClick={onClose}
          >
            <X size={17} />
          </button>
        </div>

        <form onSubmit={submit}>
          <label className="form-field">
            <span>Name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
              placeholder="e.g. Human Resources"
            />
          </label>

          <label className="form-field">
            <span>Remarks</span>
            <textarea
              rows={3}
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              placeholder="Optional notes about when this category should be used."
            />
          </label>

          <div className="form-field">
            <span>State</span>
            <button
              type="button"
              className={`status-toggle ${status === "ACTIVE" ? "active" : ""}`}
              role="switch"
              aria-checked={status === "ACTIVE"}
              onClick={() =>
                setStatus((current) =>
                  current === "ACTIVE" ? "INACTIVE" : "ACTIVE",
                )
              }
            >
              <span className="toggle-track">
                <i />
              </span>
              <strong>{status === "ACTIVE" ? "Active" : "Inactive"}</strong>
            </button>
          </div>

          {error && <small className="field-error">{error}</small>}
          <div className="kpi-modal-actions">
            <button type="button" className="button secondary" onClick={onClose}>
              Close
            </button>
            <button type="submit" className="button primary">
              Create Category
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
