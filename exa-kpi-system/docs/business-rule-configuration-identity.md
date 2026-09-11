# KPI Configuration identity ? 2026-09-11

Pools and Scorecards may contain multiple configurations of the same KPI Definition, including Generate by Subject variants. Configuration ID is the identity; Configuration Code is its stable public identifier. Names may change without changing membership.

A Pool cannot contain the same configuration twice in overlapping effective intervals. Historical memberships remain separate so a retired configuration can be added again in a later, non-overlapping period. Membership writes retain the Pool transaction lock.

A Scorecard composition cannot contain the same configuration twice. Its KPI and linked Scorecard weights must still total 100%. Each variant has an independent goal, result, compliance and weight. Existing exclusive assignment of a configuration across scorecards within a Pool period is unchanged.

Generate by Subject rejects an existing active configuration with the same Definition ID, Subject Type and Subject External ID. Display names are not used for duplicate detection. Creation is serialized on the Definition row.

The scorecards migration removes Definition uniqueness from Pool membership projections and Scorecard composition KPIs. Configuration uniqueness remains in place.
