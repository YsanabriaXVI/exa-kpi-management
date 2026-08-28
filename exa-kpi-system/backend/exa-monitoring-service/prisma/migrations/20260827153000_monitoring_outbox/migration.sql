CREATE TABLE `monitoring_period_closures` (
  `monitoring_period_closure_id` BIGINT NOT NULL AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `closure_type` VARCHAR(40) NOT NULL,
  `missing_result_count` INT NOT NULL DEFAULT 0,
  `justification` TEXT NULL,
  `closed_at` DATETIME(3) NOT NULL,
  `closed_by_user_id` BIGINT NULL,
  PRIMARY KEY (`monitoring_period_closure_id`),
  UNIQUE INDEX `uq_mpc_period` (`monitoring_period_id`),
  CONSTRAINT `fk_mpc_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `outbox_events` (
  `outbox_event_id` BIGINT NOT NULL AUTO_INCREMENT,
  `event_id` CHAR(36) NOT NULL,
  `event_type` VARCHAR(120) NOT NULL,
  `aggregate_type` VARCHAR(80) NOT NULL,
  `aggregate_id` VARCHAR(100) NOT NULL,
  `aggregate_version` INT UNSIGNED NOT NULL,
  `subject` VARCHAR(200) NOT NULL,
  `payload` JSON NOT NULL,
  `occurred_at` DATETIME(3) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `attempt_count` INT UNSIGNED NOT NULL DEFAULT 0,
  `next_attempt_at` DATETIME(3) NULL,
  `last_error` TEXT NULL,
  `published_at` DATETIME(3) NULL,
  `locked_at` DATETIME(3) NULL,
  `locked_by` VARCHAR(100) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NULL,
  PRIMARY KEY (`outbox_event_id`),
  UNIQUE INDEX `uq_outbox_events_event_id` (`event_id`),
  INDEX `ix_outbox_events_pending` (`status`,`next_attempt_at`,`occurred_at`),
  INDEX `ix_outbox_events_claim` (`status`,`locked_at`),
  INDEX `ix_outbox_events_aggregate` (`aggregate_type`,`aggregate_id`,`aggregate_version`),
  CONSTRAINT `chk_outbox_events_status` CHECK (`status` IN ('PENDING','PROCESSING','PUBLISHED','FAILED','DEAD'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
