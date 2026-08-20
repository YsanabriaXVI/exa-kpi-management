-- Persist finalized Pool composition per Input Period.
CREATE TABLE `kpi_pool_period_compositions` (
  `kpi_pool_period_composition_id` BIGINT NOT NULL AUTO_INCREMENT,
  `kpi_pool_id` BIGINT NOT NULL,
  `period_start` DATE NOT NULL,
  `period_end` DATE NOT NULL,
  `status_code` VARCHAR(20) NOT NULL DEFAULT 'LOCKED',
  `kpi_count_snapshot` INT UNSIGNED NOT NULL,
  `finalized_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `finalized_by_user_id` BIGINT NULL,
  PRIMARY KEY (`kpi_pool_period_composition_id`),
  UNIQUE KEY `uq_kpi_pool_period_composition` (`kpi_pool_id`, `period_start`),
  KEY `ix_kpi_pool_period_compositions_status` (`kpi_pool_id`, `status_code`, `period_start`),
  CONSTRAINT `fk_kpi_pool_period_compositions_pool`
    FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `ck_kpi_pool_period_compositions_range`
    CHECK (`period_end` >= `period_start`),
  CONSTRAINT `ck_kpi_pool_period_compositions_status`
    CHECK (`status_code` = 'LOCKED')
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
