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
npm run prisma:seed
npm run typecheck
npm test
npm run dev
```

The service defaults to port `4001`. The shared environment is orchestrated by `backend/docker-compose.yml`.

API documentation is available at `GET /api/docs`. Business endpoints use the
`/api/v1` base path, while health remains under `/api/health`.

`TEMPORARY_ACTOR_USER_ID` is an optional development-only audit identity seam.
When absent, nullable audit user IDs remain `null`. Replace the middleware with
the future EXA/JWT identity resolver; clients cannot provide the actor through a
public request header.

## Current scope

The first functional slice implements KPI Definition and the active KPI Category
lookup. Authentication, KPI Configuration, and official catalog seed values are
intentionally outside this increment.

## Initial KPI Definition data

`npm run prisma:seed` imports the normalized KPI Definition development dataset
audited from the current frontend mock service. It matches categories by `code`
and definitions by `kpiCode`, creates missing records, and preserves existing
records without overwriting API edits. The same importer can be run explicitly:

```bash
npm run prisma:import:kpi-definitions
```

See `context/KPI_DEFINITION_MOCK_AUDIT.md` for included, excluded, and conflicting
mock fields. The frontend mocks remain in place until a later API-integration task.
