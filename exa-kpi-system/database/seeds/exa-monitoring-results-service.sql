-- ============================================================================
-- EXA KPI MANAGEMENT - MONITORING RESULTS SERVICE
-- MySQL 8 bootstrap schema
-- Database: exa_monitoring
-- Generated: 2026-08-25
--
-- ARCHITECTURAL RULES
-- 1) Physical FOREIGN KEY constraints exist ONLY between tables owned by
--    exa_monitoring.
-- 2) IDs owned by Pool, Scorecard, KPI Management, Access/Identity or any
--    other microservice are stored as EXTERNAL IDs: indexed, but WITHOUT FK.
-- 3) Historical business data is preserved with snapshots. Monitoring must not
--    depend on mutable names/goals/units/weights from other services after a
--    Monitoring Period is generated.
-- 4) Manual Entry and Excel Import are capture channels for the SAME Draft.
--    The Monitoring Period does not have one exclusive input method.
-- 5) An expected result is represented by monitoring_period_inputs.
--    A pending result has kpi_results.result_value IS NULL; the row itself may
--    exist to preserve a comment or a cleared Draft value. Result = 0 is a
--    valid real result and must never mean "pending".
-- 6) Score/Compliance/Traffic Light may remain NULL while results are still in
--    Draft. They are calculated later by the scoring/validation workflow.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `exa_monitoring`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `exa_monitoring`;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- ============================================================================
-- 1. LOCAL CATALOGS
-- ============================================================================

CREATE TABLE `monitoring_period_statuses` (
  `monitoring_period_status_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `is_terminal` TINYINT(1) NOT NULL DEFAULT 0,
  `allows_entry` TINYINT(1) NOT NULL DEFAULT 0,
  `allows_validation` TINYINT(1) NOT NULL DEFAULT 0,
  `allows_submit` TINYINT(1) NOT NULL DEFAULT 0,
  `allows_close` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `uq_monitoring_period_status_code` UNIQUE (`code`),
  CONSTRAINT `chk_mps_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_mps_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_mps_order` CHECK (`display_order` > 0),

  INDEX `ix_mps_created_by` (`created_by_user_id`),
  INDEX `ix_mps_updated_by` (`updated_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `monitoring_input_methods` (
  `monitoring_input_method_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `uq_monitoring_input_method_code` UNIQUE (`code`),
  CONSTRAINT `chk_mim_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_mim_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_mim_order` CHECK (`display_order` > 0),

  INDEX `ix_mim_created_by` (`created_by_user_id`),
  INDEX `ix_mim_updated_by` (`updated_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `result_entry_batch_statuses` (
  `result_entry_batch_status_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `is_terminal` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_result_batch_status_code` UNIQUE (`code`),
  CONSTRAINT `chk_rebs_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_rebs_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_rebs_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `result_entry_row_statuses` (
  `result_entry_row_status_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_result_row_status_code` UNIQUE (`code`),
  CONSTRAINT `chk_rers_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_rers_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_rers_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `kpi_result_statuses` (
  `kpi_result_status_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `is_final` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_kpi_result_status_code` UNIQUE (`code`),
  CONSTRAINT `chk_krs_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_krs_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_krs_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `validation_statuses` (
  `validation_status_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `is_successful` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_validation_status_code` UNIQUE (`code`),
  CONSTRAINT `chk_vs_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_vs_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_vs_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `validation_issue_severities` (
  `validation_issue_severity_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `blocks_validation` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_validation_severity_code` UNIQUE (`code`),
  CONSTRAINT `chk_vis_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_vis_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_vis_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `period_closure_types` (
  `period_closure_type_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `code` VARCHAR(40) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `requires_justification` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `uq_period_closure_type_code` UNIQUE (`code`),
  CONSTRAINT `chk_pct_code` CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),
  CONSTRAINT `chk_pct_name` CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),
  CONSTRAINT `chk_pct_order` CHECK (`display_order` > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 2. MONITORING PERIOD - LOCAL AGGREGATE ROOT
-- ============================================================================

CREATE TABLE `monitoring_periods` (
  `monitoring_period_id` BIGINT PRIMARY KEY AUTO_INCREMENT,

  -- External Pool references. These are deliberately NOT physical FKs.
  `kpi_pool_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exa_kpi_pool.kpi_pools',
  `pool_input_period_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact generated Pool Input Period',
  `pool_period_composition_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact finalized Pool composition for this Input Period',
  `input_frequency_id` BIGINT NULL COMMENT 'EXTERNAL ID - Pool/KPI catalog; no FK',

  -- Pool snapshots for historical independence and fast overview queries.
  `pool_code_snapshot` VARCHAR(40) NOT NULL,
  `pool_name_snapshot` VARCHAR(200) NOT NULL,
  `input_frequency_code_snapshot` VARCHAR(40) NULL,
  `input_frequency_name_snapshot` VARCHAR(120) NULL,
  `companies_snapshot` JSON NULL COMMENT 'Historical company context copied from Pool',

  `sequence_no` INT NOT NULL,
  `period_key` VARCHAR(30) NOT NULL COMMENT 'Example: 2026-08, 2026-Q3, 2026-H1',
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `period_label` VARCHAR(100) NOT NULL,

  `monitoring_period_status_id` BIGINT NOT NULL,
  `previous_monitoring_period_id` BIGINT NULL,

  `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `generated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_mp_status`
    FOREIGN KEY (`monitoring_period_status_id`)
    REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_mp_previous`
    FOREIGN KEY (`previous_monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `uq_mp_pool_input_period` UNIQUE (`kpi_pool_id`, `pool_input_period_id`),
  CONSTRAINT `uq_mp_pool_period_key` UNIQUE (`kpi_pool_id`, `period_key`),
  CONSTRAINT `uq_mp_pool_sequence` UNIQUE (`kpi_pool_id`, `sequence_no`),
  CONSTRAINT `uq_mp_previous` UNIQUE (`previous_monitoring_period_id`),

  CONSTRAINT `chk_mp_sequence` CHECK (`sequence_no` > 0),
  CONSTRAINT `chk_mp_dates` CHECK (`period_end` >= `period_start`),
  CONSTRAINT `chk_mp_period_key` CHECK (CHAR_LENGTH(TRIM(`period_key`)) > 0),
  CONSTRAINT `chk_mp_label` CHECK (CHAR_LENGTH(TRIM(`period_label`)) > 0),
  CONSTRAINT `chk_mp_pool_code` CHECK (CHAR_LENGTH(TRIM(`pool_code_snapshot`)) > 0),
  CONSTRAINT `chk_mp_pool_name` CHECK (CHAR_LENGTH(TRIM(`pool_name_snapshot`)) > 0),
  CONSTRAINT `chk_mp_not_self_previous`
    CHECK (`previous_monitoring_period_id` IS NULL OR `previous_monitoring_period_id` <> `monitoring_period_id`),

  INDEX `ix_mp_status` (`monitoring_period_status_id`),
  INDEX `ix_mp_pool` (`kpi_pool_id`),
  INDEX `ix_mp_pool_input_period` (`pool_input_period_id`),
  INDEX `ix_mp_pool_composition` (`pool_period_composition_id`),
  INDEX `ix_mp_dates` (`period_start`, `period_end`),
  INDEX `ix_mp_generated_by` (`generated_by_user_id`),
  INDEX `ix_mp_created_by` (`created_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 3. SCORECARD SNAPSHOT FOR EXACT INPUT PERIOD
-- ============================================================================

CREATE TABLE `monitoring_period_scorecards` (
  `monitoring_period_scorecard_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,

  `scorecard_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exa_scorecard.scorecards',
  `scorecard_period_composition_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact FINALIZED Scorecard composition for this Input Period',

  `scorecard_code_snapshot` VARCHAR(40) NOT NULL,
  `scorecard_name_snapshot` VARCHAR(200) NOT NULL,
  `departments_snapshot` JSON NULL COMMENT 'Historical scope; IDs/names copied from Scorecard/organization data',

  `own_kpi_weight_percent_snapshot` DECIMAL(7,4) NOT NULL DEFAULT 0,
  `linked_scorecard_weight_percent_snapshot` DECIMAL(7,4) NOT NULL DEFAULT 0,
  `total_weight_percent_snapshot` DECIMAL(7,4) NOT NULL DEFAULT 100.0000,

  `snapshot_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `fk_mpsc_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `uq_mpsc_period_scorecard` UNIQUE (`monitoring_period_id`, `scorecard_id`),
  CONSTRAINT `uq_mpsc_period_composition` UNIQUE (`monitoring_period_id`, `scorecard_period_composition_id`),

  CONSTRAINT `chk_mpsc_code` CHECK (CHAR_LENGTH(TRIM(`scorecard_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpsc_name` CHECK (CHAR_LENGTH(TRIM(`scorecard_name_snapshot`)) > 0),
  CONSTRAINT `chk_mpsc_own_weight` CHECK (`own_kpi_weight_percent_snapshot` BETWEEN 0 AND 100),
  CONSTRAINT `chk_mpsc_linked_weight` CHECK (`linked_scorecard_weight_percent_snapshot` BETWEEN 0 AND 100),
  CONSTRAINT `chk_mpsc_total_weight` CHECK (`total_weight_percent_snapshot` = 100.0000),
  CONSTRAINT `chk_mpsc_weight_math`
    CHECK (`total_weight_percent_snapshot` = `own_kpi_weight_percent_snapshot` + `linked_scorecard_weight_percent_snapshot`),

  INDEX `ix_mpsc_scorecard` (`scorecard_id`),
  INDEX `ix_mpsc_composition` (`scorecard_period_composition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 4. EXPECTED RESULTS
-- One row = one KPI Configuration result expected by Monitoring for the exact
-- Pool + Input Period. With the current Scorecard rule, a KPI Configuration can
-- be directly assigned to only one Scorecard inside the same Pool/Input Period.
-- ============================================================================

CREATE TABLE `monitoring_period_inputs` (
  `monitoring_period_input_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `monitoring_period_scorecard_id` BIGINT NOT NULL,

  -- External IDs - no physical FKs.
  `kpi_definition_id` BIGINT NULL COMMENT 'EXTERNAL ID - exa_kpi_management.kpi_definitions',
  `kpi_configuration_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exa_kpi_management.kpi_configurations',
  `kpi_configuration_revision_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact KPI Configuration revision',
  `pool_composition_item_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact Pool composition item',
  `scorecard_kpi_assignment_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - exact Scorecard KPI assignment for this period',

  -- Identity snapshots.
  `config_code_snapshot` VARCHAR(40) NOT NULL,
  `kpi_code_snapshot` VARCHAR(30) NOT NULL,
  `kpi_name_snapshot` VARCHAR(200) NOT NULL,
  `kpi_objective_snapshot` TEXT NULL,

  -- Goal/evaluation snapshot. Supports simple goal, exact target and ranges.
  `goal_text_snapshot` VARCHAR(255) NULL,
  `goal_value_snapshot` DECIMAL(20,6) NULL,
  `goal_min_value_snapshot` DECIMAL(20,6) NULL,
  `goal_max_value_snapshot` DECIMAL(20,6) NULL,
  `evaluation_type_code_snapshot` VARCHAR(40) NOT NULL COMMENT 'Example: GREATER_IS_BETTER, LOWER_IS_BETTER, EQUAL_IS_BETTER, RANGE',
  `scoring_method_code_snapshot` VARCHAR(40) NOT NULL COMMENT 'Example: PROPORTIONAL, THRESHOLD_BASED, RANGE_BASED, TOLERANCE_BASED',
  `calculation_rule_version_snapshot` VARCHAR(30) NULL,

  -- Unit snapshot. measurement_unit_id remains an external trace ID only.
  `measurement_unit_id` BIGINT NULL COMMENT 'EXTERNAL ID - KPI Management catalog; no FK',
  `measurement_unit_code_snapshot` VARCHAR(40) NULL,
  `measurement_unit_name_snapshot` VARCHAR(120) NULL,
  `measurement_unit_symbol_snapshot` VARCHAR(30) NULL,

  -- Data source snapshot. primary_data_source_id remains external.
  `primary_data_source_id` BIGINT NULL COMMENT 'EXTERNAL ID - KPI Management catalog; no FK',
  `primary_data_source_code_snapshot` VARCHAR(40) NULL,
  `primary_data_source_name_snapshot` VARCHAR(150) NULL,

  `weight_percent_snapshot` DECIMAL(7,4) NOT NULL,
  `is_required` TINYINT(1) NOT NULL DEFAULT 1,
  `is_sensitive` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` INT NOT NULL DEFAULT 1,
  `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `fk_mpi_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_mpi_period_scorecard`
    FOREIGN KEY (`monitoring_period_scorecard_id`)
    REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_mpi_period_configuration` UNIQUE (`monitoring_period_id`, `kpi_configuration_id`),
  CONSTRAINT `uq_mpi_period_order` UNIQUE (`monitoring_period_id`, `display_order`),
  CONSTRAINT `uq_mpi_scorecard_assignment` UNIQUE (`monitoring_period_id`, `scorecard_kpi_assignment_id`),

  CONSTRAINT `chk_mpi_config_code` CHECK (CHAR_LENGTH(TRIM(`config_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpi_kpi_code` CHECK (CHAR_LENGTH(TRIM(`kpi_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpi_kpi_name` CHECK (CHAR_LENGTH(TRIM(`kpi_name_snapshot`)) > 0),
  CONSTRAINT `chk_mpi_evaluation_type` CHECK (CHAR_LENGTH(TRIM(`evaluation_type_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpi_scoring_method` CHECK (CHAR_LENGTH(TRIM(`scoring_method_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpi_weight` CHECK (`weight_percent_snapshot` > 0 AND `weight_percent_snapshot` <= 100),
  CONSTRAINT `chk_mpi_order` CHECK (`display_order` > 0),
  CONSTRAINT `chk_mpi_goal_range`
    CHECK (`goal_min_value_snapshot` IS NULL OR `goal_max_value_snapshot` IS NULL OR `goal_max_value_snapshot` >= `goal_min_value_snapshot`),

  INDEX `ix_mpi_period_scorecard` (`monitoring_period_scorecard_id`),
  INDEX `ix_mpi_definition_external` (`kpi_definition_id`),
  INDEX `ix_mpi_configuration_external` (`kpi_configuration_id`),
  INDEX `ix_mpi_revision_external` (`kpi_configuration_revision_id`),
  INDEX `ix_mpi_pool_item_external` (`pool_composition_item_id`),
  INDEX `ix_mpi_scorecard_assignment_external` (`scorecard_kpi_assignment_id`),
  INDEX `ix_mpi_unit_external` (`measurement_unit_id`),
  INDEX `ix_mpi_data_source_external` (`primary_data_source_id`),
  INDEX `ix_mpi_sensitive` (`monitoring_period_id`, `is_sensitive`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Traffic Light thresholds are snapshots expressed over calculated compliance
-- percentage, not over raw result values.
CREATE TABLE `monitoring_period_input_thresholds` (
  `monitoring_period_input_threshold_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_input_id` BIGINT NOT NULL,

  `traffic_light_level_id` BIGINT NULL COMMENT 'EXTERNAL ID - KPI Management traffic light catalog; no FK',
  `traffic_light_code_snapshot` VARCHAR(30) NOT NULL COMMENT 'Example: RED, YELLOW, GREEN',
  `traffic_light_name_snapshot` VARCHAR(100) NULL,

  `range_min_percent` DECIMAL(12,6) NULL,
  `range_max_percent` DECIMAL(12,6) NULL,
  `includes_min` TINYINT(1) NOT NULL DEFAULT 1,
  `includes_max` TINYINT(1) NOT NULL DEFAULT 0,
  `display_order` SMALLINT NOT NULL DEFAULT 1,

  CONSTRAINT `fk_mpit_input`
    FOREIGN KEY (`monitoring_period_input_id`)
    REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `uq_mpit_input_level` UNIQUE (`monitoring_period_input_id`, `traffic_light_code_snapshot`),
  CONSTRAINT `uq_mpit_input_order` UNIQUE (`monitoring_period_input_id`, `display_order`),

  CONSTRAINT `chk_mpit_code` CHECK (CHAR_LENGTH(TRIM(`traffic_light_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpit_has_boundary` CHECK (`range_min_percent` IS NOT NULL OR `range_max_percent` IS NOT NULL),
  CONSTRAINT `chk_mpit_range`
    CHECK (`range_min_percent` IS NULL OR `range_max_percent` IS NULL OR `range_max_percent` >= `range_min_percent`),
  CONSTRAINT `chk_mpit_order` CHECK (`display_order` > 0),

  INDEX `ix_mpit_level_external` (`traffic_light_level_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Snapshot of Linked Scorecards used later by Scorecard score calculations.
-- Same-period semantics only: no "latest closed" fallback is persisted here.
CREATE TABLE `monitoring_period_scorecard_links` (
  `monitoring_period_scorecard_link_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_scorecard_id` BIGINT NOT NULL,
  `linked_monitoring_period_scorecard_id` BIGINT NOT NULL,

  `scorecard_linked_scorecard_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - original Scorecard link row',
  `linked_scorecard_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - linked Scorecard',
  `linked_scorecard_period_composition_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - linked Scorecard exact same-period FINALIZED composition',

  `linked_scorecard_code_snapshot` VARCHAR(40) NOT NULL,
  `linked_scorecard_name_snapshot` VARCHAR(200) NOT NULL,
  `weight_percent_snapshot` DECIMAL(7,4) NOT NULL,
  `display_order_snapshot` INT NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `fk_mpscl_parent`
    FOREIGN KEY (`monitoring_period_scorecard_id`)
    REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_mpscl_linked_local`
    FOREIGN KEY (`linked_monitoring_period_scorecard_id`)
    REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_mpscl_parent_linked` UNIQUE (`monitoring_period_scorecard_id`, `linked_scorecard_id`),
  CONSTRAINT `uq_mpscl_original_link` UNIQUE (`monitoring_period_scorecard_id`, `scorecard_linked_scorecard_id`),

  CONSTRAINT `chk_mpscl_not_self`
    CHECK (`monitoring_period_scorecard_id` <> `linked_monitoring_period_scorecard_id`),
  CONSTRAINT `chk_mpscl_code` CHECK (CHAR_LENGTH(TRIM(`linked_scorecard_code_snapshot`)) > 0),
  CONSTRAINT `chk_mpscl_name` CHECK (CHAR_LENGTH(TRIM(`linked_scorecard_name_snapshot`)) > 0),
  CONSTRAINT `chk_mpscl_weight` CHECK (`weight_percent_snapshot` > 0 AND `weight_percent_snapshot` <= 100),
  CONSTRAINT `chk_mpscl_order` CHECK (`display_order_snapshot` > 0),

  INDEX `ix_mpscl_link_external` (`scorecard_linked_scorecard_id`),
  INDEX `ix_mpscl_scorecard_external` (`linked_scorecard_id`),
  INDEX `ix_mpscl_composition_external` (`linked_scorecard_period_composition_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 5. EXCEL TEMPLATE METADATA
-- The actual .xlsx lives in object/file storage. DB stores metadata only.
-- ============================================================================

CREATE TABLE `monitoring_period_templates` (
  `monitoring_period_template_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `template_version` INT NOT NULL DEFAULT 1,
  `template_file_name` VARCHAR(255) NOT NULL,
  `storage_key` VARCHAR(500) NOT NULL,
  `mime_type` VARCHAR(150) NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  `expected_row_count` INT NOT NULL,
  `expected_column_count` INT NOT NULL,
  `metadata_json` JSON NULL COMMENT 'Template period/version metadata used to reject a wrong-period workbook',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `generated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_mpt_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `uq_mpt_period_version` UNIQUE (`monitoring_period_id`, `template_version`),
  CONSTRAINT `uq_mpt_storage_key` UNIQUE (`storage_key`),

  CONSTRAINT `chk_mpt_version` CHECK (`template_version` > 0),
  CONSTRAINT `chk_mpt_file_name` CHECK (CHAR_LENGTH(TRIM(`template_file_name`)) > 0),
  CONSTRAINT `chk_mpt_storage_key` CHECK (CHAR_LENGTH(TRIM(`storage_key`)) > 0),
  CONSTRAINT `chk_mpt_mime_type` CHECK (CHAR_LENGTH(TRIM(`mime_type`)) > 0),
  CONSTRAINT `chk_mpt_rows` CHECK (`expected_row_count` >= 0),
  CONSTRAINT `chk_mpt_columns` CHECK (`expected_column_count` > 0),

  INDEX `ix_mpt_period_active` (`monitoring_period_id`, `is_active`),
  INDEX `ix_mpt_generated_by` (`generated_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 6. RESULT ENTRY - MANUAL + EXCEL SHARE THE SAME DRAFT
-- ============================================================================

CREATE TABLE `result_entry_batches` (
  `result_entry_batch_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `monitoring_input_method_id` BIGINT NOT NULL,
  `monitoring_period_template_id` BIGINT NULL,
  `result_entry_batch_status_id` BIGINT NOT NULL,

  `batch_no` INT NOT NULL,
  `overwrite_existing_values` TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Excel conflict decision; service must require explicit user confirmation',

  `uploaded_file_name` VARCHAR(255) NULL,
  `uploaded_storage_key` VARCHAR(500) NULL,
  `uploaded_mime_type` VARCHAR(150) NULL,
  `uploaded_size_bytes` BIGINT NULL,

  `rows_received` INT NOT NULL DEFAULT 0,
  `rows_valid` INT NOT NULL DEFAULT 0,
  `rows_with_warnings` INT NOT NULL DEFAULT 0,
  `rows_with_errors` INT NOT NULL DEFAULT 0,

  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` DATETIME(3) NULL,
  `submitted_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_reb_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_reb_method`
    FOREIGN KEY (`monitoring_input_method_id`)
    REFERENCES `monitoring_input_methods` (`monitoring_input_method_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_reb_template`
    FOREIGN KEY (`monitoring_period_template_id`)
    REFERENCES `monitoring_period_templates` (`monitoring_period_template_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_reb_status`
    FOREIGN KEY (`result_entry_batch_status_id`)
    REFERENCES `result_entry_batch_statuses` (`result_entry_batch_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_reb_period_batch` UNIQUE (`monitoring_period_id`, `batch_no`),
  CONSTRAINT `uq_reb_storage_key` UNIQUE (`uploaded_storage_key`),

  CONSTRAINT `chk_reb_batch_no` CHECK (`batch_no` > 0),
  CONSTRAINT `chk_reb_rows_received` CHECK (`rows_received` >= 0),
  CONSTRAINT `chk_reb_rows_valid` CHECK (`rows_valid` >= 0),
  CONSTRAINT `chk_reb_rows_warning` CHECK (`rows_with_warnings` >= 0),
  CONSTRAINT `chk_reb_rows_error` CHECK (`rows_with_errors` >= 0),
  CONSTRAINT `chk_reb_row_counts`
    CHECK (`rows_valid` + `rows_with_warnings` + `rows_with_errors` <= `rows_received`),
  CONSTRAINT `chk_reb_timestamps` CHECK (`finished_at` IS NULL OR `finished_at` >= `started_at`),
  CONSTRAINT `chk_reb_uploaded_size` CHECK (`uploaded_size_bytes` IS NULL OR `uploaded_size_bytes` > 0),
  CONSTRAINT `chk_reb_file_metadata`
    CHECK (
      (`uploaded_file_name` IS NULL AND `uploaded_storage_key` IS NULL AND `uploaded_mime_type` IS NULL AND `uploaded_size_bytes` IS NULL)
      OR
      (`uploaded_file_name` IS NOT NULL AND `uploaded_storage_key` IS NOT NULL AND `uploaded_mime_type` IS NOT NULL AND `uploaded_size_bytes` IS NOT NULL)
    ),

  INDEX `ix_reb_period_created` (`monitoring_period_id`, `created_at`),
  INDEX `ix_reb_method` (`monitoring_input_method_id`),
  INDEX `ix_reb_status` (`result_entry_batch_status_id`),
  INDEX `ix_reb_template` (`monitoring_period_template_id`),
  INDEX `ix_reb_submitted_by` (`submitted_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `result_entry_batch_rows` (
  `result_entry_batch_row_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `result_entry_batch_id` BIGINT NOT NULL,
  `monitoring_period_input_id` BIGINT NOT NULL,
  `result_entry_row_status_id` BIGINT NOT NULL,

  `source_row_number` INT NULL COMMENT 'Excel row number; NULL for Manual Entry',
  `raw_result_value` VARCHAR(250) NULL,
  `parsed_result_value` DECIMAL(20,6) NULL,
  `raw_comment` TEXT NULL,
  `existing_result_value_snapshot` DECIMAL(20,6) NULL COMMENT 'Used to display import conflicts before overwrite',
  `row_message` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `fk_rebr_batch`
    FOREIGN KEY (`result_entry_batch_id`)
    REFERENCES `result_entry_batches` (`result_entry_batch_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_rebr_input`
    FOREIGN KEY (`monitoring_period_input_id`)
    REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_rebr_status`
    FOREIGN KEY (`result_entry_row_status_id`)
    REFERENCES `result_entry_row_statuses` (`result_entry_row_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_rebr_batch_input` UNIQUE (`result_entry_batch_id`, `monitoring_period_input_id`),
  CONSTRAINT `uq_rebr_batch_source_row` UNIQUE (`result_entry_batch_id`, `source_row_number`),
  CONSTRAINT `chk_rebr_source_row` CHECK (`source_row_number` IS NULL OR `source_row_number` > 0),

  INDEX `ix_rebr_status` (`result_entry_row_status_id`),
  INDEX `ix_rebr_input` (`monitoring_period_input_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Current materialized result. There is at most one current result per expected
-- Monitoring Input. A row may exist with result_value NULL when a pending input
-- has a comment or when an entered value is cleared while the period is DRAFT.
CREATE TABLE `kpi_results` (
  `kpi_result_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_input_id` BIGINT NOT NULL,
  `latest_result_entry_batch_row_id` BIGINT NOT NULL,
  `result_value` DECIMAL(20,6) NULL,
  `result_comment` TEXT NULL,

  -- Scoring fields remain nullable while Draft/scoring rules are not yet final.
  `raw_achievement_percent` DECIMAL(12,6) NULL,
  `compliance_percent` DECIMAL(12,6) NULL,
  `weighted_score_points` DECIMAL(12,6) NULL,
  `traffic_light_level_id` BIGINT NULL COMMENT 'EXTERNAL ID - KPI Management traffic light catalog; no FK',
  `traffic_light_code_snapshot` VARCHAR(30) NULL,
  `calculation_version` VARCHAR(30) NULL,

  `kpi_result_status_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL DEFAULT 1,
  `version` INT NOT NULL DEFAULT 1 COMMENT 'Optimistic-lock token for the current result',

  `entered_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `entered_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_kr_input`
    FOREIGN KEY (`monitoring_period_input_id`)
    REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_kr_latest_row`
    FOREIGN KEY (`latest_result_entry_batch_row_id`)
    REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_kr_status`
    FOREIGN KEY (`kpi_result_status_id`)
    REFERENCES `kpi_result_statuses` (`kpi_result_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_kr_input` UNIQUE (`monitoring_period_input_id`),
  CONSTRAINT `chk_kr_raw_achievement` CHECK (`raw_achievement_percent` IS NULL OR `raw_achievement_percent` >= 0),
  CONSTRAINT `chk_kr_compliance` CHECK (`compliance_percent` IS NULL OR `compliance_percent` >= 0),
  CONSTRAINT `chk_kr_weighted_score` CHECK (`weighted_score_points` IS NULL OR `weighted_score_points` >= 0),
  CONSTRAINT `chk_kr_revision` CHECK (`revision_no` > 0),
  CONSTRAINT `chk_kr_version` CHECK (`version` > 0),

  INDEX `ix_kr_latest_row` (`latest_result_entry_batch_row_id`),
  INDEX `ix_kr_status` (`kpi_result_status_id`),
  INDEX `ix_kr_traffic_light_external` (`traffic_light_level_id`),
  INDEX `ix_kr_entered_by` (`entered_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `kpi_result_revisions` (
  `kpi_result_revision_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `kpi_result_id` BIGINT NOT NULL,
  `revision_no` INT NOT NULL,
  `result_entry_batch_row_id` BIGINT NOT NULL,

  `previous_result_value` DECIMAL(20,6) NULL,
  `new_result_value` DECIMAL(20,6) NULL,
  `previous_comment` TEXT NULL,
  `new_comment` TEXT NULL,
  `raw_achievement_percent` DECIMAL(12,6) NULL,
  `compliance_percent` DECIMAL(12,6) NULL,
  `weighted_score_points` DECIMAL(12,6) NULL,
  `traffic_light_level_id` BIGINT NULL COMMENT 'EXTERNAL ID - KPI Management traffic light catalog; no FK',
  `traffic_light_code_snapshot` VARCHAR(30) NULL,
  `calculation_version` VARCHAR(30) NULL,
  `kpi_result_status_id` BIGINT NOT NULL,

  `change_type` VARCHAR(40) NOT NULL COMMENT 'CREATE, UPDATE, CLEAR or COMMENT_ONLY',
  `entry_source` VARCHAR(40) NOT NULL COMMENT 'MANUAL or EXCEL',
  `revision_reason` TEXT NULL,
  `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `changed_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_krr_result`
    FOREIGN KEY (`kpi_result_id`)
    REFERENCES `kpi_results` (`kpi_result_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_krr_batch_row`
    FOREIGN KEY (`result_entry_batch_row_id`)
    REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_krr_status`
    FOREIGN KEY (`kpi_result_status_id`)
    REFERENCES `kpi_result_statuses` (`kpi_result_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_krr_result_revision` UNIQUE (`kpi_result_id`, `revision_no`),
  CONSTRAINT `chk_krr_revision` CHECK (`revision_no` > 0),
  CONSTRAINT `chk_krr_change_type` CHECK (`change_type` IN ('CREATE', 'UPDATE', 'CLEAR', 'COMMENT_ONLY')),
  CONSTRAINT `chk_krr_entry_source` CHECK (`entry_source` IN ('MANUAL', 'EXCEL')),
  CONSTRAINT `chk_krr_raw_achievement` CHECK (`raw_achievement_percent` IS NULL OR `raw_achievement_percent` >= 0),
  CONSTRAINT `chk_krr_compliance` CHECK (`compliance_percent` IS NULL OR `compliance_percent` >= 0),
  CONSTRAINT `chk_krr_weighted_score` CHECK (`weighted_score_points` IS NULL OR `weighted_score_points` >= 0),

  INDEX `ix_krr_batch_row` (`result_entry_batch_row_id`),
  INDEX `ix_krr_status` (`kpi_result_status_id`),
  INDEX `ix_krr_changed_by` (`changed_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 7. VALIDATION
-- Validation can run multiple times while the Monitoring Period remains DRAFT.
-- It does NOT automatically submit the period.
-- ============================================================================

CREATE TABLE `validation_runs` (
  `validation_run_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `trigger_result_entry_batch_id` BIGINT NULL,
  `validation_status_id` BIGINT NOT NULL,
  `run_no` INT NOT NULL,

  `expected_input_count` INT NOT NULL DEFAULT 0,
  `entered_result_count` INT NOT NULL DEFAULT 0,
  `missing_result_count` INT NOT NULL DEFAULT 0,
  `valid_result_count` INT NOT NULL DEFAULT 0,
  `warning_count` INT NOT NULL DEFAULT 0,
  `error_count` INT NOT NULL DEFAULT 0,
  `critical_error_count` INT NOT NULL DEFAULT 0,

  `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finished_at` DATETIME(3) NULL,
  `executed_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `summary_json` JSON NULL,

  CONSTRAINT `fk_vr_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_vr_trigger_batch`
    FOREIGN KEY (`trigger_result_entry_batch_id`)
    REFERENCES `result_entry_batches` (`result_entry_batch_id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  CONSTRAINT `fk_vr_status`
    FOREIGN KEY (`validation_status_id`)
    REFERENCES `validation_statuses` (`validation_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_vr_period_run` UNIQUE (`monitoring_period_id`, `run_no`),
  CONSTRAINT `chk_vr_run_no` CHECK (`run_no` > 0),
  CONSTRAINT `chk_vr_expected` CHECK (`expected_input_count` >= 0),
  CONSTRAINT `chk_vr_entered` CHECK (`entered_result_count` >= 0),
  CONSTRAINT `chk_vr_missing` CHECK (`missing_result_count` >= 0),
  CONSTRAINT `chk_vr_valid` CHECK (`valid_result_count` >= 0),
  CONSTRAINT `chk_vr_warning` CHECK (`warning_count` >= 0),
  CONSTRAINT `chk_vr_error` CHECK (`error_count` >= 0),
  CONSTRAINT `chk_vr_critical` CHECK (`critical_error_count` >= 0),
  CONSTRAINT `chk_vr_expected_balance`
    CHECK (`entered_result_count` + `missing_result_count` = `expected_input_count`),
  CONSTRAINT `chk_vr_valid_not_over_entered` CHECK (`valid_result_count` <= `entered_result_count`),
  CONSTRAINT `chk_vr_critical_not_over_error` CHECK (`critical_error_count` <= `error_count`),
  CONSTRAINT `chk_vr_times` CHECK (`finished_at` IS NULL OR `finished_at` >= `started_at`),

  INDEX `ix_vr_period_started` (`monitoring_period_id`, `started_at`),
  INDEX `ix_vr_status` (`validation_status_id`),
  INDEX `ix_vr_trigger_batch` (`trigger_result_entry_batch_id`),
  INDEX `ix_vr_executed_by` (`executed_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `validation_issues` (
  `validation_issue_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `validation_run_id` BIGINT NOT NULL,
  `validation_issue_severity_id` BIGINT NOT NULL,

  `monitoring_period_input_id` BIGINT NULL,
  `result_entry_batch_row_id` BIGINT NULL,
  `kpi_result_id` BIGINT NULL,

  `issue_code` VARCHAR(100) NOT NULL,
  `field_name` VARCHAR(100) NULL,
  `issue_message` TEXT NOT NULL,
  `current_value_text` TEXT NULL,
  `expected_value_text` TEXT NULL,

  `is_resolved` TINYINT(1) NOT NULL DEFAULT 0,
  `resolved_at` DATETIME(3) NULL,
  `resolved_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',
  `resolution_notes` TEXT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  CONSTRAINT `fk_vi_run`
    FOREIGN KEY (`validation_run_id`)
    REFERENCES `validation_runs` (`validation_run_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_vi_severity`
    FOREIGN KEY (`validation_issue_severity_id`)
    REFERENCES `validation_issue_severities` (`validation_issue_severity_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_vi_input`
    FOREIGN KEY (`monitoring_period_input_id`)
    REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_vi_batch_row`
    FOREIGN KEY (`result_entry_batch_row_id`)
    REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_vi_result`
    FOREIGN KEY (`kpi_result_id`)
    REFERENCES `kpi_results` (`kpi_result_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `chk_vi_code` CHECK (CHAR_LENGTH(TRIM(`issue_code`)) > 0),
  CONSTRAINT `chk_vi_message` CHECK (CHAR_LENGTH(TRIM(`issue_message`)) > 0),
  CONSTRAINT `chk_vi_resolution`
    CHECK (
      (`is_resolved` = 0 AND `resolved_at` IS NULL)
      OR
      (`is_resolved` = 1 AND `resolved_at` IS NOT NULL)
    ),

  INDEX `ix_vi_run_code` (`validation_run_id`, `issue_code`),
  INDEX `ix_vi_run_resolved` (`validation_run_id`, `is_resolved`),
  INDEX `ix_vi_severity` (`validation_issue_severity_id`),
  INDEX `ix_vi_input` (`monitoring_period_input_id`),
  INDEX `ix_vi_batch_row` (`result_entry_batch_row_id`),
  INDEX `ix_vi_result` (`kpi_result_id`),
  INDEX `ix_vi_resolved_by` (`resolved_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 8. WORKFLOW HISTORY / RETURN FOR CORRECTION
-- Return for Correction is represented as SUBMITTED -> DRAFT with reason_code
-- and change_reason; no extra status is needed.
-- ============================================================================

CREATE TABLE `monitoring_period_status_history` (
  `monitoring_period_status_history_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `from_monitoring_period_status_id` BIGINT NULL,
  `to_monitoring_period_status_id` BIGINT NOT NULL,
  `reason_code` VARCHAR(60) NULL COMMENT 'Example: SUBMIT, RETURN_FOR_CORRECTION, VALIDATE, CLOSE',
  `change_reason` TEXT NULL,
  `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `changed_by_user_id` BIGINT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_mpsh_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_mpsh_from`
    FOREIGN KEY (`from_monitoring_period_status_id`)
    REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_mpsh_to`
    FOREIGN KEY (`to_monitoring_period_status_id`)
    REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `chk_mpsh_different`
    CHECK (`from_monitoring_period_status_id` IS NULL OR `from_monitoring_period_status_id` <> `to_monitoring_period_status_id`),

  INDEX `ix_mpsh_period_changed` (`monitoring_period_id`, `changed_at`),
  INDEX `ix_mpsh_from` (`from_monitoring_period_status_id`),
  INDEX `ix_mpsh_to` (`to_monitoring_period_status_id`),
  INDEX `ix_mpsh_changed_by` (`changed_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 9. PERIOD CLOSURE
-- CLOSED is the workflow state. NORMAL / WITH_EXCEPTIONS is closure metadata.
-- ============================================================================

CREATE TABLE `period_closures` (
  `period_closure_id` BIGINT PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `period_closure_type_id` BIGINT NOT NULL,
  `validation_run_id` BIGINT NOT NULL,
  `closure_no` INT NOT NULL,

  `expected_input_count` INT NOT NULL,
  `entered_result_count` INT NOT NULL,
  `missing_result_count` INT NOT NULL,
  `warning_count` INT NOT NULL,
  `error_count` INT NOT NULL,
  `affected_scorecard_count` INT NOT NULL,

  `justification` TEXT NULL,
  `confirmation_acknowledged` TINYINT(1) NOT NULL,
  `closed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `closed_by_user_id` BIGINT NOT NULL COMMENT 'EXTERNAL ID - Access/Identity; no FK',

  CONSTRAINT `fk_pc_period`
    FOREIGN KEY (`monitoring_period_id`)
    REFERENCES `monitoring_periods` (`monitoring_period_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_pc_type`
    FOREIGN KEY (`period_closure_type_id`)
    REFERENCES `period_closure_types` (`period_closure_type_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_pc_validation`
    FOREIGN KEY (`validation_run_id`)
    REFERENCES `validation_runs` (`validation_run_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `uq_pc_period_closure_no` UNIQUE (`monitoring_period_id`, `closure_no`),
  CONSTRAINT `chk_pc_closure_no` CHECK (`closure_no` > 0),
  CONSTRAINT `chk_pc_expected` CHECK (`expected_input_count` >= 0),
  CONSTRAINT `chk_pc_entered` CHECK (`entered_result_count` >= 0),
  CONSTRAINT `chk_pc_missing` CHECK (`missing_result_count` >= 0),
  CONSTRAINT `chk_pc_warning` CHECK (`warning_count` >= 0),
  CONSTRAINT `chk_pc_error` CHECK (`error_count` >= 0),
  CONSTRAINT `chk_pc_scorecards` CHECK (`affected_scorecard_count` >= 0),
  CONSTRAINT `chk_pc_expected_balance`
    CHECK (`entered_result_count` + `missing_result_count` = `expected_input_count`),
  CONSTRAINT `chk_pc_confirmation` CHECK (`confirmation_acknowledged` = 1),
  CONSTRAINT `chk_pc_justification` CHECK (`justification` IS NULL OR CHAR_LENGTH(TRIM(`justification`)) > 0),

  INDEX `ix_pc_period_closed` (`monitoring_period_id`, `closed_at`),
  INDEX `ix_pc_validation` (`validation_run_id`),
  INDEX `ix_pc_type` (`period_closure_type_id`),
  INDEX `ix_pc_closed_by` (`closed_by_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ============================================================================
-- 10. SEED DATA
-- Idempotent catalog bootstrap.
-- ============================================================================

INSERT IGNORE INTO `monitoring_period_statuses`
  (`code`, `name`, `description`, `display_order`, `is_terminal`, `allows_entry`, `allows_validation`, `allows_submit`, `allows_close`)
VALUES
  ('DRAFT',     'Draft',     'Results may be captured or corrected through Manual Entry and Excel Import.', 1, 0, 1, 1, 1, 0),
  ('SUBMITTED', 'Submitted', 'Entry is locked while the submitted period is reviewed.',                    2, 0, 0, 1, 0, 0),
  ('VALIDATED', 'Validated', 'Validation has been approved and the period is ready for closure.',          3, 0, 0, 0, 0, 1),
  ('CLOSED',    'Closed',    'The Monitoring Period is final and read-only.',                               4, 1, 0, 0, 0, 0);

INSERT IGNORE INTO `monitoring_input_methods`
  (`code`, `name`, `description`, `display_order`)
VALUES
  ('MANUAL', 'Manual Entry', 'Results entered or corrected directly in the application.', 1),
  ('EXCEL',  'Excel Import', 'Results imported from the generated Monitoring Period Excel template.', 2);

INSERT IGNORE INTO `result_entry_batch_statuses`
  (`code`, `name`, `description`, `display_order`, `is_terminal`)
VALUES
  ('PROCESSING', 'Processing', 'The batch is being parsed or prepared.', 1, 0),
  ('READY',      'Ready',      'The batch passed parsing and can be confirmed.', 2, 0),
  ('IMPORTED',   'Imported',   'The confirmed rows were applied to the Draft results.', 3, 1),
  ('FAILED',     'Failed',     'The batch could not be applied.', 4, 1),
  ('CANCELLED',  'Cancelled',  'The user cancelled the batch before import.', 5, 1);

INSERT IGNORE INTO `result_entry_row_statuses`
  (`code`, `name`, `description`, `display_order`)
VALUES
  ('VALID',   'Valid',   'The row can be applied to the Draft result.', 1),
  ('WARNING', 'Warning', 'The row can be reviewed before confirmation.', 2),
  ('ERROR',   'Error',   'The row cannot be applied until corrected.', 3),
  ('SKIPPED', 'Skipped', 'The row is intentionally not applied.', 4);

INSERT IGNORE INTO `kpi_result_statuses`
  (`code`, `name`, `description`, `display_order`, `is_final`)
VALUES
  ('ENTERED',   'Entered',   'A current result value exists in Draft.', 1, 0),
  ('VALIDATED', 'Validated', 'The result belongs to a validated Monitoring Period.', 2, 0),
  ('CLOSED',    'Closed',    'The result belongs to a closed Monitoring Period.', 3, 1);

INSERT IGNORE INTO `validation_statuses`
  (`code`, `name`, `description`, `display_order`, `is_successful`)
VALUES
  ('PASSED',               'Passed',               'No blocking validation issues were found.', 1, 1),
  ('PASSED_WITH_WARNINGS', 'Passed with Warnings', 'Warnings exist but no blocking issue was found.', 2, 1),
  ('FAILED',               'Failed',               'One or more blocking validation issues were found.', 3, 0);

INSERT IGNORE INTO `validation_issue_severities`
  (`code`, `name`, `description`, `display_order`, `blocks_validation`)
VALUES
  ('WARNING',  'Warning',  'Review is recommended; may be allowed through an approved exception.', 1, 0),
  ('ERROR',    'Error',    'The issue blocks normal validation until corrected or explicitly handled by an allowed business rule.', 2, 1),
  ('CRITICAL', 'Critical', 'The issue always blocks validation/closure until corrected.', 3, 1);

INSERT IGNORE INTO `period_closure_types`
  (`code`, `name`, `description`, `requires_justification`, `display_order`)
VALUES
  ('NORMAL',          'Normal',          'Standard closure after successful validation.', 0, 1),
  ('WITH_EXCEPTIONS', 'With Exceptions', 'Closure with approved warnings/missing information according to permissions and business rules.', 1, 2);

-- ============================================================================
-- INTENTIONALLY DEFERRED FROM THIS BOOTSTRAP
-- ============================================================================
-- * period_reopenings: CLOSED reopening policy has not been finalized.
-- * scorecard_results / scorecard_kpi_result_items / scorecard_link_result_items:
--   implement when the Scorecard Scoring Engine and final score materialization
--   are approved.
-- * monitoring_period_input_consumers: not required while the business rule
--   remains "one KPI Configuration can be directly selected by only one
--   Scorecard inside the same Pool + Input Period".
-- * External-service tables (users, roles, scorecards, kpi_pools,
--   kpi_configurations, measurement_units, traffic_light_levels, etc.) are NOT
--   recreated here and receive NO physical FK from exa_monitoring.
-- ============================================================================
