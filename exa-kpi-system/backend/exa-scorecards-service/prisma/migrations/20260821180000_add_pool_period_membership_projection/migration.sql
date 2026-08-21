CREATE TABLE `pool_period_membership_references` (
  `pool_period_membership_reference_id` BIGINT NOT NULL AUTO_INCREMENT,
  `pool_period_reference_id` BIGINT NOT NULL,
  `pool_membership_external_id` BIGINT NOT NULL,
  `kpi_definition_external_id` BIGINT NOT NULL,
  `kpi_configuration_external_id` BIGINT NOT NULL,
  `definition_code` VARCHAR(30) NOT NULL,
  `definition_name` VARCHAR(200) NOT NULL,
  `configuration_code` VARCHAR(40) NOT NULL,
  `display_order` INT UNSIGNED NOT NULL,
  PRIMARY KEY (`pool_period_membership_reference_id`),
  UNIQUE INDEX `uq_pool_period_membership_reference` (`pool_period_reference_id`, `pool_membership_external_id`),
  UNIQUE INDEX `uq_pool_period_configuration_reference` (`pool_period_reference_id`, `kpi_configuration_external_id`),
  UNIQUE INDEX `uq_pool_period_definition_reference` (`pool_period_reference_id`, `kpi_definition_external_id`),
  INDEX `ix_pool_period_membership_configuration` (`kpi_configuration_external_id`),
  CONSTRAINT `fk_pool_period_membership_references_period` FOREIGN KEY (`pool_period_reference_id`) REFERENCES `pool_period_references` (`pool_period_reference_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `scorecard_department_scopes`
  ADD COLUMN `external_company_id` BIGINT NULL AFTER `external_department_id`;

UPDATE `scorecard_department_scopes` d
JOIN `scorecard_company_scopes` c ON c.scorecard_id = d.scorecard_id
SET d.external_company_id = c.external_company_id
WHERE d.external_company_id IS NULL;

ALTER TABLE `scorecard_department_scopes`
  MODIFY `external_company_id` BIGINT NOT NULL,
  ADD INDEX `ix_scorecard_department_company_external` (`external_company_id`);
