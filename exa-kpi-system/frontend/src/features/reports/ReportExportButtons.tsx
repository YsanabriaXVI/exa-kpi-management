import { useRef, useState } from "react";
import { Download, FileText } from "lucide-react";
import type { TableExport } from "./table-export";

export function ReportExportButtons({ getReport, disabled = false }: {
  getReport: () => TableExport;
  disabled?: boolean;
}) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function download(format: "xlsx" | "pdf") {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      // Capture the currently filtered and sorted rows before loading exporters.
      const report = getReport();
      const { exportTable } = await import("./table-export");
      await exportTable(report, format);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The report could not be exported. Please try again.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return <>
    <button type="button" className="xls" disabled={disabled || busy} onClick={() => void download("xlsx")} title="Export all filtered rows to Excel"><Download size={15}/>Export Excel</button>
    <button type="button" className="pdf" disabled={disabled || busy} onClick={() => void download("pdf")} title="Export all filtered rows to PDF"><FileText size={15}/>Export PDF</button>
    {busy && <span role="status">Preparing export…</span>}
    {error && <span role="alert">{error}</span>}
  </>;
}
