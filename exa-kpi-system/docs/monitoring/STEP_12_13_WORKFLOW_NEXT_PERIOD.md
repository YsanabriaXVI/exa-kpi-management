# Steps 12–13: Workflow and Next Period

Continuation of Step 11.5, 2026-09-07.

## UI correction after user acceptance feedback

The first delivery connected workflow buttons but did not restore the wizard.
ResultEntry routed directly into a single-page ManualResultEntry, and Overview
only listed materialized Monitoring records. This was not sufficient UI integration.

ManualResultEntry now has five navigable stages: Result Entry, Check Results,
Review & Submit, Approval and Close Period. Check advances to evaluation; successful
workflow transitions advance to the relevant stage. Unsaved edits prevent forward
navigation. Score and Compliance use backend values; Traffic Lights have explicit
colored badges and labels, and unavailable values remain unavailable.

PoolPeriodExplorer is shared by Overview, Result Entry selection and Detail
selection. It lists Pool calendars independently of Monitoring materialization,
shows future/uninitialized periods, resolves readiness on selection and opens the
exact Monitoring identity or explicitly initializes a ready period. KPI Pool list
now retrieves every page. The explorer currently fetches up to 100 periods per Pool.
Overview retains a separate paginated section for initialized periods, now with
Scorecard scores and traffic counts. Detail includes Scorecard scores, scoring
blockers and navigation back to the wizard or all Pool periods. Overview no longer
overrides backend workflow state with local-storage closure state.

Local read-only audit found 7 Pools, 55 calendar periods and 1 initialized Monitoring
period (id 1, Pool 5, August 2026). All 10 inputs in that period have null
effectiveSettingsSnapshot. The original Scorecard materialization projection also
returns null effectiveSettings and revision identity for these assignments. Existing
Results were preserved. These legacy data cannot produce valid current Scores or
Traffic Lights; restoring the original execution settings remains unresolved.
The UI now explains this blocker rather than displaying unexplained blank scores.

Validation after correction: 60 frontend tests passed, including all three discovery
routes, multi-period calendars, the five-stage wizard and colored traffic badges.
105 Monitoring tests passed, plus 2 new Overview tests for current versus stale
baseline scoring. Monitoring typecheck and frontend build passed. The local Vite
server returned the updated wizard and explorer modules (HTTP 200). Monitoring was
restarted and its live API now returns the new scorecards/trafficLights projection.
Browser discovery still returns no connections, so visual browser QA is pending.

## Initial workflow implementation

The authoritative Manual Result Entry screen now calls the existing versioned
Submit, Return for Correction, Approve and Close APIs. It requires confirmation,
blocks actions while Results are dirty or a request is pending, validates return
and exception reasons, and refreshes persisted state and Monitoring caches.
Submission requires a CURRENT Check marked readyForSubmit. Existing backend guards
remain authoritative for Results and baseline versions. Closed periods show final
scores and remain read-only. Missing Results still block submission under the
Step 11 policy; the legacy closure-with-exceptions option does not bypass that policy.

Next Period is available after CLOSED. GET /api/v1/monitoring-periods/{id}/next-period
selects the first calendar period starting after the source end date, without
skipping unconfigured periods. It returns existing Monitoring identity, readiness,
the reason for a blocked successor, or END_OF_SCHEDULE. The resolver is read-only.
The UI explicitly initializes a ready successor through the existing idempotent
materialization API, using that period's own FINALIZED composition. It never copies
Results, baseline resolutions, Checks, or workflow state from the source.
Historical matching continues through Step 11.5 when Check Results is run.

Validation: 105 Monitoring unit/service/API tests; 20 MySQL integration tests,
including submit → return → edit → stale Check rejection → recheck → submit →
approve → close, audit and final-score persistence, and blocked edits after submission
and closure. Next Period service tests cover closed-source guard, chronological
selection, unconfigured successor, existing identity and calendar exhaustion.
54 frontend tests passed (51 in the full suite and 3 new Next Period tests).
Frontend tests cover workflow confirmations, stale/dirty guards, correction reasons,
closed state, opening and initializing successors and calendar exhaustion.

Monitoring typecheck and frontend production build pass. Browser setup and discovery
returned no available browsers; visual review is still pending. The two external
service materialization smoke tests were not run. No new database migration is needed.
