ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `measurement_unit_id` BIGINT NULL AFTER `evaluation_type_id`,
  ADD COLUMN `data_source_id` BIGINT NULL AFTER `measurement_unit_id`;

UPDATE `kpi_configuration_revisions` r
JOIN `kpi_configurations` c ON c.`kpi_configuration_id` = r.`kpi_configuration_id`
SET r.`measurement_unit_id` = c.`measurement_unit_id`,
    r.`data_source_id` = c.`primary_data_source_id`;

ALTER TABLE `kpi_configuration_revisions`
  MODIFY COLUMN `measurement_unit_id` BIGINT NOT NULL,
  MODIFY COLUMN `data_source_id` BIGINT NOT NULL,
  ADD INDEX `ix_kpi_configuration_revisions_measurement_unit` (`measurement_unit_id`),
  ADD INDEX `ix_kpi_configuration_revisions_data_source` (`data_source_id`),
  ADD CONSTRAINT `fk_kpi_configuration_revisions_measurement_unit`
    FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_kpi_configuration_revisions_data_source`
    FOREIGN KEY (`data_source_id`) REFERENCES `data_sources` (`data_source_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
