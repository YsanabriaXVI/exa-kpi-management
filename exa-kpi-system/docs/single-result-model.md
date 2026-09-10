# Single final result per KPI

New configuration revisions use `scoringRuleConfig.model = SINGLE_RESULT_V1`.
The capture contract is OVERALL, CURRENT_PERIOD, DIRECT: one numeric Goal and
one final Result, both in the Goal measurement unit. The Result unit is derived
and read-only. Monitoring does not request the business inputs used to obtain
that number, including when the unit is a percentage or ratio.

The three configuration choices are:

- **Sin bandas**: proportional Result / Goal for More is better, or Goal / Result
  for Lower is better. Goal must be positive. Lower is better with negative
  results requires explicit bands; a negative denominator is not a meaningful
  proportional achievement. The existing lower-result-zero convention is 100%.
- **Intervalos de resultado**: contiguous intervals covering the permitted
  result domain. Shared boundaries belong to the preceding interval. The first
  finite lower bound is included, so [0, 0] is a valid singleton.
- **Niveles de cumplimiento**: upper bounds and compliance values, compiled to
  the same intervals. There is no interpolation. Blank outer limits are unbounded.

Zero is better requires Goal 0 and bands that assign 100% at Result 0.
Compliance always ranges from 0 to 100%. Traffic Light uses Compliance.
Extra Points = max(0, persisted raw achievement - 100); band results have zero
extra points. Missing/not-calculable compliance has no extra-points value.
Extra Points are informational and never change Scorecard weights or weighted
contributions. No new database column is necessary: raw achievement is already
persisted and the read contracts derive Extra Points from it.

Reports defaults to compliance trends. Previous Period and Same Period Last
Year compare closed results without changing their stored evaluation. Differences
in compliance are percentage points, not raw KPI units.

A new single-result revision cannot replace/delete an older
revision. Frozen and closed
historical records retain their original contracts. Legacy tables and historical
readers remain available; their entity, calculated-input and baseline controls
are absent from the new configuration form.

Catalog Management is removed from navigation and its former URL redirects to
Configuration Overview. Catalog data and APIs remain available to the forms.

## Local data cleanup, 2026-09-10

The only active By Entity configuration found was ID 5, KPC-003-01, for
KPI-003 Productividad kilómetros por cabezal (four individual entities).
Its membership in draft Pool ID 2 was removed through the Pool API, then the
configuration was soft-deleted through KPI Management. The KPI definition was
retained. No Scorecard composition or Monitoring input referenced that
configuration, so no Scorecards or results were removed. A copy of the
configuration was saved outside the repository in the local temporary directory.

## Verification, 2026-09-10

- KPI Management: 170 tests passed; production TypeScript build passed.
- Monitoring: 144 tests passed; production TypeScript build passed.
- Frontend: 80 tests passed; TypeScript and Vite production build passed.
- Updated historical-baseline tests for the separate reason/source fields,
  the Pool search filter, and the compliance display. Updated Scorecard tests
  for the Pool prerequisite message and empty-composition selection flow.
- The default backend suites skip 27 opt-in integration tests. Database
  integration and browser interaction were not verified in this pass.
- Vite reports existing bundle-size and mixed import warnings; the build succeeds.
