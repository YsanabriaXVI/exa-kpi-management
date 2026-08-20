-- Simplify Pool business codes to {AREAS}-{SEQUENCE}-{ISSUE_YEAR}.
-- Companies remain normalized Pool associations but no longer define code identity.

CREATE TEMPORARY TABLE `tmp_kpi_pool_resequence` AS
SELECT
  `kpi_pool_id`,
  ROW_NUMBER() OVER (
    PARTITION BY `area_scope_key`, `issue_year`
    ORDER BY `pool_sequence`, `created_at`, `kpi_pool_id`
  ) AS `new_sequence`
FROM `kpi_pools`;

UPDATE `kpi_pools` AS `pool`
INNER JOIN `tmp_kpi_pool_resequence` AS `resequence`
  ON `resequence`.`kpi_pool_id` = `pool`.`kpi_pool_id`
SET
  `pool`.`pool_sequence` = `resequence`.`new_sequence`,
  `pool`.`pool_code` = CONCAT(
    REPLACE(`pool`.`area_scope_key`, '|', '-'),
    '-',
    LPAD(`resequence`.`new_sequence`, 2, '0'),
    '-',
    `pool`.`issue_year`
  );

DROP TEMPORARY TABLE `tmp_kpi_pool_resequence`;

ALTER TABLE `kpi_pools`
  DROP INDEX `uq_kpi_pools_business_scope_sequence`,
  DROP CHECK `chk_kpi_pools_company_scope`,
  DROP COLUMN `company_scope_key`,
  ADD UNIQUE INDEX `uq_kpi_pools_business_scope_sequence`
    (`area_scope_key`, `issue_year`, `pool_sequence`);

CREATE TEMPORARY TABLE `tmp_kpi_pool_sequence_state` AS
SELECT
  `area_scope_key`,
  `issue_year`,
  SUM(`last_sequence`) AS `last_sequence`
FROM `kpi_pool_code_sequences`
GROUP BY `area_scope_key`, `issue_year`;

DROP TABLE `kpi_pool_code_sequences`;

CREATE TABLE `kpi_pool_code_sequences` (
  `kpi_pool_code_sequence_id` BIGINT NOT NULL AUTO_INCREMENT,
  `area_scope_key` VARCHAR(255) NOT NULL,
  `issue_year` SMALLINT NOT NULL,
  `last_sequence` INT UNSIGNED NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_pool_code_sequence_id`),
  UNIQUE INDEX `uq_kpi_pool_code_sequence_scope` (`area_scope_key`, `issue_year`),
  CONSTRAINT `chk_kpi_pool_code_sequences_area_scope`
    CHECK (CHAR_LENGTH(TRIM(`area_scope_key`)) > 0),
  CONSTRAINT `chk_kpi_pool_code_sequences_issue_year`
    CHECK (`issue_year` BETWEEN 2000 AND 9999)
) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

INSERT INTO `kpi_pool_code_sequences` (`area_scope_key`, `issue_year`, `last_sequence`)
SELECT
  `state`.`area_scope_key`,
  `state`.`issue_year`,
  GREATEST(
    `state`.`last_sequence`,
    COALESCE(MAX(`pool`.`pool_sequence`), 0)
  )
FROM `tmp_kpi_pool_sequence_state` AS `state`
LEFT JOIN `kpi_pools` AS `pool`
  ON `pool`.`area_scope_key` = `state`.`area_scope_key`
  AND `pool`.`issue_year` = `state`.`issue_year`
GROUP BY `state`.`area_scope_key`, `state`.`issue_year`, `state`.`last_sequence`;

INSERT INTO `kpi_pool_code_sequences` (`area_scope_key`, `issue_year`, `last_sequence`)
SELECT `pool`.`area_scope_key`, `pool`.`issue_year`, MAX(`pool`.`pool_sequence`)
FROM `kpi_pools` AS `pool`
LEFT JOIN `tmp_kpi_pool_sequence_state` AS `state`
  ON `state`.`area_scope_key` = `pool`.`area_scope_key`
  AND `state`.`issue_year` = `pool`.`issue_year`
WHERE `state`.`area_scope_key` IS NULL
GROUP BY `pool`.`area_scope_key`, `pool`.`issue_year`;

DROP TEMPORARY TABLE `tmp_kpi_pool_sequence_state`;
