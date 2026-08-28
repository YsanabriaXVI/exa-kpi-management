# KPI Evaluation Catalog V1

Status: **DRAFT — BUSINESS APPROVAL REQUIRED**  
Purpose: ground truth for Monitoring scoring. This document is normative only after every row is approved.

## Evidence policy

- `PROPOSED`: inferred from the KPI name, goal, unit, or current seed; must not drive final scoring yet.
- `BLOCKED`: insufficient information or a business decision is missing.
- `APPROVED`: business confirmed semantics, formula, configuration, and acceptance examples.
- `REJECTED / NEEDS_REDEFINITION`: the KPI is ambiguous, internally inconsistent, or cannot be measured reliably in its current form.
- Generated seed records (`KPI-062` through `KPI-105`) are test/bootstrap data, not business ground truth.
- A KPI configuration may not become scoreable merely because the engine can infer a default formula.

## Approval checklist

A KPI may move to `APPROVED` only when all fields below are complete and supported by an approved example:

- [ ] KPI name and objective
- [ ] Category and owner department
- [ ] Result semantics and measurement unit
- [ ] Result calculation/source, when the result is derived
- [ ] Permitted domain, precision, and negative-value policy
- [ ] Evaluation type and scoring method
- [ ] Goal, target, range, or milestone configuration
- [ ] Special rule, when applicable
- [ ] Below-target, at-target, and above-target examples
- [ ] Expected raw achievement, compliance, and traffic light for every example
- [ ] Missing-result and exception behavior
- [ ] Business approver and approval date

## Real KPI working catalog

No row is approved yet. Values shown below are hypotheses extracted from current base seed data.

| Status | KPI | Objective | Category | Owner department | Result semantics | Result calculation/source | Unit | Evaluation | Scoring method | Goal/config | Blocking question |
|---|---|---|---|---|---|---|---|---|---|---|---|
| BLOCKED | KPI-049 Reduce operating costs | Reduce operating cost by 20% | Financial | TBD | TBD | Integrator - EMS | % | TBD | TBD | 20 | Does `Result` mean actual cost, cost variance, or achieved reduction percentage? The answer changes LOWER into GREATER. |
| PROPOSED | KPI-050 Productivity kms/head | Reach productivity per head | Operations | TBD | Kilometres per eligible head during the period | Integrator - EMS | km/head | GREATER | PROPORTIONAL | goal 3700 | Who belongs to the denominator, and how are partial periods/headcount changes handled? |
| BLOCKED | KPI-052 Transportation damages | Avoid qualifying transportation damages | Security | Transport / Safety (confirm) | Count of qualifying damages | EMS-Depot | count | LOWER | ZERO_TARGET | goal 0; bands TBD | Does any damage produce 0% compliance, or are progressive severity/count bands required? What qualifies as damage? |
| PROPOSED | KPI-053 Gensets sales | Increase Gensets sales by 5% | Financial | TBD | Percentage growth against an approved baseline | Integrator - EMS | % | GREATER | PROPORTIONAL | goal 5 | Which baseline is authoritative, and is a negative result permitted? |
| BLOCKED | KPI-054 Increase EXA trips | Add 100 EXA trips | Operations | TBD | TBD | EMS | count | TBD | TBD | 100 | Does `Result` mean incremental trips or total trips? What is the baseline period? |
| PROPOSED | KPI-061 On-time dispatch rate | Reach 95% on-time dispatches | Operations | TBD | Eligible on-time dispatches / eligible dispatches × 100 | TMS | % | GREATER | PROPORTIONAL | goal 95 | Which dispatches are eligible, how are cancellations handled, and what happens when the denominator is zero? |

## Business examples awaiting identification

These are required scoring families, but they must be linked to actual KPI codes and owners before approval.

| Status | Candidate KPI | Result semantics | Result calculation/source | Unit | Evaluation | Scoring method | Goal/config | Blocking question |
|---|---|---|---|---|---|---|---|---|
| BLOCKED | Cost per kilometre | Actual approved cost per eligible kilometre | approved cost / eligible kilometres | currency/km | LOWER | PROPORTIONAL | goal > 0, TBD | What costs, kilometres, currency, and exclusions are authoritative? |
| BLOCKED | Zero accidents | Count by approved accident/severity scope | source system TBD | count | LOWER | ZERO_TARGET | goal 0; bands TBD | Does one occurrence immediately mean 0%, or are KPI-specific progressive bands used? |
| BLOCKED | Heads within ±10% average | Percentage of eligible heads inside the approved average band | `PERCENT_WITHIN_AVERAGE_BAND`; formula inputs TBD | % | GREATER | PROPORTIONAL | goal 90 (confirm) | Define population, average, exclusions, rounding, and whether Monitoring receives operands or the final percentage. |
| BLOCKED | EMS-SAP integration | Completion state | evidence/approval TBD | state | BINARY or MILESTONE (choose one) | BINARY or MILESTONE (choose one) | states TBD | Does business recognize only completed/not completed, or approved partial milestones? |
| BLOCKED | Maintain X-Y | Measured value whose ideal outcome is within an interval | source TBD | TBD | RANGE | RANGE_BASED | min/max and penalty TBD | What compliance applies outside the range and how is distance measured? |

## Approval record

Each approval applies to one immutable catalog revision and its complete examples.

| KPI | Catalog revision | Approved by | Owner department | Approved date | Decision/evidence reference |
|---|---|---|---|---|---|
| _None yet_ | — | — | — | — | — |

## Acceptance examples template

Approved examples live as separate rows so a KPI can have multiple executable cases.

| KPI | Case | Result | Expected raw achievement | Expected compliance | Expected traffic light | Status |
|---|---|---:|---:|---:|---|---|
| KPI-050 | Proposed below goal | 3330 | 90% | 90% | GREEN | PROPOSED |
| KPI-052 | Proposed exact zero | 0 | 100% | 100% | GREEN | PROPOSED |
| KPI-052 | Any positive result | 1 | TBD | TBD | TBD | BLOCKED |

## Required approval fields per KPI

Every scoreable KPI must explicitly provide:

1. Business definition, category, owner, and result semantics.
2. Measurement unit and permitted numeric domain, including whether negatives are valid.
3. Evaluation type and scoring method.
4. Goal or range boundaries.
5. Method-specific configuration: zero-target bands, tolerance, range penalties, or milestones.
6. At least three examples with expected raw achievement, compliance, and traffic light.
7. Missing-result and exception policy.
8. Traffic-light catalog or confirmed use of the global catalog.

## Catalog acceptance gate

A row may move to `APPROVED` only when its examples produce the expected results under [Scoring Rules V1](./SCORING_RULES_V1.md), and the named business owner approves the catalog revision. `BLOCKED`, `PROPOSED`, and `NEEDS_REDEFINITION` rows must produce `NOT_CALCULABLE` for official validation/closure rather than silently selecting a formula.
