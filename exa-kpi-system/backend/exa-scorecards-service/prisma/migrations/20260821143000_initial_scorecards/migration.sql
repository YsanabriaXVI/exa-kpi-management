CREATE TABLE scorecard_statuses (
  code VARCHAR(30) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT chk_scorecard_status_order CHECK (display_order > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecards (
  scorecard_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_code VARCHAR(40) NOT NULL,
  scorecard_name VARCHAR(200) NOT NULL,
  description TEXT NULL,
  kpi_pool_external_id BIGINT NOT NULL,
  pool_code_snapshot VARCHAR(500) NOT NULL,
  pool_name_snapshot VARCHAR(200) NOT NULL,
  status_code VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  aggregate_version INT UNSIGNED NOT NULL DEFAULT 1,
  notes TEXT NULL,
  deleted_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL,
  CONSTRAINT uq_scorecards_code UNIQUE (scorecard_code),
  CONSTRAINT fk_scorecards_status FOREIGN KEY (status_code) REFERENCES scorecard_statuses(code) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_scorecards_code_not_blank CHECK (LENGTH(TRIM(scorecard_code)) > 0),
  CONSTRAINT chk_scorecards_name_not_blank CHECK (LENGTH(TRIM(scorecard_name)) > 0),
  INDEX ix_scorecards_pool_status (kpi_pool_external_id, status_code, deleted_at),
  INDEX ix_scorecards_status (status_code, deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_company_scopes (
  scorecard_company_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  external_company_id BIGINT NOT NULL,
  company_code_snapshot VARCHAR(30) NOT NULL,
  company_name_snapshot VARCHAR(150) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_company_scopes_scorecard FOREIGN KEY (scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_company_scope UNIQUE (scorecard_id, external_company_id),
  CONSTRAINT uq_scorecard_company_scope_order UNIQUE (scorecard_id, display_order),
  INDEX ix_scorecard_company_external (external_company_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_department_scopes (
  scorecard_department_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  external_department_id BIGINT NOT NULL,
  department_code_snapshot VARCHAR(50) NOT NULL,
  department_name_snapshot VARCHAR(150) NOT NULL,
  display_order SMALLINT NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_department_scopes_scorecard FOREIGN KEY (scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_department_scope UNIQUE (scorecard_id, external_department_id),
  CONSTRAINT uq_scorecard_department_scope_order UNIQUE (scorecard_id, display_order),
  INDEX ix_scorecard_department_external (external_department_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_employee_scopes (
  scorecard_employee_scope_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_department_scope_id BIGINT NOT NULL,
  external_employee_id BIGINT NOT NULL,
  employee_code_snapshot VARCHAR(50) NOT NULL,
  employee_name_snapshot VARCHAR(220) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_employee_scopes_department FOREIGN KEY (scorecard_department_scope_id) REFERENCES scorecard_department_scopes(scorecard_department_scope_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_department_employee UNIQUE (scorecard_department_scope_id, external_employee_id),
  INDEX ix_scorecard_employee_external (external_employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_period_compositions (
  scorecard_period_composition_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_id BIGINT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  pool_composition_external_id BIGINT NULL,
  status_code VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
  finalized_at DATETIME(3) NULL,
  finalized_by_user_id BIGINT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_period_compositions_scorecard FOREIGN KEY (scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_composition UNIQUE (scorecard_id, period_start),
  CONSTRAINT chk_scorecard_period_dates CHECK (period_end >= period_start),
  CONSTRAINT chk_scorecard_period_status CHECK (status_code IN ('DRAFT','FINALIZED')),
  INDEX ix_scorecard_period_status (scorecard_id, status_code, period_start),
  INDEX ix_scorecard_pool_composition_external (pool_composition_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_period_kpis (
  scorecard_period_kpi_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_period_composition_id BIGINT NOT NULL,
  kpi_pool_membership_external_id BIGINT NOT NULL,
  kpi_definition_external_id BIGINT NOT NULL,
  kpi_configuration_external_id BIGINT NOT NULL,
  definition_code_snapshot VARCHAR(30) NOT NULL,
  definition_name_snapshot VARCHAR(200) NOT NULL,
  configuration_code_snapshot VARCHAR(40) NOT NULL,
  weight_percent DECIMAL(7,4) NOT NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  updated_at DATETIME(3) NULL,
  updated_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_period_kpis_composition FOREIGN KEY (scorecard_period_composition_id) REFERENCES scorecard_period_compositions(scorecard_period_composition_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_kpi UNIQUE (scorecard_period_composition_id, kpi_configuration_external_id),
  CONSTRAINT uq_scorecard_period_kpi_order UNIQUE (scorecard_period_composition_id, display_order),
  CONSTRAINT chk_scorecard_period_kpi_weight CHECK (weight_percent > 0 AND weight_percent <= 100),
  INDEX ix_scorecard_pool_membership_external (kpi_pool_membership_external_id),
  INDEX ix_scorecard_definition_external (kpi_definition_external_id),
  INDEX ix_scorecard_configuration_external (kpi_configuration_external_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE scorecard_period_links (
  scorecard_period_link_id BIGINT PRIMARY KEY AUTO_INCREMENT,
  scorecard_period_composition_id BIGINT NOT NULL,
  linked_scorecard_id BIGINT NOT NULL,
  weight_percent DECIMAL(7,4) NOT NULL,
  display_order INT UNSIGNED NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  created_by_user_id BIGINT NULL,
  CONSTRAINT fk_scorecard_period_links_composition FOREIGN KEY (scorecard_period_composition_id) REFERENCES scorecard_period_compositions(scorecard_period_composition_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_scorecard_period_links_linked_scorecard FOREIGN KEY (linked_scorecard_id) REFERENCES scorecards(scorecard_id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT uq_scorecard_period_link UNIQUE (scorecard_period_composition_id, linked_scorecard_id),
  CONSTRAINT uq_scorecard_period_link_order UNIQUE (scorecard_period_composition_id, display_order),
  CONSTRAINT chk_scorecard_period_link_weight CHECK (weight_percent > 0 AND weight_percent <= 100),
  INDEX ix_scorecard_period_linked_scorecard (linked_scorecard_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

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
  INDEX ix_outbox_events_pending (status, next_attempt_at, occurred_at),
  INDEX ix_outbox_events_aggregate (aggregate_type, aggregate_id, aggregate_version)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO scorecard_statuses (code, name, description, display_order) VALUES
  ('DRAFT', 'Draft', 'Scorecard information or period composition is being prepared.', 10),
  ('ACTIVE', 'Active', 'The Scorecard has at least one finalized period composition.', 20),
  ('INACTIVE', 'Inactive', 'The Scorecard is retained for historical consultation.', 30);

