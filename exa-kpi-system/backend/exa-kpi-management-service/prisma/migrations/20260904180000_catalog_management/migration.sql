CREATE TABLE `subject_types` (
  `subject_type_id` BIGINT NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(30) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT true,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL,
  `updated_at` DATETIME(3) NULL,
  `updated_by_user_id` BIGINT NULL,
  UNIQUE INDEX `uq_subject_types_code` (`code`),
  PRIMARY KEY (`subject_type_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `subject_types` (`code`, `name`, `is_active`)
SELECT DISTINCT `subject_type`,
  CONCAT(UPPER(LEFT(REPLACE(LOWER(`subject_type`), '_', ' '), 1)), SUBSTRING(REPLACE(LOWER(`subject_type`), '_', ' '), 2)),
  true
FROM `kpi_configuration_subject_catalog`;

ALTER TABLE `kpi_configuration_subject_catalog`
  ADD COLUMN `updated_at` DATETIME(3) NULL,
  ADD COLUMN `updated_by_user_id` BIGINT NULL;
