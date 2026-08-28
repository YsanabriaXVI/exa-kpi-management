import ExcelJS from "exceljs";
import { resultEntryService } from "./result-entry.service.js";
import { AppError } from "../utils/app-error.js";

const TEMPLATE_VERSION = "1";
const text = (value: ExcelJS.CellValue) => value === null || value === undefined ? "" : typeof value === "object" && "text" in value ? String(value.text) : String(value).trim();

export const excelImportService = {
  async template(periodId: string) {
    const entry = await resultEntryService.get(periodId);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Result Entry", { views: [{ state: "frozen", ySplit: 1 }] });
    sheet.columns = [
      { header: "Config Code", key: "configCode", width: 20 }, { header: "KPI Code", key: "kpiCode", width: 18 },
      { header: "KPI Name", key: "kpiName", width: 38 }, { header: "Goal", key: "goal", width: 18 },
      { header: "Unit", key: "unit", width: 16 }, { header: "Data Source", key: "dataSource", width: 28 },
      { header: "Result", key: "result", width: 18 }, { header: "Comment", key: "comment", width: 38 },
    ];
    for (const input of entry.inputs) sheet.addRow({ configCode: input.configCode, kpiCode: input.kpiCode, kpiName: input.kpiName, goal: input.goal, unit: input.unit, dataSource: input.dataSource, result: input.resultValue, comment: input.comment });
    sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } }; sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF247C9E" } };
    for (let row = 2; row <= sheet.rowCount; row++) for (let column = 1; column <= 6; column++) sheet.getCell(row, column).protection = { locked: true };
    sheet.protect("exa-monitoring", { selectLockedCells: true, selectUnlockedCells: true });
    const metadata = workbook.addWorksheet("_metadata", { state: "veryHidden" });
    [["templateVersion", TEMPLATE_VERSION], ["monitoringPeriodId", entry.monitoringPeriod.id], ["poolInputPeriodId", entry.monitoringPeriod.poolInputPeriodId], ["periodKey", entry.monitoringPeriod.periodKey], ["generatedAt", new Date().toISOString()]].forEach((row) => metadata.addRow(row));
    return { buffer: Buffer.from(await workbook.xlsx.writeBuffer()), filename: `${entry.monitoringPeriod.poolCode}_${entry.monitoringPeriod.periodKey}.xlsx` };
  },
  async preview(periodId: string, file: Buffer) {
    const entry = await resultEntryService.get(periodId); const workbook = new ExcelJS.Workbook();
    try { await workbook.xlsx.load(file as unknown as ExcelJS.Buffer); } catch { throw new AppError(422, "INVALID_EXCEL_FILE", "The uploaded file is not a valid .xlsx workbook"); }
    const sheet = workbook.getWorksheet("Result Entry"), metadata = workbook.getWorksheet("_metadata");
    if (!sheet || !metadata) throw new AppError(422, "INVALID_MONITORING_TEMPLATE", "The workbook is not a Monitoring Result Entry template");
    const meta = new Map<string, string>(); metadata.eachRow((row) => meta.set(text(row.getCell(1).value), text(row.getCell(2).value)));
    if (meta.get("templateVersion") !== TEMPLATE_VERSION || meta.get("monitoringPeriodId") !== periodId || meta.get("poolInputPeriodId") !== entry.monitoringPeriod.poolInputPeriodId || meta.get("periodKey") !== entry.monitoringPeriod.periodKey) throw new AppError(422, "TEMPLATE_CONTEXT_MISMATCH", "The workbook belongs to another Monitoring Period or template version");
    const inputs = entry.inputs as Array<{id:string;configCode:string;kpiCode:string;resultValue:string|null;comment:string|null;version:number|null}>;
    const byConfig = new Map(inputs.map((input) => [input.configCode, input])); const rows: any[] = []; const invalidRows: any[] = [];
    const occurrences = new Map<string, number>();
    for (let number = 2; number <= sheet.rowCount; number++) {
      const configCode = text(sheet.getRow(number).getCell(1).value);
      if (configCode) occurrences.set(configCode, (occurrences.get(configCode) ?? 0) + 1);
    }
    for (let number = 2; number <= sheet.rowCount; number++) {
      const row = sheet.getRow(number), configCode = text(row.getCell(1).value), resultValue = text(row.getCell(7).value), comment = text(row.getCell(8).value) || null, input = byConfig.get(configCode);
      if ((occurrences.get(configCode) ?? 0) > 1) { invalidRows.push({ row: number, configCode, code: "EXCEL_DUPLICATE_KPI", error: "Config Code appears more than once in the workbook" }); continue; }
      if (!input) { invalidRows.push({ row: number, configCode, code: "EXCEL_UNKNOWN_KPI", error: "Unknown Config Code" }); continue; }
      if (resultValue && !/^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/.test(resultValue.replace(/,/g, ""))) { invalidRows.push({ row: number, configCode, code: "RESULT_NOT_NUMERIC", error: "Result must be numeric" }); continue; }
      const normalized = resultValue ? resultValue.replace(/,/g, "") : null;
      if (normalized) {
        const unsigned = normalized.replace(/^[+-]/, ""), [integer = "", fraction = ""] = unsigned.split(".");
        if (integer.replace(/^0+(?=\d)/, "").length > 14 || fraction.length > 6) { invalidRows.push({ row: number, configCode, code: "RESULT_PRECISION_EXCEEDED", error: "Result exceeds DECIMAL(20,6) precision" }); continue; }
      }
      const classification = !normalized ? "BLANK_PENDING" : input.resultValue === normalized && (input.comment ?? null) === comment ? "SAME_VALUE" : input.resultValue === null ? "NEW_VALUE" : "DIFFERENT_VALUE";
      rows.push({ row: number, configCode, kpiCode: input.kpiCode, resultValue: normalized, comment, classification, monitoringPeriodInputId: input.id, version: input.version });
    }
    const count = (classification: string) => rows.filter((row) => row.classification === classification).length;
    return { metadata: Object.fromEntries(meta), summary: { expected: entry.summary.expected, newValues: count("NEW_VALUE"), blankPending: count("BLANK_PENDING"), existingSame: count("SAME_VALUE"), existingDifferent: count("DIFFERENT_VALUE"), invalidRows: invalidRows.length }, rows, invalidRows, changes: rows.filter((row) => row.classification === "NEW_VALUE" || row.classification === "DIFFERENT_VALUE").map(({ monitoringPeriodInputId, resultValue, comment, version }) => ({ monitoringPeriodInputId, resultValue, comment, version })) };
  },
  confirm(periodId: string, changes: any[], actor: bigint) { return resultEntryService.save(periodId, { changes }, actor, "EXCEL"); },
};
