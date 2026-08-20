# KPI Pool Database Ownership Matrix

| Table | Owner | Purpose/type | Physical FKs | External IDs / dependencies | Notes |
|---|---|---|---|---|---|
| `pool_areas` | Pool Service | Local catalog | None | Audit user IDs | Approved bootstrap: OPS, SEG, FIN |
| `company_references` | Pool Service projection | Read projection | None | `external_company_id`; future Organization/Access source | Pool is not company master |
| `input_frequency_references` | Pool Service projection | Read projection | None | `external_input_frequency_id`; KPI Management source | No cross-service relation |
| `kpi_pool_code_sequences` | Pool Service | Transactional concurrency state | None | None | Unique area scope + issue year; Companies do not participate |
| `kpi_pools` | Pool Service | Aggregate root | None | frequency and audit user IDs | Lifecycle and validity are separate concepts |
| `kpi_pool_areas` | Pool Service | Transactional association | `kpi_pools`, `pool_areas` | Audit user ID | Includes historical snapshots/order |
| `kpi_pool_companies` | Pool Service | Transactional association | `kpi_pools`, local `company_references` | Company and audit user IDs | Projection FK is local only |
| `kpi_pool_kpis` | Pool Service | Effective-dated transactional membership | `kpi_pools` | Definition, Configuration, frequency, audit user IDs | No overlapping Configuration intervals per Definition/Pool; overlap protected transactionally |
| `kpi_pool_period_compositions` | Pool Service | Period composition lock and KPI-count snapshot | `kpi_pools` | Finalizing audit user ID | One immutable `POOL_COMPOSITION_LOCKED` row per Pool/Input Period; not a Scorecard publication or Monitoring closure |
| `outbox_events` | Pool Service | Transactional integration infrastructure | None | Aggregate ID is an opaque string | Durable publication foundation |

There are no physical foreign keys or Prisma relations to `exa_kpi_management`, `exa_access`, or any other service database. Availability is a derived read model and therefore has no table in this migration.
