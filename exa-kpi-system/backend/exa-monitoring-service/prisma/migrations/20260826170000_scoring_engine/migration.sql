ALTER TABLE `monitoring_period_inputs`
  ADD COLUMN `scoring_rule_config_snapshot` JSON NULL AFTER `scoring_method_code_snapshot`;

ALTER TABLE `kpi_results`
  ADD COLUMN `calculation_status` VARCHAR(40) NULL AFTER `traffic_light_code`,
  ADD COLUMN `calculation_error_code` VARCHAR(80) NULL AFTER `calculation_status`,
  ADD COLUMN `calculation_version` VARCHAR(30) NULL AFTER `calculation_error_code`,
  ADD COLUMN `calculated_at` DATETIME(3) NULL AFTER `calculation_version`;

ALTER TABLE `monitoring_period_scorecards`
  ADD COLUMN `direct_score_percent` DECIMAL(12,6) NULL AFTER `total_weight_percent_snapshot`,
  ADD COLUMN `linked_score_percent` DECIMAL(12,6) NULL AFTER `direct_score_percent`,
  ADD COLUMN `preview_score_percent` DECIMAL(12,6) NULL AFTER `linked_score_percent`,
  ADD COLUMN `final_score_percent` DECIMAL(12,6) NULL AFTER `preview_score_percent`,
  ADD COLUMN `calculation_version` VARCHAR(30) NULL AFTER `final_score_percent`,
  ADD COLUMN `calculated_at` DATETIME(3) NULL AFTER `calculation_version`;
