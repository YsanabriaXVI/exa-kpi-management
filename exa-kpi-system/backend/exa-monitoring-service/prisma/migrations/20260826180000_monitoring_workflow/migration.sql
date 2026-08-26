ALTER TABLE `monitoring_periods`
  ADD COLUMN `version` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `validation_status` VARCHAR(40) NULL,
  ADD COLUMN `validation_summary` JSON NULL,
  ADD COLUMN `validation_run_at` DATETIME(3) NULL,
  ADD COLUMN `validation_run_by_user_id` BIGINT NULL,
  ADD COLUMN `submitted_at` DATETIME(3) NULL,
  ADD COLUMN `submitted_by_user_id` BIGINT NULL,
  ADD COLUMN `validated_at` DATETIME(3) NULL,
  ADD COLUMN `validated_by_user_id` BIGINT NULL,
  ADD COLUMN `returned_at` DATETIME(3) NULL,
  ADD COLUMN `returned_by_user_id` BIGINT NULL,
  ADD COLUMN `return_reason` TEXT NULL,
  ADD COLUMN `closed_at` DATETIME(3) NULL,
  ADD COLUMN `closed_by_user_id` BIGINT NULL,
  ADD COLUMN `closed_with_exceptions` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `close_exception_justification` TEXT NULL;

CREATE TABLE `monitoring_period_workflow_events` (
  `monitoring_period_workflow_event_id` BIGINT NOT NULL AUTO_INCREMENT,
  `monitoring_period_id` BIGINT NOT NULL,
  `action_code` VARCHAR(40) NOT NULL,
  `from_status_code` VARCHAR(40) NOT NULL,
  `to_status_code` VARCHAR(40) NOT NULL,
  `comment` TEXT NULL,
  `metadata` JSON NULL,
  `actor_user_id` BIGINT NULL,
  `occurred_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `ix_mpwe_period_time` (`monitoring_period_id`, `occurred_at`),
  PRIMARY KEY (`monitoring_period_workflow_event_id`),
  CONSTRAINT `fk_mpwe_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `monitoring_period_statuses` (`code`,`name`,`description`,`display_order`,`is_terminal`,`allows_entry`,`allows_validation`,`allows_submit`,`allows_close`)
VALUES
  ('SUBMITTED','Submitted','Results are read-only and awaiting validation.',2,false,false,true,false,false),
  ('VALIDATED','Validated','Results were validated and may be closed.',3,false,false,false,false,true),
  ('CLOSED','Closed','Historical read-only Monitoring Period.',4,true,false,false,false,false)
ON DUPLICATE KEY UPDATE
  `name`=VALUES(`name`),`description`=VALUES(`description`),`display_order`=VALUES(`display_order`),`is_terminal`=VALUES(`is_terminal`),`allows_entry`=VALUES(`allows_entry`),`allows_validation`=VALUES(`allows_validation`),`allows_submit`=VALUES(`allows_submit`),`allows_close`=VALUES(`allows_close`);

UPDATE `monitoring_period_statuses` SET `allows_entry`=true,`allows_validation`=true,`allows_submit`=true WHERE `code`='DRAFT';
