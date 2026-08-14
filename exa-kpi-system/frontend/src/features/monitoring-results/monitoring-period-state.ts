export type MonitoringPeriodClosure = {
  mode: "normal" | "with-exceptions";
  closedAt: string;
};

const simulatedClosures = new Map<string, MonitoringPeriodClosure>();

function closureKey(poolId: number, period: string) {
  return `${poolId}:${period}`;
}

export function saveMonitoringPeriodClosure(
  poolId: number,
  period: string,
  mode: MonitoringPeriodClosure["mode"],
) {
  const closure: MonitoringPeriodClosure = {
    mode,
    closedAt: new Date().toISOString(),
  };
  simulatedClosures.set(closureKey(poolId, period), closure);
}

export function isMonitoringPeriodClosed(poolId: number, period: string) {
  return simulatedClosures.has(closureKey(poolId, period));
}
