import { AppError } from "../utils/app-error.js";

export type InputPeriod = { start: Date; end: Date };

export function parseDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function formatDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

export function addUtcMonths(value: Date, months: number): Date {
  return utcDate(value.getUTCFullYear(), value.getUTCMonth() + months, 1);
}

export function previousDay(value: Date): Date {
  return new Date(value.getTime() - 86_400_000);
}

export function periodContaining(value: Date, monthsPerPeriod: number): InputPeriod {
  if (![1, 3, 4, 6, 12].includes(monthsPerPeriod)) {
    throw new AppError(422, "INPUT_FREQUENCY_PERIOD_UNSUPPORTED", "Input Frequency must define 1, 3, 4, 6 or 12 months per period");
  }
  const startMonth = Math.floor(value.getUTCMonth() / monthsPerPeriod) * monthsPerPeriod;
  const start = utcDate(value.getUTCFullYear(), startMonth, 1);
  return { start, end: previousDay(addUtcMonths(start, monthsPerPeriod)) };
}

export function poolPeriods(validFrom: Date, validTo: Date, monthsPerPeriod: number): InputPeriod[] {
  if (!Number.isFinite(validFrom.getTime()) || !Number.isFinite(validTo.getTime()) || validFrom > validTo) {
    throw new AppError(422, "POOL_VALIDITY_INVALID", "Pool validity must contain valid dates with start on or before end");
  }
  const first = periodContaining(validFrom, monthsPerPeriod);
  const last = periodContaining(validTo, monthsPerPeriod);
  if (first.start.getTime() !== validFrom.getTime() || last.end.getTime() !== validTo.getTime()) {
    throw new AppError(422, "POOL_VALIDITY_NOT_PERIOD_ALIGNED", "Pool validity must contain complete Input Periods");
  }
  const months = (validTo.getUTCFullYear() - validFrom.getUTCFullYear()) * 12 + validTo.getUTCMonth() - validFrom.getUTCMonth() + 1;
  if (months > 12) throw new AppError(422, "POOL_VALIDITY_TOO_LONG", "Pool validity cannot exceed 12 months");
  const periods: InputPeriod[] = [];
  for (let start = validFrom; start <= validTo; start = addUtcMonths(start, monthsPerPeriod)) {
    periods.push({ start, end: previousDay(addUtcMonths(start, monthsPerPeriod)) });
  }
  return periods;
}

export function resolvePoolPeriod(validFrom: Date, validTo: Date, monthsPerPeriod: number, requestedStart: string): InputPeriod {
  const requested = parseDateOnly(requestedStart);
  const period = poolPeriods(validFrom, validTo, monthsPerPeriod).find((candidate) => candidate.start.getTime() === requested.getTime());
  if (!period) throw new AppError(422, "POOL_OUTSIDE_VALIDITY", "Target period is outside Pool validity or is not a period boundary");
  return period;
}

// Read-only default. Mutation eligibility is resolved from finalized compositions
// by targetPeriod in the membership service, never from the system clock.
export function defaultTargetPeriod(validFrom: Date, validTo: Date, monthsPerPeriod: number, status: string): InputPeriod {
  const periods = poolPeriods(validFrom, validTo, monthsPerPeriod);
  const first = periods[0];
  if (!first) throw new AppError(422, "POOL_OUTSIDE_VALIDITY", "Pool has no valid Input Periods");
  if (status === "INACTIVE") throw new AppError(409, "POOL_INACTIVE", "Inactive Pools cannot schedule KPI membership changes");
  return first;
}
