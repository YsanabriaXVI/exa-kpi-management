ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `evaluation_scope` VARCHAR(30) NOT NULL DEFAULT 'OVERALL',
  ADD COLUMN `goal_type` VARCHAR(30) NOT NULL DEFAULT 'SINGLE_VALUE',
  ADD COLUMN `goal_assignment` VARCHAR(40) NULL,
  ADD COLUMN `goal_unit_id` BIGINT NULL,
  ADD COLUMN `result_method` VARCHAR(40) NOT NULL DEFAULT 'DIRECT';

UPDATE `kpi_configuration_revisions`
SET `evaluation_scope` = CASE WHEN `goal_mode` = 'BY_SUBJECT' THEN 'BY_SUBJECT' ELSE 'OVERALL' END,
    `goal_type` = CASE WHEN `goal_mode` = 'RANGE' THEN 'RANGE' ELSE 'SINGLE_VALUE' END,
    `goal_assignment` = CASE WHEN `goal_mode` = 'BY_SUBJECT' THEN 'DIFFERENT_GOAL_PER_SUBJECT' ELSE NULL END,
    `goal_unit_id` = `measurement_unit_id`,
    `result_method` = CASE WHEN `calculation_pattern` IN ('DERIVED','MULTI_INPUT_CURRENT_PERIOD','COMPOSITE') THEN 'CALCULATED_FROM_INPUTS' ELSE 'DIRECT' END;

ALTER TABLE `kpi_configuration_revisions`
  MODIFY `goal_unit_id` BIGINT NOT NULL,
  ADD KEY `ix_kpi_configuration_revisions_goal_unit` (`goal_unit_id`),
  ADD CONSTRAINT `fk_kpi_configuration_revisions_goal_unit` FOREIGN KEY (`goal_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `kpi_configuration_revision_measurement_inputs` (
  `kpi_configuration_revision_measurement_input_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_revision_id` BIGINT NOT NULL,
  `input_name` VARCHAR(160) NOT NULL,
  `input_unit_id` BIGINT NOT NULL,
  `description` VARCHAR(500) NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_configuration_revision_measurement_input_id`),
  KEY `ix_kpi_revision_measurement_inputs_order` (`kpi_configuration_revision_id`, `display_order`),
  KEY `ix_kpi_revision_measurement_inputs_unit` (`input_unit_id`),
  CONSTRAINT `fk_kpi_revision_measurement_inputs_revision` FOREIGN KEY (`kpi_configuration_revision_id`) REFERENCES `kpi_configuration_revisions` (`kpi_configuration_revision_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_kpi_revision_measurement_inputs_unit` FOREIGN KEY (`input_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
