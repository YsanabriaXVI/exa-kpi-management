# Explicit result bands

New configurations use `scoringMethod: "RESULT_BANDS"` and
`scoringRuleConfig.bandMode: "INTERVALS"`. Existing `STEP_POINTS` and
`LINEAR_POINTS` configurations retain their calculation mode.

The existing JSON field stores `minResult`, `maxResult`, `includesMin`,
`includesMax`, and `compliance`. A null minimum means no lower limit; a null
maximum means no upper limit. An omitted maximum remains supported for older
configurations. No relational schema migration is needed.

For LOWER_IS_BETTER with negative results allowed:

```json
[
  {"minResult": null, "maxResult": -5, "includesMin": false, "includesMax": true, "compliance": 100},
  {"minResult": -5, "maxResult": 0, "includesMin": false, "includesMax": true, "compliance": 80},
  {"minResult": 0, "maxResult": 5, "includesMin": false, "includesMax": true, "compliance": 50},
  {"minResult": 5, "maxResult": null, "includesMin": false, "includesMax": false, "compliance": 0}
]
```

For ZERO_IS_BETTER with negative results allowed:

```json
[
  {"minResult": null, "maxResult": -3, "includesMax": false, "compliance": 0},
  {"minResult": -3, "maxResult": -1, "includesMin": true, "includesMax": false, "compliance": 80},
  {"minResult": -1, "maxResult": 1, "includesMin": true, "includesMax": true, "compliance": 100},
  {"minResult": 1, "maxResult": 3, "includesMin": false, "includesMax": true, "compliance": 80},
  {"minResult": 3, "maxResult": null, "includesMin": false, "compliance": 0}
]
```

Intervals assign a fixed compliance percentage, without interpolation.
Overlaps are rejected, including a shared endpoint included by both bands.
Gaps are allowed; a result in a gap is not calculable. Negative-result policy
still applies independently. Goal attainment keeps its behavior semantics:
LOWER compares the actual result to the target; ZERO requires actual zero.
Consequently a tolerance band may award 100% while goalMet remains false.

## Acceptance status

No automated tests were executed for this change. The real frontend journey
is pending because the Browser runtime reported no available browsers.
No August closure or September initialization was performed in this session.

The requested acceptance remains: August 2026, target 100, result 90, weight
100%, Check Results yielding score 90 and goalMet false, then SUBMITTED,
VALIDATED, CLOSED. After Pool receives or reconciles closure, initialize
September as DRAFT with inputs present and no results, scores, checks or baseline
resolutions. Return to August to confirm its read-only state, score, snapshots
and audit. Repeat the lifecycle with LOWER_IS_BETTER and ZERO_IS_BETTER rules.
For a subsequent PREVIOUS_PERIOD comparison, use August's persisted result
90 as the baseline, not its target 100.
