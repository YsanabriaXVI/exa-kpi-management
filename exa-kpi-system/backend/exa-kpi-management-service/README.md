# EXA KPI Management Service

Independent Node.js and TypeScript microservice for KPI Definitions, KPI Configurations, temporal configuration revisions, thresholds, and service-owned catalogs.

## Context order

Before changing this service, read:

1. `../BACKEND_CONTEXT.md`
2. `context/KPI_MANAGEMENT_CONTEXT.md`
3. `../../database/seeds/KPI_MANAGEMENT_DB_OWNERSHIP_MATRIX.md`
4. `../../database/seeds/exa-kpi-management-service.sql`

## Local commands

```bash
npm install
npm run prisma:generate
npm run typecheck
npm test
npm run dev
```

The service defaults to port `4001`. The shared multi-service environment will be owned by `backend/compose.yaml` when it is implemented.

## Current scope

This commit establishes the service boundary and a minimal health endpoint. Prisma domain models, migrations, catalog seeds, authentication, OpenAPI, and KPI business endpoints are intentionally subsequent vertical slices.
