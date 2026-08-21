CREATE TABLE scorecard_code_sequences (
  scorecard_code_sequence_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scope_key VARCHAR(255) NOT NULL,
  issue_year SMALLINT NOT NULL,
  last_sequence INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_scorecard_code_sequence_scope UNIQUE (scope_key, issue_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pool_references (
  kpi_pool_external_id BIGINT PRIMARY KEY,
  pool_code VARCHAR(500) NOT NULL,
  pool_name VARCHAR(200) NOT NULL,
  status_code VARCHAR(20) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  input_frequency_external_id BIGINT NOT NULL,
  input_frequency_code VARCHAR(50) NOT NULL,
  source_version BIGINT NULL,
  source_updated_at DATETIME(3) NULL,
  synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_pool_references_code UNIQUE (pool_code),
  INDEX ix_pool_references_status_validity (status_code, valid_from, valid_to)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE pool_period_references (
  pool_period_reference_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  kpi_pool_external_id BIGINT NOT NULL,
  pool_period_external_id BIGINT NULL,
  pool_composition_external_id BIGINT NULL,
  period_key CHAR(7) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  composition_status_code VARCHAR(32) NOT NULL,
  kpi_count_snapshot INT UNSIGNED NULL,
  source_version BIGINT NULL,
  source_updated_at DATETIME(3) NULL,
  synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_pool_period_reference UNIQUE (kpi_pool_external_id, period_start),
  CONSTRAINT uq_pool_period_external UNIQUE (pool_period_external_id),
  CONSTRAINT uq_pool_composition_external UNIQUE (pool_composition_external_id),
  CONSTRAINT chk_pool_period_reference_dates CHECK (period_end >= period_start),
  INDEX ix_pool_period_reference_status (kpi_pool_external_id, composition_status_code, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE scorecard_period_compositions
  ADD COLUMN kpi_pool_external_id BIGINT NOT NULL AFTER scorecard_id,
  ADD COLUMN pool_period_external_id BIGINT NULL AFTER kpi_pool_external_id,
  ADD COLUMN period_key CHAR(7) NOT NULL AFTER period_end,
  ALTER COLUMN status_code SET DEFAULT 'PREPARING',
  ADD INDEX ix_scorecard_pool_period_external (pool_period_external_id);

ALTER TABLE scorecard_period_compositions DROP CHECK chk_scorecard_period_status;
ALTER TABLE scorecard_period_compositions
  ADD CONSTRAINT chk_scorecard_period_status CHECK (status_code IN ('PREPARING','FINALIZED'));

CREATE TABLE processed_events (
  event_id CHAR(36) PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  aggregate_id VARCHAR(100) NULL,
  source_service VARCHAR(100) NULL,
  processed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_processed_events_type (event_type, processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

