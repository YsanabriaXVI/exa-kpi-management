export type DerivedInputPeriod = { start: string; end: string; label: string };

const frequencyMonthsByCode: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  FOUR_MONTHLY: 4,
  FOUR_MONTH: 4,
  SEMIANNUAL: 6,
  SEMI_ANNUAL: 6,
  ANNUAL: 12,
};

export function frequencyMonths(value?: string) {
  if (!value) return 0;
  const normalized = value.trim().toUpperCase().replace(/[ -]+/g, "_");
  return frequencyMonthsByCode[normalized] ?? 0;
}

export function formatScheduleFrequency(value?: string) {
  if (!value) return "Select a frequency";
  const normalized = value.trim().toUpperCase().replace(/[ -]+/g, "_");
  return ({
    MONTHLY: "Monthly",
    QUARTERLY: "Trimestral",
    FOUR_MONTHLY: "Cuatrimestral",
    FOUR_MONTH: "Cuatrimestral",
    SEMIANNUAL: "Semestral",
    SEMI_ANNUAL: "Semestral",
    ANNUAL: "Anual",
  } as Record<string, string>)[normalized] ?? value;
}

export function deriveInputPeriods(validFrom: string, validTo: string, frequency?: string): DerivedInputPeriod[] {
  const monthsPerPeriod = frequencyMonths(frequency);
  const first = parseDate(validFrom);
  const last = parseDate(validTo);
  if (!monthsPerPeriod || !first || !last || first > last) return [];

  const periods: DerivedInputPeriod[] = [];
  for (let start = first; start <= last; start = addUtcMonths(start, monthsPerPeriod)) {
    const calculatedEnd = previousUtcDay(addUtcMonths(start, monthsPerPeriod));
    const end = calculatedEnd > last ? last : calculatedEnd;
    periods.push({ start: toDateValue(start), end: toDateValue(end), label: formatInputPeriod(start, end) });
  }
  return periods;
}

export function formatScheduleValidity(validFrom: string, validTo: string) {
  const start = parseDate(validFrom);
  const end = parseDate(validTo);
  if (!start || !end) return "Select a validity period";
  return `${formatMonth(start)} – ${formatMonth(end)}`;
}

function formatInputPeriod(start: Date, end: Date) {
  return start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth()
    ? formatMonth(start)
    : `${formatMonth(start)} – ${formatMonth(end)}`;
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric", timeZone: "UTC" }).format(value);
}

function parseDate(value: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addUtcMonths(value: Date, months: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));
}

function previousUtcDay(value: Date) {
  return new Date(value.getTime() - 86_400_000);
}

function toDateValue(value: Date) {
  return value.toISOString().slice(0, 10);
}
