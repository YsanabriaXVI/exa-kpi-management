# Close and Initialize Next Period recovery

Closing remains manual. Initialize Next Period remains a separate explicit user
action. This change adds no background initialization, scoring rules, result
inheritance or database migrations.

## Closure projection

Pool first reads its closure projection by the exact persisted Input Period ID.
If missing, it requests Monitoring's read-only endpoint:

`GET /api/v1/monitoring-periods/internal/closure?poolId=...&poolInputPeriodId=...&periodStart=YYYY-MM-DD&periodEnd=YYYY-MM-DD`

Monitoring verifies the IDs and dates against its own period, and returns OPEN,
NOT_MATERIALIZED or CLOSED. Only CLOSED repairs the projection. Recovery uses a
stable event identity derived from the Monitoring ID/version and the same
serializable, version-guarded projection handler as NATS. Equal/older versions
are recorded as processed but cannot overwrite newer closure data. Identity
conflicts fail rather than replacing the period. A timeout/unavailable service
does not authorize advancement.
If ProcessedEvent survives but the projection is lost, the handler reconstructs
the missing projection instead of stopping at the deduplication record.

Pool configuration: `MONITORING_BASE_URL` (local default localhost:4004) and
`MONITORING_TIMEOUT_MS` (5000). Docker Compose sets the internal service address.

## Startup and resumability

Pool and Monitoring retry initial NATS connection/stream setup every five
seconds. Pool separately retries the closure subscription if MONITORING_EVENTS
is absent, or if the connection/subscription closes. Shutdown stops retries;
the durable consumer is retained, not deleted.

Next Period resolves the chronological successor after the source is CLOSED.
The UI exposes explicit review checkpoints: POOL_EDITABLE, SCORECARDS_REVIEW,
READY_TO_MATERIALIZE, MONITORING_MATERIALIZED, and END_OF_SCHEDULE.
Review and finalize the Pool in Manage KPIs / Pool Schedule first. Then prepare
Scorecard drafts, review inherited selections and weights, and finalize every
Scorecard. Removed Pool KPIs are reported; existing drafts are preserved.

POST next-period only materializes Monitoring when both Pool and Scorecards are
finalized, or returns the existing Monitoring identity. It does not finalize
compositions on the user's behalf. Retry explicitly after service recovery;
each request resolves persisted readiness again. No previous Results, scores,
manual baselines or Checks are copied. Newly materialized periods start DRAFT
with empty Results; existing periods are never reset.

## Local operator recovery

Run these commands in the respective service directory or container with its
normal environment. They are operator tools, not new administration endpoints.
No command below was executed during implementation.

Monitoring:

```text
npm run ops:outbox -- list
npm run ops:outbox -- replay <eventId> "Reason for operator recovery" --confirm
```

List returns up to 100 DEAD events without dumping their business payloads.
Replay accepts only a DEAD UUID, resets its attempts and requeues the original
event identity. The normal Outbox worker publishes it. It requires a reason and
explicit confirmation and logs the local operator. Resolve the underlying outage
first; otherwise the event can exhaust its retry budget again.

Pool:

```text
npm run ops:closures -- inspect
npm run ops:closures -- inspect <fromStreamSequence>
npm run ops:closures -- replay <streamSequence> "Reason for operator recovery" --confirm
```

Inspect shows durable consumer state and closure events missing from ProcessedEvent,
in windows of 200 stream sequences, returning nextSequence. Delivered-but-unprocessed
is not proof of exhaustion: it can also be in flight. Consumer failure logs include
streamSequence, deliveryCount and deliveriesExhausted=true on the final attempt.
These identify exhausted deliveries; inspect also locates historical unresolved
deliveries, including failures predating the new logs.

Replay selects one retained closure message and invokes the same idempotent
handler directly; it does not reset or delete the durable consumer. Already
processed or stale events remain harmless. Invalid messages are rejected.
If the stream message is no longer retained, Initialize Next Period can still
recover closure authoritatively from Monitoring. Operator replay is logged with
sequence, reason and result. No replay happens automatically from these tools.

## Verification boundary

No tests were added or run, and no builds, Docker startup, migrations or live
replays were executed. Runtime verification remains the next manual exercise.
