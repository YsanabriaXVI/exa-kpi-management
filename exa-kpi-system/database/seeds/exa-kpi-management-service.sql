-- ============================================================================
-- EXA KPI Management Service
-- Target: MySQL 8.x
-- Database ownership: exa-kpi-management-service
--
-- IMPORTANT MICROSERVICE RULE:
-- - Physical FOREIGN KEY constraints exist ONLY between tables owned by this service.
-- - created_by_user_id / updated_by_user_id are EXTERNAL IDs that point logically to
--   the Access/Identity service. They intentionally have NO cross-service FK.
-- - Historical KPI targets / evaluation rules are versioned through
--   kpi_configuration_revisions and kpi_configuration_revision_thresholds.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS `exa_kpi_management`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE `exa_kpi_management`;

-- ============================================================================
-- LOOKUPS / CATALOGS
-- ============================================================================

CREATE TABLE `kpi_categories` (
  `kpi_category_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_category_id`),
  UNIQUE KEY `uq_kpi_categories_code` (`code`),

  CONSTRAINT `chk_kpi_categories_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_kpi_categories_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `measurement_units` (
  `measurement_unit_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `symbol` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `decimal_places` SMALLINT NOT NULL DEFAULT 2,
  `is_percentage` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`measurement_unit_id`),
  UNIQUE KEY `uq_measurement_units_code` (`code`),
  UNIQUE KEY `uq_measurement_units_symbol` (`symbol`),

  CONSTRAINT `chk_measurement_units_decimal_places`
    CHECK (`decimal_places` BETWEEN 0 AND 8),

  CONSTRAINT `chk_measurement_units_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_measurement_units_symbol_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`symbol`)) > 0),

  CONSTRAINT `chk_measurement_units_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `input_frequencies` (
  `input_frequency_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `months_per_period` SMALLINT NOT NULL,
  `periods_per_year` SMALLINT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`input_frequency_id`),
  UNIQUE KEY `uq_input_frequencies_code` (`code`),

  CONSTRAINT `chk_input_frequencies_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_input_frequencies_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

  CONSTRAINT `chk_input_frequencies_months_range`
    CHECK (`months_per_period` BETWEEN 1 AND 12),

  CONSTRAINT `chk_input_frequencies_periods_range`
    CHECK (`periods_per_year` IS NULL OR `periods_per_year` BETWEEN 1 AND 12),

  CONSTRAINT `chk_input_frequencies_year_consistency`
    CHECK (
      `periods_per_year` IS NULL
      OR (`months_per_period` * `periods_per_year`) = 12
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `traffic_light_levels` (
  `traffic_light_level_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `severity_rank` SMALLINT NOT NULL,
  `hex_color` VARCHAR(7) NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`traffic_light_level_id`),
  UNIQUE KEY `uq_traffic_light_levels_code` (`code`),
  UNIQUE KEY `uq_traffic_light_levels_severity_rank` (`severity_rank`),

  CONSTRAINT `chk_traffic_light_levels_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_traffic_light_levels_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

  CONSTRAINT `chk_traffic_light_levels_severity_rank`
    CHECK (`severity_rank` > 0),

  CONSTRAINT `chk_traffic_light_levels_hex_color`
    CHECK (
      `hex_color` IS NULL
      OR REGEXP_LIKE(`hex_color`, '^#[0-9A-Fa-f]{6}$')
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `data_sources` (
  `data_source_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `description` TEXT NULL,
  `source_type` VARCHAR(30) NOT NULL,
  `is_external` BOOLEAN NOT NULL DEFAULT FALSE,
  `supports_automation` BOOLEAN NOT NULL DEFAULT FALSE,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`data_source_id`),
  UNIQUE KEY `uq_data_sources_code` (`code`),
  KEY `ix_data_sources_source_type` (`source_type`),

  CONSTRAINT `chk_data_sources_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_data_sources_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

  CONSTRAINT `chk_data_sources_source_type`
    CHECK (`source_type` IN ('DATABASE', 'API', 'FILE', 'MANUAL', 'OTHER'))
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `kpi_configuration_statuses` (
  `kpi_configuration_status_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_configuration_status_id`),
  UNIQUE KEY `uq_kpi_configuration_statuses_code` (`code`),

  CONSTRAINT `chk_kpi_configuration_statuses_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_kpi_configuration_statuses_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE `evaluation_types` (
  `evaluation_type_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`evaluation_type_id`),
  UNIQUE KEY `uq_evaluation_types_code` (`code`),

  CONSTRAINT `chk_evaluation_types_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

  CONSTRAINT `chk_evaluation_types_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

  CONSTRAINT `chk_evaluation_types_display_order`
    CHECK (`display_order` > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- KPI DEFINITION
-- ============================================================================

CREATE TABLE `kpi_definitions` (
  `kpi_definition_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_code` VARCHAR(30) NOT NULL,
  `kpi_name` VARCHAR(200) NOT NULL,
  `description` TEXT NOT NULL,
  `kpi_category_id` BIGINT NOT NULL,

  `status_code` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE,
  `deleted_at` DATETIME(3) NULL,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_definition_id`),
  UNIQUE KEY `uq_kpi_definitions_code` (`kpi_code`),
  KEY `ix_kpi_definitions_category` (`kpi_category_id`),
  KEY `ix_kpi_definitions_status` (`status_code`),

  CONSTRAINT `fk_kpi_definitions_category`
    FOREIGN KEY (`kpi_category_id`)
    REFERENCES `kpi_categories` (`kpi_category_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `chk_kpi_definitions_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`kpi_code`)) > 0),

  CONSTRAINT `chk_kpi_definitions_name_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`kpi_name`)) > 0),

  CONSTRAINT `chk_kpi_definitions_description_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`description`)) > 0),

  CONSTRAINT `chk_kpi_definitions_status`
    CHECK (`status_code` IN ('ACTIVE', 'INACTIVE')),

  CONSTRAINT `chk_kpi_definitions_status_consistency`
    CHECK (
      (`status_code` = 'ACTIVE' AND `is_active` = TRUE)
      OR
      (`status_code` = 'INACTIVE' AND `is_active` = FALSE)
    ),

  CONSTRAINT `chk_kpi_definitions_deleted_status`
    CHECK (`deleted_at` IS NULL OR `status_code` = 'INACTIVE')
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- KPI CONFIGURATION
--
-- Stable configuration data lives here.
-- Time-varying evaluation data (target, evaluation type and thresholds)
-- is stored in kpi_configuration_revisions.
-- ============================================================================

CREATE TABLE `kpi_configurations` (
  `kpi_configuration_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_definition_id` BIGINT NOT NULL,
  `config_code` VARCHAR(40) NOT NULL,

  `measurement_unit_id` BIGINT NOT NULL,
  `input_frequency_id` BIGINT NOT NULL,
  `primary_data_source_id` BIGINT NOT NULL,
  `kpi_configuration_status_id` BIGINT NOT NULL,

  `notes` TEXT NULL,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_configuration_id`),
  UNIQUE KEY `uq_kpi_configurations_code` (`config_code`),

  KEY `ix_kpi_configurations_definition` (`kpi_definition_id`),
  KEY `ix_kpi_configurations_measurement_unit` (`measurement_unit_id`),
  KEY `ix_kpi_configurations_input_frequency` (`input_frequency_id`),
  KEY `ix_kpi_configurations_primary_source` (`primary_data_source_id`),
  KEY `ix_kpi_configurations_status` (`kpi_configuration_status_id`),

  CONSTRAINT `fk_kpi_configurations_definition`
    FOREIGN KEY (`kpi_definition_id`)
    REFERENCES `kpi_definitions` (`kpi_definition_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configurations_measurement_unit`
    FOREIGN KEY (`measurement_unit_id`)
    REFERENCES `measurement_units` (`measurement_unit_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configurations_frequency`
    FOREIGN KEY (`input_frequency_id`)
    REFERENCES `input_frequencies` (`input_frequency_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configurations_primary_source`
    FOREIGN KEY (`primary_data_source_id`)
    REFERENCES `data_sources` (`data_source_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configurations_status`
    FOREIGN KEY (`kpi_configuration_status_id`)
    REFERENCES `kpi_configuration_statuses` (`kpi_configuration_status_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `chk_kpi_configurations_code_not_blank`
    CHECK (CHAR_LENGTH(TRIM(`config_code`)) > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- STEP 3: CONFIGURATION REVISIONS
--
-- A KPI Configuration is not overwritten when its target/evaluation rules change.
-- Instead, a new revision is created.
--
-- Example:
--   Revision 1: target 15%, effective 2026-01-01 through 2026-08-31
--   Revision 2: target 18%, effective from 2026-09-01
--
-- effective_to is treated as an INCLUSIVE date.
--
-- IMPORTANT:
-- MySQL CHECK constraints cannot prevent overlapping date ranges between
-- different rows. The service layer MUST validate that revisions for the same
-- kpi_configuration_id do not overlap.
-- ============================================================================

CREATE TABLE `kpi_configuration_revisions` (
  `kpi_configuration_revision_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_id` BIGINT NOT NULL,

  `revision_number` INT UNSIGNED NOT NULL,
  `target_value` DECIMAL(20,6) NULL,
  `evaluation_type_id` BIGINT NOT NULL,

  `effective_from` DATE NOT NULL,
  `effective_to` DATE NULL,

  `change_reason` VARCHAR(500) NULL,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_configuration_revision_id`),

  UNIQUE KEY `uq_kpi_configuration_revision_number`
    (`kpi_configuration_id`, `revision_number`),

  KEY `ix_kpi_configuration_revisions_effective_lookup`
    (`kpi_configuration_id`, `effective_from`, `effective_to`),

  KEY `ix_kpi_configuration_revisions_evaluation_type`
    (`evaluation_type_id`),

  CONSTRAINT `fk_kpi_configuration_revisions_configuration`
    FOREIGN KEY (`kpi_configuration_id`)
    REFERENCES `kpi_configurations` (`kpi_configuration_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configuration_revisions_evaluation_type`
    FOREIGN KEY (`evaluation_type_id`)
    REFERENCES `evaluation_types` (`evaluation_type_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `chk_kpi_configuration_revisions_revision_number`
    CHECK (`revision_number` > 0),

  CONSTRAINT `chk_kpi_configuration_revisions_effective_range`
    CHECK (
      `effective_to` IS NULL
      OR `effective_to` >= `effective_from`
    )
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- STEP 3: REVISION THRESHOLDS
--
-- Thresholds now belong to a specific configuration revision.
-- This prevents a later threshold change from rewriting historical evaluations.
-- ============================================================================

CREATE TABLE `kpi_configuration_revision_thresholds` (
  `kpi_configuration_revision_threshold_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_revision_id` BIGINT NOT NULL,
  `traffic_light_level_id` BIGINT NOT NULL,

  `range_min_percent` DECIMAL(9,4) NOT NULL,
  `range_max_percent` DECIMAL(9,4) NOT NULL,
  `includes_min` BOOLEAN NOT NULL DEFAULT TRUE,
  `includes_max` BOOLEAN NOT NULL DEFAULT FALSE,
  `display_order` SMALLINT NOT NULL DEFAULT 1,

  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL COMMENT 'External ID -> Access/Identity service user',

  PRIMARY KEY (`kpi_configuration_revision_threshold_id`),

  UNIQUE KEY `uq_kpi_configuration_revision_threshold_level`
    (`kpi_configuration_revision_id`, `traffic_light_level_id`),

  UNIQUE KEY `uq_kpi_configuration_revision_threshold_order`
    (`kpi_configuration_revision_id`, `display_order`),

  KEY `ix_kpi_configuration_revision_thresholds_traffic_light`
    (`traffic_light_level_id`),

  CONSTRAINT `fk_kpi_configuration_revision_thresholds_revision`
    FOREIGN KEY (`kpi_configuration_revision_id`)
    REFERENCES `kpi_configuration_revisions` (`kpi_configuration_revision_id`)
    ON DELETE CASCADE
    ON UPDATE CASCADE,

  CONSTRAINT `fk_kpi_configuration_revision_thresholds_traffic_light`
    FOREIGN KEY (`traffic_light_level_id`)
    REFERENCES `traffic_light_levels` (`traffic_light_level_id`)
    ON DELETE RESTRICT
    ON UPDATE CASCADE,

  CONSTRAINT `chk_kpi_configuration_revision_thresholds_min_nonnegative`
    CHECK (`range_min_percent` >= 0),

  CONSTRAINT `chk_kpi_configuration_revision_thresholds_valid_range`
    CHECK (`range_max_percent` >= `range_min_percent`),

  CONSTRAINT `chk_kpi_configuration_revision_thresholds_display_order`
    CHECK (`display_order` > 0)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;


-- ============================================================================
-- OPTIONAL INDEXES FOR EXTERNAL AUDIT IDs
--
-- These are NOT foreign keys. They are useful only if audit queries frequently
-- filter by the user who created/updated a row.
-- Add selectively when real query patterns justify them.
-- ============================================================================

-- Example:
-- CREATE INDEX `ix_kpi_definitions_created_by_user`
--   ON `kpi_definitions` (`created_by_user_id`);


-- ============================================================================
-- IMPORTANT SERVICE-LAYER RULES NOT FULLY ENFORCEABLE BY MYSQL
-- ============================================================================
--
-- 1. A KPI configuration revision date range must not overlap another revision
--    of the same kpi_configuration_id.
--
-- 2. By default, a newly created revision becomes effective on the NEXT input
--    period. Applying it to the CURRENT input period must be explicit and only
--    allowed while that Monitoring period is DRAFT.
--
-- 3. SUBMITTED / VALIDATED / CLOSED Monitoring periods must not be silently
--    recalculated by a new KPI configuration revision.
--
-- 4. Monitoring must store snapshots of the applied revision, target,
--    evaluation type and thresholds so historical results never change later.
--
-- 5. created_by_user_id / updated_by_user_id are external references. Their
--    existence/authorization is validated through the Access/Identity service,
--    not by MySQL cross-database foreign keys.
--
-- 6. kpi_configuration_revisions should be treated as historical records.
--    Once a revision has been consumed by submitted/validated/closed periods,
--    destructive deletion should be prohibited by the service layer.
-- ============================================================================