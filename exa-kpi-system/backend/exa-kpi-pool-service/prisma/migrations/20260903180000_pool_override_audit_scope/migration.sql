ALTER TABLE `kpi_pool_period_configuration_overrides`
  ADD COLUMN `previous_effective_value` JSON NULL AFTER `base_global_value`,
  ADD COLUMN `apply_scope` VARCHAR(30) NOT NULL DEFAULT 'FROM_PERIOD_ONWARD' AFTER `override_value`;

UPDATE `kpi_pool_period_configuration_overrides`
SET `previous_effective_value` = `base_global_value`
WHERE `previous_effective_value` IS NULL;

ALTER TABLE `kpi_pool_period_configuration_overrides`
  MODIFY COLUMN `previous_effective_value` JSON NOT NULL;
