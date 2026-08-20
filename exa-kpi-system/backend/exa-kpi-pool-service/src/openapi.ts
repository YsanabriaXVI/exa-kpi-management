export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "EXA KPI Pool Service",
    version: "0.1.0",
    description: "KPI Pool service with Pool Info, derived KPI availability, explicit membership and lifecycle commands.",
  },
  servers: [{ url: "http://localhost:4002" }],
  paths: {
    "/api/health/live": {
      get: {
        summary: "Liveness probe",
        responses: { "200": { description: "The Node/Express process is alive" } },
      },
    },
    "/api/health/ready": {
      get: {
        summary: "Readiness probe",
        description: "MySQL is required. NATS is reported but temporary broker degradation does not fail readiness.",
        responses: {
          "200": { description: "MySQL is available" },
          "503": { description: "MySQL is unavailable" },
        },
      },
    },
    "/api/v1/kpi-pools": {
      get: { summary: "List KPI Pools", description: "Server-side paginated Pool Info list.", responses: { "200": { description: "Paginated Pools" } } },
      post: { summary: "Create a DRAFT KPI Pool", description: "Validates local references and generates the canonical code transactionally.", responses: { "201": { description: "DRAFT Pool created" }, "422": { description: "Invalid or inactive reference" } } },
    },
    "/api/v1/kpi-pools/lookups": {
      get: { summary: "Get active Pool Info lookups", responses: { "200": { description: "Pool Areas, company references and input-frequency references" } } },
    },
    "/api/v1/kpi-pools/{id}": {
      get: { summary: "Get KPI Pool Info", responses: { "200": { description: "Pool Info" }, "404": { description: "Pool not found" } } },
      patch: { summary: "Update DRAFT KPI Pool Info", description: "Structural scope changes regenerate the canonical code using the new scope sequence.", responses: { "200": { description: "DRAFT Pool updated" }, "409": { description: "Pool structure is locked" } } },
    },
    "/api/v1/kpi-pools/{id}/kpi-configurations": {
      get: { summary: "List KPI Configurations in a Pool", responses: { "200": { description: "Pool memberships" } } },
      post: { summary: "Add KPI Configurations to a DRAFT Pool", description: "All-or-nothing validation through KPI Management batch lookup.", responses: { "201": { description: "Memberships created" }, "409": { description: "Pool locked or conflict" }, "422": { description: "Ineligible batch" } } },
    },
    "/api/v1/kpi-pools/kpi-configuration-usage": { post: { summary: "Resolve Pool usage for KPI Configurations", description: "Batch read model used by KPI Config Overview; avoids N+1 calls and returns Pool names/counts.", responses: { "200": { description: "Usage grouped by Configuration external ID" } } } },
    "/api/v1/kpi-pools/{id}/kpi-configurations/{configurationId}": { delete: { summary: "Physically remove a KPI Configuration from a DRAFT Pool", responses: { "200": { description: "Draft membership removed" } } } },
    "/api/v1/kpi-pools/{id}/kpi-configurations/{configurationId}/retire": { post: { summary: "Retire membership before a future Input Period", responses: { "200": { description: "Membership interval closed" } } } },
    "/api/v1/kpi-pools/{id}/kpi-configurations/replace": { post: { summary: "Atomically replace a Configuration for a future Input Period", responses: { "200": { description: "Membership replaced" } } } },
    "/api/v1/kpi-pools/{id}/input-periods": { get: { summary: "List Pool Input Periods and conservative editability", responses: { "200": { description: "Input Periods" } } } },
    "/api/v1/kpi-pools/{id}/input-periods/finalize": { post: { summary: "Finalize and lock a Pool composition for one Input Period", responses: { "200": { description: "Period composition finalized" } } } },
    "/api/v1/kpi-pools/{id}/available-kpi-configurations": { get: { summary: "List derived KPI Configuration availability", responses: { "200": { description: "Paginated availability and reasons" } } } },
    "/api/v1/kpi-pools/{id}/activation-readiness": { get: { summary: "Run pre-activation checks", responses: { "200": { description: "Activation checklist" } } } },
    "/api/v1/kpi-pools/{id}/activate": { post: { summary: "Activate a validated DRAFT Pool", responses: { "200": { description: "Pool activated and Outbox event stored" }, "422": { description: "Pool not ready" } } } },
    "/api/v1/kpi-pools/{id}/deactivate": { post: { summary: "Deactivate an ACTIVE Pool", responses: { "200": { description: "Pool deactivated and Outbox event stored" } } } },
  },
} as const;
