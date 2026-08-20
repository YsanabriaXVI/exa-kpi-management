-- Distinguish the Pool composition lock from future Scorecard publication and Monitoring closure.
ALTER TABLE `kpi_pool_period_compositions`
  DROP CHECK `ck_kpi_pool_period_compositions_status`;

ALTER TABLE `kpi_pool_period_compositions`
  MODIFY COLUMN `status_code` VARCHAR(32) NOT NULL DEFAULT 'POOL_COMPOSITION_LOCKED';

UPDATE `kpi_pool_period_compositions`
SET `status_code` = 'POOL_COMPOSITION_LOCKED'
WHERE `status_code` = 'LOCKED';

ALTER TABLE `kpi_pool_period_compositions`
  ADD CONSTRAINT `ck_kpi_pool_period_compositions_status`
  CHECK (`status_code` = 'POOL_COMPOSITION_LOCKED');
