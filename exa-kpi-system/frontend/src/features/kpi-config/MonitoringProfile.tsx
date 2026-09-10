import type { ReactNode } from "react";
import type { KpiConfigInput, KpiConfigRecord, TrafficLightRanges } from "./kpi-config.types";
import { useSingleResultProfile } from "./SingleResultProfile";

export function useMonitoringProfile(input: KpiConfigInput | null, saved?: KpiConfigRecord, resultSetup?: { onSemanticsChange: (value: string) => void; onZeroTarget?: () => void; evaluationScope?: KpiConfigInput["evaluationScope"]; ranges?: TrafficLightRanges; editor: ReactNode }) {
  return useSingleResultProfile(input, saved, resultSetup?.onZeroTarget);
}
