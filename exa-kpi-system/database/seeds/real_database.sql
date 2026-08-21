-- CREATE TABLE `companies` (
--   `company_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(30) UNIQUE NOT NULL,
--   `name` varchar(150) NOT NULL,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_companies_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_companies_name_not_blank` CHECK (length(trim(name)) > 0)
-- );

-- CREATE TABLE `departments` (
--   `department_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `company_id` bigint NOT NULL,
--   `parent_department_id` bigint COMMENT 'Self-reference used for areas, divisions or subdepartments',
--   `code` varchar(30) NOT NULL,
--   `name` varchar(150) NOT NULL,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_departments_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_departments_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_departments_not_self_parent` CHECK (parent_department_id IS NULL OR parent_department_id <> department_id)
-- );

-- CREATE TABLE `employees` (
--   `employee_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `employee_code` varchar(50) UNIQUE NOT NULL,
--   `first_name` varchar(100) NOT NULL,
--   `last_name` varchar(100) NOT NULL,
--   `email` varchar(254) NOT NULL,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_employees_code_not_blank` CHECK (length(trim(employee_code)) > 0),
--   CONSTRAINT `chk_employees_first_name_not_blank` CHECK (length(trim(first_name)) > 0),
--   CONSTRAINT `chk_employees_last_name_not_blank` CHECK (length(trim(last_name)) > 0),
--   CONSTRAINT `chk_employees_email_not_blank` CHECK (length(trim(email)) > 0)
-- );

-- CREATE TABLE `employee_assignments` (
--   `employee_assignment_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `employee_id` bigint NOT NULL,
--   `company_id` bigint NOT NULL,
--   `department_id` bigint NOT NULL,
--   `valid_from` date,
--   `valid_to` date,
--   `is_primary` boolean NOT NULL DEFAULT true,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_employee_assignments_validity` CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
-- );

-- CREATE TABLE `users` (
--   `user_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `employee_id` bigint,
--   `username` varchar(120) UNIQUE NOT NULL,
--   `email` varchar(254) UNIQUE NOT NULL,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `password_hash` varchar(255) NOT NULL,
--   `must_change_password` boolean NOT NULL DEFAULT true,
--   `last_login_at` timestamptz,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_users_username_not_blank` CHECK (length(trim(username)) > 0),
--   CONSTRAINT `chk_users_email_not_blank` CHECK (length(trim(email)) > 0)
-- );

-- CREATE TABLE `kpi_categories` (
-- `kpi_category_id` bigint PRIMARY KEY AUTO_INCREMENT,
-- `code` varchar(50) UNIQUE NOT NULL,
-- `name` varchar(120) NOT NULL,
-- `description` text,
-- `is_active` boolean NOT NULL DEFAULT true,
-- `created_at` timestamp NOT NULL DEFAULT (now()),
-- `created_by_user_id` bigint,
-- `updated_at` timestamp,
-- `updated_by_user_id` bigint,
-- CONSTRAINT `chk_kpi_categories_code_not_blank` CHECK (length(trim(code)) > 0),
-- CONSTRAINT `chk_kpi_categories_name_not_blank` CHECK (length(trim(name)) > 0)
-- );

-- CREATE TABLE `measurement_units` (
--   `measurement_unit_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(50) UNIQUE NOT NULL,
--   `symbol` varchar(50) UNIQUE NOT NULL,
--   `name` varchar(120) NOT NULL,
--   `description` text,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   `decimal_places` smallint NOT NULL CHECK (decimal_places >= 0 AND decimal_places <= 8) DEFAULT 2,
--   `is_percentage` boolean NOT NULL DEFAULT false,
--   CONSTRAINT `chk_measurement_units_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_measurement_units_symbol_not_blank` CHECK (length(trim(symbol)) > 0),
--   CONSTRAINT `chk_measurement_units_name_not_blank` CHECK (length(trim(name)) > 0)
-- );

-- CREATE TABLE `input_frequencies` (
--   `input_frequency_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(50) UNIQUE NOT NULL,
--   `name` varchar(120) NOT NULL,
--   `description` text,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   `months_per_period` smallint NOT NULL CHECK (months_per_period > 0),
--   `periods_per_year` smallint CHECK (periods_per_year > 0),
--   CONSTRAINT `chk_input_frequencies_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_input_frequencies_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_input_frequencies_months_range` CHECK (months_per_period BETWEEN 1 AND 12),
--   CONSTRAINT `chk_input_frequencies_periods_range` CHECK (periods_per_year IS NULL OR periods_per_year BETWEEN 1 AND 12),
--   CONSTRAINT `chk_input_frequencies_year_consistency` CHECK (periods_per_year IS NULL OR months_per_period * periods_per_year = 12)
-- );

-- CREATE TABLE `traffic_light_levels` (
--   `traffic_light_level_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(50) UNIQUE NOT NULL,
--   `name` varchar(120) NOT NULL,
--   `description` text,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   `severity_rank` smallint UNIQUE NOT NULL,
--   `hex_color` varchar(7),
--   CONSTRAINT `chk_traffic_light_levels_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_traffic_light_levels_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_traffic_light_levels_severity_rank` CHECK (severity_rank > 0),
--   CONSTRAINT `chk_traffic_light_levels_hex_color` CHECK (hex_color IS NULL OR hex_color ~ '^#[0-9A-Fa-f]{6}$')
-- );

-- CREATE TABLE `data_sources` (
--   `data_source_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(50) UNIQUE NOT NULL,
--   `name` varchar(120) NOT NULL,
--   `description` text,
--   `is_active` boolean NOT NULL DEFAULT true,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   `source_type` varchar(30) NOT NULL,
--   `is_external` boolean NOT NULL DEFAULT false,
--   `supports_automation` boolean NOT NULL DEFAULT false,
--   CONSTRAINT `chk_data_sources_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_data_sources_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_data_sources_source_type` CHECK (source_type IN ('DATABASE', 'API', 'FILE', 'MANUAL', 'OTHER'))
-- );

-- CREATE TABLE `kpi_definitions` (
--   `kpi_definition_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `kpi_code` varchar(30) UNIQUE NOT NULL,
--   `kpi_name` varchar(200) NOT NULL,
--   `description` text NOT NULL,
--   `kpi_category_id` bigint NOT NULL,
--   `status_code` varchar(20) NOT NULL DEFAULT 'ACTIVE',
--   `is_active` boolean NOT NULL DEFAULT true,
--   `deleted_at` timestamp,
--   `created_at` timestamp NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamp,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_definitions_code_not_blank` CHECK (length(trim(kpi_code)) > 0),
--   CONSTRAINT `chk_kpi_definitions_name_not_blank` CHECK (length(trim(kpi_name)) > 0),
--   CONSTRAINT `chk_kpi_definitions_description_not_blank` CHECK (length(trim(description)) > 0),
--   CONSTRAINT `chk_kpi_definitions_status` CHECK (status_code IN ('ACTIVE', 'INACTIVE')),
--   CONSTRAINT `chk_kpi_definitions_status_consistency` CHECK (is_active = (status_code = 'ACTIVE')),
--   CONSTRAINT `chk_kpi_definitions_deleted_status` CHECK (deleted_at IS NULL OR status_code = 'INACTIVE')
-- );

-- CREATE TABLE `kpi_configurations` (
--   `kpi_configuration_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `kpi_definition_id` bigint NOT NULL,
--   `config_code` varchar(40) UNIQUE NOT NULL,
--   `measurement_unit_id` bigint NOT NULL,
--   `input_frequency_id` bigint NOT NULL,
--   `primary_data_source_id` bigint NOT NULL,
--   `evaluation_type_id` bigint NOT NULL,
--   `target_value` numeric(20,6),
--   `kpi_configuration_status_id` bigint NOT NULL,
--   `notes` text,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_configurations_code_not_blank` CHECK (length(trim(config_code)) > 0)
-- );

-- CREATE TABLE `kpi_configuration_thresholds` (
--   `kpi_configuration_threshold_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `kpi_configuration_id` bigint NOT NULL,
--   `traffic_light_level_id` bigint NOT NULL,
--   `range_min_percent` numeric(9,4) NOT NULL,
--   `range_max_percent` numeric(9,4) NOT NULL,
--   `includes_min` boolean NOT NULL DEFAULT true,
--   `includes_max` boolean NOT NULL DEFAULT false,
--   `display_order` smallint NOT NULL DEFAULT 1,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_thresholds_min_nonnegative` CHECK (range_min_percent >= 0),
--   CONSTRAINT `chk_kpi_thresholds_valid_range` CHECK (range_max_percent >= range_min_percent),
--   CONSTRAINT `chk_kpi_thresholds_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `kpi_configuration_statuses` (
--   `kpi_configuration_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(30) UNIQUE NOT NULL,
--   `name` varchar(100) NOT NULL,
--   `description` text,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_configuration_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_kpi_configuration_statuses_name_not_blank` CHECK (length(trim(name)) > 0)
-- );

-- CREATE TABLE `evaluation_types` (
--   `evaluation_type_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(30) UNIQUE NOT NULL,
--   `name` varchar(100) NOT NULL,
--   `description` text,
--   `display_order` smallint NOT NULL DEFAULT 1,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_evaluation_types_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_evaluation_types_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_evaluation_types_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `kpi_pools` (
--   `kpi_pool_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `pool_code` varchar(40) UNIQUE NOT NULL,
--   `pool_name` varchar(200) NOT NULL,
--   `description` text,
--   `input_frequency_id` bigint NOT NULL,
--   `valid_from` date NOT NULL,
--   `valid_to` date NOT NULL,
--   `status_code` varchar(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
--   `notes` text,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_pools_code_not_blank` CHECK (length(trim(pool_code)) > 0),
--   CONSTRAINT `chk_kpi_pools_name_not_blank` CHECK (length(trim(pool_name)) > 0),
--   CONSTRAINT `chk_kpi_pools_validity` CHECK (valid_to >= valid_from),
--   CONSTRAINT `chk_kpi_pools_status` CHECK (status_code IN ('NOT_CONFIGURED', 'CONFIGURED', 'INACTIVE'))
-- );

-- CREATE TABLE `kpi_pool_companies` (
--   `kpi_pool_company_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `kpi_pool_id` bigint NOT NULL,
--   `company_id` bigint NOT NULL,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint
-- );

-- CREATE TABLE `kpi_pool_kpis` (
--   `kpi_pool_kpi_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `kpi_pool_id` bigint NOT NULL,
--   `kpi_definition_id` bigint NOT NULL,
--   `kpi_configuration_id` bigint NOT NULL,
--   `display_order` integer NOT NULL DEFAULT 1,
--   `is_required` boolean NOT NULL DEFAULT true,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_kpi_pool_kpis_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `kpi_pool_availability_statuses` (
--   `kpi_pool_availability_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(40) UNIQUE NOT NULL,
--   `name` varchar(100) NOT NULL,
--   `description` text,
--   `display_order` smallint NOT NULL DEFAULT 1,
--   CONSTRAINT `chk_kpi_pool_availability_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_kpi_pool_availability_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_kpi_pool_availability_statuses_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `kpi_pool_configuration_availability` (
--   `kpi_pool_id` bigint NOT NULL,
--   `kpi_definition_id` bigint NOT NULL,
--   `kpi_configuration_id` bigint NOT NULL,
--   `kpi_pool_availability_status_id` bigint NOT NULL,
--   `availability_reason_code` varchar(60)
-- );

-- CREATE TABLE `scorecard_statuses` (
--   `scorecard_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(30) UNIQUE NOT NULL,
--   `name` varchar(100) NOT NULL,
--   `description` text,
--   `display_order` smallint NOT NULL DEFAULT 1,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_scorecard_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_scorecard_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_scorecard_statuses_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `scorecards` (
--   `scorecard_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_code` varchar(40) UNIQUE NOT NULL,
--   `scorecard_name` varchar(200) NOT NULL,
--   `description` text,
--   `kpi_pool_id` bigint NOT NULL,
--   `input_frequency_id` bigint NOT NULL,
--   `valid_from` date NOT NULL,
--   `valid_to` date NOT NULL,
--   `scorecard_status_id` bigint NOT NULL,
--   `notes` text,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_scorecards_code_not_blank` CHECK (length(trim(scorecard_code)) > 0),
--   CONSTRAINT `chk_scorecards_name_not_blank` CHECK (length(trim(scorecard_name)) > 0),
--   CONSTRAINT `chk_scorecards_validity` CHECK (valid_to >= valid_from)
-- );

-- CREATE TABLE `scorecard_departments` (
--   `scorecard_department_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_id` bigint NOT NULL,
--   `department_id` bigint NOT NULL,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint
-- );

-- CREATE TABLE `scorecard_employees` (
--   `scorecard_employee_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_department_id` bigint NOT NULL,
--   `employee_id` bigint NOT NULL,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint
-- );

-- CREATE TABLE `scorecard_kpis` (
--   `scorecard_kpi_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_id` bigint NOT NULL,
--   `kpi_pool_kpi_id` bigint NOT NULL,
--   `weight_percent` numeric(7,4) NOT NULL,
--   `display_order` integer NOT NULL DEFAULT 1,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_scorecard_kpis_weight` CHECK (weight_percent > 0 AND weight_percent <= 100),
--   CONSTRAINT `chk_scorecard_kpis_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `scorecard_linked_scorecards` (
--   `scorecard_linked_scorecard_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_id` bigint NOT NULL,
--   `linked_scorecard_id` bigint NOT NULL,
--   `weight_percent` numeric(7,4) NOT NULL,
--   `display_order` integer NOT NULL DEFAULT 1,
--   `created_at` timestamptz NOT NULL DEFAULT (now()),
--   `created_by_user_id` bigint,
--   `updated_at` timestamptz,
--   `updated_by_user_id` bigint,
--   CONSTRAINT `chk_scorecard_links_not_self` CHECK (scorecard_id <> linked_scorecard_id),
--   CONSTRAINT `chk_scorecard_links_weight` CHECK (weight_percent > 0 AND weight_percent <= 100),
--   CONSTRAINT `chk_scorecard_links_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `scorecard_kpi_availability_statuses` (
--   `scorecard_kpi_availability_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `code` varchar(40) UNIQUE NOT NULL,
--   `name` varchar(100) NOT NULL,
--   `description` text,
--   `display_order` smallint NOT NULL DEFAULT 1,
--   CONSTRAINT `chk_scorecard_kpi_availability_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
--   CONSTRAINT `chk_scorecard_kpi_availability_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
--   CONSTRAINT `chk_scorecard_kpi_availability_statuses_display_order` CHECK (display_order > 0)
-- );

-- CREATE TABLE `scorecard_kpi_availability` (
--   `scorecard_id` bigint NOT NULL,
--   `kpi_pool_kpi_id` bigint NOT NULL,
--   `scorecard_kpi_availability_status_id` bigint NOT NULL,
--   `availability_reason_code` varchar(60)
-- );

-- CREATE TABLE `scorecard_composition_summary` (
--   `scorecard_id` bigint PRIMARY KEY,
--   `own_kpi_count` integer NOT NULL,
--   `linked_scorecard_count` integer NOT NULL,
--   `own_kpi_weight_percent` numeric(7,4) NOT NULL,
--   `linked_scorecard_weight_percent` numeric(7,4) NOT NULL,
--   `total_weight_percent` numeric(7,4) NOT NULL,
--   `composition_status_code` varchar(20) NOT NULL,
--   CONSTRAINT `chk_scorecard_composition_own_count` CHECK (own_kpi_count >= 0),
--   CONSTRAINT `chk_scorecard_composition_linked_count` CHECK (linked_scorecard_count >= 0),
--   CONSTRAINT `chk_scorecard_composition_own_weight` CHECK (own_kpi_weight_percent >= 0),
--   CONSTRAINT `chk_scorecard_composition_linked_weight` CHECK (linked_scorecard_weight_percent >= 0),
--   CONSTRAINT `chk_scorecard_composition_total` CHECK (total_weight_percent = own_kpi_weight_percent + linked_scorecard_weight_percent),
--   CONSTRAINT `chk_scorecard_composition_status` CHECK (composition_status_code IN ('INCOMPLETE', 'COMPLETE', 'OVERWEIGHT'))
-- );

-- CREATE TABLE `scorecard_result_schedule_preview` (
--   `scorecard_id` bigint NOT NULL,
--   `sequence_no` integer NOT NULL,
--   `period_start` date NOT NULL,
--   `period_end` date NOT NULL,
--   `period_label` varchar(100) NOT NULL,
--   CONSTRAINT `chk_scorecard_schedule_sequence` CHECK (sequence_no > 0),
--   CONSTRAINT `chk_scorecard_schedule_period` CHECK (period_end >= period_start),
--   CONSTRAINT `chk_scorecard_schedule_label_not_blank` CHECK (length(trim(period_label)) > 0)
-- );

CREATE TABLE `monitoring_period_statuses` (
  `monitoring_period_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `is_terminal` boolean NOT NULL DEFAULT false,
  `allows_entry` boolean NOT NULL DEFAULT false,
  `allows_validation` boolean NOT NULL DEFAULT false,
  `allows_close` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_monitoring_period_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_monitoring_period_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_monitoring_period_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `monitoring_input_methods` (
  `monitoring_input_method_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_monitoring_input_methods_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_monitoring_input_methods_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_monitoring_input_methods_display_order` CHECK (display_order > 0)
);

CREATE TABLE `result_entry_batch_statuses` (
  `result_entry_batch_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `is_terminal` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_result_entry_batch_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_result_entry_batch_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_result_entry_batch_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `result_entry_row_statuses` (
  `result_entry_row_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_result_entry_row_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_result_entry_row_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_result_entry_row_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `kpi_result_statuses` (
  `kpi_result_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `is_final` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_kpi_result_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_kpi_result_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_kpi_result_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `validation_statuses` (
  `validation_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `is_successful` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_validation_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_validation_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_validation_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `validation_issue_severities` (
  `validation_issue_severity_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(30) UNIQUE NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `blocks_validation` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_validation_issue_severities_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_validation_issue_severities_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_validation_issue_severities_display_order` CHECK (display_order > 0)
);

CREATE TABLE `period_closure_types` (
  `period_closure_type_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `requires_justification` boolean NOT NULL DEFAULT false,
  `display_order` smallint NOT NULL DEFAULT 1,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_period_closure_types_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_period_closure_types_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_period_closure_types_display_order` CHECK (display_order > 0)
);

CREATE TABLE `period_reopening_statuses` (
  `period_reopening_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  `is_terminal` boolean NOT NULL DEFAULT false,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_period_reopening_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_period_reopening_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_period_reopening_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `monitoring_periods` (
  `monitoring_period_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `kpi_pool_id` bigint NOT NULL,
  `input_frequency_id` bigint NOT NULL,
  `sequence_no` integer NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `monitoring_period_status_id` bigint NOT NULL,
  `monitoring_input_method_id` bigint,
  `previous_monitoring_period_id` bigint,
  `generated_at` timestamptz NOT NULL DEFAULT (now()),
  `generated_by_user_id` bigint,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_monitoring_periods_sequence` CHECK (sequence_no > 0),
  CONSTRAINT `chk_monitoring_periods_dates` CHECK (period_end >= period_start),
  CONSTRAINT `chk_monitoring_periods_label_not_blank` CHECK (length(trim(period_label)) > 0),
  CONSTRAINT `chk_monitoring_periods_not_self_previous` CHECK (previous_monitoring_period_id IS NULL OR previous_monitoring_period_id <> monitoring_period_id)
);

CREATE TABLE `monitoring_period_scorecards` (
  `monitoring_period_scorecard_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `scorecard_code_snapshot` varchar(40) NOT NULL,
  `scorecard_name_snapshot` varchar(200) NOT NULL,
  `scorecard_valid_from_snapshot` date NOT NULL,
  `scorecard_valid_to_snapshot` date NOT NULL,
  `own_kpi_weight_percent_snapshot` numeric(7,4) NOT NULL,
  `linked_scorecard_weight_percent_snapshot` numeric(7,4) NOT NULL,
  `total_weight_percent_snapshot` numeric(7,4) NOT NULL,
  `snapshot_created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_scorecards_code_not_blank` CHECK (length(trim(scorecard_code_snapshot)) > 0),
  CONSTRAINT `chk_period_scorecards_name_not_blank` CHECK (length(trim(scorecard_name_snapshot)) > 0),
  CONSTRAINT `chk_period_scorecards_validity` CHECK (scorecard_valid_to_snapshot >= scorecard_valid_from_snapshot),
  CONSTRAINT `chk_period_scorecards_own_weight` CHECK (own_kpi_weight_percent_snapshot BETWEEN 0 AND 100),
  CONSTRAINT `chk_period_scorecards_linked_weight` CHECK (linked_scorecard_weight_percent_snapshot BETWEEN 0 AND 100),
  CONSTRAINT `chk_period_scorecards_total_weight_math` CHECK (total_weight_percent_snapshot = own_kpi_weight_percent_snapshot + linked_scorecard_weight_percent_snapshot),
  CONSTRAINT `chk_period_scorecards_total_weight_100` CHECK (total_weight_percent_snapshot = 100)
);

CREATE TABLE `monitoring_period_inputs` (
  `monitoring_period_input_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `kpi_pool_kpi_id` bigint NOT NULL,
  `config_code_snapshot` varchar(40) NOT NULL,
  `kpi_code_snapshot` varchar(30) NOT NULL,
  `kpi_name_snapshot` varchar(200) NOT NULL,
  `target_value_snapshot` numeric(20,6) NOT NULL,
  `measurement_unit_id` bigint NOT NULL,
  `evaluation_type_id` bigint NOT NULL,
  `primary_data_source_id` bigint NOT NULL,
  `is_required` boolean NOT NULL DEFAULT true,
  `is_sensitive` boolean NOT NULL DEFAULT false,
  `display_order` integer NOT NULL DEFAULT 1,
  `generated_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_inputs_config_code_not_blank` CHECK (length(trim(config_code_snapshot)) > 0),
  CONSTRAINT `chk_period_inputs_kpi_code_not_blank` CHECK (length(trim(kpi_code_snapshot)) > 0),
  CONSTRAINT `chk_period_inputs_kpi_name_not_blank` CHECK (length(trim(kpi_name_snapshot)) > 0),
  CONSTRAINT `chk_period_inputs_display_order` CHECK (display_order > 0)
);

CREATE TABLE `monitoring_period_input_consumers` (
  `monitoring_period_input_consumer_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_input_id` bigint NOT NULL,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_kpi_id` bigint NOT NULL,
  `weight_percent_snapshot` numeric(7,4) NOT NULL,
  `display_order_snapshot` integer NOT NULL,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_input_consumers_weight` CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
  CONSTRAINT `chk_period_input_consumers_display_order` CHECK (display_order_snapshot > 0)
);

CREATE TABLE `monitoring_period_input_thresholds` (
  `monitoring_period_input_threshold_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_input_id` bigint NOT NULL,
  `traffic_light_level_id` bigint NOT NULL,
  `range_min_percent` numeric(12,6) NOT NULL,
  `range_max_percent` numeric(12,6) NOT NULL,
  `includes_min` boolean NOT NULL DEFAULT true,
  `includes_max` boolean NOT NULL DEFAULT false,
  `display_order` smallint NOT NULL DEFAULT 1,
  CONSTRAINT `chk_period_input_thresholds_range` CHECK (range_max_percent >= range_min_percent),
  CONSTRAINT `chk_period_input_thresholds_display_order` CHECK (display_order > 0)
);

CREATE TABLE `monitoring_period_scorecard_links` (
  `monitoring_period_scorecard_link_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_linked_scorecard_id` bigint NOT NULL,
  `linked_scorecard_id` bigint NOT NULL,
  `linked_scorecard_code_snapshot` varchar(40) NOT NULL,
  `linked_scorecard_name_snapshot` varchar(200) NOT NULL,
  `weight_percent_snapshot` numeric(7,4) NOT NULL,
  `display_order_snapshot` integer NOT NULL,
  `resolution_policy_code` varchar(50) NOT NULL DEFAULT 'SAME_PERIOD_ELSE_LATEST_CLOSED',
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_scorecard_links_code_not_blank` CHECK (length(trim(linked_scorecard_code_snapshot)) > 0),
  CONSTRAINT `chk_period_scorecard_links_name_not_blank` CHECK (length(trim(linked_scorecard_name_snapshot)) > 0),
  CONSTRAINT `chk_period_scorecard_links_weight` CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
  CONSTRAINT `chk_period_scorecard_links_display_order` CHECK (display_order_snapshot > 0),
  CONSTRAINT `chk_period_scorecard_links_resolution_policy` CHECK (resolution_policy_code IN ('SAME_PERIOD_ELSE_LATEST_CLOSED', 'LATEST_CLOSED_ONLY', 'REQUIRE_EXCEPTION'))
);

CREATE TABLE `monitoring_period_templates` (
  `monitoring_period_template_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint UNIQUE NOT NULL,
  `template_file_name` varchar(255) NOT NULL,
  `storage_key` varchar(500) UNIQUE NOT NULL,
  `mime_type` varchar(150) NOT NULL DEFAULT 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  `expected_row_count` integer NOT NULL,
  `expected_column_count` integer NOT NULL,
  `generated_at` timestamptz NOT NULL DEFAULT (now()),
  `generated_by_user_id` bigint,
  CONSTRAINT `chk_monitoring_templates_file_name_not_blank` CHECK (length(trim(template_file_name)) > 0),
  CONSTRAINT `chk_monitoring_templates_storage_key_not_blank` CHECK (length(trim(storage_key)) > 0),
  CONSTRAINT `chk_monitoring_templates_mime_type_not_blank` CHECK (length(trim(mime_type)) > 0),
  CONSTRAINT `chk_monitoring_templates_row_count` CHECK (expected_row_count > 0),
  CONSTRAINT `chk_monitoring_templates_column_count` CHECK (expected_column_count > 0)
);

CREATE TABLE `result_entry_batches` (
  `result_entry_batch_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `monitoring_input_method_id` bigint NOT NULL,
  `monitoring_period_template_id` bigint,
  `uploaded_file_name` varchar(255),
  `uploaded_storage_key` varchar(500) UNIQUE,
  `uploaded_mime_type` varchar(150),
  `uploaded_size_bytes` bigint,
  `result_entry_batch_status_id` bigint NOT NULL,
  `batch_no` integer NOT NULL,
  `rows_received` integer NOT NULL DEFAULT 0,
  `rows_valid` integer NOT NULL DEFAULT 0,
  `rows_with_warnings` integer NOT NULL DEFAULT 0,
  `rows_with_errors` integer NOT NULL DEFAULT 0,
  `started_at` timestamptz NOT NULL DEFAULT (now()),
  `finished_at` timestamptz,
  `submitted_by_user_id` bigint,
  `notes` text,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_result_entry_batches_batch_no` CHECK (batch_no > 0),
  CONSTRAINT `chk_result_entry_batches_rows_received` CHECK (rows_received >= 0),
  CONSTRAINT `chk_result_entry_batches_rows_valid` CHECK (rows_valid >= 0),
  CONSTRAINT `chk_result_entry_batches_rows_warning` CHECK (rows_with_warnings >= 0),
  CONSTRAINT `chk_result_entry_batches_rows_error` CHECK (rows_with_errors >= 0),
  CONSTRAINT `chk_result_entry_batches_row_counts` CHECK (rows_valid + rows_with_warnings + rows_with_errors <= rows_received),
  CONSTRAINT `chk_result_entry_batches_timestamps` CHECK (finished_at IS NULL OR finished_at >= started_at),
  CONSTRAINT `chk_result_entry_batches_uploaded_size` CHECK (uploaded_size_bytes IS NULL OR uploaded_size_bytes > 0),
  CONSTRAINT `chk_result_entry_batches_file_metadata_consistency` CHECK ((uploaded_file_name IS NULL
      AND uploaded_storage_key IS NULL
      AND uploaded_mime_type IS NULL
      AND uploaded_size_bytes IS NULL)
      OR
      (uploaded_file_name IS NOT NULL
      AND uploaded_storage_key IS NOT NULL
      AND uploaded_mime_type IS NOT NULL
      AND uploaded_size_bytes IS NOT NULL)),
  CONSTRAINT `chk_result_entry_batches_file_name_not_blank` CHECK (uploaded_file_name IS NULL OR length(trim(uploaded_file_name)) > 0),
  CONSTRAINT `chk_result_entry_batches_storage_key_not_blank` CHECK (uploaded_storage_key IS NULL OR length(trim(uploaded_storage_key)) > 0),
  CONSTRAINT `chk_result_entry_batches_mime_type_not_blank` CHECK (uploaded_mime_type IS NULL OR length(trim(uploaded_mime_type)) > 0)
);

CREATE TABLE `result_entry_batch_rows` (
  `result_entry_batch_row_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `result_entry_batch_id` bigint NOT NULL,
  `monitoring_period_input_id` bigint NOT NULL,
  `source_row_number` integer,
  `raw_result_value` varchar(250),
  `parsed_result_value` numeric(20,6),
  `raw_comment` text,
  `result_entry_row_status_id` bigint NOT NULL,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_result_entry_batch_rows_source_row_number` CHECK (source_row_number IS NULL OR source_row_number > 0)
);

CREATE TABLE `kpi_results` (
  `kpi_result_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_input_id` bigint UNIQUE NOT NULL,
  `latest_result_entry_batch_row_id` bigint NOT NULL,
  `result_value` numeric(20,6) NOT NULL,
  `result_comment` text,
  `compliance_rate_percent` numeric(12,6) NOT NULL,
  `score_percent` numeric(7,4) NOT NULL,
  `extra_points_percent` numeric(12,6) NOT NULL DEFAULT 0,
  `traffic_light_level_id` bigint NOT NULL,
  `kpi_result_status_id` bigint NOT NULL,
  `revision_no` integer NOT NULL DEFAULT 1,
  `entered_at` timestamptz NOT NULL DEFAULT (now()),
  `entered_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_kpi_results_compliance_nonnegative` CHECK (compliance_rate_percent >= 0),
  CONSTRAINT `chk_kpi_results_score_range` CHECK (score_percent BETWEEN 0 AND 100),
  CONSTRAINT `chk_kpi_results_extra_points_nonnegative` CHECK (extra_points_percent >= 0),
  CONSTRAINT `chk_kpi_results_revision_no` CHECK (revision_no > 0)
);

CREATE TABLE `kpi_result_revisions` (
  `kpi_result_revision_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `kpi_result_id` bigint NOT NULL,
  `revision_no` integer NOT NULL,
  `result_entry_batch_row_id` bigint NOT NULL,
  `result_value` numeric(20,6) NOT NULL,
  `result_comment` text,
  `compliance_rate_percent` numeric(12,6) NOT NULL,
  `score_percent` numeric(7,4) NOT NULL,
  `extra_points_percent` numeric(12,6) NOT NULL DEFAULT 0,
  `traffic_light_level_id` bigint NOT NULL,
  `kpi_result_status_id` bigint NOT NULL,
  `revision_reason` text,
  `changed_at` timestamptz NOT NULL DEFAULT (now()),
  `changed_by_user_id` bigint,
  CONSTRAINT `chk_kpi_result_revisions_revision_no` CHECK (revision_no > 0),
  CONSTRAINT `chk_kpi_result_revisions_compliance_nonnegative` CHECK (compliance_rate_percent >= 0),
  CONSTRAINT `chk_kpi_result_revisions_score_range` CHECK (score_percent BETWEEN 0 AND 100),
  CONSTRAINT `chk_kpi_result_revisions_extra_points_nonnegative` CHECK (extra_points_percent >= 0)
);

CREATE TABLE `validation_runs` (
  `validation_run_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `trigger_result_entry_batch_id` bigint,
  `run_no` integer NOT NULL,
  `validation_status_id` bigint NOT NULL,
  `expected_input_count` integer NOT NULL DEFAULT 0,
  `entered_result_count` integer NOT NULL DEFAULT 0,
  `missing_result_count` integer NOT NULL DEFAULT 0,
  `valid_result_count` integer NOT NULL DEFAULT 0,
  `warning_count` integer NOT NULL DEFAULT 0,
  `error_count` integer NOT NULL DEFAULT 0,
  `critical_error_count` integer NOT NULL DEFAULT 0,
  `started_at` timestamptz NOT NULL DEFAULT (now()),
  `finished_at` timestamptz,
  `executed_by_user_id` bigint,
  `summary_json` jsonb NOT NULL DEFAULT ('{}'::jsonb),
  CONSTRAINT `chk_validation_runs_run_no` CHECK (run_no > 0),
  CONSTRAINT `chk_validation_runs_expected_count` CHECK (expected_input_count >= 0),
  CONSTRAINT `chk_validation_runs_entered_count` CHECK (entered_result_count >= 0),
  CONSTRAINT `chk_validation_runs_missing_count` CHECK (missing_result_count >= 0),
  CONSTRAINT `chk_validation_runs_valid_count` CHECK (valid_result_count >= 0),
  CONSTRAINT `chk_validation_runs_warning_count` CHECK (warning_count >= 0),
  CONSTRAINT `chk_validation_runs_error_count` CHECK (error_count >= 0),
  CONSTRAINT `chk_validation_runs_critical_count` CHECK (critical_error_count >= 0),
  CONSTRAINT `chk_validation_runs_expected_balance` CHECK (entered_result_count + missing_result_count = expected_input_count),
  CONSTRAINT `chk_validation_runs_valid_not_over_entered` CHECK (valid_result_count <= entered_result_count),
  CONSTRAINT `chk_validation_runs_critical_not_over_errors` CHECK (critical_error_count <= error_count),
  CONSTRAINT `chk_validation_runs_timestamps` CHECK (finished_at IS NULL OR finished_at >= started_at)
);

CREATE TABLE `validation_issues` (
  `validation_issue_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `validation_run_id` bigint NOT NULL,
  `validation_issue_severity_id` bigint NOT NULL,
  `monitoring_period_input_id` bigint,
  `result_entry_batch_row_id` bigint,
  `kpi_result_id` bigint,
  `issue_code` varchar(100) NOT NULL,
  `field_name` varchar(100),
  `issue_message` text NOT NULL,
  `current_value_text` text,
  `expected_value_text` text,
  `is_resolved` boolean NOT NULL DEFAULT false,
  `resolved_at` timestamptz,
  `resolved_by_user_id` bigint,
  `resolution_notes` text,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_validation_issues_code_not_blank` CHECK (length(trim(issue_code)) > 0),
  CONSTRAINT `chk_validation_issues_message_not_blank` CHECK (length(trim(issue_message)) > 0),
  CONSTRAINT `chk_validation_issues_resolution_consistency` CHECK ((is_resolved = false AND resolved_at IS NULL AND resolved_by_user_id IS NULL)
      OR (is_resolved = true AND resolved_at IS NOT NULL))
);

CREATE TABLE `monitoring_period_status_history` (
  `monitoring_period_status_history_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `from_monitoring_period_status_id` bigint,
  `to_monitoring_period_status_id` bigint NOT NULL,
  `change_reason` text,
  `changed_at` timestamptz NOT NULL DEFAULT (now()),
  `changed_by_user_id` bigint,
  CONSTRAINT `chk_period_status_history_different_statuses` CHECK (from_monitoring_period_status_id IS NULL OR from_monitoring_period_status_id <> to_monitoring_period_status_id)
);

CREATE TABLE `period_closures` (
  `period_closure_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `period_closure_type_id` bigint NOT NULL,
  `validation_run_id` bigint NOT NULL,
  `closure_no` integer NOT NULL,
  `expected_input_count` integer NOT NULL,
  `entered_result_count` integer NOT NULL,
  `missing_result_count` integer NOT NULL,
  `warning_count` integer NOT NULL,
  `error_count` integer NOT NULL,
  `affected_scorecard_count` integer NOT NULL,
  `justification` text,
  `confirmation_acknowledged` boolean NOT NULL,
  `closed_at` timestamptz NOT NULL DEFAULT (now()),
  `closed_by_user_id` bigint NOT NULL,
  CONSTRAINT `chk_period_closures_closure_no` CHECK (closure_no > 0),
  CONSTRAINT `chk_period_closures_expected_count` CHECK (expected_input_count >= 0),
  CONSTRAINT `chk_period_closures_entered_count` CHECK (entered_result_count >= 0),
  CONSTRAINT `chk_period_closures_missing_count` CHECK (missing_result_count >= 0),
  CONSTRAINT `chk_period_closures_warning_count` CHECK (warning_count >= 0),
  CONSTRAINT `chk_period_closures_error_count` CHECK (error_count >= 0),
  CONSTRAINT `chk_period_closures_scorecard_count` CHECK (affected_scorecard_count >= 0),
  CONSTRAINT `chk_period_closures_expected_balance` CHECK (entered_result_count + missing_result_count = expected_input_count),
  CONSTRAINT `chk_period_closures_confirmation` CHECK (confirmation_acknowledged = true),
  CONSTRAINT `chk_period_closures_justification_not_blank` CHECK (justification IS NULL OR length(trim(justification)) > 0)
);

CREATE TABLE `period_reopenings` (
  `period_reopening_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_id` bigint NOT NULL,
  `period_closure_id` bigint NOT NULL,
  `period_reopening_status_id` bigint NOT NULL,
  `request_reason` text NOT NULL,
  `requested_at` timestamptz NOT NULL DEFAULT (now()),
  `requested_by_user_id` bigint NOT NULL,
  `decided_at` timestamptz,
  `decided_by_user_id` bigint,
  `decision_notes` text,
  `reopened_at` timestamptz,
  `reopened_by_user_id` bigint,
  CONSTRAINT `chk_period_reopenings_reason_not_blank` CHECK (length(trim(request_reason)) > 0),
  CONSTRAINT `chk_period_reopenings_decision_consistency` CHECK ((decided_at IS NULL AND decided_by_user_id IS NULL)
      OR (decided_at IS NOT NULL AND decided_by_user_id IS NOT NULL)),
  CONSTRAINT `chk_period_reopenings_reopened_consistency` CHECK ((reopened_at IS NULL AND reopened_by_user_id IS NULL)
      OR (reopened_at IS NOT NULL AND reopened_by_user_id IS NOT NULL)),
  CONSTRAINT `chk_period_reopenings_decision_time` CHECK (decided_at IS NULL OR decided_at >= requested_at),
  CONSTRAINT `chk_period_reopenings_reopened_time` CHECK (reopened_at IS NULL OR reopened_at >= requested_at)
);

-- CREATE TABLE `scorecard_results` (
--   `scorecard_result_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `period_closure_id` bigint NOT NULL,
--   `monitoring_period_scorecard_id` bigint NOT NULL,
--   `scorecard_id` bigint NOT NULL,
--   `own_kpi_contribution_percent` numeric(7,4) NOT NULL DEFAULT 0,
--   `linked_scorecard_contribution_percent` numeric(7,4) NOT NULL DEFAULT 0,
--   `final_score_percent` numeric(7,4) NOT NULL,
--   `missing_own_kpi_count` integer NOT NULL DEFAULT 0,
--   `missing_linked_scorecard_count` integer NOT NULL DEFAULT 0,
--   `calculation_notes` text,
--   `calculated_at` timestamptz NOT NULL DEFAULT (now()),
--   `calculated_by_user_id` bigint,
--   CONSTRAINT `chk_scorecard_results_own_contribution` CHECK (own_kpi_contribution_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_results_linked_contribution` CHECK (linked_scorecard_contribution_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_results_final_score` CHECK (final_score_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_results_final_math` CHECK (final_score_percent = own_kpi_contribution_percent + linked_scorecard_contribution_percent),
--   CONSTRAINT `chk_scorecard_results_missing_kpis` CHECK (missing_own_kpi_count >= 0),
--   CONSTRAINT `chk_scorecard_results_missing_links` CHECK (missing_linked_scorecard_count >= 0)
-- );

-- CREATE TABLE `scorecard_kpi_result_items` (
--   `scorecard_kpi_result_item_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_result_id` bigint NOT NULL,
--   `monitoring_period_input_consumer_id` bigint NOT NULL,
--   `kpi_result_id` bigint,
--   `weight_percent_snapshot` numeric(7,4) NOT NULL,
--   `kpi_score_percent` numeric(7,4),
--   `weighted_score_percent` numeric(7,4),
--   `is_missing` boolean NOT NULL DEFAULT false,
--   `notes` text,
--   CONSTRAINT `chk_scorecard_kpi_items_weight` CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
--   CONSTRAINT `chk_scorecard_kpi_items_score` CHECK (kpi_score_percent IS NULL OR kpi_score_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_kpi_items_weighted_score` CHECK (weighted_score_percent IS NULL OR weighted_score_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_kpi_items_missing_consistency` CHECK ((is_missing = true AND kpi_result_id IS NULL AND kpi_score_percent IS NULL AND weighted_score_percent IS NULL)
--       OR (is_missing = false AND kpi_result_id IS NOT NULL AND kpi_score_percent IS NOT NULL AND weighted_score_percent IS NOT NULL))
-- );

-- CREATE TABLE `scorecard_link_result_items` (
--   `scorecard_link_result_item_id` bigint PRIMARY KEY AUTO_INCREMENT,
--   `scorecard_result_id` bigint NOT NULL,
--   `monitoring_period_scorecard_link_id` bigint NOT NULL,
--   `linked_scorecard_result_id` bigint,
--   `resolution_code` varchar(50) NOT NULL,
--   `weight_percent_snapshot` numeric(7,4) NOT NULL,
--   `linked_score_percent` numeric(7,4),
--   `weighted_score_percent` numeric(7,4),
--   `is_missing` boolean NOT NULL DEFAULT false,
--   `notes` text,
--   CONSTRAINT `chk_scorecard_link_items_resolution` CHECK (resolution_code IN ('SAME_PERIOD', 'LATEST_PRIOR_CLOSED', 'EXCEPTION_ZERO', 'MISSING')),
--   CONSTRAINT `chk_scorecard_link_items_weight` CHECK (weight_percent_snapshot > 0 AND weight_percent_snapshot <= 100),
--   CONSTRAINT `chk_scorecard_link_items_score` CHECK (linked_score_percent IS NULL OR linked_score_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_link_items_weighted_score` CHECK (weighted_score_percent IS NULL OR weighted_score_percent BETWEEN 0 AND 100),
--   CONSTRAINT `chk_scorecard_link_items_missing_consistency` CHECK ((is_missing = true AND linked_scorecard_result_id IS NULL AND linked_score_percent IS NULL AND weighted_score_percent IS NULL)
--       OR (is_missing = false AND linked_scorecard_result_id IS NOT NULL AND linked_score_percent IS NOT NULL AND weighted_score_percent IS NOT NULL))
-- );

CREATE TABLE `roles` (
  `role_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(120) NOT NULL,
  `description` text,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_roles_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_roles_name_not_blank` CHECK (length(trim(name)) > 0)
);

CREATE TABLE `permissions` (
  `permission_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(80) UNIQUE NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text,
  `module_code` varchar(40) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_permissions_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_permissions_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_permissions_module_not_blank` CHECK (length(trim(module_code)) > 0)
);

CREATE TABLE `user_roles` (
  `user_role_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `assigned_at` timestamptz NOT NULL DEFAULT (now()),
  `assigned_by_user_id` bigint
);

CREATE TABLE `role_permissions` (
  `role_permission_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `permission_id` bigint NOT NULL,
  `assigned_at` timestamptz NOT NULL DEFAULT (now()),
  `assigned_by_user_id` bigint
);

CREATE TABLE `user_access_scopes` (
  `user_access_scope_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `department_id` bigint,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint
);

CREATE TABLE `monitoring_period_scorecard_departments` (
  `monitoring_period_scorecard_department_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_department_id` bigint NOT NULL,
  `department_id` bigint NOT NULL,
  `department_code_snapshot` varchar(30) NOT NULL,
  `department_name_snapshot` varchar(150) NOT NULL,
  `snapshot_created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_sc_departments_code_not_blank` CHECK (length(trim(department_code_snapshot)) > 0),
  CONSTRAINT `chk_period_sc_departments_name_not_blank` CHECK (length(trim(department_name_snapshot)) > 0)
);

CREATE TABLE `monitoring_period_scorecard_employees` (
  `monitoring_period_scorecard_employee_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `monitoring_period_scorecard_department_id` bigint NOT NULL,
  `scorecard_employee_id` bigint NOT NULL,
  `employee_id` bigint NOT NULL,
  `employee_code_snapshot` varchar(50) NOT NULL,
  `employee_name_snapshot` varchar(220) NOT NULL,
  `snapshot_created_at` timestamptz NOT NULL DEFAULT (now()),
  CONSTRAINT `chk_period_sc_employees_code_not_blank` CHECK (length(trim(employee_code_snapshot)) > 0),
  CONSTRAINT `chk_period_sc_employees_name_not_blank` CHECK (length(trim(employee_name_snapshot)) > 0)
);

CREATE TABLE `vw_latest_scorecard_results` (
  `scorecard_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `period_closure_id` bigint NOT NULL,
  `scorecard_code` varchar(40) NOT NULL,
  `scorecard_name` varchar(200) NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `input_frequency_id` bigint NOT NULL,
  `input_frequency_code` varchar(50) NOT NULL,
  `input_frequency_name` varchar(120) NOT NULL,
  `department_count` integer NOT NULL,
  `department_names` text,
  `kpi_count` integer NOT NULL,
  `linked_scorecard_count` integer NOT NULL,
  `own_kpi_weight_percent` numeric(7,4) NOT NULL,
  `linked_scorecard_weight_percent` numeric(7,4) NOT NULL,
  `own_kpi_contribution_percent` numeric(7,4) NOT NULL,
  `linked_scorecard_contribution_percent` numeric(7,4) NOT NULL,
  `final_score_percent` numeric(7,4) NOT NULL,
  `gap_percent` numeric(7,4) NOT NULL,
  `green_kpi_count` integer NOT NULL,
  `yellow_kpi_count` integer NOT NULL,
  `red_kpi_count` integer NOT NULL,
  `missing_kpi_count` integer NOT NULL,
  `result_status_code` varchar(40) NOT NULL,
  `closure_type_code` varchar(40) NOT NULL,
  `closed_at` timestamptz NOT NULL
);

CREATE TABLE `vw_scorecard_result_detail` (
  `scorecard_result_id` bigint PRIMARY KEY,
  `period_closure_id` bigint NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `kpi_pool_id` bigint NOT NULL,
  `scorecard_code` varchar(40) NOT NULL,
  `scorecard_name` varchar(200) NOT NULL,
  `pool_code` varchar(40) NOT NULL,
  `pool_name` varchar(200) NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `scorecard_valid_from` date NOT NULL,
  `scorecard_valid_to` date NOT NULL,
  `input_frequency_code` varchar(50) NOT NULL,
  `input_frequency_name` varchar(120) NOT NULL,
  `period_status_code` varchar(40) NOT NULL,
  `closure_type_code` varchar(40) NOT NULL,
  `own_kpi_weight_percent` numeric(7,4) NOT NULL,
  `linked_scorecard_weight_percent` numeric(7,4) NOT NULL,
  `own_kpi_contribution_percent` numeric(7,4) NOT NULL,
  `linked_scorecard_contribution_percent` numeric(7,4) NOT NULL,
  `final_score_percent` numeric(7,4) NOT NULL,
  `gap_percent` numeric(7,4) NOT NULL,
  `kpi_count` integer NOT NULL,
  `linked_scorecard_count` integer NOT NULL,
  `pool_kpi_count` integer NOT NULL,
  `department_count` integer NOT NULL,
  `collaborator_count` integer NOT NULL,
  `input_method_code` varchar(40),
  `input_method_name` varchar(120),
  `submitted_file_name` varchar(255),
  `submitted_file_storage_key` varchar(500),
  `calculated_at` timestamptz NOT NULL,
  `closed_at` timestamptz NOT NULL,
  `calculation_notes` text
);

CREATE TABLE `vw_scorecard_result_departments` (
  `monitoring_period_scorecard_department_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `department_id` bigint NOT NULL,
  `department_code` varchar(30) NOT NULL,
  `department_name` varchar(150) NOT NULL,
  `collaborator_count` integer NOT NULL
);

CREATE TABLE `vw_scorecard_result_collaborators` (
  `monitoring_period_scorecard_employee_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `monitoring_period_scorecard_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `department_id` bigint NOT NULL,
  `department_name` varchar(150) NOT NULL,
  `employee_id` bigint NOT NULL,
  `employee_code` varchar(50) NOT NULL,
  `employee_name` varchar(220) NOT NULL
);

CREATE TABLE `vw_scorecard_result_kpis` (
  `scorecard_kpi_result_item_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `monitoring_period_input_id` bigint NOT NULL,
  `kpi_result_id` bigint,
  `kpi_pool_kpi_id` bigint NOT NULL,
  `kpi_definition_id` bigint NOT NULL,
  `kpi_configuration_id` bigint NOT NULL,
  `kpi_code` varchar(30) NOT NULL,
  `config_code` varchar(40) NOT NULL,
  `kpi_name` varchar(200) NOT NULL,
  `weight_percent` numeric(7,4) NOT NULL,
  `measurement_unit_code` varchar(50) NOT NULL,
  `measurement_unit_symbol` varchar(50) NOT NULL,
  `measurement_unit_name` varchar(120) NOT NULL,
  `data_source_code` varchar(50) NOT NULL,
  `data_source_name` varchar(120) NOT NULL,
  `evaluation_type_code` varchar(30) NOT NULL,
  `target_value` numeric(20,6),
  `result_value` numeric(20,6),
  `result_comment` text,
  `compliance_rate_percent` numeric(12,6),
  `score_percent` numeric(7,4),
  `weighted_score_percent` numeric(7,4),
  `extra_points_percent` numeric(12,6),
  `traffic_light_level_id` bigint,
  `traffic_light_code` varchar(50),
  `traffic_light_name` varchar(120),
  `traffic_light_hex_color` varchar(7),
  `is_sensitive` boolean NOT NULL,
  `is_missing` boolean NOT NULL
);

CREATE TABLE `vw_scorecard_result_links` (
  `scorecard_link_result_item_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `linked_scorecard_id` bigint,
  `linked_scorecard_result_id` bigint,
  `linked_scorecard_code` varchar(40),
  `linked_scorecard_name` varchar(200),
  `source_period_label` varchar(100),
  `resolution_code` varchar(50) NOT NULL,
  `weight_percent` numeric(7,4) NOT NULL,
  `linked_score_percent` numeric(7,4),
  `weighted_score_percent` numeric(7,4),
  `source_result_status_code` varchar(40),
  `is_missing` boolean NOT NULL,
  `notes` text
);

CREATE TABLE `vw_scorecard_history_rows` (
  `scorecard_result_id` bigint PRIMARY KEY,
  `scorecard_id` bigint NOT NULL,
  `scorecard_code` varchar(40) NOT NULL,
  `scorecard_name` varchar(200) NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `input_frequency_code` varchar(50) NOT NULL,
  `input_frequency_name` varchar(120) NOT NULL,
  `scorecard_valid_from` date NOT NULL,
  `scorecard_valid_to` date NOT NULL,
  `expected_period_count` integer NOT NULL,
  `department_count` integer NOT NULL,
  `department_names` text,
  `final_score_percent` numeric(7,4) NOT NULL,
  `result_status_code` varchar(40) NOT NULL,
  `closure_type_code` varchar(40) NOT NULL,
  `closed_at` timestamptz NOT NULL,
  `scorecard_average_percent` numeric(7,4),
  `previous_score_percent` numeric(7,4),
  `score_difference_percent` numeric(9,4),
  `trend_code` varchar(20)
);

CREATE TABLE `vw_kpi_analysis_base` (
  `scorecard_kpi_result_item_id` bigint PRIMARY KEY,
  `scorecard_result_id` bigint NOT NULL,
  `scorecard_id` bigint NOT NULL,
  `scorecard_code` varchar(40) NOT NULL,
  `scorecard_name` varchar(200) NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `kpi_pool_kpi_id` bigint NOT NULL,
  `kpi_definition_id` bigint NOT NULL,
  `kpi_configuration_id` bigint NOT NULL,
  `kpi_code` varchar(30) NOT NULL,
  `config_code` varchar(40) NOT NULL,
  `kpi_name` varchar(200) NOT NULL,
  `department_names` text,
  `evaluation_type_code` varchar(30) NOT NULL,
  `measurement_unit_code` varchar(50) NOT NULL,
  `measurement_unit_symbol` varchar(50) NOT NULL,
  `target_value` numeric(20,6),
  `result_value` numeric(20,6),
  `result_minus_target_value` numeric(20,6),
  `compliance_rate_percent` numeric(12,6),
  `score_percent` numeric(7,4),
  `weight_percent` numeric(7,4),
  `weighted_score_percent` numeric(7,4),
  `extra_points_percent` numeric(12,6),
  `traffic_light_code` varchar(50),
  `traffic_light_name` varchar(120),
  `traffic_light_hex_color` varchar(7),
  `previous_period_id` bigint,
  `previous_period_label` varchar(100),
  `previous_result_value` numeric(20,6),
  `difference_vs_previous_value` numeric(20,6),
  `same_period_last_year_id` bigint,
  `same_period_last_year_label` varchar(100),
  `same_period_last_year_result_value` numeric(20,6),
  `difference_vs_last_year_value` numeric(20,6),
  `trend_code` varchar(20),
  `is_sensitive` boolean NOT NULL
);

CREATE TABLE `vw_scorecard_analysis_base` (
  `scorecard_result_id` bigint PRIMARY KEY,
  `scorecard_id` bigint NOT NULL,
  `scorecard_code` varchar(40) NOT NULL,
  `scorecard_name` varchar(200) NOT NULL,
  `monitoring_period_id` bigint NOT NULL,
  `period_label` varchar(100) NOT NULL,
  `period_start` date NOT NULL,
  `period_end` date NOT NULL,
  `department_count` integer NOT NULL,
  `department_names` text,
  `final_score_percent` numeric(7,4) NOT NULL,
  `own_kpi_contribution_percent` numeric(7,4) NOT NULL,
  `linked_scorecard_contribution_percent` numeric(7,4) NOT NULL,
  `kpi_count` integer NOT NULL,
  `linked_scorecard_count` integer NOT NULL,
  `green_kpi_count` integer NOT NULL,
  `yellow_kpi_count` integer NOT NULL,
  `red_kpi_count` integer NOT NULL,
  `missing_kpi_count` integer NOT NULL,
  `result_status_code` varchar(40) NOT NULL,
  `closed_at` timestamptz NOT NULL,
  `previous_period_id` bigint,
  `previous_period_label` varchar(100),
  `previous_score_percent` numeric(7,4),
  `difference_vs_previous_percent` numeric(9,4),
  `same_period_last_year_id` bigint,
  `same_period_last_year_label` varchar(100),
  `same_period_last_year_score_percent` numeric(7,4),
  `difference_vs_last_year_percent` numeric(9,4),
  `trend_code` varchar(20)
);

-- CREATE UNIQUE INDEX `uq_departments_company_code` ON `departments` (`company_id`, `code`);

-- CREATE INDEX `ix_departments_parent` ON `departments` (`parent_department_id`);

-- CREATE UNIQUE INDEX `uq_employee_department_assignment` ON `employee_assignments` (`employee_id`, `department_id`, `valid_from`);

-- CREATE INDEX `ix_employee_assignments_company` ON `employee_assignments` (`company_id`);

-- CREATE INDEX `ix_employee_assignments_department` ON `employee_assignments` (`department_id`);

-- CREATE UNIQUE INDEX `uq_users_employee` ON `users` (`employee_id`);

-- CREATE INDEX `ix_users_is_active` ON `users` (`is_active`);

-- CREATE INDEX `ix_data_sources_source_type` ON `data_sources` (`source_type`);

-- CREATE INDEX `ix_kpi_definitions_category` ON `kpi_definitions` (`kpi_category_id`);

-- CREATE INDEX `ix_kpi_definitions_status` ON `kpi_definitions` (`status_code`);

-- CREATE INDEX `ix_kpi_configurations_definition` ON `kpi_configurations` (`kpi_definition_id`);

-- CREATE INDEX `ix_kpi_configurations_measurement_unit` ON `kpi_configurations` (`measurement_unit_id`);

-- CREATE INDEX `ix_kpi_configurations_input_frequency` ON `kpi_configurations` (`input_frequency_id`);

-- CREATE INDEX `ix_kpi_configurations_primary_source` ON `kpi_configurations` (`primary_data_source_id`);

-- CREATE INDEX `ix_kpi_configurations_evaluation_type` ON `kpi_configurations` (`evaluation_type_id`);

-- CREATE INDEX `ix_kpi_configurations_status` ON `kpi_configurations` (`kpi_configuration_status_id`);

-- CREATE UNIQUE INDEX `uq_kpi_configuration_definition_pair` ON `kpi_configurations` (`kpi_configuration_id`, `kpi_definition_id`);

-- CREATE UNIQUE INDEX `uq_kpi_configuration_threshold_level` ON `kpi_configuration_thresholds` (`kpi_configuration_id`, `traffic_light_level_id`);

-- CREATE UNIQUE INDEX `uq_kpi_configuration_threshold_order` ON `kpi_configuration_thresholds` (`kpi_configuration_id`, `display_order`);

-- CREATE INDEX `ix_kpi_thresholds_traffic_light_level` ON `kpi_configuration_thresholds` (`traffic_light_level_id`);

-- CREATE INDEX `ix_kpi_pools_input_frequency` ON `kpi_pools` (`input_frequency_id`);

-- CREATE INDEX `ix_kpi_pools_status` ON `kpi_pools` (`status_code`);

-- CREATE INDEX `ix_kpi_pools_validity` ON `kpi_pools` (`valid_from`, `valid_to`);

-- CREATE UNIQUE INDEX `uq_kpi_pool_frequency_pair` ON `kpi_pools` (`kpi_pool_id`, `input_frequency_id`);

-- CREATE UNIQUE INDEX `uq_kpi_pool_company` ON `kpi_pool_companies` (`kpi_pool_id`, `company_id`);

-- CREATE INDEX `ix_kpi_pool_companies_company` ON `kpi_pool_companies` (`company_id`);

-- CREATE UNIQUE INDEX `uq_kpi_pool_configuration` ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_configuration_id`);

-- CREATE UNIQUE INDEX `uq_kpi_pool_definition` ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_definition_id`);

-- CREATE UNIQUE INDEX `uq_kpi_pool_display_order` ON `kpi_pool_kpis` (`kpi_pool_id`, `display_order`);

-- CREATE INDEX `ix_kpi_pool_kpis_configuration` ON `kpi_pool_kpis` (`kpi_configuration_id`);

-- CREATE INDEX `ix_kpi_pool_kpis_definition` ON `kpi_pool_kpis` (`kpi_definition_id`);

-- CREATE UNIQUE INDEX `uq_pool_configuration_availability` ON `kpi_pool_configuration_availability` (`kpi_pool_id`, `kpi_configuration_id`);

-- CREATE INDEX `ix_pool_configuration_availability_status` ON `kpi_pool_configuration_availability` (`kpi_pool_availability_status_id`);

-- CREATE INDEX `ix_scorecards_kpi_pool` ON `scorecards` (`kpi_pool_id`);

-- CREATE INDEX `ix_scorecards_input_frequency` ON `scorecards` (`input_frequency_id`);

-- CREATE INDEX `ix_scorecards_status` ON `scorecards` (`scorecard_status_id`);

-- CREATE INDEX `ix_scorecards_validity` ON `scorecards` (`valid_from`, `valid_to`);

-- CREATE INDEX `ix_scorecards_pool_frequency` ON `scorecards` (`kpi_pool_id`, `input_frequency_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_department` ON `scorecard_departments` (`scorecard_id`, `department_id`);

-- CREATE INDEX `ix_scorecard_departments_department` ON `scorecard_departments` (`department_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_department_employee` ON `scorecard_employees` (`scorecard_department_id`, `employee_id`);

-- CREATE INDEX `ix_scorecard_employees_employee` ON `scorecard_employees` (`employee_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_pool_kpi` ON `scorecard_kpis` (`scorecard_id`, `kpi_pool_kpi_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_kpi_display_order` ON `scorecard_kpis` (`scorecard_id`, `display_order`);

-- CREATE INDEX `ix_scorecard_kpis_pool_kpi` ON `scorecard_kpis` (`kpi_pool_kpi_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_linked_scorecard` ON `scorecard_linked_scorecards` (`scorecard_id`, `linked_scorecard_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_link_display_order` ON `scorecard_linked_scorecards` (`scorecard_id`, `display_order`);

-- CREATE INDEX `ix_scorecard_links_linked_scorecard` ON `scorecard_linked_scorecards` (`linked_scorecard_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_kpi_availability` ON `scorecard_kpi_availability` (`scorecard_id`, `kpi_pool_kpi_id`);

-- CREATE INDEX `ix_scorecard_kpi_availability_status` ON `scorecard_kpi_availability` (`scorecard_kpi_availability_status_id`);

-- CREATE UNIQUE INDEX `uq_scorecard_schedule_preview` ON `scorecard_result_schedule_preview` (`scorecard_id`, `sequence_no`);

CREATE UNIQUE INDEX `uq_scorecard_schedule_period_start` ON `scorecard_result_schedule_preview` (`scorecard_id`, `period_start`);

CREATE UNIQUE INDEX `uq_monitoring_period_pool_sequence` ON `monitoring_periods` (`kpi_pool_id`, `sequence_no`);

CREATE UNIQUE INDEX `uq_monitoring_period_pool_dates` ON `monitoring_periods` (`kpi_pool_id`, `period_start`, `period_end`);

CREATE UNIQUE INDEX `uq_monitoring_period_previous` ON `monitoring_periods` (`previous_monitoring_period_id`);

CREATE INDEX `ix_monitoring_periods_status` ON `monitoring_periods` (`monitoring_period_status_id`);

CREATE INDEX `ix_monitoring_periods_input_method` ON `monitoring_periods` (`monitoring_input_method_id`);

CREATE INDEX `ix_monitoring_periods_dates` ON `monitoring_periods` (`period_start`, `period_end`);

CREATE UNIQUE INDEX `uq_monitoring_period_method_pair` ON `monitoring_periods` (`monitoring_period_id`, `monitoring_input_method_id`);

CREATE UNIQUE INDEX `uq_monitoring_period_scorecard` ON `monitoring_period_scorecards` (`monitoring_period_id`, `scorecard_id`);

CREATE INDEX `ix_monitoring_period_scorecards_scorecard` ON `monitoring_period_scorecards` (`scorecard_id`);

CREATE UNIQUE INDEX `uq_monitoring_period_pool_kpi_input` ON `monitoring_period_inputs` (`monitoring_period_id`, `kpi_pool_kpi_id`);

CREATE UNIQUE INDEX `uq_monitoring_period_input_order` ON `monitoring_period_inputs` (`monitoring_period_id`, `display_order`);

CREATE INDEX `ix_monitoring_period_inputs_pool_kpi` ON `monitoring_period_inputs` (`kpi_pool_kpi_id`);

CREATE INDEX `ix_monitoring_period_inputs_measurement_unit` ON `monitoring_period_inputs` (`measurement_unit_id`);

CREATE INDEX `ix_monitoring_period_inputs_evaluation_type` ON `monitoring_period_inputs` (`evaluation_type_id`);

CREATE INDEX `ix_monitoring_period_inputs_data_source` ON `monitoring_period_inputs` (`primary_data_source_id`);

CREATE INDEX `ix_monitoring_period_inputs_sensitive` ON `monitoring_period_inputs` (`monitoring_period_id`, `is_sensitive`);

CREATE UNIQUE INDEX `uq_period_input_scorecard_consumer` ON `monitoring_period_input_consumers` (`monitoring_period_input_id`, `monitoring_period_scorecard_id`);

CREATE INDEX `ix_period_input_consumers_scorecard_kpi` ON `monitoring_period_input_consumers` (`scorecard_kpi_id`);

CREATE INDEX `ix_period_input_consumers_period_scorecard` ON `monitoring_period_input_consumers` (`monitoring_period_scorecard_id`);

CREATE UNIQUE INDEX `uq_period_input_threshold_level` ON `monitoring_period_input_thresholds` (`monitoring_period_input_id`, `traffic_light_level_id`);

CREATE UNIQUE INDEX `uq_period_input_threshold_order` ON `monitoring_period_input_thresholds` (`monitoring_period_input_id`, `display_order`);

CREATE UNIQUE INDEX `uq_period_scorecard_linked_scorecard` ON `monitoring_period_scorecard_links` (`monitoring_period_scorecard_id`, `linked_scorecard_id`);

CREATE INDEX `ix_period_scorecard_links_original_link` ON `monitoring_period_scorecard_links` (`scorecard_linked_scorecard_id`);

CREATE INDEX `ix_period_scorecard_links_linked_scorecard` ON `monitoring_period_scorecard_links` (`linked_scorecard_id`);

CREATE INDEX `ix_monitoring_templates_generated_by` ON `monitoring_period_templates` (`generated_by_user_id`);

CREATE UNIQUE INDEX `uq_result_entry_period_batch_no` ON `result_entry_batches` (`monitoring_period_id`, `batch_no`);

CREATE INDEX `ix_result_entry_batches_status` ON `result_entry_batches` (`result_entry_batch_status_id`);

CREATE INDEX `ix_result_entry_batches_template` ON `result_entry_batches` (`monitoring_period_template_id`);

CREATE INDEX `ix_result_entry_batches_submitted_by` ON `result_entry_batches` (`submitted_by_user_id`);

CREATE INDEX `ix_result_entry_batches_period_created` ON `result_entry_batches` (`monitoring_period_id`, `created_at`);

CREATE UNIQUE INDEX `uq_result_entry_batch_period_input` ON `result_entry_batch_rows` (`result_entry_batch_id`, `monitoring_period_input_id`);

CREATE UNIQUE INDEX `uq_result_entry_batch_source_row` ON `result_entry_batch_rows` (`result_entry_batch_id`, `source_row_number`);

CREATE INDEX `ix_result_entry_batch_rows_status` ON `result_entry_batch_rows` (`result_entry_row_status_id`);

CREATE INDEX `ix_result_entry_batch_rows_period_input` ON `result_entry_batch_rows` (`monitoring_period_input_id`);

CREATE INDEX `ix_kpi_results_latest_batch_row` ON `kpi_results` (`latest_result_entry_batch_row_id`);

CREATE INDEX `ix_kpi_results_traffic_light` ON `kpi_results` (`traffic_light_level_id`);

CREATE INDEX `ix_kpi_results_status` ON `kpi_results` (`kpi_result_status_id`);

CREATE INDEX `ix_kpi_results_entered_by` ON `kpi_results` (`entered_by_user_id`);

CREATE UNIQUE INDEX `uq_kpi_result_revision_no` ON `kpi_result_revisions` (`kpi_result_id`, `revision_no`);

CREATE INDEX `ix_kpi_result_revisions_batch_row` ON `kpi_result_revisions` (`result_entry_batch_row_id`);

CREATE INDEX `ix_kpi_result_revisions_changed_by` ON `kpi_result_revisions` (`changed_by_user_id`);

CREATE UNIQUE INDEX `uq_validation_period_run_no` ON `validation_runs` (`monitoring_period_id`, `run_no`);

CREATE INDEX `ix_validation_runs_status` ON `validation_runs` (`validation_status_id`);

CREATE INDEX `ix_validation_runs_trigger_batch` ON `validation_runs` (`trigger_result_entry_batch_id`);

CREATE INDEX `ix_validation_runs_executed_by` ON `validation_runs` (`executed_by_user_id`);

CREATE INDEX `ix_validation_runs_period_started` ON `validation_runs` (`monitoring_period_id`, `started_at`);

CREATE INDEX `ix_validation_issues_severity` ON `validation_issues` (`validation_issue_severity_id`);

CREATE INDEX `ix_validation_issues_period_input` ON `validation_issues` (`monitoring_period_input_id`);

CREATE INDEX `ix_validation_issues_batch_row` ON `validation_issues` (`result_entry_batch_row_id`);

CREATE INDEX `ix_validation_issues_kpi_result` ON `validation_issues` (`kpi_result_id`);

CREATE INDEX `ix_validation_issues_run_code` ON `validation_issues` (`validation_run_id`, `issue_code`);

CREATE INDEX `ix_validation_issues_run_resolved` ON `validation_issues` (`validation_run_id`, `is_resolved`);

CREATE INDEX `ix_period_status_history_period_changed` ON `monitoring_period_status_history` (`monitoring_period_id`, `changed_at`);

CREATE INDEX `ix_period_status_history_from` ON `monitoring_period_status_history` (`from_monitoring_period_status_id`);

CREATE INDEX `ix_period_status_history_to` ON `monitoring_period_status_history` (`to_monitoring_period_status_id`);

CREATE INDEX `ix_period_status_history_changed_by` ON `monitoring_period_status_history` (`changed_by_user_id`);

CREATE UNIQUE INDEX `uq_period_closure_no` ON `period_closures` (`monitoring_period_id`, `closure_no`);

CREATE INDEX `ix_period_closures_validation_run` ON `period_closures` (`validation_run_id`);

CREATE INDEX `ix_period_closures_type` ON `period_closures` (`period_closure_type_id`);

CREATE INDEX `ix_period_closures_closed_by` ON `period_closures` (`closed_by_user_id`);

CREATE INDEX `ix_period_closures_period_closed` ON `period_closures` (`monitoring_period_id`, `closed_at`);

CREATE INDEX `ix_period_reopenings_closure` ON `period_reopenings` (`period_closure_id`);

CREATE INDEX `ix_period_reopenings_status` ON `period_reopenings` (`period_reopening_status_id`);

CREATE INDEX `ix_period_reopenings_requested_by` ON `period_reopenings` (`requested_by_user_id`);

CREATE INDEX `ix_period_reopenings_decided_by` ON `period_reopenings` (`decided_by_user_id`);

CREATE INDEX `ix_period_reopenings_period_requested` ON `period_reopenings` (`monitoring_period_id`, `requested_at`);

CREATE UNIQUE INDEX `uq_closure_period_scorecard_result` ON `scorecard_results` (`period_closure_id`, `monitoring_period_scorecard_id`);

CREATE INDEX `ix_scorecard_results_scorecard` ON `scorecard_results` (`scorecard_id`);

CREATE INDEX `ix_scorecard_results_scorecard_calculated` ON `scorecard_results` (`scorecard_id`, `calculated_at`);

CREATE UNIQUE INDEX `uq_scorecard_result_kpi_consumer` ON `scorecard_kpi_result_items` (`scorecard_result_id`, `monitoring_period_input_consumer_id`);

CREATE INDEX `ix_scorecard_kpi_items_kpi_result` ON `scorecard_kpi_result_items` (`kpi_result_id`);

CREATE UNIQUE INDEX `uq_scorecard_result_link_item` ON `scorecard_link_result_items` (`scorecard_result_id`, `monitoring_period_scorecard_link_id`);

CREATE INDEX `ix_scorecard_link_items_linked_result` ON `scorecard_link_result_items` (`linked_scorecard_result_id`);

CREATE INDEX `ix_scorecard_link_items_resolution` ON `scorecard_link_result_items` (`resolution_code`);

CREATE INDEX `ix_roles_is_active` ON `roles` (`is_active`);

CREATE INDEX `ix_permissions_module` ON `permissions` (`module_code`);

CREATE INDEX `ix_permissions_is_active` ON `permissions` (`is_active`);

CREATE UNIQUE INDEX `uq_user_role` ON `user_roles` (`user_id`, `role_id`);

CREATE INDEX `ix_user_roles_role` ON `user_roles` (`role_id`);

CREATE INDEX `ix_user_roles_assigned_by` ON `user_roles` (`assigned_by_user_id`);

CREATE UNIQUE INDEX `uq_role_permission` ON `role_permissions` (`role_id`, `permission_id`);

CREATE INDEX `ix_role_permissions_permission` ON `role_permissions` (`permission_id`);

CREATE INDEX `ix_role_permissions_assigned_by` ON `role_permissions` (`assigned_by_user_id`);

CREATE UNIQUE INDEX `uq_user_access_scope` ON `user_access_scopes` (`user_id`, `company_id`, `department_id`);

CREATE INDEX `ix_user_access_scopes_company` ON `user_access_scopes` (`company_id`);

CREATE INDEX `ix_user_access_scopes_department` ON `user_access_scopes` (`department_id`);

CREATE INDEX `ix_user_access_scopes_created_by` ON `user_access_scopes` (`created_by_user_id`);

CREATE UNIQUE INDEX `uq_period_scorecard_department` ON `monitoring_period_scorecard_departments` (`monitoring_period_scorecard_id`, `department_id`);

CREATE INDEX `ix_period_sc_departments_original_assignment` ON `monitoring_period_scorecard_departments` (`scorecard_department_id`);

CREATE INDEX `ix_period_sc_departments_department` ON `monitoring_period_scorecard_departments` (`department_id`);

CREATE UNIQUE INDEX `uq_period_scorecard_department_employee` ON `monitoring_period_scorecard_employees` (`monitoring_period_scorecard_department_id`, `employee_id`);

CREATE INDEX `ix_period_sc_employees_original_assignment` ON `monitoring_period_scorecard_employees` (`scorecard_employee_id`);

CREATE INDEX `ix_period_sc_employees_employee` ON `monitoring_period_scorecard_employees` (`employee_id`);

ALTER TABLE `companies` COMMENT = 'Stores the companies that belong to the EXA Group.
Examples: EXA, CONMOXA.
';

ALTER TABLE `departments` COMMENT = 'Stores departments and organizational subdivisions.

parent_department_id allows structures such as:

Operations
  ├── Transportation
  ├── Interchange
  └── Maintenance and Repair
';

ALTER TABLE `employees` COMMENT = 'Stores the general identity of an employee.

The current department is not stored directly here because
an employee may move between departments over time.
';

ALTER TABLE `employee_assignments` COMMENT = 'Stores the employee''s department history.

Example:
2025-01-01 to 2026-04-30 -> IT Support
2026-05-01 to NULL       -> Software Development
';

ALTER TABLE `users` COMMENT = 'Stores application user accounts.

employee_id is optional because some technical or administrative
accounts may not belong to an employee.

One employee may have at most one application user account.
';

ALTER TABLE `kpi_categories` COMMENT = 'Categories used to classify KPI definitions.

Examples:
FINANCIAL
OPERATIONS
PRODUCTIVITY
TECHNOLOGY
SECURITY
SALES
MAINTENANCE
';

ALTER TABLE `measurement_units` COMMENT = 'Units used to express KPI goals and results.

Examples:
PERCENT
HNL
USD
KILOMETER
GALLON
HOUR
DAY
CONTAINER
GENSET
UNIT
';

ALTER TABLE `input_frequencies` COMMENT = 'Defines how frequently KPI results are generated and evaluated.

Suggested values:

MONTHLY
  months_per_period = 1
  periods_per_year = 12

QUARTERLY
  months_per_period = 3
  periods_per_year = 4

FOUR_MONTHLY
  months_per_period = 4
  periods_per_year = 3

SEMIANNUAL
  months_per_period = 6
  periods_per_year = 2

ANNUAL
  months_per_period = 12
  periods_per_year = 1
';

ALTER TABLE `traffic_light_levels` COMMENT = 'Defines the traffic-light levels used to classify KPI compliance.

This table defines the meaning and visual identity of each level.
It does not define the percentage ranges for each KPI.

Suggested values:
GREEN
YELLOW
RED
';

ALTER TABLE `data_sources` COMMENT = 'Defines where KPI results may originate.

Examples:
EMS
SAP
GPS
EMS_DEPOT
EXCEL_IMPORT
MANUAL
API

Credentials and passwords must not be stored here.
';

ALTER TABLE `kpi_definitions` COMMENT = 'Stores the conceptual definition of a KPI.

It answers:
What is measured?
Why is it measured?
To which category does it belong?

It does not store:
target value
measurement unit
frequency
traffic-light ranges
results
score
';

ALTER TABLE `kpi_configurations` COMMENT = 'Stores a measurable configuration derived from a KPI Definition.

Example:

KPI-050
  KPC-050-01
  KPC-050-02
  KPC-050-03

Configurations do not contain validity dates.
Validity is controlled by KPI Pools and ScoreCards.
';

ALTER TABLE `kpi_configuration_thresholds` COMMENT = 'Defines the RED, YELLOW and GREEN compliance ranges
belonging to a dated KPI configuration.
';

ALTER TABLE `kpi_configuration_statuses` COMMENT = 'Defines the lifecycle status of a KPI Configuration.

Suggested values:

1  Not Configured: Configuration is incomplete.

2  Configured: Configuration is complete and available for KPI Pools.

3  Retired: Configuration is unavailable for new Pools but retained for history.
';

ALTER TABLE `evaluation_types` COMMENT = 'Defines how a KPI result is compared against its target.

Suggested values:

GREATER_IS_BETTER
LOWER_IS_BETTER
EXACT_VALUE
WITHIN_RANGE
';

-- ALTER TABLE `kpi_pools` COMMENT = 'Stores the main KPI Pool information.

-- A Pool:
-- - Has a validity period.
-- - Applies to one or more companies.
-- - Contains selected KPI Configurations.
-- - May be used by ScoreCards and Monitoring Results.

-- It does not use explicit versions.
-- ';

-- ALTER TABLE `kpi_pool_companies` COMMENT = 'Associates companies with a KPI Pool.

-- Example:

-- POOL-001
--   - EXA
--   - CONMOXA

-- is_primary may be removed if the business does not need
-- to identify a primary company.
-- ';

-- ALTER TABLE `kpi_pool_kpis` COMMENT = 'Stores only KPI Configurations already added to the Pool.

-- The unique index on:

-- kpi_pool_id + kpi_definition_id

-- prevents adding two configurations that originate from
-- the same KPI Definition.

-- Example not allowed:

-- POOL-001
--   KPC-050-01
--   KPC-050-02

-- Both originate from KPI-050.
-- ';

-- ALTER TABLE `kpi_pool_availability_statuses` COMMENT = 'Suggested values:

-- AVAILABLE_TO_ADD
-- ALREADY_IN_POOL
-- NOT_AVAILABLE

-- These values describe a KPI Configuration relative
-- to a specific KPI Pool.
-- ';

-- ALTER TABLE `kpi_pool_configuration_availability` COMMENT = 'LOGICAL DATABASE VIEW — not a transactional table.

-- This view calculates whether a KPI Configuration is:

-- AVAILABLE_TO_ADD
-- ALREADY_IN_POOL
-- NOT_AVAILABLE

-- availability_reason_code examples:

-- NOT_CONFIGURED
-- KPI_DEFINITION_ALREADY_IN_POOL
-- FREQUENCY_MISMATCH
-- POOL_NOT_CONFIGURED
-- POOL_INACTIVE
-- POOL_OUTSIDE_VALIDITY

-- Do not store checkbox selection here.
-- SELECTED / NOT_SELECTED belongs only to the frontend.
-- ';

ALTER TABLE `scorecard_statuses` COMMENT = 'Suggested values:

NOT_CONFIGURED
CONFIGURED
INACTIVE

NOT_CONFIGURED:
General information or composition is incomplete.

CONFIGURED:
The ScoreCard has valid departments, schedule and
a total composition weight of exactly 100%.

INACTIVE:
The ScoreCard cannot be used for new operations,
but historical results remain available.
';

ALTER TABLE `scorecards` COMMENT = 'The ScoreCard stores its effective result frequency.

Its input_frequency_id must match the input frequency
of the selected KPI Pool.

The frequency is used together with valid_from and
valid_to to generate Expected Inputs.
';

ALTER TABLE `scorecard_departments` COMMENT = 'Stores the departments selected for a ScoreCard.

A department may only be selected when its company
belongs to the source KPI Pool.

Example:

Pool companies:
  EXA
  CONMOXA

The ScoreCard may only select departments belonging
to EXA or CONMOXA.
';

ALTER TABLE `scorecard_employees` COMMENT = 'Stores the collaborators assigned to a ScoreCard.

Employees are selected from departments that already
belong to the ScoreCard.

The system must validate that the employee belongs to
the selected department when the assignment is created.
';

ALTER TABLE `scorecard_kpis` COMMENT = 'Stores the ScoreCard''s own KPI components.

A KPI may only be selected when it exists in the source
KPI Pool through kpi_pool_kpis.

The table references kpi_pool_kpis instead of referencing
kpi_configurations directly. This preserves the rule that
the ScoreCard may only use KPIs from its selected Pool.

No parent-child KPI hierarchy is used.
';

ALTER TABLE `scorecard_linked_scorecards` COMMENT = 'Stores ScoreCards linked as components of another ScoreCard.

The only structural restriction is that a ScoreCard cannot
link directly to itself.

Circular relationships between different ScoreCards are
not blocked by this table.
';

ALTER TABLE `scorecard_kpi_availability_statuses` COMMENT = 'Suggested values:

AVAILABLE_TO_SELECT
SELECTED_IN_SCORECARD
NOT_AVAILABLE

These values describe a Pool KPI relative to a specific
ScoreCard.
';

ALTER TABLE `scorecard_kpi_availability` COMMENT = 'LOGICAL DATABASE VIEW OR API READ MODEL.

This is not a manually maintained transactional table.

It is used by the Select KPIs from Pool screen to classify
each KPI belonging to the ScoreCard''s source Pool as:

AVAILABLE_TO_SELECT
SELECTED_IN_SCORECARD
NOT_AVAILABLE

Possible availability_reason_code values:

CONFIGURATION_NOT_CONFIGURED
CONFIGURATION_RETIRED
SCORECARD_INACTIVE
POOL_KPI_NOT_AVAILABLE

SELECTED / NOT_SELECTED checkbox state belongs only
to the frontend and is not stored here.
';

ALTER TABLE `scorecard_composition_summary` COMMENT = 'LOGICAL DATABASE VIEW OR API READ MODEL.

Supports the ScoreCard Assignment progress bar and the
Composition Breakdown shown in ScoreCard Detail.

composition_status_code is calculated as:

INCOMPLETE:
  total_weight_percent < 100

COMPLETE:
  total_weight_percent = 100

OVERWEIGHT:
  total_weight_percent > 100

Example:

Own KPI Weight:              70%
Linked ScoreCard Weight:     30%
Total Composition:          100%
Composition Status:     COMPLETE
';

ALTER TABLE `scorecard_result_schedule_preview` COMMENT = 'LOGICAL DATABASE VIEW OR API READ MODEL.

Generates the ScoreCard Result Schedule preview using:

scorecards.valid_from
scorecards.valid_to
scorecards.input_frequency_id

Example:

Validity:
  January 2026 to June 2026

Frequency:
  MONTHLY

Generated rows:

  1 | 2026-01-01 | 2026-01-31 | Jan 2026
  2 | 2026-02-01 | 2026-02-28 | Feb 2026
  3 | 2026-03-01 | 2026-03-31 | Mar 2026
  4 | 2026-04-01 | 2026-04-30 | Apr 2026
  5 | 2026-05-01 | 2026-05-31 | May 2026
  6 | 2026-06-01 | 2026-06-30 | Jun 2026

Expected Inputs is calculated as the number of generated rows.

The actual monitoring periods will be stored later in the
Monitoring Results module.
';

ALTER TABLE `monitoring_period_statuses` COMMENT = 'Suggested values:

SCHEDULED
ACTIVE
CONTINUE_ENTRY
SUBMITTED
VALIDATED
CLOSED
CLOSED_WITH_EXCEPTIONS

A future period remains SCHEDULED until its previous period reaches
CLOSED or CLOSED_WITH_EXCEPTIONS.
';

ALTER TABLE `monitoring_input_methods` COMMENT = 'Suggested values:

MANUAL
EXCEL_TEMPLATE

Once the first result is saved, the period is locked to the selected
method. Changing the method requires deleting all draft results first.
';

ALTER TABLE `result_entry_batch_statuses` COMMENT = 'Suggested values:

DRAFT
UPLOADED
PROCESSING
ACCEPTED
PARTIAL
REJECTED
CANCELLED
';

ALTER TABLE `result_entry_row_statuses` COMMENT = 'Suggested values:

PENDING
VALID
WARNING
ERROR
APPLIED
REJECTED
';

ALTER TABLE `kpi_result_statuses` COMMENT = 'Suggested values:

ENTERED
VALID
WARNING
INVALID
CLOSED
';

ALTER TABLE `validation_statuses` COMMENT = 'Suggested values:

PENDING_VALIDATION
NO_ERRORS
WITH_WARNINGS
WITH_ERRORS
VALIDATED_WITH_EXCEPTIONS
';

ALTER TABLE `validation_issue_severities` COMMENT = 'Suggested values:

INFO
WARNING
ERROR
CRITICAL
';

ALTER TABLE `period_closure_types` COMMENT = 'Suggested values:

NORMAL
WITH_EXCEPTIONS
';

ALTER TABLE `period_reopening_statuses` COMMENT = 'Suggested values:

REQUESTED
APPROVED
REJECTED
COMPLETED
CANCELLED
';

ALTER TABLE `monitoring_periods` COMMENT = 'One row represents one Pool input period.

The current status and selected input method are stored here.
The rule that the next period cannot be opened until the previous one
is closed must be enforced transactionally by the service.
';

ALTER TABLE `monitoring_period_scorecards` COMMENT = 'Snapshot of ScoreCards affected by this Pool period.

Only ScoreCards valid for the period and consuming at least one KPI
from the Pool are inserted. Later ScoreCard edits do not change this
historical snapshot.
';

ALTER TABLE `monitoring_period_inputs` COMMENT = 'Distinct required KPI inputs for one Pool period.

A Pool may contain 50 KPIs, but this table only receives the union of
KPIs selected by ScoreCards valid for the period. If only 40 unique
KPIs are consumed, only 40 rows are generated.
';

ALTER TABLE `monitoring_period_input_consumers` COMMENT = 'Maps one shared Pool KPI input to every ScoreCard that consumes it.

The KPI result is entered once. Each ScoreCard later applies its own
weight_percent_snapshot to that same result.
';

ALTER TABLE `monitoring_period_input_thresholds` COMMENT = 'Snapshot of the traffic-light ranges used by the KPI input.
Future changes to KPI Configuration thresholds do not recalculate a
closed historical period.
';

ALTER TABLE `monitoring_period_scorecard_links` COMMENT = 'Snapshot of Linked ScoreCards and their weights.

Circular configuration links are allowed. During result calculation,
every linked contribution must be resolved to a concrete closed
scorecard_result. If a same-period cycle cannot be resolved, the
service uses the latest available closed result or requires an
exception according to resolution_policy_code.
';

ALTER TABLE `monitoring_period_templates` COMMENT = 'Stores the Excel template generated for one Monitoring Period.

Only one template is maintained per period. If the user downloads it
again, the system returns the same current template or regenerates and
updates this row before any results are entered.

The sheet must protect all informational columns and leave only Result
and Comment editable.

During upload, the backend validates the required column names, the
expected KPI Config Codes and the expected number of rows. Tokens,
hashes and one database row per Excel row are intentionally omitted.
';

ALTER TABLE `result_entry_batches` COMMENT = 'One save operation or one Excel upload.

MANUAL batches do not contain uploaded file metadata.

EXCEL_TEMPLATE batches reference the generated template and store the
uploaded Excel file name, storage location, MIME type and size directly
in this table. This avoids a separate generic files table.

The service validates that Excel batches contain file metadata and that
Manual batches do not.
';

ALTER TABLE `result_entry_batch_rows` COMMENT = 'Stores each result received through Manual Entry or Excel.

For Excel uploads, the backend matches each Config Code from the file
against monitoring_period_inputs and stores the resolved
monitoring_period_input_id.

The system validates required columns, duplicated Config Codes, missing
expected KPIs and numeric Result values without using row tokens,
per-row hashes or a separate template-row table.
';

ALTER TABLE `kpi_results` COMMENT = 'Current authoritative result for one required KPI input.

One monitoring_period_input has at most one current row. Every change
is copied to kpi_result_revisions before/after the update. Closed
periods must reject all updates.
';

ALTER TABLE `kpi_result_revisions` COMMENT = 'Full immutable revision history of a KPI result while the period is
open. It also supports auditing corrections after an Excel re-upload.
';

ALTER TABLE `validation_runs` COMMENT = 'One complete validation execution for a Pool period.
';

ALTER TABLE `validation_issues` COMMENT = 'Stores structural errors, missing results, invalid formats, warnings and
critical errors found by one validation run.

All three optional target references may be NULL for a period-level
issue, such as an invalid template structure.
';

ALTER TABLE `monitoring_period_status_history` COMMENT = 'Immutable audit trail for every period state transition.
';

ALTER TABLE `period_closures` COMMENT = 'Formal close event.

Service rules:
- NORMAL requires zero missing results and zero blocking errors.
- WITH_EXCEPTIONS requires a non-empty justification and permission.
- The period must already be VALIDATED.
- Closing creates immutable ScoreCard results in the same transaction.
';

ALTER TABLE `period_reopenings` COMMENT = 'Optional controlled reopening workflow. Closed periods remain read-only
unless an approved reopening changes the period back to an editable
state and records the transition in status history.
';

ALTER TABLE `scorecard_results` COMMENT = 'Final frozen ScoreCard result generated when the Pool period closes.

Reclosing after an approved reopening creates a new closure and a new
result set; previous closure results remain historical.
';

ALTER TABLE `scorecard_kpi_result_items` COMMENT = 'Frozen contribution of one own KPI to one ScoreCard result.
';

ALTER TABLE `scorecard_link_result_items` COMMENT = 'Frozen contribution of one Linked ScoreCard.

linked_scorecard_result_id identifies the exact closed result used,
preventing an endless recursive lookup even when ScoreCard links are
circular.
';

ALTER TABLE `roles` COMMENT = 'Defines the general profiles assigned to application users.

Suggested values:

ADMIN
KPI_MANAGER
DEPARTMENT_MANAGER
ANALYST
VIEWER
';

ALTER TABLE `permissions` COMMENT = 'Defines individual actions that may be assigned to roles.

Suggested permission codes:

KPI_DEFINITION_VIEW
KPI_DEFINITION_MANAGE

KPI_POOL_VIEW
KPI_POOL_MANAGE

SCORECARD_VIEW
SCORECARD_MANAGE

MONITORING_VIEW
MONITORING_ENTER_RESULTS
MONITORING_VALIDATE_RESULTS
MONITORING_CLOSE_PERIOD
MONITORING_CLOSE_WITH_EXCEPTIONS

REPORTS_VIEW
RAW_RESULTS_VIEW

USERS_MANAGE
ROLES_MANAGE

Suggested module_code values:

KPI_MANAGEMENT
KPI_POOL
SCORECARD
MONITORING
REPORTS
SECURITY
';

ALTER TABLE `user_roles` COMMENT = 'Associates users with roles.

A user may have more than one role.

Example:

Carlos
  - DEPARTMENT_MANAGER
  - ANALYST
';

ALTER TABLE `role_permissions` COMMENT = 'Associates roles with permissions.

Example:

DEPARTMENT_MANAGER
  - SCORECARD_VIEW
  - MONITORING_VIEW
  - MONITORING_ENTER_RESULTS
  - REPORTS_VIEW
';

ALTER TABLE `user_access_scopes` COMMENT = 'Defines where a user may apply their permissions.

department_id = NULL:
  The user has access to the entire company.

department_id has a value:
  The user has access only to that department.

Examples:

User A:
  company_id = EXA
  department_id = Transportation

User B:
  company_id = EXA
  department_id = NULL

The application must validate that the selected department belongs
to the selected company.

ADMIN may bypass scope restrictions according to the application rule.
';

ALTER TABLE `monitoring_period_scorecard_departments` COMMENT = 'Physical snapshot generated together with monitoring_period_scorecards.

It preserves the departments assigned to a ScoreCard for that exact
monitoring period. Later changes to scorecard_departments do not modify
historical Reports.
';

ALTER TABLE `monitoring_period_scorecard_employees` COMMENT = 'Physical snapshot of the collaborators assigned to a ScoreCard
department for one monitoring period.

It supports the ScoreCard Scope Summary and View Collaborators screens
without depending on the ScoreCard''s current assignment.
';

ALTER TABLE `vw_latest_scorecard_results` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

Returns only the latest closed ScoreCard result for each ScoreCard.
It powers:
  - ScoreCards Found
  - Average Score
  - Best Performer
  - Lowest Performer
  - Latest result cards
  - Traffic-light counts
  - View History / View Details navigation

Department, status and period filters are query parameters. They are
not stored in a Reports table.

Suggested SQL selection:
  ROW_NUMBER() OVER (
    PARTITION BY scorecard_id
    ORDER BY closed_at DESC, scorecard_result_id DESC
  ) = 1
';

ALTER TABLE `vw_scorecard_result_detail` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

Powers the upper section of Scorecard Result Detail:
  - Final Score Summary
  - Final Composition
  - ScoreCard duration
  - Result status
  - Input method
  - Linked ScoreCards count
  - KPIs used from Pool
  - Input frequency
  - Download submitted XLS when the method was EXCEL_TEMPLATE

submitted_file_* comes from the latest accepted Excel batch for the
monitoring period. It is NULL for MANUAL entry.
';

ALTER TABLE `vw_scorecard_result_departments` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

One row per historical department assigned to the ScoreCard result.
It powers the department chips shown in Scorecard Scope Summary.
';

ALTER TABLE `vw_scorecard_result_collaborators` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

One row per collaborator snapshotted for the ScoreCard result.
It is read-only and supports the View Collaborators action.
';

ALTER TABLE `vw_scorecard_result_kpis` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

Powers the KPIs Included tab:
  KPI Code
  KPI Name
  Weight
  Measurement Unit
  Data Source
  Goal
  Result
  Compliance Rate
  Score
  Weighted Value
  Traffic Light

Sensitive-data rule:
  The view may contain target_value and result_value, but the API must
  omit or mask those fields when the requesting user lacks raw-result
  permission. Hiding a column only in the frontend is not sufficient.
';

ALTER TABLE `vw_scorecard_result_links` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

Powers the Linked ScoreCards tab and shows the exact closed linked
result used by the calculation.

resolution_code explains whether the contribution came from:
  SAME_PERIOD
  LATEST_PRIOR_CLOSED
  EXCEPTION_ZERO
  MISSING

Circular ScoreCard relationships remain traceable because every row
references a concrete linked_scorecard_result_id when available.
';

ALTER TABLE `vw_scorecard_history_rows` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

One row per ScoreCard + closed period.

The History screen may pivot these rows into dynamic month columns.
Month columns such as Jan 2026, Feb 2026 and Mar 2026 are NOT physical
database columns because the selected period range changes.

trend_code is derived from the current result versus the immediately
previous closed result:
  IMPROVED
  STABLE
  DECLINED
  NO_COMPARISON
';

ALTER TABLE `vw_kpi_analysis_base` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

One row per KPI contribution used by one ScoreCard result and period.

Supports:
  - KPI Trend
  - KPI Benchmark across ScoreCards
  - Goal vs Result
  - Previous Period
  - Same Period Last Year
  - Summary cards
  - Line charts

Custom Period comparison is performed by self-joining this view using
the period selected by the user. Custom filters are not persisted.

A shared Pool KPI result may appear once for each consuming ScoreCard.
This is intentional because each ScoreCard may apply a different weight.

Sensitive result fields must be masked by the API when required.
';

ALTER TABLE `vw_scorecard_analysis_base` COMMENT = 'LOGICAL DATABASE VIEW / API READ MODEL.

Supports:
  - ScoreCard comparison table
  - Average Score
  - Best Performer
  - Lowest Performer
  - Trend vs Comparison
  - Current vs compared-period bar chart

Custom Period comparison is a self-join of this view using the
user-selected comparison period. Nothing is stored in Reports.
';

ALTER TABLE `scorecards` ADD CONSTRAINT `fk_scorecards_input_frequency` FOREIGN KEY (`input_frequency_id`) REFERENCES `input_frequencies` (`input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pools` ADD CONSTRAINT `fk_kpi_pools_frequency` FOREIGN KEY (`input_frequency_id`) REFERENCES `input_frequencies` (`input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_configuration_definition` FOREIGN KEY (`kpi_configuration_id`, `kpi_definition_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`, `kpi_definition_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecards` ADD CONSTRAINT `fk_scorecards_pool_frequency` FOREIGN KEY (`kpi_pool_id`, `input_frequency_id`) REFERENCES `kpi_pools` (`kpi_pool_id`, `input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecards` ADD CONSTRAINT `fk_scorecards_status` FOREIGN KEY (`scorecard_status_id`) REFERENCES `scorecard_statuses` (`scorecard_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_departments` ADD CONSTRAINT `fk_scorecard_departments_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_departments` ADD CONSTRAINT `fk_scorecard_departments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_employees` ADD CONSTRAINT `fk_scorecard_employees_department` FOREIGN KEY (`scorecard_department_id`) REFERENCES `scorecard_departments` (`scorecard_department_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_employees` ADD CONSTRAINT `fk_scorecard_employees_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpis` ADD CONSTRAINT `fk_scorecard_kpis_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpis` ADD CONSTRAINT `fk_scorecard_kpis_pool_kpi` FOREIGN KEY (`kpi_pool_kpi_id`) REFERENCES `kpi_pool_kpis` (`kpi_pool_kpi_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_linked_scorecards` ADD CONSTRAINT `fk_scorecard_links_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_linked_scorecards` ADD CONSTRAINT `fk_scorecard_links_linked_scorecard` FOREIGN KEY (`linked_scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpi_availability` ADD CONSTRAINT `fk_scorecard_kpi_availability_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE;

ALTER TABLE `scorecard_kpi_availability` ADD CONSTRAINT `fk_scorecard_kpi_availability_pool_kpi` FOREIGN KEY (`kpi_pool_kpi_id`) REFERENCES `kpi_pool_kpis` (`kpi_pool_kpi_id`) ON DELETE RESTRICT;

ALTER TABLE `scorecard_kpi_availability` ADD CONSTRAINT `fk_scorecard_kpi_availability_status` FOREIGN KEY (`scorecard_kpi_availability_status_id`) REFERENCES `scorecard_kpi_availability_statuses` (`scorecard_kpi_availability_status_id`) ON DELETE RESTRICT;

ALTER TABLE `scorecard_composition_summary` ADD CONSTRAINT `fk_scorecard_composition_summary_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE;

ALTER TABLE `scorecard_result_schedule_preview` ADD CONSTRAINT `fk_scorecard_schedule_preview_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE CASCADE;

ALTER TABLE `scorecard_statuses` ADD CONSTRAINT `fk_scorecard_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_statuses` ADD CONSTRAINT `fk_scorecard_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecards` ADD CONSTRAINT `fk_scorecards_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecards` ADD CONSTRAINT `fk_scorecards_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_departments` ADD CONSTRAINT `fk_scorecard_departments_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_departments` ADD CONSTRAINT `fk_scorecard_departments_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_employees` ADD CONSTRAINT `fk_scorecard_employees_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_employees` ADD CONSTRAINT `fk_scorecard_employees_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_kpis` ADD CONSTRAINT `fk_scorecard_kpis_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_kpis` ADD CONSTRAINT `fk_scorecard_kpis_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_linked_scorecards` ADD CONSTRAINT `fk_scorecard_links_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_linked_scorecards` ADD CONSTRAINT `fk_scorecard_links_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE;

-- ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON DELETE RESTRICT;

-- ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_configuration` FOREIGN KEY (`kpi_configuration_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`) ON DELETE RESTRICT;

-- ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_status` FOREIGN KEY (`kpi_pool_availability_status_id`) REFERENCES `kpi_pool_availability_statuses` (`kpi_pool_availability_status_id`) ON DELETE RESTRICT;

-- ALTER TABLE `kpi_definitions` ADD CONSTRAINT `fk_kpi_definitions_category` FOREIGN KEY (`kpi_category_id`) REFERENCES `kpi_categories` (`kpi_category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `traffic_light_levels` ADD CONSTRAINT `fk_traffic_light_levels_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `traffic_light_levels` ADD CONSTRAINT `fk_traffic_light_levels_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `data_sources` ADD CONSTRAINT `fk_data_sources_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `data_sources` ADD CONSTRAINT `fk_data_sources_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_definitions` ADD CONSTRAINT `fk_kpi_definitions_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_definitions` ADD CONSTRAINT `fk_kpi_definitions_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `employee_assignments` ADD CONSTRAINT `fk_employee_assignments_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `employee_assignments` ADD CONSTRAINT `fk_employee_assignments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `employee_assignments` ADD CONSTRAINT `fk_employee_assignments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `users` ADD CONSTRAINT `fk_users_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- ALTER TABLE `kpi_categories` ADD CONSTRAINT `fk_kpi_categories_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_categories` ADD CONSTRAINT `fk_kpi_categories_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `measurement_units` ADD CONSTRAINT `fk_measurement_units_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `measurement_units` ADD CONSTRAINT `fk_measurement_units_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `input_frequencies` ADD CONSTRAINT `fk_input_frequencies_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `input_frequencies` ADD CONSTRAINT `fk_input_frequencies_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_measurement_unit` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_frequency` FOREIGN KEY (`input_frequency_id`) REFERENCES `input_frequencies` (`input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_primary_source` FOREIGN KEY (`primary_data_source_id`) REFERENCES `data_sources` (`data_source_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_status` FOREIGN KEY (`kpi_configuration_status_id`) REFERENCES `kpi_configuration_statuses` (`kpi_configuration_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configuration_thresholds` ADD CONSTRAINT `fk_kpi_thresholds_configuration` FOREIGN KEY (`kpi_configuration_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configuration_thresholds` ADD CONSTRAINT `fk_kpi_thresholds_traffic_light` FOREIGN KEY (`traffic_light_level_id`) REFERENCES `traffic_light_levels` (`traffic_light_level_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- ALTER TABLE `kpi_configuration_statuses` ADD CONSTRAINT `fk_kpi_configuration_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configuration_statuses` ADD CONSTRAINT `fk_kpi_configuration_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configurations` ADD CONSTRAINT `fk_kpi_configurations_evaluation_type` FOREIGN KEY (`evaluation_type_id`) REFERENCES `evaluation_types` (`evaluation_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_pools` ADD CONSTRAINT `fk_kpi_pools_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_pools` ADD CONSTRAINT `fk_kpi_pools_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `companies` ADD CONSTRAINT `fk_companies_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `companies` ADD CONSTRAINT `fk_companies_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `employees` ADD CONSTRAINT `fk_employees_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `employee_assignments` ADD CONSTRAINT `fk_employee_assignments_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `employee_assignments` ADD CONSTRAINT `fk_employee_assignments_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configuration_thresholds` ADD CONSTRAINT `fk_kpi_thresholds_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `kpi_configuration_thresholds` ADD CONSTRAINT `fk_kpi_thresholds_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `evaluation_types` ADD CONSTRAINT `fk_evaluation_types_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

-- ALTER TABLE `evaluation_types` ADD CONSTRAINT `fk_evaluation_types_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`role_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`permission_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `user_access_scopes` ADD CONSTRAINT `fk_user_access_scopes_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `user_access_scopes` ADD CONSTRAINT `fk_user_access_scopes_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `user_access_scopes` ADD CONSTRAINT `fk_user_access_scopes_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `users` ADD CONSTRAINT `fk_users_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `users` ADD CONSTRAINT `fk_users_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `roles` ADD CONSTRAINT `fk_roles_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `roles` ADD CONSTRAINT `fk_roles_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `permissions` ADD CONSTRAINT `fk_permissions_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `permissions` ADD CONSTRAINT `fk_permissions_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `user_roles` ADD CONSTRAINT `fk_user_roles_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `role_permissions` ADD CONSTRAINT `fk_role_permissions_assigned_by` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `user_access_scopes` ADD CONSTRAINT `fk_user_access_scopes_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_pool_frequency` FOREIGN KEY (`kpi_pool_id`, `input_frequency_id`) REFERENCES `kpi_pools` (`kpi_pool_id`, `input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_status` FOREIGN KEY (`monitoring_period_status_id`) REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_input_method` FOREIGN KEY (`monitoring_input_method_id`) REFERENCES `monitoring_input_methods` (`monitoring_input_method_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_previous` FOREIGN KEY (`previous_monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecards` ADD CONSTRAINT `fk_period_scorecards_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecards` ADD CONSTRAINT `fk_period_scorecards_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_period_inputs_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_period_inputs_pool_kpi` FOREIGN KEY (`kpi_pool_kpi_id`) REFERENCES `kpi_pool_kpis` (`kpi_pool_kpi_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_period_inputs_measurement_unit` FOREIGN KEY (`measurement_unit_id`) REFERENCES `measurement_units` (`measurement_unit_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_period_inputs_evaluation_type` FOREIGN KEY (`evaluation_type_id`) REFERENCES `evaluation_types` (`evaluation_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_inputs` ADD CONSTRAINT `fk_period_inputs_data_source` FOREIGN KEY (`primary_data_source_id`) REFERENCES `data_sources` (`data_source_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_input_consumers` ADD CONSTRAINT `fk_period_input_consumers_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_input_consumers` ADD CONSTRAINT `fk_period_input_consumers_scorecard` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_input_consumers` ADD CONSTRAINT `fk_period_input_consumers_scorecard_kpi` FOREIGN KEY (`scorecard_kpi_id`) REFERENCES `scorecard_kpis` (`scorecard_kpi_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_input_thresholds` ADD CONSTRAINT `fk_period_input_thresholds_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_input_thresholds` ADD CONSTRAINT `fk_period_input_thresholds_level` FOREIGN KEY (`traffic_light_level_id`) REFERENCES `traffic_light_levels` (`traffic_light_level_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_links` ADD CONSTRAINT `fk_period_scorecard_links_period_scorecard` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_links` ADD CONSTRAINT `fk_period_scorecard_links_original_link` FOREIGN KEY (`scorecard_linked_scorecard_id`) REFERENCES `scorecard_linked_scorecards` (`scorecard_linked_scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_links` ADD CONSTRAINT `fk_period_scorecard_links_linked_scorecard` FOREIGN KEY (`linked_scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_templates` ADD CONSTRAINT `fk_monitoring_templates_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_period_method` FOREIGN KEY (`monitoring_period_id`, `monitoring_input_method_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`, `monitoring_input_method_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_template` FOREIGN KEY (`monitoring_period_template_id`) REFERENCES `monitoring_period_templates` (`monitoring_period_template_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_status` FOREIGN KEY (`result_entry_batch_status_id`) REFERENCES `result_entry_batch_statuses` (`result_entry_batch_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_result_entry_rows_batch` FOREIGN KEY (`result_entry_batch_id`) REFERENCES `result_entry_batches` (`result_entry_batch_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_result_entry_rows_period_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `result_entry_batch_rows` ADD CONSTRAINT `fk_result_entry_rows_status` FOREIGN KEY (`result_entry_row_status_id`) REFERENCES `result_entry_row_statuses` (`result_entry_row_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_period_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_latest_batch_row` FOREIGN KEY (`latest_result_entry_batch_row_id`) REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_traffic_light` FOREIGN KEY (`traffic_light_level_id`) REFERENCES `traffic_light_levels` (`traffic_light_level_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_status` FOREIGN KEY (`kpi_result_status_id`) REFERENCES `kpi_result_statuses` (`kpi_result_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_kpi_result_revisions_result` FOREIGN KEY (`kpi_result_id`) REFERENCES `kpi_results` (`kpi_result_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_kpi_result_revisions_batch_row` FOREIGN KEY (`result_entry_batch_row_id`) REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_kpi_result_revisions_traffic_light` FOREIGN KEY (`traffic_light_level_id`) REFERENCES `traffic_light_levels` (`traffic_light_level_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_kpi_result_revisions_status` FOREIGN KEY (`kpi_result_status_id`) REFERENCES `kpi_result_statuses` (`kpi_result_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `validation_runs` ADD CONSTRAINT `fk_validation_runs_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `validation_runs` ADD CONSTRAINT `fk_validation_runs_trigger_batch` FOREIGN KEY (`trigger_result_entry_batch_id`) REFERENCES `result_entry_batches` (`result_entry_batch_id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `validation_runs` ADD CONSTRAINT `fk_validation_runs_status` FOREIGN KEY (`validation_status_id`) REFERENCES `validation_statuses` (`validation_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_run` FOREIGN KEY (`validation_run_id`) REFERENCES `validation_runs` (`validation_run_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_severity` FOREIGN KEY (`validation_issue_severity_id`) REFERENCES `validation_issue_severities` (`validation_issue_severity_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_period_input` FOREIGN KEY (`monitoring_period_input_id`) REFERENCES `monitoring_period_inputs` (`monitoring_period_input_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_batch_row` FOREIGN KEY (`result_entry_batch_row_id`) REFERENCES `result_entry_batch_rows` (`result_entry_batch_row_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_kpi_result` FOREIGN KEY (`kpi_result_id`) REFERENCES `kpi_results` (`kpi_result_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_status_history` ADD CONSTRAINT `fk_period_status_history_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_status_history` ADD CONSTRAINT `fk_period_status_history_from` FOREIGN KEY (`from_monitoring_period_status_id`) REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_status_history` ADD CONSTRAINT `fk_period_status_history_to` FOREIGN KEY (`to_monitoring_period_status_id`) REFERENCES `monitoring_period_statuses` (`monitoring_period_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_closures` ADD CONSTRAINT `fk_period_closures_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_closures` ADD CONSTRAINT `fk_period_closures_type` FOREIGN KEY (`period_closure_type_id`) REFERENCES `period_closure_types` (`period_closure_type_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_closures` ADD CONSTRAINT `fk_period_closures_validation_run` FOREIGN KEY (`validation_run_id`) REFERENCES `validation_runs` (`validation_run_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_period` FOREIGN KEY (`monitoring_period_id`) REFERENCES `monitoring_periods` (`monitoring_period_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_closure` FOREIGN KEY (`period_closure_id`) REFERENCES `period_closures` (`period_closure_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_status` FOREIGN KEY (`period_reopening_status_id`) REFERENCES `period_reopening_statuses` (`period_reopening_status_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_results` ADD CONSTRAINT `fk_scorecard_results_closure` FOREIGN KEY (`period_closure_id`) REFERENCES `period_closures` (`period_closure_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_results` ADD CONSTRAINT `fk_scorecard_results_period_scorecard` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_results` ADD CONSTRAINT `fk_scorecard_results_scorecard` FOREIGN KEY (`scorecard_id`) REFERENCES `scorecards` (`scorecard_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpi_result_items` ADD CONSTRAINT `fk_scorecard_kpi_items_result` FOREIGN KEY (`scorecard_result_id`) REFERENCES `scorecard_results` (`scorecard_result_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpi_result_items` ADD CONSTRAINT `fk_scorecard_kpi_items_consumer` FOREIGN KEY (`monitoring_period_input_consumer_id`) REFERENCES `monitoring_period_input_consumers` (`monitoring_period_input_consumer_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_kpi_result_items` ADD CONSTRAINT `fk_scorecard_kpi_items_kpi_result` FOREIGN KEY (`kpi_result_id`) REFERENCES `kpi_results` (`kpi_result_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_link_result_items` ADD CONSTRAINT `fk_scorecard_link_items_result` FOREIGN KEY (`scorecard_result_id`) REFERENCES `scorecard_results` (`scorecard_result_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `scorecard_link_result_items` ADD CONSTRAINT `fk_scorecard_link_items_period_link` FOREIGN KEY (`monitoring_period_scorecard_link_id`) REFERENCES `monitoring_period_scorecard_links` (`monitoring_period_scorecard_link_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `scorecard_link_result_items` ADD CONSTRAINT `fk_scorecard_link_items_linked_result` FOREIGN KEY (`linked_scorecard_result_id`) REFERENCES `scorecard_results` (`scorecard_result_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_statuses` ADD CONSTRAINT `fk_monitoring_period_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_period_statuses` ADD CONSTRAINT `fk_monitoring_period_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_input_methods` ADD CONSTRAINT `fk_monitoring_input_methods_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_input_methods` ADD CONSTRAINT `fk_monitoring_input_methods_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_batch_statuses` ADD CONSTRAINT `fk_batch_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_batch_statuses` ADD CONSTRAINT `fk_batch_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_row_statuses` ADD CONSTRAINT `fk_row_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_row_statuses` ADD CONSTRAINT `fk_row_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_result_statuses` ADD CONSTRAINT `fk_kpi_result_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_result_statuses` ADD CONSTRAINT `fk_kpi_result_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_statuses` ADD CONSTRAINT `fk_validation_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_statuses` ADD CONSTRAINT `fk_validation_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_issue_severities` ADD CONSTRAINT `fk_validation_severities_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_issue_severities` ADD CONSTRAINT `fk_validation_severities_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_closure_types` ADD CONSTRAINT `fk_closure_types_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_closure_types` ADD CONSTRAINT `fk_closure_types_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_reopening_statuses` ADD CONSTRAINT `fk_reopening_statuses_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_reopening_statuses` ADD CONSTRAINT `fk_reopening_statuses_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_periods` ADD CONSTRAINT `fk_monitoring_periods_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_period_templates` ADD CONSTRAINT `fk_monitoring_templates_generated_by` FOREIGN KEY (`generated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_submitted_by` FOREIGN KEY (`submitted_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_created_by` FOREIGN KEY (`created_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `result_entry_batches` ADD CONSTRAINT `fk_result_entry_batches_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_entered_by` FOREIGN KEY (`entered_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_results` ADD CONSTRAINT `fk_kpi_results_updated_by` FOREIGN KEY (`updated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `kpi_result_revisions` ADD CONSTRAINT `fk_kpi_result_revisions_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_runs` ADD CONSTRAINT `fk_validation_runs_executed_by` FOREIGN KEY (`executed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `validation_issues` ADD CONSTRAINT `fk_validation_issues_resolved_by` FOREIGN KEY (`resolved_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_period_status_history` ADD CONSTRAINT `fk_period_status_history_changed_by` FOREIGN KEY (`changed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_closures` ADD CONSTRAINT `fk_period_closures_closed_by` FOREIGN KEY (`closed_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_requested_by` FOREIGN KEY (`requested_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE RESTRICT;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_decided_by` FOREIGN KEY (`decided_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `period_reopenings` ADD CONSTRAINT `fk_period_reopenings_reopened_by` FOREIGN KEY (`reopened_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `scorecard_results` ADD CONSTRAINT `fk_scorecard_results_calculated_by` FOREIGN KEY (`calculated_by_user_id`) REFERENCES `users` (`user_id`) ON DELETE SET NULL;

ALTER TABLE `monitoring_period_scorecard_departments` ADD CONSTRAINT `fk_period_sc_departments_period_scorecard` FOREIGN KEY (`monitoring_period_scorecard_id`) REFERENCES `monitoring_period_scorecards` (`monitoring_period_scorecard_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_departments` ADD CONSTRAINT `fk_period_sc_departments_original_assignment` FOREIGN KEY (`scorecard_department_id`) REFERENCES `scorecard_departments` (`scorecard_department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_departments` ADD CONSTRAINT `fk_period_sc_departments_department` FOREIGN KEY (`department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_employees` ADD CONSTRAINT `fk_period_sc_employees_period_department` FOREIGN KEY (`monitoring_period_scorecard_department_id`) REFERENCES `monitoring_period_scorecard_departments` (`monitoring_period_scorecard_department_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_employees` ADD CONSTRAINT `fk_period_sc_employees_original_assignment` FOREIGN KEY (`scorecard_employee_id`) REFERENCES `scorecard_employees` (`scorecard_employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `monitoring_period_scorecard_employees` ADD CONSTRAINT `fk_period_sc_employees_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`employee_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
