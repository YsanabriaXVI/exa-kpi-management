ALTER TABLE `pool_period_membership_references`
  ADD COLUMN `measurement_unit_snapshot` VARCHAR(120) NULL;

ALTER TABLE `scorecard_period_kpis`
  ADD COLUMN `measurement_unit_snapshot` VARCHAR(120) NULL;
