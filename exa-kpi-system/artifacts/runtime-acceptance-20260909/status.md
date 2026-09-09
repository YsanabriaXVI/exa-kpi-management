# Runtime acceptance — 2026-09-09

**FINAL STATUS: acceptance completed.** August Monitoring 37 is CLOSED with
result 90, final score 90 and goalMet=false. Pool acknowledged closure.
September Monitoring 38 is DRAFT with one input and no results, checks, scores
or baseline resolutions. See acceptance-result.md and evidence files 12–26.
The stopped continuations below are retained as execution history.

## Latest continuation: stopped at result entry

The user authorized the existing department 2001 and employee 1001 fixture.
Scorecard 1 was created (HTTP 201), August composition 1 received membership 1
with weight 100 (HTTP 201), and was FINALIZED (HTTP 200).
Monitoring materialization returned HTTP 201:

- August monitoringPeriodId: 37.
- Monitoring Scorecard snapshot ID: 37.
- Monitoring input ID: 76.
- Configuration revision ID: 3.
- Status DRAFT; workflow version 1; resultsVersion 0; baselineVersion 0.

POST http://localhost:4004/api/v1/monitoring-periods/37/result-entry/save-changes
returned HTTP 422 for this request:

```json
{"resultsVersion":0,"changes":[{"monitoringPeriodInputId":"76","resultValue":"90","version":null,"comment":"Manual runtime acceptance: result 90, target 100."}]}
```

Response:

```json
{"error":{"code":"RESULT_ONLY_EDITABLE","message":"Only Result can be edited in Manual Entry V1"}}
```

Monitoring log: time 1788981231397, request 43, the POST endpoint above,
statusCode 422, responseTime 11 ms, message "request completed".
Cause confirmed at result-entry.service.ts:203: supplying a comment different
from the stored comment is rejected. The request unnecessarily added a comment;
the result itself has not yet been evaluated. No code change is required to
remove the optional comment from the runtime request.

A subsequent GET result-entry confirmed resultValue=null, result version=null,
resultsVersion=0, workflow version=1, status DRAFT, check NOT_CHECKED,
and every Scorecard score still null. No Check Results, submit, approval, close
or September initialization was attempted in this continuation.

Files 05 through 11 contain the full runtime requests and responses.
The earlier notes below document the preceding continuation.

## Environment

Applied only KPI Management migration 20260909120000_entity_evaluation_mode
with prisma migrate deploy. Subsequent migrate status: database schema is up
to date (17 migrations). Regenerated Prisma Client 6.19.3.
No reset, db push, seeds, automated tests or application-code changes.

All four services returned HTTP 200 for readiness. JetStream reported three
streams and two consumers. MONITORING_EVENTS consumer
exa-kpi-pool-monitoring-closures-v1 was push_bound=true with num_pending=0 and
num_ack_pending=0.

## Persisted progress

- Definition 2: Test Monitoring Score (existing, reused).
- Configuration 3: target 100, CURRENT_PERIOD, OVERALL, HIGHER_IS_BETTER,
  PROPORTIONAL, floorPercent 0, capPercent 100, APPROVED; existing, reused.
- Pool 1: Acceptance Greater August 2026; activated during this run.
- Membership 1: configuration 3, effective from 2026-08-01; POST returned 201.
- Pool activation event: c9664e48-f031-4a54-8fac-345771003888.
- August Pool period 1, composition 1: POOL_COMPOSITION_LOCKED, kpiCount 1.
- September Pool period 2: previously read as FUTURE_NOT_AVAILABLE.
- No Scorecard created; no Monitoring period materialized during this run.
- No result entered, Check Results, submit, validate, close or next-period call.

Complete action responses are retained alongside this report. These endpoints
did not return optimistic version fields; scoringRuleConfigVersion was 1.

## Stopped lookup

GET http://localhost:4001/api/v1/catalog-management/subject-types/DEPARTMENT/values

Request body: none. HTTP status: 404.

Response:

```json
{"error":{"code":"CATALOG_ITEM_NOT_FOUND","message":"Subject Type not found"}}
```

KPI Management log excerpt (selected fields from the actual log):

```json
{"time":1788980976853,"req":{"id":78,"method":"GET","url":"/api/v1/catalog-management/subject-types/DEPARTMENT/values"},"res":{"statusCode":404},"responseTime":4,"msg":"request completed"}
```

Diagnosis: the requested subject type is not in the published catalog. The
diagnostic GET /api/v1/catalog-management/subject-types returned ASSET,
CUSTOMER, EMPLOYEE, FLEET, LOCATION, OPERATION, PROJECT and SUBDIVISIONS.
The attempted lookup assumed DEPARTMENT was available; this was not a failure
of POST /scorecards or of the Monitoring lifecycle, which have not been called.

The Scorecard UI uses temporaryOrganizationScope from
frontend/src/features/scorecards/organization-fixtures.ts for departments and
employees, rather than IDs returned by an Organization API. The existing
fixture includes department 2001 (Administración), employee 1001 (Andrea Morales),
with company 1 supplied from the Pool API. Using that fixture would require an
explicit exception to the user's API-returned-IDs-only constraint.
