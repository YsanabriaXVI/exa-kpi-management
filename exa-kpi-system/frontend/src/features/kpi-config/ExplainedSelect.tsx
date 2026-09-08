import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import "./explained-select.css";

export type ExplainedOption = { value: string; label: string; meaning: string; example: string; note?: string };

export function ExplainedSelect({ label, value, onChange, options, placeholder }: {
  label: string; value: string; onChange: (value: string) => void; options: ExplainedOption[]; placeholder: string;
}) {
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const selected = options.find(option => option.value === value);
  const information = options.find(option => option.value === expanded) ?? selected ?? options[0];
  return <div className="explained-select" ref={root} onBlur={event => {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget as Node)) setOpen(false);
  }} onKeyDown={event => {
    if (event.key === "Escape" && open) { event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    <span className="explained-select-label" id={`${id}-label`}>{label}</span>
    <button className="explained-select-trigger" type="button" ref={trigger} aria-expanded={open} aria-controls={`${id}-options`} aria-labelledby={`${id}-label ${id}-value`} onClick={() => setOpen(!open)} onKeyDown={event => {
      if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); }
    }}><span id={`${id}-value`}>{selected?.label ?? placeholder}</span><ChevronDown size={17} aria-hidden="true"/></button>
    {open && <div className="explained-select-options" id={`${id}-options`} role="group" aria-labelledby={`${id}-label`}>
      <p className="explained-select-hint">Selecciona una opción o abre la flecha para conocerla.</p>
      <div className="explained-select-body">
      <div className="explained-select-list">
      {options.map(option => {
        const show = information?.value === option.value;
        const helpId = `${id}-help`;
        return <div className={`explained-select-option${show ? " is-previewed" : ""}`} key={option.value} onMouseEnter={() => setExpanded(option.value)} onFocus={() => setExpanded(option.value)}>
          <div className="explained-select-row">
            <label className="explained-select-choice"><input type="radio" name={id} value={option.value} checked={value === option.value} onChange={() => { onChange(option.value); setOpen(false); trigger.current?.focus(); }}/><span>{option.label}</span></label>
            <button className="explained-select-info" type="button" aria-label={`Ver información: ${option.label}`} aria-expanded={show} aria-controls={helpId} onClick={() => setExpanded(option.value)}><ChevronRight size={18} aria-hidden="true"/></button>
          </div>
        </div>;
      })}
      </div>
      <aside className="explained-select-help" id={`${id}-help`} aria-label="Información de la opción" aria-live="polite" tabIndex={0}>
        {information && <><h3>{information.label}</h3><dl><div><dt>Qué significa</dt><dd>{information.meaning}</dd></div><div><dt>Ejemplo</dt><dd>{information.example}</dd></div></dl>{information.note && <p>{information.note}</p>}</>}
      </aside>
      </div>
    </div>}
  </div>;
}
