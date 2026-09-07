ALTER TABLE monitoring_periods
  ADD COLUMN baseline_version INT NOT NULL DEFAULT 0,
  ADD COLUMN current_scoring_baseline_version INT NULL;
UPDATE monitoring_periods SET current_scoring_baseline_version = 0
  WHERE current_scoring_results_version IS NOT NULL;
ALTER TABLE monitoring_validation_runs ADD COLUMN based_on_baseline_version INT NOT NULL DEFAULT 0;
CREATE TABLE historical_baseline_resolutions (
  historical_baseline_resolution_id BIGINT NOT NULL AUTO_INCREMENT,
  monitoring_period_id BIGINT NOT NULL,
  monitoring_period_input_id BIGINT NOT NULL,
  revision_no INT NOT NULL,
  baseline_version INT NOT NULL,
  reference_type VARCHAR(40) NOT NULL,
  required_period_key VARCHAR(30) NOT NULL,
  required_period_start DATE NOT NULL,
  required_period_end DATE NOT NULL,
  subject_external_id VARCHAR(100) NULL,
  source_type VARCHAR(20) NOT NULL,
  baseline_value_snapshot DECIMAL(20,6) NOT NULL,
  baseline_unit_snapshot JSON NOT NULL,
  source_monitoring_period_id BIGINT NULL,
  source_result_id BIGINT NULL,
  source_pool_external_id BIGINT NULL,
  source_scorecard_external_id BIGINT NULL,
  source_kpi_definition_external_id BIGINT NULL,
  source_kpi_configuration_external_id BIGINT NULL,
  source_subject_external_id VARCHAR(100) NULL,
  provenance JSON NOT NULL,
  reason TEXT NULL,
  resolved_by_user_id BIGINT NOT NULL,
  resolved_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (historical_baseline_resolution_id),
  UNIQUE KEY uq_baseline_input_revision (monitoring_period_input_id, revision_no),
  KEY ix_baseline_period_version (monitoring_period_id, baseline_version),
  CONSTRAINT fk_baseline_period FOREIGN KEY (monitoring_period_id) REFERENCES monitoring_periods(monitoring_period_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_baseline_input FOREIGN KEY (monitoring_period_input_id) REFERENCES monitoring_period_inputs(monitoring_period_input_id) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
