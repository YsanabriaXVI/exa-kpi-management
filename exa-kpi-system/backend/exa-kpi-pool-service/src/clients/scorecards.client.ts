import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";

export const scorecardsClient = {
  async frozenUsage(poolId: string, periodKey: string, configurationId: string) {
    const query = new URLSearchParams({ poolId, periodKey, configurationId });
    try {
      const response = await fetch(`${env.SCORECARDS_BASE_URL}/api/v1/scorecards/internal/frozen-kpi-usage?${query}`, { signal: AbortSignal.timeout(env.SCORECARDS_TIMEOUT_MS), headers: { "x-service-name": "exa-kpi-pool-service" } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json() as { data: { frozen: boolean; scorecardId: string|null; scorecardPeriodCompositionId: string|null } }).data;
    } catch (error) {
      throw new AppError(503, "SCORECARDS_UNAVAILABLE", "Scorecards availability could not be verified before changing the Pool override");
    }
  },
};
