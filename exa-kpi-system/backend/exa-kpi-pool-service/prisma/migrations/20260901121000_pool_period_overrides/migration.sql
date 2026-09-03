CREATE TABLE `kpi_pool_period_configuration_overrides` (
 `kpi_pool_period_configuration_override_id` BIGINT NOT NULL AUTO_INCREMENT, `kpi_pool_id` BIGINT NOT NULL,
 `input_period_id` BIGINT NOT NULL, `pool_membership_id` BIGINT NOT NULL, `kpi_configuration_external_id` BIGINT NOT NULL,
 `field_code` VARCHAR(60) NOT NULL, `base_global_revision_external_id` BIGINT NOT NULL, `base_global_value` JSON NOT NULL,
 `override_value` JSON NOT NULL, `status_code` VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', `active_key` VARCHAR(10) NULL DEFAULT 'ACTIVE', `superseded_by_global_revision_external_id` BIGINT NULL,
 `superseded_at` DATETIME(3) NULL, `reason` VARCHAR(500) NULL, `version` INTEGER UNSIGNED NOT NULL DEFAULT 1,
 `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3), `created_by_user_id` BIGINT NULL, `updated_at` DATETIME(3) NULL, `updated_by_user_id` BIGINT NULL,
 UNIQUE INDEX `uq_pool_period_override_active_field` (`input_period_id`,`pool_membership_id`,`field_code`,`active_key`),
 INDEX `ix_pool_period_override_resolution` (`kpi_pool_id`,`input_period_id`,`kpi_configuration_external_id`),
 CONSTRAINT `fk_pool_period_override_input` FOREIGN KEY (`input_period_id`) REFERENCES `kpi_pool_input_periods` (`kpi_pool_input_period_id`) ON DELETE CASCADE ON UPDATE CASCADE,
 PRIMARY KEY (`kpi_pool_period_configuration_override_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `kpi_pool_period_composition_items` (
 `kpi_pool_period_composition_item_id` BIGINT NOT NULL AUTO_INCREMENT, `composition_id` BIGINT NOT NULL, `pool_membership_id` BIGINT NOT NULL,
 `kpi_configuration_external_id` BIGINT NOT NULL, `configuration_code_snapshot` VARCHAR(40) NOT NULL, `display_order` INTEGER UNSIGNED NOT NULL,
 `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
 UNIQUE INDEX `uq_pool_composition_item_membership` (`composition_id`,`pool_membership_id`),
 CONSTRAINT `fk_pool_composition_item_composition` FOREIGN KEY (`composition_id`) REFERENCES `kpi_pool_period_compositions` (`kpi_pool_period_composition_id`) ON DELETE CASCADE ON UPDATE CASCADE,
 PRIMARY KEY (`kpi_pool_period_composition_item_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
