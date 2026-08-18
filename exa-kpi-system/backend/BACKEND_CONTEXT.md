# EXA KPI Backend — Shared Context

> Root-level context for the backend workspace that will contain the KPI microservices.
>
> Suggested location: `Backend/BACKEND_CONTEXT.md`

## 1. Purpose

This backend belongs to the EXA KPI Management system.

The backend will be implemented as a set of independent Node.js + TypeScript microservices rather than as one monolithic API.

Expected root structure:

```text
Backend/
├── BACKEND_CONTEXT.md
├── exa-kpi-management-service/
├── exa-kpi-pool-service/
├── exa-scorecards-service/
├── exa-monitoring-service/
├── exa-reporting-service/
└── exa-access-service/          
```

The exact final service list can change if EXA already provides corporate services for identity, users, departments, notifications, organization data, etc.

Do not create all services blindly. Build them progressively as ownership and contracts are defined.

## 2. Main business flow

```text
KPI Definition
    ↓
KPI Configuration
    ↓
KPI Pool
    ↓
ScoreCards
    ↓
Monitoring Results
    ↓
Reports / Analytics
```

- **KPI Definition**: conceptual KPI catalog.
- **KPI Configuration**: reusable measurable configuration of a KPI Definition.
- **KPI Pool**: valid set of KPI Configurations available during a validity period.
- **ScoreCard**: weighted composition of KPIs from a Pool and potentially linked ScoreCards.
- **Monitoring Results**: input, validation, submission and closure of KPI results by input period.
- **Reports / Analytics**: read models, history, comparisons and exports.

## 3. Planned service ownership

### `exa-kpi-management-service`

Owns:

```text
KPI Definition
KPI Configuration
KPI configuration revisions
KPI evaluation/catalog data owned by this domain
```

Target database:

```text
exa_kpi_management
```

### `exa-kpi-pool-service`

Owns:

```text
KPI Pools
Pool validity
Pool companies
Pool KPI membership
Pool lifecycle
```

Target database:

```text
exa_kpi_pool
```

### `exa-scorecards-service`

Owns:

```text
ScoreCards
ScoreCard departments
ScoreCard employees
ScoreCard KPI assignments
KPI weights
Linked ScoreCards
ScoreCard lifecycle/publishing
```

Target database:

```text
exa_scorecard
```

### `exa-monitoring-service`

Owns:

```text
Input periods
Monitoring Overview state
Draft result entry
Manual result entry
Excel result import
Validation
Submission
Return for correction
Validation/acceptance
Close Period
Close With Exceptions
KPI result snapshots
ScoreCard result snapshots
Historical closure data
```

Target database:

```text
exa_monitoring
```

This is expected to be the most transaction-heavy service.

### `exa-reporting-service`

Owns read-oriented data and reporting projections, not the official transactional source of truth for KPI results.

Target database:

```text
exa_reporting
```

Expected responsibilities:

```text
Latest ScoreCard Results
ScoreCard history
ScoreCard analysis
Excel exports
PDF exports
Reporting projections/read models
```

Official closed result data is owned by Monitoring.

### `exa-access-service`

Create only if EXA does not already provide a corporate identity/access service that should be reused.

Possible ownership:

```text
Users
Roles
Permissions
User-role assignment
Role-permission assignment
Access scopes
```

Target database if local:

```text
exa_access
```

Do not duplicate corporate authentication/SSO/JWT ownership if an existing EXA service already provides it.

## 4. Database-per-service rule

Each microservice owns its own database logically.

Development may use one MySQL 8 server/container with several databases:

```text
mysql:8
│
├── exa_kpi_management
├── exa_kpi_pool
├── exa_scorecard
├── exa_monitoring
├── exa_reporting
└── exa_access
```

This does **not** mean the services share data ownership.

Each service must have:

```text
its own DATABASE_URL
its own Prisma schema
its own migrations
its own tables
its own Prisma Client
```

Do not create one global `schema.prisma` containing the entire KPI platform but each service must owns theirs `schema.prisma` as we clarified above.

## 5. Critical relational rule

### Same microservice

If both tables belong to the same service:

```text
Physical MySQL Foreign Key
+
normal Prisma relation
```

Example:

```text
KPI Management

kpi_configurations.kpi_definition_id
    ↓
kpi_definitions.kpi_definition_id
```

### Different microservices

If the referenced entity belongs to another service:

```text
External ID only
NO cross-service MySQL FK
NO cross-service Prisma relation
```

Example:

```text
Pool service

kpi_pool_kpis.kpi_configuration_id
```

logically references a KPI Configuration owned by `exa-kpi-management-service`, but Pool must not create a physical FK into `exa_kpi_management` and must not model an external `KpiConfiguration` as a Prisma relation.

Cross-service validation/read behavior should use an explicit API contract, event/projection, or snapshot depending on the use case.

## 6. External audit/user IDs

Fields such as:

```text
created_by_user_id
updated_by_user_id
```

may exist in multiple services for traceability.

If User identity belongs to Access/Identity, those values are **External IDs**.

They must not create physical cross-service FK constraints or fake Prisma relations to an external `User` model.

The authenticated user identifier will later come from the EXA auth/JWT context.

## 7. Snapshots and history

Historical KPI results must remain reproducible even when KPI definitions/configuration rules of measurement (sucha as goal, traffic light, data source, Measurement unit) change later.

Monitoring may therefore store snapshots of external domain data:

```text
kpi_configuration_id
kpi_configuration_revision_id

kpi_code_snapshot
kpi_name_snapshot

target_snapshot
measurement_unit_snapshot
evaluation_type_snapshot
traffic_light_thresholds_snapshot

scorecard weight snapshot
pool context snapshot
```

Snapshots are intentional duplication for historical integrity.

Do not replace historical snapshots by repeatedly querying the newest current configuration from another service.

## 8. KPI configuration revisions

KPI Configuration rules are temporal.

Example:

```text
KPC-050-01

Revision 1
Target = 15%
Effective = 2026-01-01 through 2026-08-31

Revision 2
Target = 18%
Effective = 2026-09-01 onward
```

Do not overwrite historical target/evaluation rules in place.

The KPI Management domain uses:

```text
kpi_configurations
        │
        └── kpi_configuration_revisions
                │
                └── kpi_configuration_revision_thresholds
```

Time-sensitive rules such as target, evaluation behavior and traffic-light thresholds belong to the appropriate revision.

A change should normally become effective from the **next input period**.

Applying a revision to the current input period is an explicit exceptional action and should only be possible if that Monitoring period remains editable, for example `DRAFT`.

A new revision must never silently recalculate or rewrite:

```text
SUBMITTED
VALIDATED
CLOSED
```

historical periods.

## 9. Monitoring workflow

Manual entry and Excel import are two capture channels into the same draft result set.

```text
Manual ─┐
        ├──> Draft Results
Excel ──┘
```

Main workflow:

```text
DRAFT
  ↓ Submit Results
SUBMITTED
  ↓ Validate / Accept
VALIDATED
  ↓ Close
CLOSED
```

Correction flow:

```text
SUBMITTED
    ↓
Return for Correction
    ↓
DRAFT
```

and, where authorized:

```text
VALIDATED
    ↓
Return for Correction
    ↓
DRAFT
```

Do not maintain separate manual-results and excel-results business tables unless a future requirement explicitly demands it.

## 10. Monitoring close rules

Expected concepts:

```text
Normal Close
Close With Exceptions
```

Normal close requires the appropriate validated/complete state.

Close With Exceptions may allow permitted missing/warning conditions and requires justification.

Critical structural/data errors should block closure.

The exact rules belong in the Monitoring service layer and should be covered by tests.

## 11. Excel import principle

Excel upload must not directly insert final result rows without validation.

Expected flow:

```text
Download Template
→ Fill workbook
→ Upload
→ Validate file/headers
→ Parse rows
→ Validate KPI/period/value/duplicates
→ Preview
→ Confirm Import
→ Persist into Draft
```

Existing draft results must not be silently overwritten or erased by blank Excel cells.

## 12. Service communication

Use synchronous HTTP/REST when a service requires an immediate answer to continue.

Mental model:

```text
REST
= "I need an answer now."
```

Examples:

```text
Pool asks KPI Management whether a KPI Configuration exists/is usable.
Scorecard asks Pool for valid pool context.
Monitoring retrieves current configuration data while generating a new period/snapshot.
Frontend performs CRUD and workflow commands.
```

Use asynchronous messaging only where decoupling provides real value.

Potential future events:

```text
kpi.configuration.revised
scorecard.published
monitoring.results.submitted
monitoring.results.validated
monitoring.period.closed
monitoring.period.closed-with-exceptions
```

Do not turn ordinary CRUD/filter/list operations into events.

## 13. NATS and Transactional Outbox

NATS is optional per service.

Do not add NATS merely because another EXA service uses it.

Strongest initial candidate:

```text
exa-monitoring-service
```

Possible flow:

```text
Monitoring closes period
        ↓
DB transaction commits
        ↓
Outbox record committed
        ↓
Outbox processor publishes NATS event
        ↓
Reporting updates projection
Notifications may react
```

Business change + outbox event intention should be committed in the same local DB transaction.

The outbox does not create a distributed DB/NATS transaction.

Consumers must be designed for possible duplicate delivery/idempotency.

## 14. Backend technology direction

Unless EXA provides a newer mandatory standard, the intended direction is:

```text
Node.js
TypeScript
MySQL 8
Prisma
Zod
Pino
Swagger / OpenAPI
Vitest
Docker
Docker Compose
```

NATS and Transactional Outbox are used only where justified (At Monitoring Results module it´s so much necessary to implement it ).




Do not add dependencies merely because they appear in another service.

## 15. Existing EXA service references observed outside this workspace

Codex working in this backend root does **not** have direct access to these repositories unless they are explicitly provided later.

The following is contextual information derived from prior human review. Do not assume these files exist locally.

### `exa-notifications-core`

Observed organization was approximately:

```text
prisma/

src/
├── config/
│   ├── database.ts
│   ├── env.ts
│   └── nats.ts
├── events/
│   ├── publishers/
│   └── subjects.ts
├── middleware/
│   └── auth.ts
├── routes/
│   ├── __tests__/
│   ├── health.ts
│   ├── lookups.ts
│   └── notifications.ts
├── schemas/
├── services/
│   ├── notificationService.ts
│   └── outboxProcessor.ts
├── test/
│   ├── helpers/
│   └── setup.ts
├── types/
├── utils/
│   ├── dtos.ts
│   ├── errors.ts
│   └── pagination.ts
├── app.ts
└── index.ts

Dockerfile
Dockerfile.dev
bitbucket-pipelines.yml ( we are currently working in GitHub)
package.json
README.md
tsconfig.json
```

Observed characteristics:

```text
Prisma
Pino
NATS
Transactional Outbox
schemas/runtime validation
tests near related code
shared test setup/helpers
Dockerfile + Dockerfile.dev
Bitbucket pipeline ( we are currently working in GitHub)
app.ts / index.ts separation
```

Its database configuration used a shared/single Prisma Client approach, with more verbose Prisma logging in development and reduced logging in production.

Do not copy this service blindly; use it as a style/reference point.

### `exa-damage-service`

Observed organization was approximately:

```text
src/
├── config/
│   └── database/
├── controllers/
├── middlewares/
├── models/
├── routes/
│   └── __test__/
├── services/
├── test/
│   └── setup.ts
├── app.ts
├── index.ts
└── terminate.ts

Dockerfile
Dockerfile.dev
bitbucket-pipelines.yml  ( we are currently working in GitHub)
package.json
README.md
tsconfig.json
```

Observed characteristics:

```text
Express
Sequelize or Prisma
Zod

Route
→ Controller
→ Service
→ Sequelize or Prisma Model

Logging
→ Pino
→ JWT


Docs
→ Swagger

Testing (backend)
→ Vitest + Jest (or the one which is more appropiated)

```




## 16. Conclusions from the EXA references

The reviewed services do **not** prove that there is one rigid universal internal architecture.

Common tendencies observed:

```text
TypeScript service
config
routes
services
middleware
tests
app/index separation
Dockerfile
Dockerfile.dev
Bitbucket pipeline
README
```


For the new KPI services:

- favor consistency across the new KPI service family;
- favor pragmatic/simple layers;
- avoid boilerplate with no business value;
- do not create empty architectural layers just to look "enterprise".

Do not automatically create:

```text
controllers/
repositories/
models/
domain/
ports/
adapters/
use-cases/
factories/
```

unless actual complexity or confirmed EXA standards justify them.

Do not duplicate Prisma-generated persistence models into equivalent TypeScript interfaces without a real domain/API need.

## 17. Preferred initial service shape

A new KPI service will likely begin close to:

```text
exa-*-service/
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── src/
│   ├── config/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── test/
│   ├── types/
│   ├── utils/
│   ├── app.ts
│   ├── index.ts
│   └── terminate.ts        # if this lifecycle pattern is selected
│
├── Dockerfile
├── Dockerfile.dev
├── .dockerignore
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── bitbucket-pipelines.yml
└── README.md
```

Optional components introduced only when needed:

```text
events/
config/nats.ts
outboxProcessor.ts
repositories/
```

## 18. Local Docker architecture

A root/local-development Compose environment may eventually orchestrate:

```text
frontend
exa-kpi-management-service
exa-kpi-pool-service
exa-scorecards-service
exa-monitoring-service
exa-reporting-service

mysql:8
nats               # when event integrations are enabled
adminer             # optional development convenience
```

Use the official MySQL 8 image unless there is an explicit need for a custom MySQL Dockerfile.

A single MySQL server may host all development databases while still enforcing logical service ownership.

Where practical, each service should eventually use DB credentials restricted to its own database.

## 19. API/application principles

### Routes should remain thin

Routes mainly handle:

```text
HTTP input
authentication/authorization
Zod validation
calling service logic
HTTP response
```

Do not place significant domain logic directly in route handlers.

### Services own business rules

Examples:

```text
KPI revision overlap validation
Pool validity
ScoreCard weight total = 100%
Monitoring workflow transitions
Close With Exceptions requirements
```

### Prisma is persistence infrastructure

Use Prisma for:

```text
queries
transactions
relations within the same service
migrations
```

Do not force every Prisma entity to have a duplicate `models/` TypeScript file.

### Zod is runtime boundary validation

Use Zod for:

```text
request params
query params
body validation
environment validation where appropriate
```

Zod shape validation does not replace business rules.

Example:

```text
"target is a decimal"
→ Zod

"this effective range overlaps another revision"
→ service/business rule
```

### Pino logging

Prefer structured logging.

Avoid leaking:

```text
passwords
JWTs
Authorization headers
secrets
sensitive raw result data
```

Do not blindly log full request bodies.

### Swagger/OpenAPI

Each service should document its own public HTTP API.

Do not create one fake monolithic API contract that hides service ownership.

## 20. Testing principles

Use Vitest unless a confirmed EXA standard requires another backend test runner.

Prioritize:

```text
service/business rule tests
route/API integration tests
transaction behavior
validation
auth/permission cases
```

Typical endpoint coverage where applicable:

```text
success
invalid request
not found
duplicate/conflict
unauthenticated
forbidden
invalid business state
transaction rollback
```

Tests may be colocated near routes/services, with shared infrastructure in:

```text
src/test/
```

Do not target arbitrary 100% coverage at the expense of critical business rules.

## 21. Docker and lifecycle principles

Each service should eventually own:

```text
Dockerfile
Dockerfile.dev
```

Expected distinction:

```text
Dockerfile.dev
→ development/hot reload

Dockerfile
→ compiled/production-oriented runtime
```

Services should implement graceful shutdown for resources they actually own:

```text
HTTP server
Prisma
NATS connection
background/outbox workers
```

## 22. Backend implementation order

Do not create all domains simultaneously.

Current intended order:

```text
1. Define/approve database ownership
2. exa-kpi-management-service
3. exa-kpi-pool-service
4. exa-scorecards-service
5. exa-monitoring-service
6. exa-reporting-service
7. access integration/service as required
```

For each service:

```text
Ownership Matrix
↓
MySQL 8 model
↓
schema.prisma
↓
seed/migrations
↓
service foundation
↓
health endpoint
↓
business features
↓
tests
↓
frontend integration
```

## 23. Current immediate focus

The immediate implementation focus is only:

```text
exa-kpi-management-service
```

Its database design has already been started outside this root context.

A separate service-specific context should live inside:

```text
Backend/exa-kpi-management-service/KPI_MANAGEMENT_CONTEXT.md
```

when that service directory exists.

That service-specific file will document:

```text
owned KPI Management tables
KPI Definition rules
KPI Configuration rules
configuration revisions
revision thresholds
physical/local FKs
External IDs
catalog seeds
API scope
service-specific non-goals
```

If a service-specific context exists, it is more authoritative for that service than this root-level summary.

## 24. Rules for Codex or any coding agent in `Backend/`

Before making changes:

1. Inspect the current filesystem/repository first.
2. Read this file.
3. Read the target service's service-specific context.
4. Read the current Prisma schema, README and existing tests before proposing changes.
5. Do not invent existing filenames, routes, modules, APIs or conventions.
6. Preserve working EXA conventions when they are already present.
7. Do not modify another microservice unless the task explicitly requires it.
8. Do not create cross-service DB FKs or Prisma relations.
9. Do not add npm dependencies without a concrete need.
10. Do not introduce NATS/Outbox unless the service actually needs asynchronous integration.
11. Keep routes thin and business rules in services.
12. Use DB transactions for multi-write operations that must succeed/fail atomically.
13. Preserve historical data instead of overwriting temporal business rules.
14. Run relevant typecheck/lint/tests after implementation.
15. Report files added/modified and commands run.
16. If documentation conflicts with real existing code, report the conflict before performing a broad rewrite.
17. Do not redesign unrelated modules.
18. Prefer incremental, testable vertical slices over generating an entire service in one huge pass.

## 25. Root-level non-goals

Do not do the following merely because this file exists:

```text
Do not generate all six services.
Do not create all six Prisma schemas.
Do not invent all REST contracts.
Do not implement Kubernetes.
Do not add NATS everywhere.
Do not create a global shared database.
Do not recreate EXA identity/auth without confirming ownership.
Do not migrate frontend mocks yet.
```

This root context exists to keep all KPI backend services architecturally aligned.

Detailed implementation belongs to each service-specific context and task.


## Pagination and large-list performance

Pagination is required for backend endpoints that may return growing or potentially large collections.

Do NOT load entire tables into memory and paginate only in the frontend.

The expected flow is:

Frontend
→ requests a specific page/filter/sort
→ Backend validates pagination parameters
→ Prisma executes a paginated MySQL query
→ MySQL returns only the required rows
→ Backend returns rows + pagination metadata
→ Frontend renders only the requested page

Example:

GET /api/kpi-definitions?page=1&pageSize=20

Possible response:

{
  "data": [...],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "totalItems": 245,
    "totalPages": 13
  }
}

### Backend pagination rules

For list endpoints with potentially growing datasets:

- use server-side pagination;
- validate `page` and `pageSize`;
- define a safe default page size;
- define a maximum allowed page size;
- never expose an unlimited page size by default;
- apply filters and sorting in the database query, before pagination;
- return consistent pagination metadata;
- avoid loading the complete table and then using JavaScript `.slice()`.

With Prisma, typical offset pagination may use:

- `skip`
- `take`
- `orderBy`
- `where`
- `count`

Example conceptual query:

prisma.kpiDefinition.findMany({
  where,
  orderBy,
  skip,
  take
})

The total count should be obtained through an appropriate database query when the UI requires it.

### Database performance rules

Pagination must be supported by appropriate MySQL indexes.

Columns frequently used for:

- filtering;
- sorting;
- searching;
- foreign-key lookup;
- status filtering;
- date filtering;

should be reviewed for indexes based on real query patterns.

Do not add indexes blindly. Indexes improve reads but also have storage and write costs.

Typical example:

If an endpoint frequently executes:

WHERE status_code = ?
ORDER BY created_at DESC

consider whether an index such as:

(status_code, created_at)

matches the real query pattern.

### Offset vs cursor pagination

For ordinary administration screens and moderate datasets, offset pagination is acceptable:

page + pageSize
→ Prisma skip/take
→ MySQL LIMIT/OFFSET

For very large or high-volume tables, especially Monitoring Results, audit/event history, or similar append-heavy datasets, evaluate cursor/keyset pagination instead of very deep OFFSET queries.

Example:

GET /results?limit=50&cursor=123456

Do not introduce cursor pagination everywhere prematurely. Use it where dataset size and query behavior justify it.

### Frontend pagination rules

The React frontend must treat pagination as server state.

Use TanStack Query for paginated API requests.

Changing:

- page;
- page size;
- search;
- filters;
- sort;

should cause the frontend to request the corresponding dataset from the backend.

Do not fetch 10,000 records and paginate them only in React.

The frontend should display backend pagination metadata, for example:

Showing 1–20 of 245
Previous
1 2 3 ...
Next

Search and filters must normally be sent to the backend so filtering occurs before pagination.

### Service-specific expectations

Pagination is especially expected for growing collections such as:

- KPI Definitions
- KPI Configurations
- KPI Pools
- ScoreCards
- Monitoring Results
- Users
- Audit logs
- Historical results
- Reporting lists

Small static lookup catalogs may return the complete active catalog when their size is naturally bounded and small, for example:

- traffic-light levels;
- evaluation types;
- configuration statuses;

unless a future requirement makes pagination necessary.

### Important rule for coding agents

When implementing a list endpoint, first determine whether the collection can grow significantly.

If yes, design:

1. database filtering/sorting;
2. appropriate indexes;
3. backend pagination;
4. pagination metadata;
5. frontend server-side pagination;

as one end-to-end feature.

Do not implement frontend-only pagination over a full database dump.

- For potentially large list endpoints, pagination must be implemented end-to-end: MySQL query → Prisma/backend → API metadata → React/TanStack Query.
- Never fetch an entire large table just to paginate it in the frontend.
- Review indexes for the actual filtering and sorting patterns used by paginated queries.