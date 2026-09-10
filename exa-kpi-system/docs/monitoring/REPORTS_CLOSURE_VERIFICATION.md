# Reports and period closure — 2026-09-10

Reports uses `/api/v1/closed-results` for Latest Results, Results History,
Scorecard Analysis, KPI Analysis and result detail. The read contract selects
only CLOSED periods and reads persisted scores and frozen snapshots. It retains
decimal strings and nulls, and selects the Check identified by the closure event;
it never substitutes another Check or recalculates using current configuration.

Latest Results and Scorecard Analysis filters use Scorecard IDs with deduplicated
options. History links remain available for closed results without a final score,
including closures with exceptions. CLOSED entry screens expose read-only
navigation, closure audit and the explicit next-period preparation flow.

Next Period requires a CLOSED source, picks the chronological successor without
skipping unconfigured periods, and blocks initialization until Pool and Scorecard
compositions are finalized. Draft preparation reports removed KPIs. See
`../next-period-recovery.md` for the current stages.

## Verification

- 37 targeted tests passed: report helpers/read contract, next-period service/UI,
  workflow service/UI.
- 32 additional tests passed: Manual Result Entry service/UI and Check Results UI.
- Monitoring and Scorecards typechecks passed; frontend production build passed.
- The full-suite diagnostic preceded the last fixes. Its remaining backend
  failure (mock Prisma JSON null handling) and two CLOSED UI failures were fixed
  and their complete test files rerun successfully.
- Six other existing frontend failures remain: three in KPI Config setup/profile
  tests and three in HistoricalBaseline UI tests (labels and updated contracts).
- 25 database integration tests were skipped by the default Monitoring test
  command. No database integration run or visual browser verification was done;
  Browser discovery returned no connected browsers.

No deployment or database migration was performed.
