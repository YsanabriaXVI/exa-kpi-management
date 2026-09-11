-- Configuration identity is unique; Definition is a shared classification.
ALTER TABLE `pool_period_membership_references` DROP INDEX `uq_pool_period_definition_reference`;
ALTER TABLE `scorecard_period_kpis` DROP INDEX `uq_scorecard_period_kpi_definition`;
