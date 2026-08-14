import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Search, ShieldAlert, X } from "lucide-react";
import "./detail-record-selector.css";
import "./detail-record-selector-locked.css";

export type DetailRecordOption = { id: string; code: string; name: string; meta?: string };

export function DetailRecordSelector({ label, placeholder, emptyLabel, options, selectedId, onSelect, disabled = false, disabledMessage, allowEmpty = true, suggestOnlyAfterTyping = false, clearSelectionOnEmpty = false }: {
  label: string;
  placeholder: string;
  emptyLabel: string;
  options: DetailRecordOption[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  disabled?: boolean;
  disabledMessage?: string;
  allowEmpty?: boolean;
  suggestOnlyAfterTyping?: boolean;
  clearSelectionOnEmpty?: boolean;
}) {
  const selected = options.find((option) => option.id === selectedId);
  const selectedLabel = selected ? `${selected.code} · ${selected.name}` : "";
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const normalizeSearchText = (value: string) => value.toLowerCase().replace(/·/g, " ").replace(/\s+/g, " ").trim();
  const isExactSelectedLabel = Boolean(selectedLabel) && normalizeSearchText(search) === normalizeSearchText(selectedLabel);
  useEffect(() => {
    if (selected) {
      setSearch(selectedLabel);
      setOpen(false);
      rootRef.current?.querySelector("input")?.blur();
    }
  }, [selected?.id]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const filtered = useMemo(() => {
    const normalize = (value: string) => value.toLowerCase().replace(/·/g, " ").replace(/\s+/g, " ").trim();
    const normalizedSearch = normalize(search);
    const term = selectedLabel && normalizedSearch === normalize(selectedLabel) ? "" : normalizedSearch;
    if (suggestOnlyAfterTyping && !term) return [];
    return options.filter((option) => normalize(`${option.code} ${option.name} ${option.meta ?? ""}`).includes(term));
  }, [options, search, selectedLabel, suggestOnlyAfterTyping]);
  return <section className={`detail-record-selector ${disabled ? "disabled" : ""}`}>
    <label>{label}</label>
    <div className="detail-record-search" ref={rootRef}>
      <Search size={18} />
      <input value={search} disabled={disabled} autoFocus={false} onFocus={() => setOpen(true)} onChange={(event) => { const value = event.target.value; setSearch(value); setOpen(true); const normalizedValue = normalizeSearchText(value); const selectedCode = normalizeSearchText(selected?.code ?? ""); const keepsSelectedCode = Boolean(selectedCode) && (normalizedValue === selectedCode || normalizedValue.startsWith(`${selectedCode} `)); if (clearSelectionOnEmpty && selectedId && !keepsSelectedCode) onSelect(null); }} placeholder={placeholder} />
      {disabled && <span className="detail-record-locked-badge" role="img" aria-label="Selección bloqueada" title="Este KPI Pool no se puede modificar desde aquí"><ShieldAlert size={16} /></span>}
      {!disabled && <button type="button" aria-label="Clear search" title="Borrar búsqueda" onClick={() => { setSearch(""); setOpen(false); if (clearSelectionOnEmpty) onSelect(null); }}><X size={17} /></button>}
      {!disabled && open && !isExactSelectedLabel && <div className="detail-record-options">
        {allowEmpty && <button type="button" className="detail-record-empty-option" onClick={() => { onSelect(null); setSearch(""); setOpen(false); }}><span><strong>{emptyLabel}</strong><small>Clear the current selection</small></span>{selectedId === null && <Check size={17} />}</button>}
        {filtered.length ? filtered.map((option) => <button type="button" className={option.id === selectedId ? "selected" : ""} key={option.id} onClick={() => { onSelect(option.id); setSearch(`${option.code} · ${option.name}`); setOpen(false); }}><span className="code-pill">{option.code}</span><span><strong>{option.name}</strong><small>{option.meta}</small></span>{option.id === selectedId && <Check size={17} />}</button>) : <p>No results found.</p>}
      </div>}
    </div>
    {disabled && disabledMessage && <p className="detail-record-disabled-message">{disabledMessage}</p>}
  </section>;
}
