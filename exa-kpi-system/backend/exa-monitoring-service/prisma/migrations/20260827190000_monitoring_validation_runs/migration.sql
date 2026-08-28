CREATE TABLE `monitoring_validation_runs` (
  `monitoring_validation_run_id` BIGINT NOT NULL AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `run_no` INTEGER NOT NULL,
  `results_version` INTEGER NOT NULL,
  `status` VARCHAR(30) NOT NULL,
  `calculation_version` VARCHAR(30) NOT NULL,
  `summary` JSON NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL,
  `invalidated_at` DATETIME(3) NULL,
  `invalidated_by_batch_id` BIGINT NULL,
  UNIQUE INDEX `uq_mvr_period_run` (`monitoring_period_id`, `run_no`),
  INDEX `ix_mvr_period_status` (`monitoring_period_id`, `status`, `created_at`),
  PRIMARY KEY (`monitoring_validation_run_id`),
  CONSTRAINT `fk_mvr_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `monitoring_validation_issues` (
  `monitoring_validation_issue_id` BIGINT NOT NULL AUTO_INCREMENT,
  `monitoring_validation_run_id` BIGINT NOT NULL,
  `monitoring_period_id` BIGINT NOT NULL,
  `monitoring_period_input_id` BIGINT NULL,
  `kpi_configuration_id` BIGINT NULL,
  `finding_code` VARCHAR(100) NOT NULL,
  `severity` VARCHAR(20) NOT NULL,
  `message` VARCHAR(500) NOT NULL,
  `details` JSON NULL,
  `blocks_submit` BOOLEAN NOT NULL DEFAULT false,
  `blocks_approval` BOOLEAN NOT NULL DEFAULT false,
  `exception_allowed` BOOLEAN NOT NULL DEFAULT false,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ix_mvi_period_severity` (`monitoring_period_id`, `severity`),
  INDEX `ix_mvi_input` (`monitoring_period_input_id`),
  PRIMARY KEY (`monitoring_validation_issue_id`),
  CONSTRAINT `fk_mvi_run` FOREIGN KEY (`monitoring_validation_run_id`) REFERENCES `monitoring_validation_runs` (`monitoring_validation_run_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_mvi_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
