CREATE TABLE `kpi_configuration_change_audits` (
  `kpi_configuration_change_audit_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_id` BIGINT NOT NULL,
  `configuration_revision_id` BIGINT NULL,
  `change_source` VARCHAR(40) NOT NULL,
  `effective_from` DATE NULL,
  `old_value` JSON NULL,
  `new_value` JSON NOT NULL,
  `reason` VARCHAR(500) NULL,
  `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `changed_by_user_id` BIGINT NULL,
  INDEX `ix_kpi_configuration_change_audit` (`kpi_configuration_id`, `changed_at`),
  CONSTRAINT `kpi_configuration_change_audits_kpi_configuration_id_fkey` FOREIGN KEY (`kpi_configuration_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  PRIMARY KEY (`kpi_configuration_change_audit_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
