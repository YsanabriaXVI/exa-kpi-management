# KPI Definition mock-data audit

## Actual source

KPI Definition data is not stored under `frontend/src/mocks`. The live mock
service builds its array in:

`frontend/src/features/kpi-definition/kpi-definition.service.ts`

It combines one explicit definition (`KPI-051`) with the 50 KPI rows exported
by `monitoring-results.data.ts` (6 base rows plus 44 generated rows).

## Importable fields

| Frontend field | Database target | Decision |
|---|---|---|
| `code` | `kpi_definitions.kpi_code` | Business key; preserve value |
| `name` | `kpi_definitions.kpi_name` | Import |
| `objective` / generated objective | `kpi_definitions.description` | Import as description |
| inferred `category` | normalized `kpi_categories` row | Resolve through category code and FK |
| `status` | `status_code` + `is_active` | Import consistently |

Mock numeric IDs are deliberately ignored. MySQL assigns primary keys.
Mock actor names and timestamps are deliberately ignored because they are not
valid Access-service IDs or authoritative audit history.

## Fields excluded from KPI Definition

The Monitoring source also contains `unit`, `dataSource`, `goal`, `result`,
`compliance`, `score`, `method`, `entryStatus`, `validation`, and
`trafficLight`. These belong to KPI Configuration or Monitoring and are not
inserted by this import.

`configUsageByDefinition` is also excluded in full because it represents KPI
Configuration data.

## Conflicts found

The `initialDefinitions` constant declares KPI-049, KPI-050, KPI-051 and
KPI-052, but the runtime array consumes only KPI-051. KPI-049, KPI-050 and
KPI-052 conflict with rows coming from Monitoring (same codes, different
names/meaning). They are dead data and are excluded rather than guessed or
merged.

The 51 runtime codes are unique and valid for `VARCHAR(30)`. Runtime statuses
are valid and descriptions are non-empty. Repeated KPI names with the suffix
`- Regional` are intentional distinct definitions with distinct codes.

## Normalized categories

Category names used by the current frontend inference are converted to stable
business codes:

- `CUSTOMER_SERVICE`
- `FINANCIAL`
- `HUMAN_RESOURCES`
- `OPERATIONS`
- `SECURITY`
- `SYSTEMS`

These six rows are initial development data derived from the current mock, not
an assertion that they are the final official EXA catalog.

## Idempotency and overwrite policy

The importer runs all writes in one local Prisma transaction. Categories are
matched by `code`; definitions are matched by `kpiCode`.

- Missing records are created.
- Existing records are preserved exactly as stored.
- Existing records are not overwritten on later runs.
- Mock numeric IDs are never used as database IDs.

This create-only policy makes repeated execution safe and prevents development
seed runs from erasing edits made through the real API.

The frontend mock files remain unchanged until KPI Definition is connected to
the real API in a separate task.
