import { useQueries, useQuery } from "@tanstack/react-query";
import { kpiPoolService } from "../kpi-pool/kpi-pool.service";
import { periodDisplay } from "./period-display";

type PeriodContext = { poolId: string; periodStart: string; periodEnd: string; periodLabel: string };

export function usePoolPeriodFormatter(poolId?: number) {
  const calendar = useQuery({
    queryKey: ["kpi-pool-periods", poolId],
    queryFn: () => kpiPoolService.getInputPeriods(poolId!),
    enabled: Boolean(poolId && poolId > 0),
  });
  return (key: string, _legacyStyle = false) => {
    const periods = calendar.data?.data ?? [];
    const period = periods.find(item => item.start.slice(0, 7) === key.slice(0, 7));
    return period ? periodDisplay(period, periods).label : key || "Select Input Period";
  };
}

export function usePeriodLabels(periods: PeriodContext[]) {
  const poolIds = [...new Set(periods.map(period => Number(period.poolId)))].filter(id => id > 0);
  const calendars = useQueries({ queries: poolIds.map(poolId => ({
    queryKey: ["kpi-pool-periods", poolId],
    queryFn: () => kpiPoolService.getInputPeriods(poolId),
  })) });
  return (period: PeriodContext) => {
    const calendar = calendars[poolIds.indexOf(Number(period.poolId))]?.data?.data;
    return calendar?.length && period.periodStart && period.periodEnd
      ? periodDisplay({ start: period.periodStart, end: period.periodEnd }, calendar).label
      : period.periodLabel;
  };
}

export function usePeriodLabel(period?: PeriodContext | null) {
  const poolId = Number(period?.poolId);
  const calendar = useQuery({
    queryKey: ["kpi-pool-periods", poolId],
    queryFn: () => kpiPoolService.getInputPeriods(poolId),
    enabled: poolId > 0,
  });
  return period && calendar.data?.data.length && period.periodStart && period.periodEnd
    ? periodDisplay({ start: period.periodStart, end: period.periodEnd }, calendar.data.data).label
    : period?.periodLabel ?? "";
}
