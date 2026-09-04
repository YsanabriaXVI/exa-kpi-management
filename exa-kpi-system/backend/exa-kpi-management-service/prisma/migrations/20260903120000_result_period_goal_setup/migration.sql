ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `period_scope` VARCHAR(40) NOT NULL DEFAULT 'CURRENT_PERIOD',
  ADD COLUMN `comparison_mode` VARCHAR(40) NOT NULL DEFAULT 'NONE',
  ADD COLUMN `comparison_direction` VARCHAR(30) NULL,
  ADD COLUMN `calculation_pattern` VARCHAR(40) NULL,
  ADD COLUMN `goal_mode` VARCHAR(30) NOT NULL DEFAULT 'SINGLE',
  ADD COLUMN `target_kind` VARCHAR(30) NULL,
  ADD COLUMN `range_min_value` DECIMAL(20,6) NULL,
  ADD COLUMN `range_max_value` DECIMAL(20,6) NULL,
  ADD COLUMN `subject_type` VARCHAR(30) NULL;

CREATE TABLE `kpi_configuration_revision_subject_goals` (
  `kpi_configuration_revision_subject_goal_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_revision_id` BIGINT NOT NULL,
  `subject_type` VARCHAR(30) NOT NULL,
  `subject_external_id` VARCHAR(100) NOT NULL,
  `subject_code_snapshot` VARCHAR(100) NULL,
  `subject_label_snapshot` VARCHAR(200) NOT NULL,
  `goal_value` DECIMAL(20,6) NOT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_configuration_revision_subject_goal_id`),
  UNIQUE KEY `uq_kpi_revision_subject_goal` (`kpi_configuration_revision_id`, `subject_type`, `subject_external_id`),
  KEY `ix_kpi_revision_subject_goals_order` (`kpi_configuration_revision_id`, `display_order`),
  CONSTRAINT `fk_kpi_revision_subject_goals_revision` FOREIGN KEY (`kpi_configuration_revision_id`) REFERENCES `kpi_configuration_revisions` (`kpi_configuration_revision_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT IGNORE INTO `measurement_units` (`code`, `symbol`, `name`, `description`, `decimal_places`, `is_percentage`, `is_active`, `created_at`) VALUES
  ('USD', 'USD', 'US Dollars', 'Monetary result in US dollars', 2, FALSE, TRUE, CURRENT_TIMESTAMP(3)),
  ('CONTAINERS', 'containers', 'Containers', 'Container count', 0, FALSE, TRUE, CURRENT_TIMESTAMP(3)),
  ('INCIDENTS', 'incidents', 'Incidents', 'Incident count', 0, FALSE, TRUE, CURRENT_TIMESTAMP(3)),
  ('UNITS', 'units', 'Units', 'Generic unit count', 0, FALSE, TRUE, CURRENT_TIMESTAMP(3)),
  ('KM_HEAD_MONTH', 'km/head/month', 'Kilometers per head per month', 'Fleet productivity rate', 2, FALSE, TRUE, CURRENT_TIMESTAMP(3)),
  ('THOUSANDS_KM', 'thousand km', 'Thousands of kilometers', 'Distance expressed in thousands of kilometers', 2, FALSE, TRUE, CURRENT_TIMESTAMP(3));
