# EXA Scorecards Service

Owns Scorecard identity, organizational scope, lifecycle, and composition by Pool Input Period. It does not own Pool schedules, KPI definitions/configurations, or Monitoring results.

## REST

- `GET /api/health/live`
- `GET /api/health/ready`
- `GET /api/docs`
- `GET /api/v1/scorecards/eligible-pools`
- `GET /api/v1/scorecards`
- `POST /api/v1/scorecards`
- `GET /api/v1/scorecards/:id`
- `PATCH /api/v1/scorecards/:id`
- `PATCH /api/v1/scorecards/:id/deactivate`

List queries use database `page`, `pageSize`, `search`, repeated filters, `sortBy`, and `sortOrder`. Pool events are consumed from JetStream with `processed_events` idempotency; outgoing Scorecard facts use the Transactional Outbox.

Owns Scorecard scope and per-Input-Period KPI selection/weights. It consumes Pool-owned time and KPI availability; it does not own Monitoring results.

## Local commands

`npm install`, `npm run prisma:generate`, `npm run typecheck`, `npm test`, `npm run dev`.

Health: `GET /api/health/live`, `GET /api/health/ready`. Swagger: `/api/docs`.
