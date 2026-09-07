import { historicalContractError } from "../contracts/historical-contract.js";

export type RequiredPeriod = { key: string; start: string; end: string; monthsPerPeriod: number; frequencyCode: string };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const monthDate = (year: number, month: number) => new Date(Date.UTC(year, month, 1));

// Uses the authoritative materialized Input Period boundaries and frozen cadence.
// This is the same calendar partition as Pool: 1, 3, 4, 6 or 12 months, year-aligned.
// It also resolves periods predating EXA/Pool validity for the manual fallback.
export function requiredHistoricalPeriod(period: any, frozen: any): RequiredPeriod | null {
  if (historicalContractError(frozen)) return null;
  const months = frozen.inputFrequency?.monthsPerPeriod;
  if (![1,3,4,6,12].includes(months)) return null;
  const current = new Date(period.periodStart);
  if (!Number.isFinite(current.getTime()) || current.getUTCDate() !== 1 || current.getUTCMonth() % months !== 0
    || frozen.inputFrequency.code !== period.inputFrequencyCodeSnapshot) return null;
  const currentEnd = new Date(monthDate(current.getUTCFullYear(), current.getUTCMonth() + months).getTime() - 86400000);
  if (iso(currentEnd) !== iso(new Date(period.periodEnd))) return null;
  const offset = frozen.periodScope === "PREVIOUS_PERIOD" ? months : frozen.periodScope === "SAME_PERIOD_PREVIOUS_YEAR" ? 12 : 0;
  if (!offset) return null;
  const start = monthDate(current.getUTCFullYear(), current.getUTCMonth() - offset);
  const end = new Date(monthDate(start.getUTCFullYear(), start.getUTCMonth() + months).getTime() - 86400000);
  return { key: iso(start).slice(0,7), start: iso(start), end: iso(end), monthsPerPeriod: months, frequencyCode: frozen.inputFrequency.code };
}
