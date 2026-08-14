import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";

type Option = { value: string; label: string };

export function PoolOverviewMultiSelect({ label, options, selected, onChange }: {
  label: string;
  options: Option[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  const remove = (event: React.MouseEvent | React.KeyboardEvent, values: string[]) => {
    event.stopPropagation();
    onChange(values);
  };

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

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  };

  return (
    <div className="pool-overview-multiselect" ref={rootRef}>
      <button type="button" className={open ? "open" : ""} aria-expanded={open} onClick={() => setOpen((current) => !current)}>
        {!selectedOptions.length ? <span className="pool-filter-placeholder">{label}</span> : (
          <span className={`pool-filter-chips ${hiddenCount > 0 ? "has-more" : ""}`}>
            {visibleOptions.map((option) => <span className="pool-filter-chip" key={option.value}>
              <span>{option.label}</span>
              <span className="pool-filter-chip-remove" role="button" tabIndex={0} aria-label={`Remove ${option.label}`} onClick={(event) => remove(event, selected.filter((item) => item !== option.value))} onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") remove(event, selected.filter((item) => item !== option.value));
              }}><X size={12} /></span>
            </span>)}
            {hiddenCount > 0 && (
              <span className="pool-filter-chip pool-filter-more">
                <span>+{hiddenCount} more</span>
                <span className="pool-filter-chip-remove" role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => remove(event, visibleOptions.map((option) => option.value))} onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") remove(event, visibleOptions.map((option) => option.value));
                }}><X size={12} /></span>
              </span>
            )}
          </span>
        )}
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="pool-filter-options" role="listbox" aria-multiselectable="true">
          <button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}><i>{!selected.length && <Check size={12} />}</i>All</button>
          {options.map((option) => {
            const checked = selected.includes(option.value);
            return <button type="button" className={checked ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><i>{checked && <Check size={12} />}</i>{option.label}</button>;
          })}
        </div>
      )}
    </div>
  );
}
