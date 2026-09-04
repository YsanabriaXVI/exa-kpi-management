ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `group_goal_value` DECIMAL(20,6) NULL AFTER `subject_type`,
  ADD COLUMN `group_goal_unit_id` BIGINT NULL AFTER `group_goal_value`,
  ADD COLUMN `group_goal_label` VARCHAR(200) NULL AFTER `group_goal_unit_id`,
  ADD KEY `ix_kpi_configuration_revisions_group_goal_unit` (`group_goal_unit_id`),
  ADD CONSTRAINT `fk_kpi_configuration_revisions_group_goal_unit`
    FOREIGN KEY (`group_goal_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
