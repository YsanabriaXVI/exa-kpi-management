-- Add multi-replica claim metadata and an index for stale-lock recovery.
ALTER TABLE `outbox_events`
  ADD COLUMN `locked_at` DATETIME(3) NULL,
  ADD COLUMN `locked_by` VARCHAR(100) NULL,
  ADD INDEX `ix_outbox_events_claim` (`status`, `locked_at`);
