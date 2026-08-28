import ExcelJS from "exceljs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getResultEntry = vi.hoisted(() => vi.fn());
vi.mock("../services/result-entry.service.js", () => ({ resultEntryService: { get: getResultEntry } }));
import { excelImportService } from "../services/excel-import.service.js";

beforeEach(() => {
  getResultEntry.mockResolvedValue({
    monitoringPeriod: { id: "1", poolInputPeriodId: "2", periodKey: "2026-08" },
    summary: { expected: 1 },
    inputs: [{ id: "10", configCode: "KPC-1", kpiCode: "KPI-1", resultValue: null, comment: null, version: null }],
  });
});

async function workbook(rows: Array<[string, string]>) {
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("Result Entry");
  sheet.addRow(["Config Code", "KPI Code", "KPI Name", "Goal", "Unit", "Data Source", "Result", "Comment"]);
  for (const [configCode, result] of rows) sheet.addRow([configCode, "", "", "", "", "", result, ""]);
  const metadata = book.addWorksheet("_metadata");
  metadata.addRows([["templateVersion", "1"], ["monitoringPeriodId", "1"], ["poolInputPeriodId", "2"], ["periodKey", "2026-08"]]);
  return Buffer.from(await book.xlsx.writeBuffer());
}

describe("Excel import technical findings", () => {
  it("rejects unknown and duplicate KPI rows without last-row-wins", async () => {
    const preview = await excelImportService.preview("1", await workbook([["KPC-1", "10"], ["KPC-1", "20"], ["UNKNOWN", "30"]]));
    expect(preview.changes).toEqual([]);
    expect(preview.invalidRows.map((row: { code: string }) => row.code)).toEqual(["EXCEL_DUPLICATE_KPI", "EXCEL_DUPLICATE_KPI", "EXCEL_UNKNOWN_KPI"]);
  });

  it("rejects excessive scale instead of silently truncating it", async () => {
    const preview = await excelImportService.preview("1", await workbook([["KPC-1", "1.1234567"]]));
    expect(preview.changes).toEqual([]);
    expect(preview.invalidRows[0]).toMatchObject({ code: "RESULT_PRECISION_EXCEEDED" });
  });
});
