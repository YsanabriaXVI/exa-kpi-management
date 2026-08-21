ALTER TABLE `scorecard_period_kpis`
  ADD UNIQUE INDEX `uq_scorecard_period_kpi_definition` (`scorecard_period_composition_id`, `kpi_definition_external_id`);
