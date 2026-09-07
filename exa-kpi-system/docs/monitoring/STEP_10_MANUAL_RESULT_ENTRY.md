# Step 10 — Manual Result Entry

Implemented for materialized Monitoring Periods. Open Result Entry and select a period, then select Manual before entering Results.

- One editable Result per frozen OVERALL or ENTITY evaluation. Goals, Result Units, Goal Units and weights remain frozen. Group Goal is informational, with no Group Result input or group scoring.
- Save partial results, including zero, exact decimals (14 integer and 6 fractional digits), edits and clears. Blank means pending. Completion counts persisted Results.
- Manual selection persists on the period. Writes require DRAFT and cannot mix with existing Excel batches. Historical comparisons and non-executable configurations are blocked.
- Saves are atomic and check both period resultsVersion and row version. Conflicts preserve typed values; reloading saved Results asks before discarding edits.
- Changes create audit revisions and invalidate previous validation. Saving does not calculate scores. Unchanged values create no revisions.
- Page unload and link navigation warn about unsaved Results. Monitoring query caches refresh after saving.

Database migration: `backend/exa-monitoring-service/prisma/migrations/20260907150000_manual_result_entry_context/migration.sql` adds the persisted entry method, results version and frozen settings context. Apply with the service's `npm run prisma:migrate:deploy` command before running the updated service.

Verification:

- Frontend: `npm test` and `npm run build`.
- Monitoring service: `npm test` and `npm run typecheck`.
- MySQL: `npm run test:integration` verifies persistence, partial completion, zero, decimal precision, audit revisions, stale versions, foreign input rejection and competing saves.
- Materialization: `npm run test:materialization` verifies OVERALL and ENTITY snapshots against MySQL using the integration connection.

Check Results, the full workflow, historical comparison and Excel remain separate roadmap steps.

## Results version and scoring validity

Checks record `basedOnResultsVersion = period.resultsVersion`. The request's `version` remains an optimistic workflow lock and is never used as the Results version. New validation runs are append-only records (`RECORDED` in storage), including a JSON snapshot of evaluated inputs and Scorecards. The latest run is exposed as CURRENT only when its base version matches the current Results and the period's current scoring version. Otherwise it is STALE; the historical record is not updated.

A real Result change clears all materialized KPI and Scorecard scoring within the save transaction and clears `currentScoringResultsVersion`. Read endpoints also mask scoring with missing or mismatched version provenance. No-op saves and workflow-only changes preserve scoring validity. Close copies the checked Scorecard preview into the final score without recalculating the historical Check.

Migration `20260907170000_validation_results_version` preserves old `results_version` values as `legacyWorkflowVersion`; their Results provenance is unknown (`basedOnResultsVersion = NULL`) and is never inferred from the current period. Existing scoring remains stored for audit but is not exposed as current without a new Check.
