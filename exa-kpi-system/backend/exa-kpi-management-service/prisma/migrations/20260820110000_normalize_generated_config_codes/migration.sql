-- Normalize codes created by the short-lived ID-based generator. A KPI
-- Configuration code is derived from the functional KPI Definition code and
-- uses a sequence local to that definition: KPI-107 -> KPC-107-01.
UPDATE `kpi_configurations` AS configuration
INNER JOIN `kpi_definitions` AS definition
  ON definition.`kpi_definition_id` = configuration.`kpi_definition_id`
SET configuration.`config_code` = CONCAT(
  'KPC-',
  SUBSTRING(definition.`kpi_code`, 5),
  '-01'
)
WHERE configuration.`deleted_at` IS NULL
  AND configuration.`config_code` <> 'PENDING'
  AND configuration.`config_code` NOT LIKE CONCAT(
    'KPC-',
    SUBSTRING(definition.`kpi_code`, 5),
    '-%'
  );
