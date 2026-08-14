import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { ReactNode } from "react";
import "./sortable-table-header.css";

export type SortDirection = "asc" | "desc";

type SortableTableHeaderProps = {
  children: ReactNode;
  active: boolean;
  direction: SortDirection;
  onSort: () => void;
};

export function SortableTableHeader({
  children,
  active,
  direction,
  onSort,
}: SortableTableHeaderProps) {
  const Icon = active
    ? direction === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th aria-sort={active ? (direction === "asc" ? "ascending" : "descending") : "none"}>
      <button type="button" className="sortable-table-header" onClick={onSort}>
        <Icon size={13} aria-hidden="true" />
        <span>{children}</span>
      </button>
    </th>
  );
}

export function compareSortValues(
  left: string | number,
  right: string | number,
  direction: SortDirection,
) {
  const comparison =
    typeof left === "number" && typeof right === "number"
      ? left - right
      : String(left).localeCompare(String(right), undefined, {
          numeric: true,
          sensitivity: "base",
        });

  return direction === "asc" ? comparison : -comparison;
}
