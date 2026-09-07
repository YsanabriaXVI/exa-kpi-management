import type { HistoricalContext } from "./HistoricalBaseline";
import type { CheckReport } from "./CheckResultsReview";
import { monitoringRequest, type ResultEntryInput, type ResultEntryResponse } from "./monitoring-results.service";
export type ManualEntryResponse = Omit<ResultEntryResponse, "inputs" | "monitoringPeriod" | "summary"> & {
  check?: CheckReport;
  monitoringPeriod: ResultEntryResponse["monitoringPeriod"] & { baselineVersion?: number; resultsVersion: number; selectedEntryMethod: string | null };
  inputs: Array<ResultEntryInput & { historical?: HistoricalContext; periodScope?: string | null; comparisonDirection?: string | null; parentKpiCode: string; weight: string | null; goalUnit: string | null; groupGoal: { value: string; unit: string; label: string } | null; entryBlock: string | null }>;
  summary: { expected: number; entered: number; pending: number; completionPercent: number };
};
async function request(id: string, body?: unknown): Promise<ManualEntryResponse> {
  return monitoringRequest<ManualEntryResponse>(`/v1/monitoring-periods/${id}/result-entry${body ? "/save-changes" : ""}`, body ? {method:"POST",body:JSON.stringify(body)} : undefined);
}
export const manualResultEntryService = {
  workflow: (id: string, action: "submit" | "approve" | "return-for-correction" | "close", version: number, details: { reason?: string; withExceptions?: boolean; justification?: string | null } = {}) => monitoringRequest<ManualEntryResponse>(`/v1/monitoring-periods/${id}/${action}`, { method: "POST", body: JSON.stringify({ version, ...details }) }),
  check: (id:string, expectedResultsVersion:number,expectedBaselineVersion?:number) => monitoringRequest<ManualEntryResponse>(`/v1/monitoring-periods/${id}/check-results`,{method:"POST",body:JSON.stringify({expectedResultsVersion,expectedBaselineVersion})}),
  get: (id:string) => request(id),
  save: (id:string, resultsVersion:number, changes:Array<{monitoringPeriodInputId:string;resultValue:string|null;version:number|null}>) => request(id,{resultsVersion,changes}),
};
