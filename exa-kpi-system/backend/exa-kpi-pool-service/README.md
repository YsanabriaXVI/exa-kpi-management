# EXA KPI Pool Service

Express/TypeScript microservice for KPI Pools. It exposes Pool Info, explicit KPI membership, derived availability, pre-activation validation and lifecycle commands backed by Transactional Outbox + NATS JetStream.

## Local commands

```bash
npm install
npm run prisma:generate
npm run prisma:validate
npm run sync:input-frequencies
npm run typecheck
npm test
npm run build
```

The shared development environment is in `backend/docker-compose.yml`. Inside Docker the service listens on port 4002, connects only to `exa_kpi_pool`, and uses `nats://nats:4222`. See `context/KPI_POOL_CONTEXT.md` for domain rules and `context/KPI_POOL_DB_OWNERSHIP_MATRIX.md` for ownership/FK decisions.

Available routes:

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/docs`
- `GET /api/docs/openapi.json`
- `GET /api/v1/kpi-pools/lookups`
- `GET|POST /api/v1/kpi-pools`
- `GET|PATCH /api/v1/kpi-pools/:id`
- `GET|POST /api/v1/kpi-pools/:id/kpi-configurations`
- `DELETE /api/v1/kpi-pools/:id/kpi-configurations/:configurationId`
- `POST /api/v1/kpi-pools/:id/kpi-configurations/:configurationId/retire`
- `POST /api/v1/kpi-pools/:id/kpi-configurations/replace`
- `GET /api/v1/kpi-pools/:id/available-kpi-configurations`
- `GET /api/v1/kpi-pools/:id/input-periods`
- `POST /api/v1/kpi-pools/:id/input-periods/finalize`
- `GET /api/v1/kpi-pools/:id/activation-readiness`
- `POST /api/v1/kpi-pools/:id/activate`
- `POST /api/v1/kpi-pools/:id/deactivate`

NATS is deliberately non-fatal to HTTP readiness. MySQL is mandatory. Outbox publishing uses multi-replica claims, stale-lock recovery, bounded retry and a `DEAD` state for manual review. The idempotent bootstrap seeds approved OPS/SEG/FIN areas and provisional EXA/CMX/TRE/LMG company references; frequencies are synchronized from KPI Management over REST.
