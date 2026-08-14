import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";
import "./multiselect-selection-overrides.css";

export type AnalysisOption = { value: string; label: string };
export function AnalysisMultiSelect({ placeholder, options, selected, onChange }: { placeholder: string; options: AnalysisOption[]; selected: string[]; onChange: (values: string[]) => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (!rootRef.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside); document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", escape); };
  }, []);
  const chosen = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(rootRef, chosen.map((option) => option.label));
  const visibleOptions = chosen.slice(0, visibleCount);
  const hiddenCount = chosen.length - visibleOptions.length;
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  return <div className="analysis-multiselect" ref={rootRef}><button type="button" className={open ? "open" : ""} onClick={() => setOpen((value) => !value)}>
    {!chosen.length ? <span className="analysis-multi-placeholder">{placeholder}</span> : <span className={`analysis-multi-chips ${hiddenCount > 0 ? "has-more" : ""}`}>{visibleOptions.map((option) => <span className="analysis-multi-chip" key={option.value}><span>{option.label}</span><i onClick={(event) => { event.stopPropagation(); toggle(option.value); }}><X size={12}/></i></span>)}{hiddenCount > 0 && <span className="analysis-multi-chip more"><span>+{hiddenCount} more</span><i onClick={(event) => { event.stopPropagation(); onChange(visibleOptions.map((option) => option.value)); }}><X size={12}/></i></span>}</span>}<ChevronDown size={16}/>
  </button>{open && <div className="analysis-multi-options"><button type="button" className={!selected.length ? "selected" : ""} onClick={() => onChange([])}><i>{!selected.length && <Check size={13}/>}</i>All</button>{options.map((option) => <button type="button" className={selected.includes(option.value) ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><i>{selected.includes(option.value) && <Check size={13}/>}</i>{option.label}</button>)}</div>}</div>;
}
