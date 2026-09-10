export type ExportCell = string | number | null | { percent: number | null; note?: string };
export type TableExport = {
  title: string;
  filename: string;
  context: Array<[string, string]>;
  headers: string[];
  rows: ExportCell[][];
};

export const exportPercent = (value: string | number | null | undefined, note?: string): ExportCell => ({
  percent: value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value),
  note,
});
const display = (cell: ExportCell): string => cell === null ? "—" : typeof cell === "object"
  ? `${cell.percent === null ? "—" : `${cell.percent.toFixed(2)}%`}${cell.note ? "\n" + cell.note : ""}` : String(cell);

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function exportTable(report: TableExport, format: "xlsx" | "pdf") {
  if (!report.rows.length) throw new Error("No rows match the current table filters.");
  const now = new Date();
  const filename = `${report.filename}-${now.toISOString().replace(/[:.]/g, "-")}.${format}`;
  const context: Array<[string, string]> = [
    ["Generated", now.toLocaleString()],
    ...report.context,
    ["Records", `${report.rows.length} (all filtered rows)`],
  ];
  if (format === "xlsx") {
    const { Workbook } = await import("exceljs");
    const workbook = new Workbook();
    workbook.creator = "EXA KPI System";
    workbook.created = now;
    const sheet = workbook.addWorksheet("Results", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.addRow(report.headers);
    for (const row of report.rows) {
      const added = sheet.addRow(row.map(cell => typeof cell === "object" && cell !== null
        ? cell.percent === null ? null : cell.percent / 100 : cell));
      row.forEach((cell, index) => {
        if (cell !== null && typeof cell === "object") {
          added.getCell(index + 1).numFmt = '0.00%';
          if (cell.note) added.getCell(index + 1).note = cell.note;
        }
      });
    }
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF62408A" } };
    sheet.getRow(1).height = 32;
    sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: report.rows.length + 1, column: report.headers.length } };
    sheet.columns.forEach((column, index) => {
      column.width = Math.min(44, Math.max(16, report.headers[index].length + 2,
        ...report.rows.slice(0, 100).map(row => display(row[index] ?? null).length + 2)));
      column.alignment = { vertical: "top", wrapText: true };
    });
    sheet.pageSetup = { orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0, printTitlesRow: "1:1" };
    const info = workbook.addWorksheet("Report Details");
    info.columns = [{ width: 24 }, { width: 90 }];
    info.addRow(["Report", report.title]);
    info.addRows(context);
    info.getColumn(1).font = { bold: true };
    info.getColumn(2).alignment = { wrapText: true, vertical: "top" };
    const buffer = await workbook.xlsx.writeBuffer();
    downloadBlob(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), filename);
    return;
  }
  const [{ jsPDF }, { autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ orientation: "landscape", format: report.headers.length > 12 ? "a3" : "a4" });
  doc.setFontSize(16);
  doc.text(report.title, 12, 15);
  let tableStart = 25;
  autoTable(doc, {
    startY: 21, margin: { left: 12, right: 12, bottom: 14 },
    body: context, theme: "plain", styles: { fontSize: 8, cellPadding: 1.5 },
    columnStyles: { 0: { cellWidth: 30, fontStyle: "bold" } },
    didDrawPage: data => { tableStart = (data.cursor?.y ?? 21) + 5; },
  });
  autoTable(doc, {
    startY: tableStart, margin: { top: 14, left: 12, right: 12, bottom: 16 },
    head: [report.headers], body: report.rows.map(row => row.map(display)),
    theme: "striped", showHead: "everyPage", rowPageBreak: "avoid",
    styles: { fontSize: report.headers.length > 12 ? 7 : 8, cellPadding: 2, overflow: "linebreak" },
    headStyles: { fillColor: [98, 64, 138] },
    alternateRowStyles: { fillColor: [246, 244, 249] },
  });
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`EXA KPI System | ${page} / ${pages}`, 12, doc.internal.pageSize.getHeight() - 7);
  }
  doc.save(filename);
}
