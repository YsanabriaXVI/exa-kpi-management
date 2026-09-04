ALTER TABLE `monitoring_period_inputs`
  DROP INDEX `uq_mpi_period_configuration`,
  DROP INDEX `uq_mpi_scorecard_assignment`,
  ADD COLUMN `evaluation_kind_snapshot` VARCHAR(20) NOT NULL DEFAULT 'OVERALL' AFTER `goal_value_snapshot`,
  ADD COLUMN `subject_type_snapshot` VARCHAR(40) NULL AFTER `evaluation_kind_snapshot`,
  ADD COLUMN `subject_external_id_snapshot` VARCHAR(100) NULL AFTER `subject_type_snapshot`,
  ADD COLUMN `subject_code_snapshot` VARCHAR(100) NULL AFTER `subject_external_id_snapshot`,
  ADD COLUMN `subject_label_snapshot` VARCHAR(200) NULL AFTER `subject_code_snapshot`,
  ADD INDEX `ix_mpi_period_configuration` (`monitoring_period_id`, `kpi_configuration_id`),
  ADD INDEX `ix_mpi_scorecard_assignment` (`monitoring_period_id`, `scorecard_kpi_assignment_id`);
