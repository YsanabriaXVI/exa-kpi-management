# Scoring Rules V1

Status: **DRAFT — DECISION RECORD FOR APPROVAL**  
Calculation version: `SCORING_V1`

`scoringRuleConfigVersion` belongs to KPI Management and versions the approved business configuration. `calculationVersion` belongs to Monitoring and identifies the algorithm that executed that immutable configuration; neither value substitutes for the other.

## 1. Contract

The individual KPI engine receives:

```text
result, goal, evaluationType, scoringMethod,
scoringRuleConfig, thresholds, weight, calculationVersion
```

It returns explicit state, never a magic numeric substitute:

```text
status = CALCULATED | MISSING | NOT_CALCULABLE
rawAchievement, compliance, trafficLight, weightedScore,
errorCode, calculationVersion
```

`NULL` means missing. Numeric `0` is a real result.

## 2. Approved common numerical policy (proposed)

- Calculations use decimal arithmetic; binary floating point is prohibited.
- Intermediate operations are not rounded unnecessarily.
- Stored calculation values retain the schema precision; UI normally displays two decimals.
- `rawAchievement` may be below 0% or above 100% when the formula naturally produces it.
- `compliance = min(100, max(0, rawAchievement))`.
- `weightedScore = compliance / 100 × weight`.
- Overachievement is reportable through `rawAchievement`, but cannot contribute more than the KPI weight.

## 3. Individual methods

### GREATER + PROPORTIONAL

Preconditions: goal is present and `goal > 0`.

```text
rawAchievement = result / goal × 100
```

Example: goal 100, result 130 → raw 130%, compliance 100%.

Open decision: a zero or negative goal requires another explicitly configured method; it is not inferred.

### LOWER + PROPORTIONAL

Preconditions: goal is present and `goal > 0`; result must be non-negative unless the KPI catalog explicitly permits otherwise.

```text
result = 0  → rawAchievement = 100
result > 0  → rawAchievement = goal / result × 100
```

Example: goal 100, result 120 → raw 83.333…%, compliance 83.333…%.

### LOWER + ZERO_TARGET

Precondition: goal equals zero.

```text
result = 0 → rawAchievement = 100
result > 0 → lookup the KPI-specific result band
```

There is no global penalty table. Missing or non-covering bands produce `NOT_CALCULABLE / SCORING_RULE_NOT_CONFIGURED`.

### EQUAL + TOLERANCE_BASED

Required configuration: target, non-negative tolerance, and ordered penalty bands outside tolerance.

```text
distance = abs(result - target)
distance <= tolerance → rawAchievement = 100
otherwise → lookup band by (distance - tolerance)
```

Overlapping bands, gaps relevant to an entered value, or negative tolerance are invalid configuration.

### RANGE + RANGE_BASED

Required configuration: `rangeMin <= rangeMax` and ordered distance penalty bands.

```text
rangeMin <= result <= rangeMax → rawAchievement = 100
otherwise → distance to nearest boundary, then band lookup
```

Inclusive boundaries are V1 default. Invalid or incomplete ranges are `NOT_CALCULABLE`.

### BINARY

Binary is a distinct scoring method and must not accept arbitrary numeric progress.

Proposed default, pending approval:

```text
NOT_COMPLETED → 0%
COMPLETED     → 100%
```

The catalog must define allowed states and evidence/approval requirements. If partial credit exists, the KPI is not Binary.

### MILESTONE

Milestone is separate from Binary. It uses an explicit, ordered catalog of business states and compliance values, for example:

```text
NOT_STARTED → 0%
IN_PROGRESS → 50%
COMPLETED   → 100%
```

Those values are illustrative only. Each KPI must define its states, evidence, transition rules, and compliance; the engine must not invent intermediate percentages.

### Derived result semantics

`DERIVED_PERCENTAGE` describes how the result is obtained; it is not, by itself, a scoring method.

Example separation:

```text
Result semantics:  DERIVED_PERCENTAGE
Result calculation: PERCENT_WITHIN_AVERAGE_BAND
Evaluation type:   GREATER
Scoring method:    PROPORTIONAL
Goal:              90%
Result:            82%
Compliance:        82 / 90 × 100 = 91.111…%
```

The result formula, operands, population, exclusions, precision, and source must be versioned and auditable. The catalog must state whether Monitoring receives the derived result or calculates it from snapshotted operands.

## 4. Calculation states

| State | Meaning | Compliance | Weighted score | Blocks official validation |
|---|---|---:|---:|---|
| `CALCULATED` | Valid input and complete scoring configuration | decimal | decimal | No |
| `MISSING` | Required result is `NULL` | `NULL` | `NULL` | Yes, unless approved close exception |
| `NOT_CALCULABLE` | Result exists but configuration/formula is invalid or unsupported | `NULL` | `NULL` | Yes |

Current code calls the missing state `PENDING`; implementation must migrate it to `MISSING` before the V1 contract is declared stable.

## 5. Traffic light

Traffic light is derived from capped `compliance`, never from raw result or raw achievement.

Proposed global default:

| Compliance | Color |
|---:|---|
| `0 <= x < 65` | RED |
| `65 <= x < 80` | YELLOW |
| `x >= 80` | GREEN |

Thresholds must be non-overlapping and cover the full compliance domain. A KPI-specific catalog may override the global default only when explicitly approved and snapshotted for the Monitoring period.

## 6. Scorecard aggregation

For each direct KPI:

```text
directContribution = compliance / 100 × KPI weight
```

For each linked Scorecard:

```text
linkedContribution = linkedScore / 100 × link weight
```

Final score is the sum of direct and linked contributions. Missing/not-calculable dependencies keep preview/validated aggregation `NULL`; weight is not redistributed. Circular dependencies and missing linked Scorecards are configuration errors.

## 7. Score lifecycle and recalculation

- `DRAFT`: mutable preview; result changes invalidate prior validation and recalculate preview.
- `SUBMITTED`: read-only until returned; submitted snapshot remains reviewable.
- `VALIDATED`: validated score and calculation version are persisted.
- `RETURNED → DRAFT`: edits invalidate validation and produce a new preview/revision.
- `CLOSED`: final score is frozen with calculation version and configuration snapshots. A future engine version must never silently rewrite it.

The three concepts are distinct: preview score, validated score, and final score.

## 8. Missing results and close with exceptions

Implemented workflow (September 2026):

- A current Check containing only `RESULT_MISSING` findings may proceed through Submit and Approval with explicit `withExceptions: true` and a justification of at least 10 characters at each transition. The actor, Check identity and justification are audited.
- Other findings, including invalid weight coverage, configuration errors and historical baseline errors, remain blocking. Existing Checks must be rerun to acquire exception eligibility.
- Close still requires `VALIDATED`, a current Check and a separate documented exception while Results are missing.
- Missing Results remain `NULL`. Affected Scorecards retain an unavailable final score; complete Scorecards retain their checked score. No weights are redistributed and no Result rows are fabricated.
- The next scheduled period is initialized independently with empty Results and finalized configuration snapshots. Closed periods remain read-only.

Deferred alternative (not implemented):

- During draft/validation: missing KPI → compliance and weighted score remain `NULL`.
- Normal close is blocked while any required KPI is missing/not calculable.
- Approved `CLOSE_WITH_EXCEPTIONS`: result remains `NULL`, exception reason/evidence is retained, and official contribution becomes zero.
- Weight is not redistributed because doing so rewards missing data.

Treating a missing Result as an official zero contribution requires explicit business approval before implementation.

## 9. Acceptance examples

| Method | Goal/config | Result | Expected status | Raw | Compliance |
|---|---|---:|---|---:|---:|
| GREATER/PROPORTIONAL | goal 100 | 80 | CALCULATED | 80 | 80 |
| GREATER/PROPORTIONAL | goal 100 | 130 | CALCULATED | 130 | 100 |
| LOWER/PROPORTIONAL | goal 100 | 120 | CALCULATED | 83.333… | 83.333… |
| LOWER/ZERO_TARGET | goal 0 | 0 | CALCULATED | 100 | 100 |
| LOWER/ZERO_TARGET | goal 0, no bands | 1 | NOT_CALCULABLE | NULL | NULL |
| EQUAL/TOLERANCE | target 5, tolerance 0.5 | 5.4 | CALCULATED | 100 | 100 |
| RANGE | [2, 8] | 8 | CALCULATED | 100 | 100 |
| Any | valid configuration | NULL | MISSING | NULL | NULL |

## 10. Decisions required before coding is hardened

1. Approve or modify cap, floor, and precision policy.
2. Approve global traffic-light boundaries and inclusivity.
3. Approve zero-target degradation per real KPI/family.
4. Define Equal penalty and Range penalty semantics.
5. Define Binary/Milestone states and Derived Percentage inputs.
6. Approve missing-result behavior for close with exceptions.
7. Decide whether negative values are globally rejected or controlled per KPI/unit.
8. Approve the real KPI catalog rows and owners.

## 11. Implementation gate

No `PROPOSED` or `BLOCKED` catalog row may generate an official validated/final score. Once the decisions above are approved, the next artifact is the Basic Input Validation Matrix, followed by conformance tests that translate every approved catalog example into executable cases.
