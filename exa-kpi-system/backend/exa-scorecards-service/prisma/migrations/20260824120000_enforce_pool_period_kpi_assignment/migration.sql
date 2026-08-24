ALTER TABLE `scorecard_period_kpis`
  ADD COLUMN `kpi_pool_external_id` BIGINT NULL,
  ADD COLUMN `period_key` CHAR(7) NULL;

UPDATE `scorecard_period_kpis` AS `kpi`
INNER JOIN `scorecard_period_compositions` AS `composition`
  ON `composition`.`scorecard_period_composition_id` = `kpi`.`scorecard_period_composition_id`
SET
  `kpi`.`kpi_pool_external_id` = `composition`.`kpi_pool_external_id`,
  `kpi`.`period_key` = `composition`.`period_key`;

ALTER TABLE `scorecard_period_kpis`
  MODIFY COLUMN `kpi_pool_external_id` BIGINT NOT NULL,
  MODIFY COLUMN `period_key` CHAR(7) NOT NULL,
  ADD UNIQUE INDEX `uq_pool_period_kpi_assignment` (`kpi_pool_external_id`, `period_key`, `kpi_configuration_external_id`);
