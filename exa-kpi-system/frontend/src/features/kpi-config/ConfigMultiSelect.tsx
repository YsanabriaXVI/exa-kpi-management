import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";

type Option = { value: string; label: string; description?: string };
type Props = { label: string; options: Option[]; selected: string[]; onChange: (values: string[]) => void; searchable?: boolean };

export function ConfigMultiSelect({ label, options, selected, onChange, searchable = false }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return !term ? options : options.filter((option) => `${option.label} ${option.description ?? ""}`.toLowerCase().includes(term));
  }, [options, search]);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const remove = (event: React.MouseEvent | React.KeyboardEvent, value: string) => {
    event.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  return (
    <div className="config-multiselect" ref={rootRef}>
      <button type="button" className="config-filter-trigger" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {selectedOptions.length ? <span className={`config-filter-chips ${hiddenCount > 0 ? "has-more" : ""}`}>{visibleOptions.map((option) => (
          <span className="config-filter-chip" key={option.value}>
            <span>{option.label}</span>
            <span
              className="config-chip-remove"
              role="button"
              tabIndex={0}
              aria-label={`Remove ${option.label}`}
              onClick={(event) => remove(event, option.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") remove(event, option.value);
              }}
            >
              <X size={12} />
            </span>
          </span>
        ))}{hiddenCount > 0 && (
          <span className="config-filter-chip config-filter-more">
            <span>+{hiddenCount} more</span>
            <span
              className="config-chip-remove"
              role="button"
              tabIndex={0}
              aria-label={`Remove ${hiddenCount} additional selections`}
              onClick={(event) => {
                event.stopPropagation();
                onChange(visibleOptions.map((option) => option.value));
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.stopPropagation();
                  onChange(visibleOptions.map((option) => option.value));
                }
              }}
            >
              <X size={12} />
            </span>
          </span>
        )}</span> : <span className="config-filter-placeholder">{label}</span>}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="config-filter-menu">
          {searchable && <label className="config-filter-search"><Search size={13} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search KPI..." /></label>}
          <button type="button" className="config-filter-option" onClick={() => onChange([])}><i className={selected.length === 0 ? "checked" : ""}>{selected.length === 0 && <Check size={11} />}</i><span><strong>All</strong></span></button>
          <div className="config-filter-option-list">
            {filtered.map((option) => {
              const checked = selected.includes(option.value);
              return <button type="button" className="config-filter-option" key={option.value} onClick={() => toggle(option.value)}><i className={checked ? "checked" : ""}>{checked && <Check size={11} />}</i><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span></button>;
            })}
            {!filtered.length && <p className="config-filter-empty">No KPI found.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
