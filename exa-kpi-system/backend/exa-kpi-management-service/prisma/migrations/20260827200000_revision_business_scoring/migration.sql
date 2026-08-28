ALTER TABLE `kpi_configuration_revisions`
  ADD COLUMN `result_semantics` VARCHAR(40) NULL AFTER `evaluation_type_id`,
  ADD COLUMN `scoring_method` VARCHAR(40) NULL AFTER `result_semantics`,
  ADD COLUMN `scoring_rule_config` JSON NULL AFTER `scoring_method`,
  ADD COLUMN `scoring_rule_config_version` INTEGER UNSIGNED NULL AFTER `scoring_rule_config`,
  ADD COLUMN `negative_result_policy` VARCHAR(20) NULL AFTER `scoring_rule_config_version`,
  ADD COLUMN `scoring_approval_status` VARCHAR(30) NOT NULL DEFAULT 'BLOCKED' AFTER `negative_result_policy`;
