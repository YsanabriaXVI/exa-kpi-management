import { ChevronDown } from "lucide-react";

const rowOptions = [5, 10, 25, 50, 100] as const;

export function RowsPerPageSelect({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <label className="rows-per-page-select">
    <span>Rows</span>
    <span className="rows-per-page-control">
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} aria-label="Rows per page">
        {rowOptions.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown size={15} aria-hidden="true" />
    </span>
  </label>;
}
