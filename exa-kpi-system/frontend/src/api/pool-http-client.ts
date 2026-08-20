import { ApiError } from "./http-client";

const poolApiBaseUrl = (import.meta.env.VITE_KPI_POOL_API_BASE_URL ?? "http://localhost:4002/api").replace(/\/$/, "");

export async function poolApiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${poolApiBaseUrl}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(payload.error?.message ?? "The KPI Pool request could not be completed.", response.status, payload.error?.code, payload.error?.details);
  }
  return response.json() as Promise<T>;
}
