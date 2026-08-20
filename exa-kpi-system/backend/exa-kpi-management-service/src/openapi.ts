import type { Express } from "express";
import swaggerUi from "swagger-ui-express";

const errorResponse = {
  type: "object",
  properties: { error: { type: "object", properties: { code: { type: "string" }, message: { type: "string" } } } },
};

const kpiDefinition = {
  type: "object",
  properties: {
    id: { type: "string", example: "1" },
    kpiCode: { type: "string", example: "KPI-001" },
    kpiName: { type: "string" },
    description: { type: "string" },
    status: { type: "string", enum: ["ACTIVE", "INACTIVE"] },
    isActive: { type: "boolean" },
    category: { $ref: "#/components/schemas/KpiCategory" },
    createdAt: { type: "string", format: "date-time" },
    updatedAt: { type: ["string", "null"], format: "date-time" },
    createdByUserId: { type: ["string", "null"] },
    updatedByUserId: { type: ["string", "null"] },
  },
};

export const openApiDocument = {
  openapi: "3.1.0",
  info: { title: "EXA KPI Management API", version: "1.0.0" },
  servers: [{ url: "http://localhost:4001" }],
  components: {
    schemas: {
      Error: errorResponse,
      KpiCategory: {
        type: "object",
        properties: { id: { type: "string" }, code: { type: "string" }, name: { type: "string" }, description: { type: ["string", "null"] } },
      },
      KpiDefinition: kpiDefinition,
      KpiDefinitionInput: {
        type: "object",
        required: ["kpiName", "description", "kpiCategoryId"],
        properties: {
          kpiName: { type: "string", maxLength: 200 },
          description: { type: "string" },
          kpiCategoryId: { type: "string", pattern: "^[1-9][0-9]*$" },
          isActive: { type: "boolean", default: true },
        },
      },
      KpiDefinitionPatch: {
        type: "object",
        minProperties: 1,
        additionalProperties: false,
        properties: {
          kpiCode: { type: "string", maxLength: 30 },
          kpiName: { type: "string", maxLength: 200 },
          description: { type: "string" },
          kpiCategoryId: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
      },
    },
  },
  paths: {
    "/api/health/live": { get: { tags: ["Health"], responses: { "200": { description: "Service is alive" } } } },
    "/api/health/ready": { get: { tags: ["Health"], responses: { "200": { description: "Database is reachable" }, "503": { description: "Database unavailable" } } } },
    "/api/v1/kpi-categories": { get: { tags: ["KPI Categories"], summary: "List active categories", responses: { "200": { description: "Active category lookup" } } } },
    "/api/v1/internal/input-frequencies": { get: { tags: ["Internal Catalogs"], summary: "List input frequencies for service projections", responses: { "200": { description: "Input-frequency projection contract; IDs are strings" } } } },
    "/api/v1/kpi-configurations/batch-lookup": { post: { tags: ["KPI Configurations"], summary: "Resolve multiple KPI Configurations for service-to-service validation", description: "Accepts 1–100 string IDs, deduplicates them and resolves the batch with one database query. Soft-deleted or unknown IDs are returned in notFoundIds.", responses: { "200": { description: "Resolved configurations in requested order and missing IDs" }, "400": { description: "Invalid or oversized batch" } } } },
    "/api/v1/internal/kpi-configurations": { get: { tags: ["Internal"], summary: "Discover KPI Configurations for service consumers", description: "Paginated temporary service-to-service catalog used by KPI Pool.", responses: { "200": { description: "Paginated configuration catalog" } } } },
    "/api/v1/kpi-definitions": {
      get: {
        tags: ["KPI Definitions"], summary: "List KPI definitions",
        parameters: [
          { name: "page", in: "query", schema: { type: "integer", minimum: 1, default: 1 } },
          { name: "pageSize", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 20 } },
          { name: "search", in: "query", description: "Searches code, name, objective, category and state", schema: { type: "string" } },
          { name: "categoryId", in: "query", style: "form", explode: true, schema: { type: "array", items: { type: "string" } } },
          { name: "status", in: "query", style: "form", explode: true, schema: { type: "array", items: { type: "string", enum: ["ACTIVE", "INACTIVE"] } } },
          { name: "sortBy", in: "query", schema: { type: "string", enum: ["kpiCode", "kpiName", "description", "category", "statusCode", "createdAt", "updatedAt"] } },
          { name: "sortOrder", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
        ], responses: { "200": { description: "Paginated list" }, "400": { description: "Invalid query", content: { "application/json": { schema: { $ref: "#/components/schemas/Error" } } } } },
      },
      post: {
        tags: ["KPI Definitions"], summary: "Create KPI definition",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/KpiDefinitionInput" } } } },
        responses: { "201": { description: "Created" }, "400": { description: "Invalid payload" }, "409": { description: "Duplicate code" }, "422": { description: "Category unavailable" } },
      },
    },
    "/api/v1/kpi-definitions/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", pattern: "^[1-9][0-9]*$" } }],
      get: { tags: ["KPI Definitions"], summary: "Get KPI definition", responses: { "200": { description: "Found" }, "404": { description: "Not found" } } },
      patch: {
        tags: ["KPI Definitions"], summary: "Partially update KPI definition",
        requestBody: { required: true, content: { "application/json": { schema: { $ref: "#/components/schemas/KpiDefinitionPatch" } } } },
        responses: { "200": { description: "Updated" }, "400": { description: "Invalid payload" }, "404": { description: "Not found" }, "409": { description: "Duplicate code" }, "422": { description: "Category unavailable" } },
      },
      delete: {
        tags: ["KPI Definitions"], summary: "Soft delete KPI definition",
        description: "Sets deleted_at and removes the definition from normal list/detail results without physically deleting the database row.",
        responses: { "200": { description: "Soft deleted" }, "404": { description: "Not found" } },
      },
    },
    "/api/v1/kpi-definitions/{id}/activate": {
      patch: { tags: ["KPI Definitions"], summary: "Activate KPI definition", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Activated" }, "404": { description: "Not found" } } },
    },
    "/api/v1/kpi-definitions/{id}/deactivate": {
      patch: { tags: ["KPI Definitions"], summary: "Deactivate KPI definition", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deactivated" }, "404": { description: "Not found" } } },
    },
    "/api/v1/kpi-definitions/{id}/configurations": {
      get: { tags: ["KPI Definitions"], summary: "List configurations related by kpi_definition_id", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }, { name: "page", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } }], responses: { "200": { description: "Paginated related KPI configurations" }, "404": { description: "Definition not found" } } },
    },
    "/api/v1/kpi-configurations": {
      get: { tags: ["KPI Configurations"], summary: "List KPI configurations", parameters: [{ name: "page", in: "query", schema: { type: "integer", minimum: 1 } }, { name: "pageSize", in: "query", schema: { type: "integer", maximum: 100 } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated configurations" } } },
      post: { tags: ["KPI Configurations"], summary: "Create a KPI configuration and initial revision", responses: { "201": { description: "Created" }, "400": { description: "Invalid payload" }, "422": { description: "Catalog or definition unavailable" } } },
    },
    "/api/v1/kpi-configurations/{id}": {
      parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
      get: { tags: ["KPI Configurations"], summary: "Get KPI configuration detail", responses: { "200": { description: "Found" }, "404": { description: "Not found" } } },
      patch: { tags: ["KPI Configurations"], summary: "Update configuration and create the next revision", responses: { "200": { description: "Updated" }, "404": { description: "Not found" }, "422": { description: "Catalog unavailable" } } },
      delete: { tags: ["KPI Configurations"], summary: "Soft delete KPI configuration", responses: { "200": { description: "Removed from active listings; database record preserved" }, "404": { description: "Not found" } } },
    },
    "/api/v1/kpi-configurations/{id}/deactivate": {
      patch: { tags: ["KPI Configurations"], summary: "Deactivate KPI configuration", parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }], responses: { "200": { description: "Deactivated" }, "404": { description: "Not found" } } },
    },
  },
};

export function registerOpenApi(app: Express): void {
  app.get("/api/docs/openapi.json", (_request, response) => response.json(openApiDocument));
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));
}
