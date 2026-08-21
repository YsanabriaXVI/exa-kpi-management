ALTER TABLE `scorecard_period_kpis`
  DROP CHECK `chk_scorecard_period_kpi_weight`,
  ADD CONSTRAINT `chk_scorecard_period_kpi_weight` CHECK (`weight_percent` >= 0 AND `weight_percent` <= 100);

ALTER TABLE `scorecard_period_links`
  DROP CHECK `chk_scorecard_period_link_weight`,
  ADD CONSTRAINT `chk_scorecard_period_link_weight` CHECK (`weight_percent` >= 0 AND `weight_percent` <= 100);

UPDATE `scorecard_period_kpis` AS kpi
INNER JOIN `scorecard_period_compositions` AS composition
  ON composition.scorecard_period_composition_id = kpi.scorecard_period_composition_id
SET kpi.weight_percent = 0
WHERE composition.status_code = 'PREPARING'
  AND kpi.weight_percent = 1;

UPDATE `scorecard_period_links` AS linked
INNER JOIN `scorecard_period_compositions` AS composition
  ON composition.scorecard_period_composition_id = linked.scorecard_period_composition_id
SET linked.weight_percent = 0
WHERE composition.status_code = 'PREPARING'
  AND linked.weight_percent = 1;
