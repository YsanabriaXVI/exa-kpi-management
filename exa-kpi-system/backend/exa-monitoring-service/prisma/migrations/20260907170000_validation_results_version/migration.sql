-- Preserve legacy workflow versions; the actual Results version is unknown.
ALTER TABLE monitoring_validation_runs
  MODIFY results_version INT NULL,
  ADD COLUMN based_on_results_version INT NULL,
  ADD COLUMN scoring_snapshot JSON NULL;
ALTER TABLE monitoring_periods ADD COLUMN current_scoring_results_version INT NULL;
