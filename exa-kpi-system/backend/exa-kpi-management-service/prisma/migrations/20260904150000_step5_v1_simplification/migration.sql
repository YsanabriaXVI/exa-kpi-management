ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `calculation_template` VARCHAR(40) NULL AFTER `calculation_pattern`;

CREATE TABLE `kpi_configuration_revision_subjects` (
  `kpi_configuration_revision_subject_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_configuration_revision_id` BIGINT NOT NULL,
  `subject_type` VARCHAR(30) NOT NULL,
  `subject_external_id` VARCHAR(100) NOT NULL,
  `subject_code_snapshot` VARCHAR(100) NULL,
  `subject_label_snapshot` VARCHAR(200) NOT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_configuration_revision_subject_id`),
  UNIQUE KEY `uq_kpi_revision_subject` (`kpi_configuration_revision_id`, `subject_type`, `subject_external_id`),
  KEY `ix_kpi_revision_subjects_order` (`kpi_configuration_revision_id`, `display_order`),
  CONSTRAINT `fk_kpi_revision_subjects_revision` FOREIGN KEY (`kpi_configuration_revision_id`) REFERENCES `kpi_configuration_revisions` (`kpi_configuration_revision_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `kpi_configuration_revision_subjects`
  (`kpi_configuration_revision_id`, `subject_type`, `subject_external_id`, `subject_code_snapshot`, `subject_label_snapshot`, `display_order`)
SELECT `kpi_configuration_revision_id`, `subject_type`, `subject_external_id`, `subject_code_snapshot`, `subject_label_snapshot`, `display_order`
FROM `kpi_configuration_revision_subject_goals`;
