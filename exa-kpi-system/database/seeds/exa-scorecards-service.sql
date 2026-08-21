-- EXA KPI Management System - exa-scorecards-service (MySQL 8.4)
-- Physical FKs exist only between tables owned by this service.
-- Every *_external_id is owned by another service and intentionally has no FK.

CREATE DATABASE IF NOT EXISTS exa_scorecard CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
USE exa_scorecard;

CREATE TABLE scorecard_statuses (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT chk_scorecard_status_order CHECK (display_order > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_code_sequences (
  scorecard_code_sequence_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scope_key VARCHAR(255) NOT NULL COMMENT 'Area scope used in SC-OPS-01-2026',
  issue_year SMALLINT NOT NULL,
  last_sequence INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_scorecard_code_sequence_scope UNIQUE (scope_key, issue_year),
  CONSTRAINT chk_scorecard_code_sequence_year CHECK (issue_year BETWEEN 2000 AND 9999)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Local read projection. All Pool identifiers remain externally owned.
CREATE TABLE pool_references (
  kpi_pool_external_id BIGINT PRIMARY KEY COMMENT 'Owned by exa-kpi-pool-service',
  pool_code VARCHAR(500) NOT NULL,
  pool_name VARCHAR(200) NOT NULL,
  status_code VARCHAR(20) NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE NOT NULL,
  input_frequency_external_id BIGINT NOT NULL COMMENT 'External frequency ID',
  input_frequency_code VARCHAR(50) NOT NULL,
  source_version BIGINT NULL,
  source_updated_at DATETIME(3) NULL,
  synced_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT uq_pool_references_code UNIQUE (pool_code),
  CONSTRAINT chk_pool_reference_dates CHECK (valid_to >= valid_from),
  INDEX ix_pool_references_status_validity (status_code, valid_from, valid_to),
  INDEX ix_pool_references_frequency_external (input_frequency_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pool_period_references (
  pool_period_reference_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  kpi_pool_external_id BIGINT NOT NULL COMMENT 'External Pool ID; no physical FK',
  pool_period_external_id BIGINT NULL COMMENT 'External Pool Input Period ID',
  pool_composition_external_id BIGINT NULL COMMENT 'External finalized Pool Composition ID',
  period_key CHAR(7) NOT NULL COMMENT 'YYYY-MM',
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
  CONSTRAINT chk_pool_period_reference_key CHECK (period_key REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  INDEX ix_pool_period_reference_status (kpi_pool_external_id, composition_status_code, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE pool_period_membership_references (
  pool_period_membership_reference_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  pool_period_reference_id BIGINT NOT NULL,
  pool_membership_external_id BIGINT NOT NULL COMMENT 'External Pool membership ID',
  kpi_definition_external_id BIGINT NOT NULL COMMENT 'External KPI Management ID',
  kpi_configuration_external_id BIGINT NOT NULL COMMENT 'External KPI Management ID',
  definition_code VARCHAR(30) NOT NULL,
  definition_name VARCHAR(200) NOT NULL,
  configuration_code VARCHAR(40) NOT NULL,
  display_order INT UNSIGNED NOT NULL,
  CONSTRAINT fk_pool_period_membership_references_period FOREIGN KEY (pool_period_reference_id)
    REFERENCES pool_period_references(pool_period_reference_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_pool_period_membership_reference UNIQUE (pool_period_reference_id, pool_membership_external_id),
  CONSTRAINT uq_pool_period_configuration_reference UNIQUE (pool_period_reference_id, kpi_configuration_external_id),
  CONSTRAINT uq_pool_period_definition_reference UNIQUE (pool_period_reference_id, kpi_definition_external_id),
  INDEX ix_pool_period_membership_configuration (kpi_configuration_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecards (
  scorecard_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_code VARCHAR(40) NOT NULL,
  scorecard_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  kpi_pool_external_id BIGINT NOT NULL COMMENT 'External Pool ID; no physical FK',
  pool_code_snapshot VARCHAR(500) NOT NULL,
  pool_name_snapshot VARCHAR(200) NOT NULL,
  status_code VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  aggregate_version INT UNSIGNED NOT NULL DEFAULT 1,
  notes TEXT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT uq_scorecards_code UNIQUE (scorecard_code),
  CONSTRAINT fk_scorecards_status FOREIGN KEY (status_code)
    REFERENCES scorecard_statuses(code) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_scorecards_code_not_blank CHECK (LENGTH(TRIM(scorecard_code)) > 0),
  CONSTRAINT chk_scorecards_name_not_blank CHECK (LENGTH(TRIM(scorecard_name)) > 0),
  INDEX ix_scorecards_pool_status (kpi_pool_external_id, status_code, deleted_at),
  INDEX ix_scorecards_status (status_code, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_company_scopes (
  scorecard_company_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  external_company_id BIGINT NOT NULL COMMENT 'External organization/company ID',
  company_code_snapshot VARCHAR(30) NOT NULL,
  company_name_snapshot VARCHAR(150) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_company_scopes_scorecard FOREIGN KEY (scorecard_id)
    REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_company_scope UNIQUE (scorecard_id, external_company_id),
  CONSTRAINT uq_scorecard_company_scope_order UNIQUE (scorecard_id, display_order),
  CONSTRAINT chk_scorecard_company_scope_order CHECK (display_order > 0),
  INDEX ix_scorecard_company_external (external_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_department_scopes (
  scorecard_department_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  external_department_id BIGINT NOT NULL COMMENT 'External organization/department ID',
  external_company_id BIGINT NOT NULL COMMENT 'External organization/company ID',
  department_code_snapshot VARCHAR(50) NOT NULL,
  department_name_snapshot VARCHAR(150) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_department_scopes_scorecard FOREIGN KEY (scorecard_id)
    REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_department_scope UNIQUE (scorecard_id, external_department_id),
  CONSTRAINT uq_scorecard_department_scope_order UNIQUE (scorecard_id, display_order),
  CONSTRAINT chk_scorecard_department_scope_order CHECK (display_order > 0),
  INDEX ix_scorecard_department_external (external_department_id),
  INDEX ix_scorecard_department_company_external (external_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_employee_scopes (
  scorecard_employee_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_department_scope_id BIGINT NOT NULL,
  external_employee_id BIGINT NOT NULL COMMENT 'External organization/employee ID',
  employee_code_snapshot VARCHAR(50) NOT NULL,
  employee_name_snapshot VARCHAR(220) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_employee_scopes_department FOREIGN KEY (scorecard_department_scope_id)
    REFERENCES scorecard_department_scopes(scorecard_department_scope_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_department_employee UNIQUE (scorecard_department_scope_id, external_employee_id),
  INDEX ix_scorecard_employee_external (external_employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_period_compositions (
  scorecard_period_composition_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  kpi_pool_external_id BIGINT NOT NULL COMMENT 'External Pool ID; no physical FK',
  pool_period_external_id BIGINT NULL COMMENT 'External Pool Input Period ID',
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  period_key CHAR(7) NOT NULL COMMENT 'YYYY-MM',
  pool_composition_external_id BIGINT NULL COMMENT 'External finalized Pool Composition ID',
  status_code VARCHAR(30) NOT NULL DEFAULT 'PREPARING',
  finalized_at DATETIME(3) NULL,
  finalized_by_user_id BIGINT NULL COMMENT 'External identity ID',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_period_compositions_scorecard FOREIGN KEY (scorecard_id)
    REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_composition UNIQUE (scorecard_id, period_start),
  CONSTRAINT chk_scorecard_period_dates CHECK (period_end >= period_start),
  CONSTRAINT chk_scorecard_period_key CHECK (period_key REGEXP '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT chk_scorecard_period_status CHECK (status_code IN ('PREPARING','FINALIZED')),
  CONSTRAINT chk_scorecard_period_finalization CHECK (
    (status_code = 'PREPARING' AND finalized_at IS NULL)
    OR (status_code = 'FINALIZED' AND finalized_at IS NOT NULL)
  ),
  INDEX ix_scorecard_period_status (scorecard_id, status_code, period_start),
  INDEX ix_scorecard_pool_external_period (kpi_pool_external_id, period_start),
  INDEX ix_scorecard_pool_period_external (pool_period_external_id),
  INDEX ix_scorecard_pool_composition_external (pool_composition_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_period_kpis (
  scorecard_period_kpi_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_period_composition_id BIGINT NOT NULL,
  kpi_pool_membership_external_id BIGINT NOT NULL COMMENT 'External Pool membership ID',
  kpi_definition_external_id BIGINT NOT NULL COMMENT 'External KPI Management ID',
  kpi_configuration_external_id BIGINT NOT NULL COMMENT 'External KPI Management ID',
  definition_code_snapshot VARCHAR(30) NOT NULL,
  definition_name_snapshot VARCHAR(200) NOT NULL,
  configuration_code_snapshot VARCHAR(40) NOT NULL,
  weight_percent DECIMAL(7,4) NOT NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_period_kpis_composition FOREIGN KEY (scorecard_period_composition_id)
    REFERENCES scorecard_period_compositions(scorecard_period_composition_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_kpi UNIQUE (scorecard_period_composition_id, kpi_configuration_external_id),
  CONSTRAINT uq_scorecard_period_kpi_definition UNIQUE (scorecard_period_composition_id, kpi_definition_external_id),
  CONSTRAINT uq_scorecard_period_kpi_order UNIQUE (scorecard_period_composition_id, display_order),
  CONSTRAINT chk_scorecard_period_kpi_weight CHECK (weight_percent > 0 AND weight_percent <= 100),
  INDEX ix_scorecard_pool_membership_external (kpi_pool_membership_external_id),
  INDEX ix_scorecard_definition_external (kpi_definition_external_id),
  INDEX ix_scorecard_configuration_external (kpi_configuration_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE scorecard_period_links (
  scorecard_period_link_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_period_composition_id BIGINT NOT NULL,
  linked_scorecard_id BIGINT NOT NULL,
  weight_percent DECIMAL(7,4) NOT NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL COMMENT 'External identity ID',
  CONSTRAINT fk_scorecard_period_links_composition FOREIGN KEY (scorecard_period_composition_id)
    REFERENCES scorecard_period_compositions(scorecard_period_composition_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_scorecard_period_links_linked_scorecard FOREIGN KEY (linked_scorecard_id)
    REFERENCES scorecards(scorecard_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_link UNIQUE (scorecard_period_composition_id, linked_scorecard_id),
  CONSTRAINT uq_scorecard_period_link_order UNIQUE (scorecard_period_composition_id, display_order),
  CONSTRAINT chk_scorecard_period_link_weight CHECK (weight_percent > 0 AND weight_percent <= 100),
  INDEX ix_scorecard_period_linked_scorecard (linked_scorecard_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE outbox_events (
  outbox_event_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  event_id CHAR(36) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  aggregate_type VARCHAR(80) NOT NULL,
  aggregate_id VARCHAR(100) NOT NULL,
  aggregate_version INT UNSIGNED NOT NULL,
  subject VARCHAR(200) NOT NULL,
  payload JSON NOT NULL,
  occurred_at DATETIME(3) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempt_count INT UNSIGNED NOT NULL DEFAULT 0,
  next_attempt_at DATETIME(3) NULL,
  last_error TEXT NULL,
  published_at DATETIME(3) NULL,
  locked_at DATETIME(3) NULL,
  locked_by VARCHAR(100) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NULL,
  CONSTRAINT uq_outbox_events_event_id UNIQUE (event_id),
  CONSTRAINT chk_outbox_status CHECK (status IN ('PENDING','PROCESSING','PUBLISHED','FAILED','DEAD')),
  INDEX ix_outbox_events_pending (status, next_attempt_at, occurred_at),
  INDEX ix_outbox_events_aggregate (aggregate_type, aggregate_id, aggregate_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE processed_events (
  event_id CHAR(36) PRIMARY KEY,
  event_type VARCHAR(120) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  aggregate_id VARCHAR(100) NULL,
  source_service VARCHAR(100) NULL,
  processed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX ix_processed_events_type (event_type, processed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO scorecard_statuses (code, name, description, display_order) VALUES
  ('DRAFT', 'Draft', 'Created without a finalized first-period composition.', 10),
  ('ACTIVE', 'Active', 'Has at least one finalized period composition.', 20),
  ('INACTIVE', 'Inactive', 'Excluded from new operations while history remains readable.', 30)
ON DUPLICATE KEY UPDATE
  name = VALUES(name), description = VALUES(description), display_order = VALUES(display_order);

-- PHYSICAL FKs (all local):
-- scorecards.status_code -> scorecard_statuses.code
-- company/department scopes.scorecard_id -> scorecards.scorecard_id
-- employee scope.department_scope_id -> scorecard_department_scopes
-- period compositions.scorecard_id -> scorecards.scorecard_id
-- period KPIs.composition_id -> scorecard_period_compositions
-- period links.composition_id -> scorecard_period_compositions
-- period links.linked_scorecard_id -> scorecards.scorecard_id
--
-- EXTERNAL IDs (never physical FKs): Pool, Pool Period, Pool Composition,
-- Pool membership, KPI Definition, KPI Configuration, frequency, company,
-- department, employee, and user/actor IDs.
