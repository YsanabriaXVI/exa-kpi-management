import { z } from "zod";
import { env } from "../config/env.js";
import { logger } from "../config/logger.js";
import { AppError } from "../utils/app-error.js";

const configurationSchema = z.object({
  id: z.string(), configCode: z.string(), definitionId: z.string(), definitionCode: z.string(), definitionName: z.string(),
  definitionIsActive: z.boolean(), inputFrequencyId: z.string(), inputFrequencyCode: z.string(), inputFrequencyName: z.string(),
  inputFrequencyIsActive: z.boolean(), status: z.string(), isActive: z.boolean(),
  categoryName: z.string().optional(), measurementUnit: z.string().optional(), dataSource: z.string().optional(), goal: z.string().nullable().optional(),
});
const catalogConfigurationSchema = configurationSchema.extend({
  categoryName: z.string(), measurementUnit: z.string(), dataSource: z.string(), goal: z.string().nullable(),
});
const metaSchema = z.object({ page: z.number(), pageSize: z.number(), totalItems: z.number(), totalPages: z.number() });
const batchResponseSchema = z.object({ data: z.array(configurationSchema), notFoundIds: z.array(z.string()) });
const catalogResponseSchema = z.object({ data: z.array(catalogConfigurationSchema), meta: metaSchema });

export type KpiManagementConfiguration = z.infer<typeof configurationSchema>;
export type KpiManagementCatalogConfiguration = z.infer<typeof catalogConfigurationSchema>;

async function request(path: string, init?: RequestInit): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.KPI_MANAGEMENT_TIMEOUT_MS);
  try {
    const response = await fetch(`${env.KPI_MANAGEMENT_BASE_URL.replace(/\/$/, "")}${path}`, {
      ...init, signal: controller.signal,
      headers: { "Content-Type": "application/json", "x-service-name": "exa-kpi-pool-service", ...init?.headers },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (error) {
    logger.warn({ path, error: error instanceof Error ? error.message : String(error) }, "KPI Management request failed");
    throw new AppError(503, "KPI_MANAGEMENT_UNAVAILABLE", "KPI Management is temporarily unavailable");
  } finally { clearTimeout(timeout); }
}

export const kpiManagementClient = {
  async batchLookup(ids: string[]) {
    const payload = await request("/api/v1/kpi-configurations/batch-lookup", { method: "POST", body: JSON.stringify({ ids }) });
    const parsed = batchResponseSchema.safeParse(payload);
    if (!parsed.success) throw new AppError(502, "KPI_MANAGEMENT_INVALID_RESPONSE", "KPI Management returned an invalid batch response");
    return parsed.data;
  },
  async listConfigurations(query: { page: number; pageSize: number; search?: string; periodStart?: string }) {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
    if (query.search) params.set("search", query.search);
    const payload = await request(`/api/v1/internal/kpi-configurations?${params}`);
    const parsed = catalogResponseSchema.safeParse(payload);
    if (!parsed.success) throw new AppError(502, "KPI_MANAGEMENT_INVALID_RESPONSE", "KPI Management returned an invalid catalog response");
    return parsed.data;
  },
};
