const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4001/api").replace(/\/$/, "");

type ApiErrorEnvelope = { error?: { code?: string; message?: string; details?: unknown } };

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "API_ERROR",
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { ...(init?.body ? { "Content-Type": "application/json" } : {}), ...init?.headers },
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as ApiErrorEnvelope;
    throw new ApiError(payload.error?.message ?? "The request could not be completed.", response.status, payload.error?.code, payload.error?.details);
  }
  return response.json() as Promise<T>;
}
