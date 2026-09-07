ALTER TABLE `monitoring_periods`
  ADD COLUMN `selected_entry_method` VARCHAR(20) NULL,
  ADD COLUMN `results_version` INT NOT NULL DEFAULT 0;
ALTER TABLE `monitoring_period_inputs`
  ADD COLUMN `effective_settings_snapshot` JSON NULL;
