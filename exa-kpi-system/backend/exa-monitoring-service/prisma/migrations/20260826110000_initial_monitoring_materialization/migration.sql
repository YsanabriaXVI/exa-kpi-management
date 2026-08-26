-- CreateTable
CREATE TABLE `monitoring_period_statuses` (
    `monitoring_period_status_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `description` TEXT NULL,
    `display_order` SMALLINT NOT NULL DEFAULT 1,
    `is_terminal` BOOLEAN NOT NULL DEFAULT false,
    `allows_entry` BOOLEAN NOT NULL DEFAULT false,
    `allows_validation` BOOLEAN NOT NULL DEFAULT false,
    `allows_submit` BOOLEAN NOT NULL DEFAULT false,
    `allows_close` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,
    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    UNIQUE INDEX `uq_monitoring_period_status_code`(`code`),
    PRIMARY KEY (`monitoring_period_status_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_periods` (
    `monitoring_period_id` BIGINT NOT NULL AUTO_INCREMENT,
    `kpi_pool_id` BIGINT NOT NULL,
    `pool_input_period_id` BIGINT NOT NULL,
    `pool_period_composition_id` BIGINT NOT NULL,
    `input_frequency_id` BIGINT NULL,
    `pool_code_snapshot` VARCHAR(40) NOT NULL,
    `pool_name_snapshot` VARCHAR(200) NOT NULL,
    `input_frequency_code_snapshot` VARCHAR(40) NULL,
    `input_frequency_name_snapshot` VARCHAR(120) NULL,
    `companies_snapshot` JSON NULL,
    `sequence_no` INTEGER NOT NULL,
    `period_key` VARCHAR(30) NOT NULL,
    `period_start` DATE NOT NULL,
    `period_end` DATE NOT NULL,
    `period_label` VARCHAR(100) NOT NULL,
    `monitoring_period_status_id` BIGINT NOT NULL,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `generated_by_user_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    INDEX `ix_mp_pool_composition`(`pool_period_composition_id`),
    UNIQUE INDEX `uq_mp_pool_input_period`(`kpi_pool_id`, `pool_input_period_id`),
    UNIQUE INDEX `uq_mp_pool_period_key`(`kpi_pool_id`, `period_key`),
    UNIQUE INDEX `uq_mp_pool_sequence`(`kpi_pool_id`, `sequence_no`),
    PRIMARY KEY (`monitoring_period_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_period_scorecards` (
    `monitoring_period_scorecard_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_id` BIGINT NOT NULL,
    `scorecard_id` BIGINT NOT NULL,
    `scorecard_period_composition_id` BIGINT NOT NULL,
    `scorecard_code_snapshot` VARCHAR(40) NOT NULL,
    `scorecard_name_snapshot` VARCHAR(200) NOT NULL,
    `departments_snapshot` JSON NULL,
    `own_kpi_weight_percent_snapshot` DECIMAL(7, 4) NOT NULL DEFAULT 0,
    `linked_scorecard_weight_percent_snapshot` DECIMAL(7, 4) NOT NULL DEFAULT 0,
    `total_weight_percent_snapshot` DECIMAL(7, 4) NOT NULL DEFAULT 100,
    `snapshot_created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_mpsc_period_scorecard`(`monitoring_period_id`, `scorecard_id`),
    UNIQUE INDEX `uq_mpsc_period_composition`(`monitoring_period_id`, `scorecard_period_composition_id`),
    PRIMARY KEY (`monitoring_period_scorecard_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_period_inputs` (
    `monitoring_period_input_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_id` BIGINT NOT NULL,
    `monitoring_period_scorecard_id` BIGINT NOT NULL,
    `kpi_definition_id` BIGINT NULL,
    `kpi_configuration_id` BIGINT NOT NULL,
    `kpi_configuration_revision_id` BIGINT NOT NULL,
    `pool_composition_item_id` BIGINT NOT NULL,
    `scorecard_kpi_assignment_id` BIGINT NOT NULL,
    `config_code_snapshot` VARCHAR(40) NOT NULL,
    `kpi_code_snapshot` VARCHAR(30) NOT NULL,
    `kpi_name_snapshot` VARCHAR(200) NOT NULL,
    `kpi_objective_snapshot` TEXT NULL,
    `goal_text_snapshot` VARCHAR(255) NULL,
    `goal_value_snapshot` DECIMAL(20, 6) NULL,
    `evaluation_type_id` BIGINT NULL,
    `evaluation_type_code_snapshot` VARCHAR(40) NOT NULL,
    `scoring_method_code_snapshot` VARCHAR(40) NULL,
    `calculation_rule_version_snapshot` VARCHAR(30) NULL,
    `measurement_unit_id` BIGINT NULL,
    `measurement_unit_code_snapshot` VARCHAR(40) NULL,
    `measurement_unit_name_snapshot` VARCHAR(120) NULL,
    `measurement_unit_symbol_snapshot` VARCHAR(30) NULL,
    `primary_data_source_id` BIGINT NULL,
    `primary_data_source_code_snapshot` VARCHAR(40) NULL,
    `primary_data_source_name_snapshot` VARCHAR(150) NULL,
    `weight_percent_snapshot` DECIMAL(7, 4) NOT NULL,
    `is_required` BOOLEAN NOT NULL DEFAULT true,
    `display_order` INTEGER NOT NULL DEFAULT 1,
    `generated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_mpi_period_configuration`(`monitoring_period_id`, `kpi_configuration_id`),
    UNIQUE INDEX `uq_mpi_period_order`(`monitoring_period_id`, `display_order`),
    UNIQUE INDEX `uq_mpi_scorecard_assignment`(`monitoring_period_id`, `scorecard_kpi_assignment_id`),
    PRIMARY KEY (`monitoring_period_input_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_period_input_thresholds` (
    `monitoring_period_input_threshold_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_input_id` BIGINT NOT NULL,
    `traffic_light_level_id` BIGINT NULL,
    `traffic_light_code_snapshot` VARCHAR(30) NOT NULL,
    `traffic_light_name_snapshot` VARCHAR(100) NULL,
    `range_min_percent` DECIMAL(12, 6) NULL,
    `range_max_percent` DECIMAL(12, 6) NULL,
    `includes_min` BOOLEAN NOT NULL DEFAULT true,
    `includes_max` BOOLEAN NOT NULL DEFAULT false,
    `display_order` SMALLINT NOT NULL DEFAULT 1,

    UNIQUE INDEX `uq_mpit_input_level`(`monitoring_period_input_id`, `traffic_light_code_snapshot`),
    UNIQUE INDEX `uq_mpit_input_order`(`monitoring_period_input_id`, `display_order`),
    PRIMARY KEY (`monitoring_period_input_threshold_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `monitoring_period_scorecard_links` (
    `monitoring_period_scorecard_link_id` BIGINT NOT NULL AUTO_INCREMENT,
    `monitoring_period_scorecard_id` BIGINT NOT NULL,
    `linked_monitoring_period_scorecard_id` BIGINT NOT NULL,
    `scorecard_linked_scorecard_id` BIGINT NOT NULL,
    `linked_scorecard_id` BIGINT NOT NULL,
    `linked_scorecard_period_composition_id` BIGINT NOT NULL,
    `linked_scorecard_code_snapshot` VARCHAR(40) NOT NULL,
    `linked_scorecard_name_snapshot` VARCHAR(200) NOT NULL,
    `weight_percent_snapshot` DECIMAL(7, 4) NOT NULL,
    `display_order_snapshot` INTEGER NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `uq_mpscl_parent_linked`(`monitoring_period_scorecard_id`, `linked_scorecard_id`),
    UNIQUE INDEX `uq_mpscl_original_link`(`monitoring_period_scorecard_id`, `scorecard_linked_scorecard_id`),
    PRIMARY KEY (`monitoring_period_scorecard_link_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_mp_status` FOREIGN KEY (`monitoring_period_status_id`) REFERENCES `monitoring_period_statuses`(`monitoring_period_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_scorecards` ADD CONSTRAINT `fk_mpsc_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods`(`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_mpi_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods`(`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_mpi_period_scorecard` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards`(`monitoring_period_scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_input_thresholds` ADD CONSTRAINT `fk_mpit_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs`(`monitoring_period_input_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_scorecard_links` ADD CONSTRAINT `fk_mpscl_parent` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards`(`monitoring_period_scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_period_scorecard_links` ADD CONSTRAINT `fk_mpscl_linked_local` FOREIGN KEY (`linked_monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards`(`monitoring_period_scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
