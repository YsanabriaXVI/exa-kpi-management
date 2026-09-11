type CalendarPeriod = { start: string; end: string };

function roman(value: number): string {
  let result = "";
  for (const [number, symbol] of [[1000,"M"],[900,"CM"],[500,"D"],[400,"CD"],[100,"C"],[90,"XC"],[50,"L"],[40,"XL"],[10,"X"],[9,"IX"],[5,"V"],[4,"IV"],[1,"I"]] as const) {
    while (value >= number) { result += symbol; value -= number; }
  }
  return result;
}

// Use the complete Pool calendar so ordinals continue across year boundaries.
export function periodDisplay(period: CalendarPeriod, calendar: CalendarPeriod[], monthsPerPeriod?: number) {
  const ordered = [...calendar].sort((a,b) => a.start.localeCompare(b.start));
  const start = new Date(period.start.slice(0,10) + "T00:00:00Z");
  const end = new Date(period.end.slice(0,10) + "T00:00:00Z");
  const first = ordered[0] ?? period;
  const firstStart = new Date(first.start.slice(0, 10) + "T00:00:00Z");
  const firstEnd = new Date(first.end.slice(0, 10) + "T00:00:00Z");
  const months = monthsPerPeriod ?? (firstEnd.getUTCFullYear()-firstStart.getUTCFullYear())*12 + firstEnd.getUTCMonth()-firstStart.getUTCMonth()+1;
  const format = (date: Date, month: "long" | "short", year = true) => new Intl.DateTimeFormat("en-US", {month, ...(year ? {year:"numeric" as const} : {}), timeZone:"UTC"}).format(date);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return {name:period.start,range:"",label:period.start};
  const range = start.getUTCFullYear() === end.getUTCFullYear() && start.getUTCMonth() === end.getUTCMonth() ? format(start, "short") : `${format(start,"short",start.getUTCFullYear()!==end.getUTCFullYear())} – ${format(end,"short")}`;
  const index = ordered.findIndex(p => p.start.slice(0,10) === period.start.slice(0,10));
  const kind = months === 3 ? "Trimestre" : months === 4 ? "Cuatrimestre" : months === 6 ? "Semestre" : null;
  const name = months === 1 ? format(start,"long") : months === 12 ? "Periodo Anual" : kind && index >= 0 ? `${roman(index+1)} ${kind}` : "Período";
  return {name, range: months === 1 ? "" : range, label: months === 1 ? name : `${name} · ${range}`};
}
