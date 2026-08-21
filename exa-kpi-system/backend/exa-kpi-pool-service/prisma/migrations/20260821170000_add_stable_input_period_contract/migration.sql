CREATE TABLE `kpi_pool_input_periods` (
  `kpi_pool_input_period_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_pool_id` BIGINT NOT NULL,
  `period_key` CHAR(7) NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`kpi_pool_input_period_id`),
  UNIQUE INDEX `uq_kpi_pool_input_period` (`kpi_pool_id`, `period_start`),
  UNIQUE INDEX `uq_kpi_pool_input_period_key` (`kpi_pool_id`, `period_key`),
  INDEX `ix_kpi_pool_input_periods_pool_start` (`kpi_pool_id`, `period_start`),
  CONSTRAINT `fk_kpi_pool_input_periods_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `kpi_pool_input_periods` (`kpi_pool_id`, `period_key`, `period_start`, `period_end`)
WITH RECURSIVE generated_periods AS (
  SELECT p.kpi_pool_id, p.valid_from AS period_start,
    LEAST(LAST_DAY(DATE_ADD(p.valid_from, INTERVAL (f.months_per_period - 1) MONTH)), p.valid_to) AS period_end,
    f.months_per_period, p.valid_to
  FROM kpi_pools p
  JOIN input_frequency_references f ON f.external_input_frequency_id = p.input_frequency_external_id
  UNION ALL
  SELECT kpi_pool_id, DATE_ADD(period_start, INTERVAL months_per_period MONTH),
    LEAST(LAST_DAY(DATE_ADD(period_start, INTERVAL (months_per_period * 2 - 1) MONTH)), valid_to),
    months_per_period, valid_to
  FROM generated_periods
  WHERE DATE_ADD(period_start, INTERVAL months_per_period MONTH) <= valid_to
)
SELECT kpi_pool_id, DATE_FORMAT(period_start, '%Y-%m'), period_start, period_end FROM generated_periods;

ALTER TABLE `kpi_pool_period_compositions`
  ADD COLUMN `kpi_pool_input_period_id` BIGINT NULL AFTER `kpi_pool_id`;

UPDATE `kpi_pool_period_compositions` c
JOIN `kpi_pool_input_periods` p ON p.kpi_pool_id = c.kpi_pool_id AND p.period_start = c.period_start
SET c.kpi_pool_input_period_id = p.kpi_pool_input_period_id;

ALTER TABLE `kpi_pool_period_compositions`
  MODIFY `kpi_pool_input_period_id` BIGINT NOT NULL,
  ADD UNIQUE INDEX `uq_kpi_pool_period_composition_input_period` (`kpi_pool_input_period_id`),
  ADD CONSTRAINT `fk_kpi_pool_period_compositions_input_period` FOREIGN KEY (`kpi_pool_input_period_id`) REFERENCES `kpi_pool_input_periods` (`kpi_pool_input_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
