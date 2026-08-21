# EXA Scorecards Service Context

## Responsibility

Scorecards owns the business decision **which KPI Configurations from one finalized KPI Pool composition are used, by whom, and with what weight for one Input Period**.

The flow is:

`KPI Management -> KPI Pool -> Scorecards -> Monitoring Results`

- KPI Management owns KPI Definitions and KPI Configurations.
- KPI Pool owns companies, validity, input frequency, generated Input Periods, and the available KPI Configuration set per Input Period.
- Scorecards owns Scorecard identity, organizational assignment, per-period KPI selection, linked Scorecards, weights, and composition finalization.
- Monitoring owns expected result lines, entry, validation, exceptions, calculations, and period closure.

## Time ownership

Scorecards does not define an independent calendar. A Scorecard references one KPI Pool and consumes its validity, frequency, and Input Periods. Pool schedule values may be stored as snapshots for traceability, but they are never user-configurable Scorecard decisions.

There is deliberately no `scorecard_result_schedule_preview`, no editable Scorecard frequency, and no Scorecard-owned validity range in this database.

## Aggregate

`scorecards` is the aggregate root. A Scorecard has:

- a single external KPI Pool source;
- company, department, and employee scope snapshots;
- zero or more per-Input-Period compositions;
- selected KPI Configurations and linked Scorecards inside each period composition;
- an aggregate version and soft-delete marker.

`scorecard_period_compositions` separates August selection from September selection. Finalization makes that period composition read-only and publishes the set downstream. It does not create Monitoring result lines.

## Lifecycle versus period state

The global Scorecard lifecycle is intentionally small:

- `DRAFT`: created, but its first period composition has not been finalized;
- `ACTIVE`: its first period composition has been finalized;
- `INACTIVE`: excluded from new operations while history remains readable.

`EXPIRED` is not persisted. It is an operational read state derived from the source Pool validity.

Period composition state is separate and persists only `PREPARING` or `FINALIZED`. UI states such as `FUTURE`, `READY_TO_FINALIZE`, or `LOCKED` are derived from Pool availability and workflow dependencies.

## Pool projections and selection authority

`pool_references`, `pool_period_references`, and `pool_period_membership_references` are local projections, not copied ownership. They allow Scorecards to know which Pools are ACTIVE and which exact same-period Pool compositions and memberships are FINALIZED without cross-database joins.

A Scorecard period composition records all of:

- `kpi_pool_external_id`;
- `pool_period_external_id` when the Pool contract supplies one;
- `pool_composition_external_id`;
- `period_key`, start, and end.

A KPI Configuration can be selected only when its Pool membership belongs to that exact finalized Pool composition and Input Period. Existence in KPI Management alone is insufficient.

## Organizational scope and collaborators

Departments and current collaborators are Scorecard scope. The backend must validate that departments belong to companies allowed by the source Pool and that collaborators belong to the selected departments. Companies remain inherited Pool context, not a Scorecard-managed catalog.

Scorecards stores current collaborator assignment. Monitoring must snapshot the applicable collaborators when it creates a period workload so later organizational changes do not rewrite history.

## External boundaries

No cross-database foreign keys are allowed. The following values are External IDs:

- `kpi_pool_external_id` and Pool period dates: owned by exa-kpi-pool-service;
- `kpi_pool_membership_external_id`: owned by exa-kpi-pool-service;
- `kpi_definition_external_id` and `kpi_configuration_external_id`: owned by exa-kpi-management-service;
- company, department, employee, and user IDs: owned by their future organizational/identity authority.

External IDs are accompanied by the minimum code/name snapshots needed for audit and resilient reads. External existence and eligibility are validated through service contracts or local projections, never with physical database FKs.

## Physical foreign keys

Physical FKs exist only between tables owned by exa-scorecards-service:

- Scorecard -> Scorecard Status;
- company/department scopes -> Scorecard;
- employee scope -> Scorecard Department Scope;
- period composition -> Scorecard;
- period KPI -> period composition;
- period linked Scorecard -> period composition and linked Scorecard;
- Outbox is standalone and transactionally written with aggregate mutations.

## Weight rules

- Each selected KPI or linked Scorecard weight is greater than 0 and at most 100.
- A finalized period composition must total exactly 100 percent across own KPIs and linked Scorecards.
- A KPI Configuration may appear at most once in one Scorecard period composition.
- A linked Scorecard may appear at most once and a Scorecard cannot link to itself.
- Backend enforcement remains authoritative; summary values are derived, not a second source of truth.
- Self-links are forbidden. Direct and transitive circular links across Scorecards are rejected for the same Input Period both when linking and before finalization.

## Scorecard codes

Canonical codes use `SC-{AREA_SCOPE}-{SEQUENCE}-{ISSUE_YEAR}`, for example `SC-OPS-01-2026`. Company, department, and frequency are not encoded. `scorecard_code_sequences` allocates the next value by area scope and year inside the same transaction as Scorecard creation; `MAX(id) + 1` is forbidden.

## Integration style

- REST answers information needed now, including eligible ACTIVE Pools.
- NATS announces facts that occurred.
- Scorecards is designed to consume `kpi.pool.activated.v1`, `kpi.pool.deactivated.v1`, `kpi.pool.period.composition.finalized.v1`, and `kpi.pool.validity.extended.v1` into local projections.
- `processed_events` makes redelivery safe.
- Scorecards publishes `scorecard.created.v1`, `scorecard.activated.v1`, `scorecard.composition.finalized.v1`, and `scorecard.deactivated.v1` through the Transactional Outbox.

Finalizing a period requires an exact total of `100.0000` across KPI and linked-Scorecard weights. PREPARING compositions may temporarily be under or over 100. Finalized compositions are immutable.

The Pool finalization contract now publishes stable `poolPeriodId`, `poolCompositionId`, `periodKey`, and the finalized membership snapshot with Pool membership, KPI Definition, and KPI Configuration External IDs. The durable JetStream consumer projects this contract transactionally and records `processed_events` before acknowledging delivery. Legacy finalized events that predate this contract are terminated without fabricating identifiers; current state remains available through Pool REST.

## Scorecard Information API

Scorecard Information is persisted through paginated REST endpoints. Creation validates an ACTIVE source Pool, inherits its company snapshots, generates `SC-{AREA_SCOPE}-{SEQUENCE}-{YEAR}` transactionally, and emits `scorecard.created.v1` through Outbox. Department input includes its external Company ID; the service rejects departments outside the selected Pool company scope. Until an Organization service contract exists, Scorecards cannot independently prove the Department master record beyond that declared external relationship.

## Frontend integration status

Overview, Detail, Assignment, KPI selection, linked-Scorecard selection, weight persistence, and finalization now use the port 4003 REST API. The former in-memory Assignment store has been removed. Pool Source and inherited schedule use real Pool external IDs and contracts.

Temporary Department and collaborator records live behind `organization-fixtures.ts` because an Organization service does not exist yet. `CreateScorecardInfo.tsx` consumes that replaceable boundary and submits only External IDs and snapshots; Scorecards does not treat those fixtures as an owned catalog.

Scorecard Overview sends page, page size, search, supported filters, and sorting to port 4003. Prisma applies `where`, `orderBy`, `skip`, `take`, and `count`; the frontend must not load an arbitrary maximum and slice it locally.

## Deliberately not owned

This service does not own Pool composition, Pool Input Period generation, Monitoring results, expected inputs, result entry, validation, close-period state, KPI measurement definitions, companies, departments, employees, or authentication credentials.
