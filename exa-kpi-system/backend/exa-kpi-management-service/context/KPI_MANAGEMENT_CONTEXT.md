# EXA KPI Management Service Context

This document contains rules specific to `exa-kpi-management-service`. It complements `../../BACKEND_CONTEXT.md`, which remains authoritative for rules shared by every backend microservice.

## Ownership

This service owns:

- KPI Definitions.
- KPI Configurations.
- KPI Configuration revisions.
- Revision-level traffic-light thresholds.
- KPI categories, measurement units, input frequencies, traffic-light levels, data sources, configuration statuses, and evaluation types.

Its database is `exa_kpi_management`.

## Service boundary

Tables owned by this service may use physical MySQL foreign keys and Prisma relations with each other. References to entities owned by other services are scalar External IDs only, without cross-database foreign keys or cross-service Prisma relations.

`created_by_user_id` and `updated_by_user_id` are External IDs owned by Access/Identity. This service does not own User, Pool, Scorecard, Monitoring, or Reporting tables.

## Temporal configuration rules

`kpi_configurations` represents stable configuration identity. Targets, evaluation types, effective dates, and thresholds belong to immutable historical revisions. A new revision must not overwrite historical rules, overlap another revision for the same configuration, or silently change submitted, validated, or closed Monitoring periods.

Applying a revision to a current period is an explicit future integration with Monitoring and is allowed only when that period is editable.

## HTTP and application rules

- Routes and controllers remain thin.
- Zod validates HTTP boundaries; services enforce business rules.
- Multi-write operations use Prisma transactions.
- Growing lists use database filtering, sorting, and pagination.
- Small bounded catalogs may return all active values.
- Pino logs must not expose credentials, tokens, authorization headers, or sensitive bodies.

## Initial implementation order

1. Service foundation and health checks.
2. Prisma schema derived from the approved MySQL 8 design.
3. Initial migration and catalog seeds.
4. KPI Definition vertical slice with tests.
5. KPI Configuration, revisions, and thresholds with transactional tests.

## Non-goals

This service does not implement Pool, Scorecards, Monitoring Results, Reports, identity ownership, NATS, or an outbox unless a later explicit contract requires them.
