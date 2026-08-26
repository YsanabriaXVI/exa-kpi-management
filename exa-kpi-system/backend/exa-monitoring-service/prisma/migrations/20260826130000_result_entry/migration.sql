-- CreateTable
CREATE TABLE `monitoring_input_methods` (
    `monitoring_input_method_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `uq_monitoring_input_method_code`(`code`),
    PRIMARY KEY (`monitoring_input_method_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_entry_batch_statuses` (
    `result_entry_batch_status_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `uq_result_entry_batch_status_code`(`code`),
    PRIMARY KEY (`result_entry_batch_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_entry_row_statuses` (
    `result_entry_row_status_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `uq_result_entry_row_status_code`(`code`),
    PRIMARY KEY (`result_entry_row_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kpi_result_statuses` (
    `kpi_result_status_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,

    UNIQUE INDEX `uq_kpi_result_status_code`(`code`),
    PRIMARY KEY (`kpi_result_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_entry_batches` (
    `result_entry_batch_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_id` BIGINT NOT NULL,
    `monitoring_input_method_id` BIGINT NOT NULL,
    `result_entry_batch_status_id` BIGINT NOT NULL,
    `batch_no` INTEGER NOT NULL,
    `total_rows` INTEGER NOT NULL DEFAULT 0,
    `valid_rows` INTEGER NOT NULL DEFAULT 0,
    `invalid_rows` INTEGER NOT NULL DEFAULT 0,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `finished_at` DATETIME(3) NULL,
    `created_by_user_id` BIGINT NULL,

    UNIQUE INDEX `uq_reb_period_batch_no`(`monitoring_period_id`, `batch_no`),
    PRIMARY KEY (`result_entry_batch_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `result_entry_batch_rows` (
    `result_entry_batch_row_id` BIGINT NOT NULL AUTO_INCREMENT,
    `result_entry_batch_id` BIGINT NOT NULL,
    `monitoring_period_input_id` BIGINT NOT NULL,
    `result_entry_row_status_id` BIGINT NOT NULL,
    `parsed_result_value` DECIMAL(20, 6) NULL,
    `raw_comment` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_rebr_batch_input`(`result_entry_batch_id`, `monitoring_period_input_id`),
    PRIMARY KEY (`result_entry_batch_row_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kpi_results` (
    `kpi_result_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_input_id` BIGINT NOT NULL,
    `latest_batch_row_id` BIGINT NOT NULL,
    `kpi_result_status_id` BIGINT NOT NULL,
    `result_value` DECIMAL(20, 6) NULL,
    `comment` TEXT NULL,
    `raw_achievement_percent` DECIMAL(12, 6) NULL,
    `compliance_percent` DECIMAL(12, 6) NULL,
    `weighted_score_points` DECIMAL(12, 6) NULL,
    `traffic_light_code` VARCHAR(30) NULL,
    `revision_no` INTEGER NOT NULL DEFAULT 1,
    `version` INTEGER NOT NULL DEFAULT 1,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,
    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    UNIQUE INDEX `uq_kpi_result_input`(`monitoring_period_input_id`),
    UNIQUE INDEX `uq_kpi_result_latest_batch_row`(`latest_batch_row_id`),
    PRIMARY KEY (`kpi_result_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `kpi_result_revisions` (
    `kpi_result_revision_id` BIGINT NOT NULL AUTO_INCREMENT,
    `kpi_result_id` BIGINT NOT NULL,
    `result_entry_batch_row_id` BIGINT NOT NULL,
    `revision_no` INTEGER NOT NULL,
    `previous_result_value` DECIMAL(20, 6) NULL,
    `new_result_value` DECIMAL(20, 6) NULL,
    `previous_comment` TEXT NULL,
    `new_comment` TEXT NULL,
    `change_type` VARCHAR(40) NOT NULL,
    `entry_source` VARCHAR(40) NOT NULL,
    `changed_by_user_id` BIGINT NULL,
    `changed_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_krr_result_revision`(`kpi_result_id`, `revision_no`),
    PRIMARY KEY (`kpi_result_revision_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_reb_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods`(`monitoring_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_reb_method` FOREIGN KEY (`monitoring_input_method_id`) REFERENCES `monitoring_input_methods`(`monitoring_input_method_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_reb_status` FOREIGN KEY (`result_entry_batch_status_id`) REFERENCES `result_entry_batch_statuses`(`result_entry_batch_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_rebr_batch` FOREIGN KEY (`result_entry_batch_id`) REFERENCES `result_entry_batches`(`result_entry_batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_rebr_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs`(`monitoring_period_input_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_rebr_status` FOREIGN KEY (`result_entry_row_status_id`) REFERENCES `result_entry_row_statuses`(`result_entry_row_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kr_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs`(`monitoring_period_input_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kr_latest_row` FOREIGN KEY (`latest_batch_row_id`) REFERENCES `result_entry_batch_rows`(`result_entry_batch_row_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kr_status` FOREIGN KEY (`kpi_result_status_id`) REFERENCES `kpi_result_statuses`(`kpi_result_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_krr_result` FOREIGN KEY (`kpi_result_id`) REFERENCES `kpi_results`(`kpi_result_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_krr_batch_row` FOREIGN KEY (`result_entry_batch_row_id`) REFERENCES `result_entry_batch_rows`(`result_entry_batch_row_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
