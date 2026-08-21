# Scorecards Database Ownership Matrix

| Table / concept | Owner | Physical FK | External IDs / notes |
|---|---|---:|---|
| `scorecard_statuses` | Scorecards | N/A | Local lifecycle lookup |
| `scorecards` | Scorecards | status only | Pool is `kpi_pool_external_id`; schedule is inherited |
| `scorecard_code_sequences` | Scorecards | None | Transaction-safe code allocation by scope/year |
| `pool_references` | Scorecards projection | None | External Pool identity and inherited schedule metadata |
| `pool_period_references` | Scorecards projection | None | Finalized Pool period/composition availability |
| `pool_period_membership_references` | Scorecards projection | Pool period reference | Finalized membership IDs and KPI snapshots; business IDs remain external |
| `scorecard_company_scopes` | Scorecards | Scorecard | Company ID is external with snapshots |
| `scorecard_department_scopes` | Scorecards | Scorecard | Department and its owning Company IDs are external with snapshots |
| `scorecard_employee_scopes` | Scorecards | Department scope | Employee ID is external with snapshots |
| `scorecard_period_compositions` | Scorecards | Scorecard | Period dates identify a Pool-owned Input Period |
| `scorecard_period_kpis` | Scorecards | Period composition | Pool membership, Definition, and Configuration IDs are external |
| `scorecard_period_links` | Scorecards | Composition + linked Scorecard | Both Scorecards are local aggregates |
| `outbox_events` | Scorecards | None | Transactional integration events |
| `processed_events` | Scorecards | None | Consumer idempotency by external event UUID |
| Pool validity/frequency/Input Periods | KPI Pool | No | Read via contract; optional snapshots only |
| KPI Definition/Configuration | KPI Management | No | External IDs and code/name snapshots |
| Result lines/results/closure | Monitoring | No | Must not be persisted in Scorecards DB |
| Companies/departments/employees/users | Organization/Identity | No | External IDs; no copied master tables |

## Removed from the legacy draft

- `employees`, `users`, and `employee_assignments`: foreign domain masters.
- Scorecard `valid_from`, `valid_to`, and `input_frequency_id`: duplicated Pool decisions.
- `scorecard_result_schedule_preview`: duplicated Pool schedule.
- `scorecard_kpi_availability`: derived UI/query concern, not authoritative state.
- `scorecard_composition_summary`: safely derived from composition rows.
- `scorecard_results`, KPI result items, and linked result items: Monitoring ownership.
