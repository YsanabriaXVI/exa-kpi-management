ALTER TABLE `kpi_configuration_revision_subject_goals`
  ADD COLUMN `goal_unit_id` BIGINT NULL,
  ADD COLUMN `result_unit_id` BIGINT NULL,
  ADD CONSTRAINT `kpi_configuration_revision_subject_goals_goal_unit_id_fkey`
    FOREIGN KEY (`goal_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `kpi_configuration_revision_subject_goals_result_unit_id_fkey`
    FOREIGN KEY (`result_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Legacy revisions keep their original global units through read-time fallback.
-- New revisions store an explicit pair of units for each selected entity.
