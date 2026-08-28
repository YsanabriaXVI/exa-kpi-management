CREATE TABLE `scorecard_period_department_scopes` (
  `scorecard_period_department_scope_id` BIGINT NOT NULL AUTO_INCREMENT,
  `scorecard_period_composition_id` BIGINT NOT NULL,
  `external_department_id` BIGINT NOT NULL,
  `external_company_id` BIGINT NOT NULL,
  `department_code_snapshot` VARCHAR(50) NOT NULL,
  `department_name_snapshot` VARCHAR(150) NOT NULL,
  `display_order` SMALLINT NOT NULL DEFAULT 1,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL,
  PRIMARY KEY (`scorecard_period_department_scope_id`),
  UNIQUE INDEX `uq_period_department_scope` (`scorecard_period_composition_id`, `external_department_id`),
  UNIQUE INDEX `uq_period_department_scope_order` (`scorecard_period_composition_id`, `display_order`),
  CONSTRAINT `fk_period_department_scope_composition` FOREIGN KEY (`scorecard_period_composition_id`) REFERENCES `scorecard_period_compositions` (`scorecard_period_composition_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `scorecard_period_employee_scopes` (
  `scorecard_period_employee_scope_id` BIGINT NOT NULL AUTO_INCREMENT,
  `scorecard_period_department_scope_id` BIGINT NOT NULL,
  `external_employee_id` BIGINT NOT NULL,
  `employee_code_snapshot` VARCHAR(50) NOT NULL,
  `employee_name_snapshot` VARCHAR(220) NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `created_by_user_id` BIGINT NULL,
  PRIMARY KEY (`scorecard_period_employee_scope_id`),
  UNIQUE INDEX `uq_period_department_employee` (`scorecard_period_department_scope_id`, `external_employee_id`),
  INDEX `ix_period_employee_external` (`external_employee_id`),
  CONSTRAINT `fk_period_employee_scope_department` FOREIGN KEY (`scorecard_period_department_scope_id`) REFERENCES `scorecard_period_department_scopes` (`scorecard_period_department_scope_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Existing compositions predate period snapshots. Seed each one from the
-- Scorecard base scope once so finalized compositions remain readable.
INSERT INTO `scorecard_period_department_scopes` (
  `scorecard_period_composition_id`, `external_department_id`, `external_company_id`,
  `department_code_snapshot`, `department_name_snapshot`, `display_order`, `created_by_user_id`
)
SELECT c.`scorecard_period_composition_id`, d.`external_department_id`, d.`external_company_id`,
       d.`department_code_snapshot`, d.`department_name_snapshot`, d.`display_order`, c.`created_by_user_id`
FROM `scorecard_period_compositions` c
JOIN `scorecard_department_scopes` d ON d.`scorecard_id` = c.`scorecard_id`;

INSERT INTO `scorecard_period_employee_scopes` (
  `scorecard_period_department_scope_id`, `external_employee_id`,
  `employee_code_snapshot`, `employee_name_snapshot`, `created_by_user_id`
)
SELECT pd.`scorecard_period_department_scope_id`, e.`external_employee_id`,
       e.`employee_code_snapshot`, e.`employee_name_snapshot`, pc.`created_by_user_id`
FROM `scorecard_period_department_scopes` pd
JOIN `scorecard_period_compositions` pc ON pc.`scorecard_period_composition_id` = pd.`scorecard_period_composition_id`
JOIN `scorecard_department_scopes` d ON d.`scorecard_id` = pc.`scorecard_id`
  AND d.`external_department_id` = pd.`external_department_id`
JOIN `scorecard_employee_scopes` e ON e.`scorecard_department_scope_id` = d.`scorecard_department_scope_id`;
