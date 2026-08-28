export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "EXA Monitoring API", version: "0.1.0" },
  paths: {
    "/api/health/live": { get: { summary: "Liveness", responses: { "200": { description: "Live" } } } },
    "/api/health/ready": { get: { summary: "Readiness", responses: { "200": { description: "Ready" }, "503": { description: "Database unavailable" } } } },
    "/api/v1/monitoring-periods/materialize": {
      post: {
        summary: "Idempotently materialize a DRAFT Monitoring Period from an exact Pool Input Period",
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["poolId", "poolInputPeriodId"], properties: { poolId: { type: "string", pattern: "^[1-9][0-9]*$" }, poolInputPeriodId: { type: "string", pattern: "^[1-9][0-9]*$" } } } } } },
        responses: { "201": { description: "Materialized" }, "200": { description: "Already materialized" }, "409": { description: "Pool or Scorecards not ready" }, "502": { description: "Downstream contract failure" }, "503": { description: "Downstream unavailable" } },
      },
    },
    "/api/v1/monitoring-periods": {
      get: { summary: "Paginated Monitoring Overview with server-side filters and sorting", responses: { "200": { description: "Monitoring Period page, facets and totals" } } },
    },
    "/api/v1/monitoring-periods/resolve": { get: { summary: "Resolve Monitoring availability and action for an exact Pool Input Period", responses: { "200": { description: "Available, ready to materialize, or unavailable with reason" } } } },
    "/api/v1/monitoring-periods/{id}/detail": { get: { summary: "Paginated, filterable and sortable Monitoring KPI detail", responses: { "200": { description: "Monitoring detail projection" } } } },
    "/api/v1/monitoring-periods/{id}/attached-scorecards": { get: { summary: "Paginated Scorecard snapshots and selected KPI results", responses: { "200": { description: "Attached Scorecards projection" } } } },
    "/api/v1/monitoring-periods/pools/{poolId}/input-schedule": { get: { summary: "Paginated Pool Input Period schedule joined with Monitoring state", responses: { "200": { description: "Pool schedule projection including non-materialized periods" } } } },
    "/api/v1/monitoring-periods/{id}/result-entry": {
      get: {
        summary: "Get the materialized Result Entry projection and Expected/Entered/Pending summary",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[1-9][0-9]*$" } }],
        responses: { "200": { description: "Result Entry projection" }, "404": { description: "Monitoring Period not found" } },
      },
    },
    "/api/v1/monitoring-periods/{id}/result-entry/save-changes": {
      post: {
        summary: "Atomically save only modified manual Result Entry rows with optimistic locking and revisions",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[1-9][0-9]*$" } }],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", required: ["changes"], properties: { changes: { type: "array", minItems: 1, items: { type: "object", required: ["monitoringPeriodInputId", "resultValue", "comment", "version"], properties: { monitoringPeriodInputId: { type: "string" }, resultValue: { type: ["string", "null"] }, comment: { type: ["string", "null"] }, version: { type: ["integer", "null"] } } } } } } } } },
        responses: { "200": { description: "Committed Result Entry projection" }, "409": { description: "Status or optimistic version conflict; complete rollback" }, "422": { description: "Invalid or no-op batch" } },
      },
    },
    "/api/v1/monitoring-periods/{id}/validate": { post: { summary: "Run repeatable DRAFT validation without changing workflow status", responses: { "200": { description: "Persisted validation summary" }, "409": { description: "State or version conflict" } } } },
    "/api/v1/monitoring-periods/{id}/submit": { post: { summary: "Submit validated DRAFT results and make them read-only", responses: { "200": { description: "Monitoring Period submitted" }, "422": { description: "Validation required or errors remain" } } } },
    "/api/v1/monitoring-periods/{id}/return-for-correction": { post: { summary: "Return SUBMITTED results to DRAFT with a required reason", responses: { "200": { description: "Monitoring Period returned" } } } },
    "/api/v1/monitoring-periods/{id}/approve": { post: { summary: "Approve SUBMITTED results as VALIDATED", responses: { "200": { description: "Monitoring Period validated" } } } },
    "/api/v1/monitoring-periods/{id}/close": { post: { summary: "Close a VALIDATED period normally or with documented exceptions", responses: { "200": { description: "Monitoring Period closed" }, "422": { description: "Missing results require Close with Exceptions" } } } },
  },
} as const;
