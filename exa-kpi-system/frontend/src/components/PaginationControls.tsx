import { ChevronLeft, ChevronRight } from "lucide-react";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

function visiblePages(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  if (page <= 4) return [1, 2, 3, 4, 5, "ellipsis-end", totalPages];
  if (page >= totalPages - 3) return [1, "ellipsis-start", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", totalPages];
}

export function PaginationControls({ page, totalPages, onPage, label = "Pagination", className = "pagination" }: {
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
  label?: string;
  className?: string;
}) {
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  return <div className={`${className} pagination-controls`} aria-label={label}>
    <button type="button" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)} aria-label="Previous page"><ChevronLeft size={16} /></button>
    {visiblePages(currentPage, totalPages).map((item) => typeof item === "number"
      ? <button type="button" key={item} className={item === currentPage ? "current active" : ""} aria-current={item === currentPage ? "page" : undefined} onClick={() => onPage(item)}>{item}</button>
      : <span className="pagination-ellipsis" key={item} aria-hidden="true">…</span>)}
    <button type="button" disabled={currentPage === totalPages} onClick={() => onPage(currentPage + 1)} aria-label="Next page"><ChevronRight size={16} /></button>
  </div>;
}
