# Basic Input Validation Matrix V1

Status: **IMPLEMENTED — TECHNICAL RULES V1**  
Scope: Monitoring `Check Results`. Business scoring remains governed by the approval status in `KPI_EVALUATION_CATALOG_V1.md`.

| Code | Condition | Severity | Blocks Submit | Blocks Approval | Exception allowed | Behavior |
|---|---|---|---:|---:|---:|---|
| `RESULT_MISSING` | Required Expected Result has `result_value = NULL` | ERROR | Yes by default | Yes by default | Yes, with explicit justification at Submit, Approval and Close | Scoring fields remain `NULL`; affected final Scorecards remain unavailable |
| `OPTIONAL_RESULT_MISSING` | Optional Expected Result has `result_value = NULL` | PENDING | No | No | Yes | `MISSING`; scoring fields remain `NULL` |
| `RESULT_NOT_NUMERIC` | API/Excel raw Result is not a decimal | ERROR | Yes | Yes | No | Reject before persistence; never coerce to zero |
| `RESULT_PRECISION_EXCEEDED` | Result exceeds `DECIMAL(20,6)` | ERROR | Yes | Yes | No | Reject before persistence; never truncate |
| `NEGATIVE_RESULT_POLICY_NOT_CONFIGURED` | Negative Result without explicit approved domain metadata | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE`; no global negative policy is inferred |
| `SCORING_METHOD_NOT_CONFIGURED` | Result exists but no explicit scoring method snapshot exists | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `GOAL_REQUIRED` | Selected method requires a target but target is absent | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `PROPORTIONAL_GOAL_NOT_POSITIVE` | Proportional method receives a zero/negative target | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `LOWER_PROPORTIONAL_GOAL_NOT_POSITIVE` | Lower proportional target is not positive | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `ZERO_TARGET_REQUIRES_ZERO_GOAL` | Zero-target method does not have target zero | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `SCORING_RULE_NOT_CONFIGURED` | Required zero-target/tolerance/range band does not cover the entered Result, is absent, or is ambiguous | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE`; no global bands are invented |
| `TOLERANCE_NOT_CONFIGURED` | Equal scoring lacks a valid non-negative tolerance | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `RANGE_NOT_CONFIGURED` | Range min/max are absent or invalid | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `UNSUPPORTED_SCORING_METHOD` | Binary, Milestone, or another unapproved method is requested | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `TRAFFIC_LIGHT_THRESHOLDS_NOT_CONFIGURED` | Compliance cannot map to exactly one snapshotted threshold | CRITICAL | Yes | Yes | No | `NOT_CALCULABLE` |
| `EXCEL_UNKNOWN_KPI` | Excel Config Code is not an Expected Result | ERROR | N/A | N/A | No | Import preview rejects the row; no Expected Result is created |
| `EXCEL_DUPLICATE_KPI` | Excel contains a Config Code more than once | ERROR | N/A | N/A | No | Import preview rejects every duplicate; no last-row-wins behavior |

## Severity semantics

- `PASS`: entered Result is calculated successfully and has no finding.
- `PENDING`: non-blocking absence allowed by the snapshotted input contract.
- `WARNING`: a concrete issue exists; gating is controlled by the issue flags, not its color.
- `ERROR`: invalid technical input rejected before it can become a Current Result.
- `CRITICAL`: a persisted Result exists but cannot be scored correctly with the immutable configuration snapshot.

## Validation identity

Each run stores the Monitoring Period result version it checked. A confirmed MANUAL or EXCEL batch atomically changes all `CURRENT` runs to `STALE`, records the invalidating batch, and clears the compatibility summary on `monitoring_periods`. Submit and Approval consult the persisted current run and its issue flags; frontend state is never authoritative.

## Deferred business rules

Extreme-value limits, negative-value permission, zero-target degradation bands, Equal penalties, Range penalties, Binary states, and Milestone states require explicit catalog/configuration approval. Their absence is never replaced with a universal default.
