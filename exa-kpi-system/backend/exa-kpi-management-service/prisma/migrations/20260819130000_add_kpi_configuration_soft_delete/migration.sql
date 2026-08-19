ALTER TABLE `kpi_configurations`
  ADD COLUMN `deleted_at` DATETIME(3) NULL AFTER `notes`;

CREATE INDEX `ix_kpi_configurations_deleted_at`
  ON `kpi_configurations` (`deleted_at`);
