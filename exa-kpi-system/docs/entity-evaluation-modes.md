# Entity participation

The persisted scope remains `OVERALL` or `BY_SUBJECT` (the UI calls the latter
"By Entity"). `entityEvaluationMode` is a separate revision dimension:

| Scope | Entity mode | Official evaluations | Weight source |
| --- | --- | --- | --- |
| OVERALL | null | One KPI | ScorecardPeriodKpi.weightPercent |
| BY_SUBJECT | INDIVIDUAL | One per subjectGoal | Explicit entityWeights |
| BY_SUBJECT | CONTRIBUTE_TO_OVERALL | One KPI | ScorecardPeriodKpi.weightPercent |

Missing/null legacy entity mode means INDIVIDUAL within BY_SUBJECT, including
records with groupGoal. Existing frozen snapshots are never rewritten.

INDIVIDUAL retains SAME_GOAL_FOR_ALL and DIFFERENT_GOAL_PER_SUBJECT as
goalAssignment strategies. Its parent weight remains the sum of entity weights.

CONTRIBUTE_TO_OVERALL uses revision.targetValue / effective.goal as the official
target. It preserves KpiConfigurationRevisionSubject selections, leaves
subjectGoals empty and goalAssignment null, and freezes entityAggregation=SUM.
All contributors use the single official result unit. Current-period target and
result units must agree; historical percentage targets keep a separate actual
result unit. groupGoal remains separate informational metadata.

## Monitoring contract

The new mode materializes one MonitoringPeriodInput with
evaluationKindSnapshot=CONTRIBUTED. It is an official KPI evaluation, not the
legacy GROUP runtime and not a set of ENTITY evaluations. The frozen snapshot
contains the contributor identities and labels. Each identity is the pair
subjectType + subjectExternalId; contributors have no target, weight or score.

Manual save uses the existing official monitoringPeriodInputId and optimistic
result/period versions. A change sends resultValue=null and the complete frozen
cohort as contributorValues, allowing null for inputs not yet captured:

```json
{
  "monitoringPeriodInputId": "123",
  "version": null,
  "resultValue": null,
  "contributorValues": [
    { "subjectType": "COMPANY", "subjectExternalId": "EXA", "resultValue": "4500000" },
    { "subjectType": "COMPANY", "subjectExternalId": "CONMOXA", "resultValue": null }
  ]
}
```

The server validates the cohort, rejects direct overrides of the official
result, orders captures by the frozen subjects and stores them in the existing
KpiResult.inputValues and ResultEntryBatchRow.inputValues JSON:

```text
{ aggregation: "SUM", contributors: [{ subjectType, subjectExternalId, resultValue }] }
```

Only a complete cohort produces an official resultValue. Missing values remain
pending; zero is a valid capture. Decimal SUM is the only new calculation.
The existing current-period scorer consumes the single official result and
weight. Input-only changes still create an audit batch/revision and invalidate
scoring even when the sum is unchanged.

Evaluation Reference remains periodScope and is preserved through effective and
frozen contracts. Both entity modes support Greater, Lower and Zero is best
(the persisted behavior code for Ideal Zero is ZERO_IS_BETTER).
Current-period Individual evaluations retain separate goals, weights and scores;
Contributed evaluations score only the complete official SUM. Shared result
bands are available for Individual evaluations with a common target, including
zero. Contributors never receive their own scores or weights.

Historical comparisons use the actual Result unit and a percentage change target.
INCREASE or REDUCTION normalizes the change before scoring against that target,
including when the behavior is Zero is best. Meeting a historical reduction
target does not mean the current Result is zero. A zero baseline remains
undefined and blocks scoring rather than inventing a percentage.

Contributed historical lookup and selection compare CLOSED official totals,
never individual captures. Sources must have the required period, frequency,
unit, semantics, SUM aggregation and identical frozen contributor identities
(subject type plus external ID, independent of order). Different cohorts are
not interchangeable. Manual baselines retain the existing mandatory reason and
audit history; they represent the comparable official total. Automatic matching
can use a prior current-period total scored with bands when the new period uses
historical proportional scoring. Multiple eligible sources remain ambiguous.

SUM requires ABSOLUTE_VALUE or COUNT and an explicitly supported additive unit
in additive-results.ts. Percentages, ratios, unit costs, durations, binary values
and unknown units are blocked at configuration and frozen contract boundaries.
Historical percentage targets are allowed: the additivity check uses the actual
Result unit, not the target unit. COUNT contributors must be nonnegative integers;
negative quantities follow the frozen negative-result policy before summation.
Custom additive units need an explicit contract update; a quantity must represent
a total, not an average or rate disguised as an absolute value.

## Manual baseline exceptions

`AUTO_MATCH` and `USER_MATCH` do not produce a warning solely because of their
origin. A manual baseline produces `MANUAL_BASELINE_USED` with severity WARNING.
It does not change historical formulas, achievement, score, goalMet or traffic
light. For Contributors the warning explicitly states that historical cohort
composition cannot be verified; no historical subject IDs are fabricated.

Manual entry requires both `reason` (why manual entry is needed, 10–10000
characters) and `sourceReference` (where the value came from, 1–10000 characters).
The latter is stored in the existing `provenance` JSON and exposed separately in
the response. No table, column, upload or URL requirement is introduced.
Changing the source reference creates a baseline revision and invalidates the
previous Check, just like changing its value or reason.

Check snapshots retain the manual origin, value, unit, requested historical
period, reason, sourceReference, resolvedByUserId and resolvedAt. Existing manual
baselines without a source reference must be completed before a new Check can
pass. Old Checks lacking the manual warning cannot authorize a subsequent
Submit, Approve or Close. Already CLOSED records are not rewritten.

Valid manual baselines produce PASSED_WITH_WARNINGS and require explicit
withExceptions plus a justification at Submit, Approve and Close. Approval keeps
the lifecycle VALIDATED and records validationStatus=VALIDATED_WITH_EXCEPTIONS.
Close keeps lifecycle CLOSED and records closedWithExceptions=true and closure
type WITH_EXCEPTIONS even when missingResultCount=0. Workflow audit events retain
the accepted exception codes, Check run ID, actor and justification. The Check
snapshot and its warning remain preserved after closure.

Missing Results remain eligible for the existing exception flow. Missing or
zero historical baselines, incompatible historical context and incomplete manual
documentation remain blocking errors and cannot be waived by this warning.

The actor still comes from TEMPORARY_ACTOR_USER_ID. It must be replaced by the
authenticated user before production; authentication is outside this change.

## Database rollout (existing requirement)

Apply KPI Management migration `20260909120000_entity_evaluation_mode` before
running the updated service, and regenerate its Prisma client. The migration
only adds a nullable column; it performs no data backfill. Other services reuse
existing JSON and VARCHAR fields and need no new tables or migrations.
