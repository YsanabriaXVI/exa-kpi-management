# EXA KPI Management Service — Database Ownership Matrix

## Scope

This matrix covers the first microservice:

```text
exa-kpi-management-service
        ↓
exa_kpi_management
```

It owns both:

- KPI Definition
- KPI Configuration

The original SQL has been adapted to MySQL 8 and extended with configuration revisions and revision-level thresholds.

---

## Core rule

```text
SAME MICROSERVICE
→ Physical FK in MySQL
→ Prisma @relation

DIFFERENT MICROSERVICE
→ External ID only
→ NO cross-database FK
→ NO Prisma @relation to the external service
```

`created_by_user_id` and `updated_by_user_id` are intentionally retained as numeric IDs, but their FK constraints to `users` are removed because Users/Identity belongs to another service.

---

## Ownership matrix

| Table | Domain | Owner service | PK | Physical/local FKs | External IDs | Snapshot relevance | Action |
|---|---|---|---|---|---|---|---|
| `kpi_categories` | KPI Definition | KPI Management | `kpi_category_id` | — | created/updated user | Low | KEEP / MySQL8 adapt |
| `measurement_units` | KPI Config catalog | KPI Management | `measurement_unit_id` | — | created/updated user | Copied into Monitoring snapshots when needed | KEEP / MySQL8 adapt |
| `input_frequencies` | KPI Config catalog | KPI Management | `input_frequency_id` | — | created/updated user | Monitoring may snapshot code/name | KEEP / MySQL8 adapt |
| `traffic_light_levels` | KPI Config catalog | KPI Management | `traffic_light_level_id` | — | created/updated user | Threshold snapshot uses semantic level | KEEP / MySQL8 adapt |
| `data_sources` | KPI Config catalog | KPI Management | `data_source_id` | — | created/updated user | Monitoring may snapshot source information | KEEP / MySQL8 adapt |
| `kpi_configuration_statuses` | KPI Config catalog | KPI Management | `kpi_configuration_status_id` | — | created/updated user | No historical recalculation | KEEP / MySQL8 adapt |
| `evaluation_types` | KPI Config catalog | KPI Management | `evaluation_type_id` | — | created/updated user | **Yes**: applied type must be snapshotted in Monitoring | KEEP / MySQL8 adapt |
| `kpi_definitions` | KPI Definition | KPI Management | `kpi_definition_id` | `kpi_category_id` → `kpi_categories` | created/updated user | Monitoring may copy code/name | KEEP + add missing local FK |
| `kpi_configurations` | KPI Configuration | KPI Management | `kpi_configuration_id` | definition, unit
, frequency, source, status | created/updated user | Identifies stable config | MODIFY: target/evaluation removed from stable row |
| `kpi_configuration_revisions` | KPI Configuration | KPI Management | `kpi_configuration_revision_id` | configuration, evaluation type | created/updated user | **Critical**: Monitoring stores revision ID + snapshot | **ADD** |
| `kpi_configuration_revision_thresholds` | KPI Configuration | KPI Management | `kpi_configuration_revision_threshold_id` | revision, traffic light level | created/updated user | **Critical**: thresholds must be historical | **ADD** |
| `kpi_configuration_thresholds` (old) | KPI Configuration | KPI Management | old PK | config, traffic light | user IDs | Historical problem | **REPLACE** by revision thresholds |

---

# Physical foreign keys that remain

These relationships are entirely inside `exa_kpi_management`, therefore they should remain real MySQL FK constraints and normal Prisma relations.

```text
kpi_definitions.kpi_category_id
→ kpi_categories.kpi_category_id


kpi_configurations.kpi_definition_id
→ kpi_definitions.kpi_definition_id


kpi_configurations.measurement_unit_id
→ measurement_units.measurement_unit_id


kpi_configurations.input_frequency_id
→ input_frequencies.input_frequency_id


kpi_configurations.primary_data_source_id
→ data_sources.data_source_id


kpi_configurations.kpi_configuration_status_id
→ kpi_configuration_statuses.kpi_configuration_status_id


kpi_configuration_revisions.kpi_configuration_id
→ kpi_configurations.kpi_configuration_id


kpi_configuration_revisions.evaluation_type_id
→ evaluation_types.evaluation_type_id


kpi_configuration_revision_thresholds.kpi_configuration_revision_id
→ kpi_configuration_revisions.kpi_configuration_revision_id


kpi_configuration_revision_thresholds.traffic_light_level_id
→ traffic_light_levels.traffic_light_level_id
```

---

# External IDs

These columns stay in the tables but intentionally DO NOT have physical foreign keys in this service:

```text
created_by_user_id
updated_by_user_id
```

Logical ownership:

```text
exa-kpi-management-service
        │
        │ external user ID
        ▼
Access / Identity service
```

The backend should obtain the authenticated user ID from the JWT/auth context and persist it for traceability.

No direct SQL join against another service database.

---

# Step 3 — Configuration revisions

## Why the original model had a problem

Original:

```text
kpi_configurations
└── target_value = 15
```

If somebody later executes:

```text
15 → 18
```

and simply updates `target_value`, the old value disappears.

That makes it impossible to reliably reconstruct:

```text
Jan-Jul → 15%
Sep-Dec → 18%
```

without an additional historical structure.

---

## New model

```text
kpi_configurations
        │
        ├── revision 1
        │     target = 15
        │     effective_from = 2026-01-01
        │     effective_to   = 2026-08-31
        │
        └── revision 2
              target = 18
              effective_from = 2026-09-01
              effective_to   = NULL
```

`kpi_configurations` represents the stable identity/configuration.

`kpi_configuration_revisions` represents time-sensitive evaluation rules.

---

# What moves from configuration to revision

Removed from `kpi_configurations`:

```text
target_value
evaluation_type_id
```

Moved to:

```text
kpi_configuration_revisions.target_value
kpi_configuration_revisions.evaluation_type_id
```

Reason:

Both affect how a result is evaluated and therefore must be historically reproducible.

---

# Revision thresholds

The old:

```text
kpi_configuration_thresholds
        ↓
kpi_configuration_id
```

has been replaced by:

```text
kpi_configuration_revision_thresholds
        ↓
kpi_configuration_revision_id
```

Therefore:

```text
Revision 1
├── target 15%
├── Green threshold A
├── Yellow threshold A
└── Red threshold A

Revision 2
├── target 18%
├── Green threshold B
├── Yellow threshold B
└── Red threshold B
```

Changing a threshold in September no longer changes the rules that were used in previous periods.

---

# MySQL 8 adaptations made

The original schema contained syntax that was not fully MySQL 8 compatible.

Changes include:

```text
timestamptz
→ DATETIME(3)

DEFAULT (now())
→ DEFAULT CURRENT_TIMESTAMP(3)

numeric(...)
→ DECIMAL(...)

PostgreSQL regex operator:
hex_color ~ '...'
→ MySQL 8 REGEXP_LIKE(...)

explicit InnoDB engine
utf8mb4 charset/collation
```

Also added the missing physical FK:

```text
kpi_definitions.kpi_category_id
→ kpi_categories.kpi_category_id
```

The previous index:

```text
UNIQUE (kpi_configuration_id, kpi_definition_id)
```

was removed because `kpi_configuration_id` is already the primary key and therefore that composite unique index added no useful integrity rule.

---

# Important rules that belong in the Service layer

MySQL alone should not attempt to enforce every business rule.

The backend service must validate:

## 1. Revision ranges cannot overlap

Invalid:

```text
Revision 1
Jan 1 - Sep 30

Revision 2
Sep 1 - Dec 31
```

because September overlaps.

---

## 2. Default revision effective date

A new KPI configuration revision should normally apply from:

```text
NEXT INPUT PERIOD
```

Example:

Change made during August:

```text
August → old revision
September → new revision
```

---

## 3. Current-period exception

Applying a revision to the current period is allowed only when explicitly selected and the corresponding Monitoring period is:

```text
DRAFT
```

It must not silently mutate:

```text
SUBMITTED
VALIDATED
CLOSED
```

periods.

---

## 4. Monitoring owns the historical snapshot

KPI Management owns the configuration revision.

Monitoring should later store:

```text
kpi_configuration_id
kpi_configuration_revision_id

kpi_code_snapshot
kpi_name_snapshot
target_snapshot
evaluation_type_snapshot
measurement_unit_snapshot
traffic_light_thresholds_snapshot
```

Therefore Reporting can reconstruct historical results without querying the current KPI configuration.

---

# Recommended Prisma boundary

The future:

```text
exa-kpi-management-service/prisma/schema.prisma
```

should contain only this service's models.

It must NOT contain:

```text
User
Pool
Scorecard
MonitoringPeriod
Report
```

just to create Prisma relations.

For example:

```text
createdByUserId BigInt?
```

is a scalar/external ID, not:

```text
createdBy User @relation(...)
```

---

# Next technical step

After reviewing/approving this ownership:

```text
1. Convert this MySQL 8 schema into schema.prisma.
2. Create initial migration.
3. Add catalog seeds.
4. Build the EXA-style Backend Foundation.
5. Start with KPI Definition vertical slice.
6. Then KPI Configuration + revisions.
```
