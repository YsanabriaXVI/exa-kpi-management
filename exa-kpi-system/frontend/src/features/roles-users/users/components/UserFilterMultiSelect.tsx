import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../../../components/useMultiSelectVisibleCount";

type Option = { value: string; label: string };

export function UserFilterMultiSelect({ label, options, selected, onChange }: { label: string; options: Option[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;

  useEffect(() => {
    const closeOutside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const closeWithEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeWithEscape);
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("keydown", closeWithEscape); };
  }, []);

  const toggle = (option: string) => onChange(selected.includes(option) ? selected.filter((item) => item !== option) : [...selected, option]);
  const remove = (event: React.MouseEvent | React.KeyboardEvent, option: string) => { event.stopPropagation(); onChange(selected.filter((item) => item !== option)); };

  return <div className="ru-filter-multiselect" ref={rootRef}>
    <button type="button" className={open ? "open" : ""} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {selectedOptions.length ? <span className={`ru-filter-chips ${hiddenCount ? "has-more" : ""}`}>{visibleOptions.map((option) => <span className="ru-filter-chip" key={option.value}><span>{option.label}</span><span className="ru-filter-chip-remove" role="button" tabIndex={0} aria-label={`Remove ${option.label}`} onClick={(event) => remove(event, option.value)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") remove(event, option.value); }}><X size={12} /></span></span>)}{hiddenCount > 0 && <span className="ru-filter-chip more"><span>+{hiddenCount} more</span><span className="ru-filter-chip-remove" role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => { event.stopPropagation(); onChange(visibleOptions.map((option) => option.value)); }}><X size={12} /></span></span>}</span> : <span className="ru-filter-placeholder">{label}</span>}
      <ChevronDown className="ru-filter-chevron" size={15} aria-hidden="true" />
    </button>
    {open && <div className="ru-filter-options"><button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}><i>{!selected.length && <Check size={12} />}</i><span>{label}</span></button>{options.map((option) => { const checked = selected.includes(option.value); return <button type="button" className={checked ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><i>{checked && <Check size={12} />}</i><span>{option.label}</span></button>; })}</div>}
  </div>;
}
