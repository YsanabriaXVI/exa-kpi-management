# Step 9.5 — Explicit entity evaluation weights

Scorecard Assignment now edits one weight per effective BY_ENTITY subject. Missing weights remain null; zero is an explicit value. The existing weights endpoint accepts `entityWeights: [{ subjectExternalId, weight }]` on each KPI assignment. Subject identities are validated against Pool Effective Settings, not supplied labels or goals.

Persistence adds the nullable `scorecard_period_kpis.entity_weights` JSON column through migration `20260907120000_explicit_entity_weights`. Weights are normalized with Prisma Decimal to four decimal places. For BY_ENTITY, the existing parent `weight_percent` is a cached subtotal for compatibility with composition summaries, not an additional evaluation weight.

FINALIZED validates the complete entity cohort and explicit weights, then validates the combined entity, OVERALL, and linked Scorecard weights against exactly 100. The frozen effective-settings snapshot includes `evaluationWeightsVersion: EXPLICIT_ENTITY_V1` and each subject's explicit `weight` alongside its identity, label and goal. Goal and result units and remaining execution metadata stay in the snapshot. Group Goal has no weight and generates no weighted evaluation.

Monitoring consumes each frozen subject weight directly. It no longer divides a parent weight. Existing materialized periods are returned without rewriting their inputs. Legacy FINALIZED snapshots are not migrated or reconstructed; attempting to materialize a legacy BY_ENTITY snapshot without explicit weights returns `FROZEN_ENTITY_WEIGHTS_MISSING`. That case needs a separate historical policy, not an inferred allocation.

Validation performed: Scorecards service tests (34 passing), Monitoring service tests (30 passing, integration suites opt-in), MySQL materialization tests (2 passing), Assignment UI tests (3 passing), both backend typechecks, frontend build, and workspace-scoped `git diff --check`. The Scorecards migration was applied in development and Monitoring migration status was current. Frontend build retains its existing bundle-size warning.

Step 10 and Group Result runtime are not implemented by this prerequisite.
