ALTER TABLE `monitoring_period_inputs`
  ADD COLUMN `result_semantics_snapshot` VARCHAR(40) NULL AFTER `evaluation_type_code_snapshot`,
  ADD COLUMN `scoring_rule_config_version_snapshot` INTEGER UNSIGNED NULL AFTER `scoring_rule_config_snapshot`,
  ADD COLUMN `negative_result_policy_snapshot` VARCHAR(20) NULL AFTER `scoring_rule_config_version_snapshot`,
  ADD COLUMN `scoring_approval_status_snapshot` VARCHAR(30) NOT NULL DEFAULT 'BLOCKED' AFTER `negative_result_policy_snapshot`;
