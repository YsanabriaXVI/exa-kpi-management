import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, X } from "lucide-react";
import { useMultiSelectVisibleCount } from "../../components/useMultiSelectVisibleCount";

type Option = { value: string; label: string };
type Props = { label: string; options: Option[]; selected: string[]; onChange: (value: string[]) => void; blocked?: boolean; onBlockedClick?: () => void };

export function ScorecardMultiSelect({ label, options, selected, onChange, blocked = false, onBlockedClick }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (event: MouseEvent) => { if (!ref.current?.contains(event.target as Node)) setOpen(false); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, []);
  const toggle = (value: string) => onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);
  const selectedOptions = options.filter((option) => selected.includes(option.value));
  const visibleCount = useMultiSelectVisibleCount(ref, selectedOptions.map((option) => option.label));
  const visibleOptions = selectedOptions.slice(0, visibleCount);
  const hiddenCount = selectedOptions.length - visibleOptions.length;
  return <div className="scorecard-multiselect" ref={ref}>
    <button type="button" className={`${open ? "open" : ""} ${blocked ? "blocked" : ""}`} aria-disabled={blocked} onClick={() => { if (blocked) { setOpen(false); onBlockedClick?.(); return; } setOpen((current) => !current); }}>
      <span className={`scorecard-filter-content ${hiddenCount ? "has-more" : ""}`}>{selectedOptions.length ? <>
        {visibleOptions.map((option) => <span className="scorecard-filter-chip" key={option.value}>
          <span>{option.label}</span>
          <span role="button" tabIndex={0} aria-label={`Remove ${option.label}`} onClick={(event) => { event.stopPropagation(); toggle(option.value); }}><X size={11} /></span>
        </span>)}
        {hiddenCount > 0 && <span className="scorecard-filter-chip scorecard-filter-more">
          <span>+{hiddenCount} more</span>
          <span role="button" tabIndex={0} aria-label="Remove additional selections" onClick={(event) => { event.stopPropagation(); onChange(visibleOptions.map((option) => option.value)); }}><X size={11} /></span>
        </span>}
      </> : <span className="scorecard-filter-placeholder">{label}</span>}</span><ChevronDown size={15} />
    </button>
    {open && <div className="scorecard-filter-options">{options.map((option) => <button type="button" className={selected.includes(option.value) ? "selected" : ""} key={option.value} onClick={() => toggle(option.value)}><span className="scorecard-option-check">{selected.includes(option.value) && <Check size={12} />}</span>{option.label}</button>)}</div>}
  </div>;
}
