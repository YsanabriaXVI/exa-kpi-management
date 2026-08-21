ALTER TABLE `pool_period_membership_references`
  ADD COLUMN `category_name` VARCHAR(120) NULL,
  ADD COLUMN `goal_snapshot` VARCHAR(500) NULL,
  ADD COLUMN `data_source_snapshot` VARCHAR(160) NULL;

ALTER TABLE `scorecard_period_kpis`
  ADD COLUMN `category_name_snapshot` VARCHAR(120) NULL,
  ADD COLUMN `goal_snapshot` VARCHAR(500) NULL,
  ADD COLUMN `data_source_snapshot` VARCHAR(160) NULL;
