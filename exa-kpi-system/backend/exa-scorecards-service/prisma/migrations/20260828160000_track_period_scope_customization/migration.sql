ALTER TABLE `scorecard_period_compositions`
  ADD COLUMN `scope_customized_at` DATETIME(3) NULL AFTER `finalized_at`;
