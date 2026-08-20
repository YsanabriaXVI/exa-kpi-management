-- INCOMPLETE is a read projection of active KPI Definitions without a real
-- configuration. Legacy PENDING rows must not participate in that projection.
UPDATE `kpi_configurations`
SET
  `deleted_at` = COALESCE(`deleted_at`, CURRENT_TIMESTAMP(3)),
  `updated_at` = CURRENT_TIMESTAMP(3)
WHERE `config_code` = 'PENDING';
