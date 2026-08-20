-- Effective-dated KPI Pool membership. Existing rows are initial composition.
ALTER TABLE `kpi_pool_kpis`
  ADD COLUMN `effective_from` DATE NULL AFTER `is_required`,
  ADD COLUMN `effective_to` DATE NULL AFTER `effective_from`,
  ADD COLUMN `updated_at` DATETIME(3) NULL AFTER `created_by_user_id`,
  ADD COLUMN `updated_by_user_id` BIGINT NULL AFTER `updated_at`;

UPDATE `kpi_pool_kpis` membership
INNER JOIN `kpi_pools` pool ON pool.`kpi_pool_id` = membership.`kpi_pool_id`
SET membership.`effective_from` = pool.`valid_from`
WHERE membership.`effective_from` IS NULL;

ALTER TABLE `kpi_pool_kpis`
  MODIFY COLUMN `effective_from` DATE NOT NULL,
  DROP INDEX `uq_kpi_pool_configuration`,
  DROP INDEX `uq_kpi_pool_definition`,
  DROP INDEX `uq_kpi_pool_kpi_order`,
  DROP INDEX `ix_kpi_pool_kpis_configuration_external`,
  DROP INDEX `ix_kpi_pool_kpis_definition_external`,
  ADD CONSTRAINT `ck_kpi_pool_kpis_effective_range`
    CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`),
  ADD INDEX `ix_kpi_pool_kpis_definition_effective`
    (`kpi_pool_id`, `kpi_definition_external_id`, `effective_from`, `effective_to`),
  ADD INDEX `ix_kpi_pool_kpis_configuration_effective`
    (`kpi_pool_id`, `kpi_configuration_external_id`, `effective_from`, `effective_to`),
  ADD INDEX `ix_kpi_pool_kpis_effective`
    (`kpi_pool_id`, `effective_from`, `effective_to`);
