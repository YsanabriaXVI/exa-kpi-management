CREATE TABLE `companies` (
  `company_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(30) UNIQUE NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamp,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_companies_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_companies_name_not_blank` CHECK (length(trim(name)) > 0)
);

CREATE TABLE `departments` (
  `department_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `parent_department_id` bigint COMMENT 'Self-reference used for areas, divisions or subdepartments',
  `code` varchar(30) NOT NULL,
  `name` varchar(150) NOT NULL,
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamp,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_departments_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_departments_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_departments_not_self_parent` CHECK (parent_department_id IS NULL OR parent_department_id <> department_id)
);

CREATE TABLE `kpi_pools` (
  `kpi_pool_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `pool_code` varchar(40) UNIQUE NOT NULL,
  `pool_name` varchar(200) NOT NULL,
  `description` text,
  `input_frequency_id` bigint NOT NULL,
  `valid_from` date NOT NULL,
  `valid_to` date NOT NULL,
  `status_code` varchar(30) NOT NULL DEFAULT 'NOT_CONFIGURED',
  `notes` text,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_kpi_pools_code_not_blank` CHECK (length(trim(pool_code)) > 0),
  CONSTRAINT `chk_kpi_pools_name_not_blank` CHECK (length(trim(pool_name)) > 0),
  CONSTRAINT `chk_kpi_pools_validity` CHECK (valid_to >= valid_from),
  CONSTRAINT `chk_kpi_pools_status` CHECK (status_code IN ('NOT_CONFIGURED', 'CONFIGURED', 'INACTIVE'))
);

CREATE TABLE `kpi_pool_companies` (
  `kpi_pool_company_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `kpi_pool_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint
);

CREATE TABLE `kpi_pool_kpis` (
  `kpi_pool_kpi_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `kpi_pool_id` bigint NOT NULL,
  `kpi_definition_id` bigint NOT NULL,
  `kpi_configuration_id` bigint NOT NULL,
  `display_order` integer NOT NULL DEFAULT 1,
  `is_required` boolean NOT NULL DEFAULT true,
  `created_at` timestamptz NOT NULL DEFAULT (now()),
  `created_by_user_id` bigint,
  `updated_at` timestamptz,
  `updated_by_user_id` bigint,
  CONSTRAINT `chk_kpi_pool_kpis_display_order` CHECK (display_order > 0),
  CONSTRAINT `uq_kpi_pool_definition` UNIQUE (`kpi_pool_id`, `kpi_definition_id`),
  CONSTRAINT `uq_kpi_pool_configuration` UNIQUE (`kpi_pool_id`, `kpi_configuration_id`)
);

CREATE TABLE `kpi_pool_availability_statuses` (
  `kpi_pool_availability_status_id` bigint PRIMARY KEY AUTO_INCREMENT,
  `code` varchar(40) UNIQUE NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `display_order` smallint NOT NULL DEFAULT 1,
  CONSTRAINT `chk_kpi_pool_availability_statuses_code_not_blank` CHECK (length(trim(code)) > 0),
  CONSTRAINT `chk_kpi_pool_availability_statuses_name_not_blank` CHECK (length(trim(name)) > 0),
  CONSTRAINT `chk_kpi_pool_availability_statuses_display_order` CHECK (display_order > 0)
);

CREATE TABLE `kpi_pool_configuration_availability` (
  `kpi_pool_id` bigint NOT NULL,
  `kpi_definition_id` bigint NOT NULL,
  `kpi_configuration_id` bigint NOT NULL,
  `kpi_pool_availability_status_id` bigint NOT NULL,
  `availability_reason_code` varchar(60)
);


ALTER TABLE `kpi_pools` COMMENT = 'Stores the main KPI Pool information.

A Pool:
- Has a validity period.
- Applies to one or more companies.
- Contains selected KPI Configurations.
- May be used by ScoreCards and Monitoring Results.

It does not use explicit versions.
';

ALTER TABLE `kpi_pool_companies` COMMENT = 'Associates companies with a KPI Pool.

Example:

POOL-001
  - EXA
  - CONMOXA

is_primary may be removed if the business does not need
to identify a primary company.
';

ALTER TABLE `kpi_pool_kpis` COMMENT = 'Stores only KPI Configurations already added to the Pool.

The unique index on:

kpi_pool_id + kpi_definition_id

prevents adding two configurations that originate from
the same KPI Definition.

Example not allowed:

POOL-001
  KPC-050-01
  KPC-050-02

Both originate from KPI-050.
';

ALTER TABLE `kpi_pool_availability_statuses` COMMENT = 'Suggested values:

AVAILABLE_TO_ADD
ALREADY_IN_POOL
NOT_AVAILABLE

These values describe a KPI Configuration relative
to a specific KPI Pool.
';

ALTER TABLE `kpi_pool_configuration_availability` COMMENT = 'LOGICAL DATABASE VIEW — not a transactional table.

This view calculates whether a KPI Configuration is:

AVAILABLE_TO_ADD
ALREADY_IN_POOL
NOT_AVAILABLE

availability_reason_code examples:

NOT_CONFIGURED
KPI_DEFINITION_ALREADY_IN_POOL
FREQUENCY_MISMATCH
POOL_NOT_CONFIGURED
POOL_INACTIVE
POOL_OUTSIDE_VALIDITY

Do not store checkbox selection here.
SELECTED / NOT_SELECTED belongs only to the frontend.
';


CREATE INDEX `ix_kpi_pools_input_frequency` ON `kpi_pools` (`input_frequency_id`);

CREATE INDEX `ix_kpi_pools_status` ON `kpi_pools` (`status_code`);

CREATE INDEX `ix_kpi_pools_validity` ON `kpi_pools` (`valid_from`, `valid_to`);

CREATE UNIQUE INDEX `uq_kpi_pool_frequency_pair` ON `kpi_pools` (`kpi_pool_id`, `input_frequency_id`);

CREATE UNIQUE INDEX `uq_kpi_pool_company` ON `kpi_pool_companies` (`kpi_pool_id`, `company_id`);

CREATE INDEX `ix_kpi_pool_companies_company` ON `kpi_pool_companies` (`company_id`);

CREATE UNIQUE INDEX `uq_kpi_pool_configuration` ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_configuration_id`);

CREATE UNIQUE INDEX `uq_kpi_pool_definition` ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_definition_id`);

CREATE UNIQUE INDEX `uq_kpi_pool_display_order` ON `kpi_pool_kpis` (`kpi_pool_id`, `display_order`);

CREATE INDEX `ix_kpi_pool_kpis_configuration` ON `kpi_pool_kpis` (`kpi_configuration_id`);

CREATE INDEX `ix_kpi_pool_kpis_definition` ON `kpi_pool_kpis` (`kpi_definition_id`);

CREATE UNIQUE INDEX `uq_pool_configuration_availability` ON `kpi_pool_configuration_availability` (`kpi_pool_id`, `kpi_configuration_id`);

CREATE INDEX `ix_pool_configuration_availability_status` ON `kpi_pool_configuration_availability` (`kpi_pool_availability_status_id`);


ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `departments` ADD CONSTRAINT `fk_departments_parent` FOREIGN KEY (`parent_department_id`) REFERENCES `departments` (`department_id`) ON DELETE RESTRICT ON UPDATE CASCADE;



ALTER TABLE `kpi_pools` ADD CONSTRAINT `fk_kpi_pools_frequency` FOREIGN KEY (`input_frequency_id`) REFERENCES `input_frequencies` (`input_frequency_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_companies` ADD CONSTRAINT `fk_kpi_pool_companies_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`company_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_kpis` ADD CONSTRAINT `fk_kpi_pool_kpis_configuration_definition` FOREIGN KEY (`kpi_configuration_id`, `kpi_definition_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`, `kpi_definition_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_pool` FOREIGN KEY (`kpi_pool_id`) REFERENCES `kpi_pools` (`kpi_pool_id`) ON DELETE CASCADE;

ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_definition` FOREIGN KEY (`kpi_definition_id`) REFERENCES `kpi_definitions` (`kpi_definition_id`) ON DELETE RESTRICT;

ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_configuration` FOREIGN KEY (`kpi_configuration_id`) REFERENCES `kpi_configurations` (`kpi_configuration_id`) ON DELETE RESTRICT;

ALTER TABLE `kpi_pool_configuration_availability` ADD CONSTRAINT `fk_pool_availability_status` FOREIGN KEY (`kpi_pool_availability_status_id`) REFERENCES `kpi_pool_availability_statuses` (`kpi_pool_availability_status_id`) ON DELETE RESTRICT;

ALTER TABLE `kpi_definitions` ADD CONSTRAINT `fk_kpi_definitions_category` FOREIGN KEY (`kpi_category_id`) REFERENCES `kpi_categories` (`kpi_category_id`) ON DELETE RESTRICT ON UPDATE CASCADE;