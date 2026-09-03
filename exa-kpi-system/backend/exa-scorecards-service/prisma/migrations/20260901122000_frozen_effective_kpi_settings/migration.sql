ALTER TABLE `scorecard_period_kpis`
 ADD COLUMN `kpi_configuration_revision_external_id` BIGINT NULL AFTER `kpi_configuration_external_id`,
 ADD COLUMN `pool_override_external_id` BIGINT NULL AFTER `kpi_configuration_revision_external_id`,
 ADD COLUMN `effective_settings_snapshot` JSON NULL AFTER `pool_override_external_id`,
 ADD COLUMN `settings_provenance_snapshot` JSON NULL AFTER `effective_settings_snapshot`;
