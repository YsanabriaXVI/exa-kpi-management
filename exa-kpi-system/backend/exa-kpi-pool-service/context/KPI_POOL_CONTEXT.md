# KPI Pool Service Context

## Boundary and responsibility

`exa-kpi-pool-service` owns reusable KPI Pool context. The domain flow is KPI Definition → KPI Configuration → KPI Pool → Scorecard → Monitoring. A Pool defines validity, one input frequency, one or more Pool Areas, one or more companies, and an explicitly managed set of existing KPI Configurations. Creation starts with zero memberships.

The service does not create or modify KPI Definitions or Configurations, goals, units, thresholds, Scorecards, Monitoring results, or corporate master data. Pool membership authorizes configurations for later Scorecard selection; it does not make Monitoring request every Pool KPI. Monitoring must follow the subset actually selected by applicable Scorecards.

## Ownership and identifiers

Tables in `exa_kpi_pool` are owned operationally by this service. Physical foreign keys are allowed only between its local tables. References to another bounded context are scalar External IDs with no cross-database foreign key and no cross-service Prisma relation.

External IDs are `kpi_definition_external_id`, `kpi_configuration_external_id`, `input_frequency_external_id`, `external_company_id`, and audit actor IDs (`created_by_user_id`, `updated_by_user_id`). Database `BIGINT` values must cross future JSON API/event boundaries as strings.

`company_references` is a local read projection, not the company master. A future Organization/Access owner may synchronize it through NATS events. `input_frequency_references` is likewise a local read projection of the catalog owned by KPI Management. The scalar frequency recorded on a Pool remains an External ID. Projection FKs only protect local projection consistency; they do not imply master-data ownership.

## Pool Areas and companies

Pool Areas are a distinct local catalog, unrelated to KPI Definition categories. `pool_areas` and `kpi_pool_areas` model the multiselect. The approved initial catalog is OPS/Operations, SEG/Security and FIN/Finance. Companies use `company_references` and `kpi_pool_companies`. Association rows retain ordered code/name snapshots for historical readability. Development bootstraps provisional external IDs 1–4 for EXA, CONMOXA, TREXA and La Mega; these must be reconciled with the future corporate owner before production integration.

## Business code and sequence

The official format is `{AREAS}-{SEQUENCE}-{ISSUE_YEAR}`, for example `OPS-SEG-FIN-01-2026`. Backend ordering is canonical: `display_order`, then `code`; click order is irrelevant. `area_scope_key` uses pipe separators, such as `OPS|SEG|FIN`. Relations are never reconstructed by splitting the presentation code. Companies remain mandatory, normalized Pool scope in `kpi_pool_companies`, but they never appear in the business code.

The sequence scope is the normalized area set + issue year. Company selection does not affect or reset it. `issue_year` is the backend-controlled year of issuance/creation, not necessarily the validity year. `kpi_pool_code_sequences` has one unique row per area/year scope. Future creation must atomically upsert/lock and increment this row in the same Prisma transaction that creates the Pool and its associations. `pool_code` and the area/year/sequence unique constraint are secondary defenses. `MAX(sequence)+1` is forbidden.

## Lifecycle and validity

The lifecycle is `DRAFT → ACTIVE → INACTIVE`; Pools are not physically deleted for normal lifecycle changes. `ACTIVE` means validated and available to eligible Scorecards. Temporal state is derived independently: an active Pool may be UPCOMING, CURRENT, or EXPIRED based on `valid_from`/`valid_to`. EXPIRED is not a lifecycle value and no cron changes lifecycle automatically.

Activation is the domain command `POST /api/v1/kpi-pools/:id/activate`, not a status toggle. It revalidates: DRAFT state, at least one area/company/KPI, valid dates/frequency, active eligible configurations, exact frequency match, and no duplicated Definition. The transaction changes lifecycle and inserts an Outbox event together.

While DRAFT, structural information and the initial membership may change freely. Once ACTIVE, core identity remains locked: areas, companies, validity boundaries, frequency, issue year and code do not change. `ACTIVE` means published for Scorecard use; it no longer freezes KPI membership forever. Membership additions, retirements and replacements may be scheduled only for future editable Input Periods. INACTIVE accepts no new planning and never destroys history.

## Membership and availability

Membership is manual and effective-dated with inclusive `effective_from` and nullable inclusive `effective_to`. Global uniqueness by Pool/Definition, Pool/Configuration and display order was removed because it prevented valid non-overlapping history and re-adding a Configuration later. The invariant is now one effective Configuration per KPI Definition in one Pool/Input Period. The service checks interval overlap inside a transaction after locking the Pool row, serializing concurrent membership commands.

For DRAFT, initial membership starts at `pool.valid_from`; unlinking may physically remove an unpublished row. For ACTIVE, the default target is the next full Input Period. Add creates a future interval, retire closes the existing interval at the previous period end, and replace atomically retires the old Configuration and adds the new one. Historical ACTIVE rows are never deleted. Supported frequency metadata is 1, 3, 4, 6 or 12 months; validity must contain complete calendar periods and cannot exceed 12 months.

For MVP, Pool frequency must exactly equal Configuration frequency. Availability is derived for a target Input Period. Reasons include `KPI_CONFIGURATION_INACTIVE`, `KPI_DEFINITION_INACTIVE`, `INPUT_FREQUENCY_INACTIVE`, `FREQUENCY_MISMATCH`, `KPI_DEFINITION_ALREADY_EFFECTIVE`, `CONFIGURATION_ALREADY_EFFECTIVE`, `POOL_INACTIVE`, `POOL_OUTSIDE_VALIDITY`, `POOL_PERIOD_LOCKED`, and `NO_FUTURE_EDITABLE_PERIOD`. `POOL_STRUCTURE_LOCKED` applies only to core Pool edits. UI selection state is never persisted.

## Input Period integrity and downstream boundaries

Monitoring owns Input Period configuration (`EDITABLE → LOCKED`) and result workflow (`DRAFT/PENDING → SUBMITTED → VALIDATED → CLOSED`). Pool creates no Monitoring tables and does not pretend to know result state. Until Monitoring integration exists, ACTIVE commands conservatively affect future periods only and default to the next Input Period. A future REST gateway or NATS-fed projection will replace this fallback.

Pool now owns the narrower **Pool Composition per Input Period** decision. `POST /api/v1/kpi-pools/:id/input-periods/finalize` validates an ACTIVE Pool, an eligible future period, at least one effective membership, unique Definitions, active Configuration/Definition/frequency references and exact frequency compatibility. It then persists `EDITABLE → POOL_COMPOSITION_LOCKED` in `kpi_pool_period_compositions` and writes `kpi.pool.period.composition.finalized.v1` to Outbox in the same transaction. This does not publish Scorecards, close Monitoring, close the Pool, or create a Monitoring result period. The three concepts remain distinct: `POOL_COMPOSITION_LOCKED`, future `SCORECARDS_PUBLISHED`, and future `MONITORING_CLOSED`. A finalized composition permanently rejects add, retire and replace commands for that period; the next eligible period remains independently editable.

Planning and finalization are separate permissions. A future composition may have `canEditComposition = true` while `canFinalizeComposition = false`. The first Input Period has no predecessor dependency. Every later period may be finalized only after Monitoring authoritatively reports the preceding period as `CLOSED` or `CLOSED_WITH_APPROVED_EXCEPTION`; otherwise the command returns `PREVIOUS_INPUT_PERIOD_NOT_CLOSED`. Until a real Monitoring REST contract or event-fed projection exists, the `PeriodFinalizationGateway` reports the dependency as unknown and never fabricates closure. This safely permits planning while preventing premature publication.

Pool membership determines availability. Scorecard independently selects the evaluated subset and weights; Pool changes never auto-mutate Scorecards. Once Monitoring locks/generates a period, it must persist an immutable snapshot of Pool, Scorecard, Configuration revision, goal, units, evaluation rules, thresholds, weights and organizational context. Submitted, Validated and Closed periods must never be reconstructed or silently recalculated from current state.

## REST, NATS, Outbox, and idempotency

REST answers questions requiring an immediate response, such as batch validation of Configuration IDs in KPI Management. NATS reports facts that occurred. NATS does not replace REST and validation uses a batch endpoint rather than N+1 calls.

KPI Management exposes `POST /api/v1/kpi-configurations/batch-lookup` for validation and a paginated internal catalog for discovery. Pool calls the batch once per requested membership operation and uses `data` plus `notFoundIds` to validate existence, Configuration status, Definition identity and frequency. React only calls Pool; it does not consume internal KPI Management endpoints.

JetStream provides durable messaging. The local `outbox_events` table stores an envelope in the same transaction as activation/deactivation. The processor claims work with row locking and `SKIP LOCKED`, recovers stale claims, publishes with `event_id` as the JetStream message ID, and uses bounded exponential retry. Exhausted events move to `DEAD` for manual review.

The standard envelope contains `eventId`, versioned `eventType`, ISO `occurredAt`, producer, aggregate type/ID, numeric aggregate version, and deliberately shaped `data`; Prisma objects are never emitted. Implemented events are `kpi.pool.activated.v1`, `kpi.pool.deactivated.v1`, `kpi.pool.kpi.added.v1`, and `kpi.pool.kpi.retired.v1`. Membership events carry IDs and effective boundaries. Future Monitoring contracts may publish `monitoring.input-period.locked.v1` and `monitoring.input-period.closed.v1`; no fake consumer exists today.

NATS availability is reported by readiness but does not make read-only HTTP unavailable. MySQL failure returns 503. The Outbox permits broker outages without losing committed facts.

## SQL audit decisions

The proposed seed was treated as design input, not executed as schema authority. Its company master and departments exceeded Pool ownership; they became a company projection and departments were removed. `EXPIRED` was removed from lifecycle. Availability tables were removed because availability is derived. Missing local frequency/company projections, immutable snapshots, aggregate version, Outbox, and explicit sequence identity were added. Cross-service IDs were renamed with `external` semantics and kept free of FKs. Indexes that only duplicated unique/FK coverage were avoided. The migration uses MySQL 8.4 `DATETIME(3)`, enforced `CHECK`s, InnoDB, and `utf8mb4_0900_ai_ci`; scope lengths are 255 so composite indexes remain within InnoDB limits.

## Future API direction

Pool Info, effective-dated membership, period-aware availability, readiness, activation and deactivation APIs exist. Every create starts DRAFT with zero memberships. Structural PATCH remains DRAFT-only; ACTIVE membership planning is future-period-only. Scorecard, Monitoring, Reporting, production authentication and Monitoring lock integration are separate milestones.
