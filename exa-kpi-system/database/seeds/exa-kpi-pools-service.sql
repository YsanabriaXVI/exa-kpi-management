-- ============================================================
-- EXA KPI POOL SERVICE
-- MySQL 8.4
-- ============================================================

-- Recomendado:
-- DATABASE: exa_kpi_pool
-- ENGINE: InnoDB
-- CHARSET: utf8mb4
-- COLLATION: utf8mb4_0900_ai_ci


-- ============================================================
-- 1. COMPANIES
-- ============================================================

CREATE TABLE `companies` (
    `company_id` BIGINT NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,
    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_companies`
        PRIMARY KEY (`company_id`),

    CONSTRAINT `uq_companies_code`
        UNIQUE (`code`),

    CONSTRAINT `chk_companies_code_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

    CONSTRAINT `chk_companies_name_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

    CONSTRAINT `chk_companies_display_order`
        CHECK (`display_order` > 0)

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Company catalog used to define the organizational scope of KPI Pools';


CREATE INDEX `ix_companies_active_order`
    ON `companies` (`is_active`, `display_order`);


-- ============================================================
-- 2. DEPARTMENTS
-- ============================================================

CREATE TABLE `departments` (
    `department_id` BIGINT NOT NULL AUTO_INCREMENT,
    `company_id` BIGINT NOT NULL,

    `parent_department_id` BIGINT NULL
        COMMENT 'Self-reference for areas, divisions or subdepartments',

    `code` VARCHAR(30) NOT NULL,
    `name` VARCHAR(150) NOT NULL,

    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,
    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_departments`
        PRIMARY KEY (`department_id`),

    CONSTRAINT `uq_departments_company_code`
        UNIQUE (`company_id`, `code`),

    CONSTRAINT `chk_departments_code_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

    CONSTRAINT `chk_departments_name_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

    CONSTRAINT `chk_departments_not_self_parent`
        CHECK (
            `parent_department_id` IS NULL
            OR `parent_department_id` <> `department_id`
        ),

    CONSTRAINT `fk_departments_company`
        FOREIGN KEY (`company_id`)
        REFERENCES `companies` (`company_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

    CONSTRAINT `fk_departments_parent`
        FOREIGN KEY (`parent_department_id`)
        REFERENCES `departments` (`department_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;


CREATE INDEX `ix_departments_company`
    ON `departments` (`company_id`);

CREATE INDEX `ix_departments_parent`
    ON `departments` (`parent_department_id`);

CREATE INDEX `ix_departments_active`
    ON `departments` (`is_active`);


-- ============================================================
-- 3. POOL AREAS
--
-- Examples:
-- OPS = Operations
-- SEG = Security
-- FIN = Finance
--
-- Do NOT hardcode official rows until approved.
-- ============================================================

CREATE TABLE `pool_areas` (
    `pool_area_id` BIGINT NOT NULL AUTO_INCREMENT,

    `code` VARCHAR(20) NOT NULL,
    `name` VARCHAR(120) NOT NULL,

    `description` TEXT NULL,

    `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,
    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_pool_areas`
        PRIMARY KEY (`pool_area_id`),

    CONSTRAINT `uq_pool_areas_code`
        UNIQUE (`code`),

    CONSTRAINT `chk_pool_areas_code_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

    CONSTRAINT `chk_pool_areas_name_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

    CONSTRAINT `chk_pool_areas_display_order`
        CHECK (`display_order` > 0)

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Business areas that can be associated with a KPI Pool';


CREATE INDEX `ix_pool_areas_active_order`
    ON `pool_areas` (`is_active`, `display_order`);


-- ============================================================
-- 4. KPI POOLS
-- ============================================================

CREATE TABLE `kpi_pools` (
    `kpi_pool_id` BIGINT NOT NULL AUTO_INCREMENT,

    /*
     * Human/business identifier.
     *
     * Example:
     * OPS-SEG-FIN-01-2026
     */
    `pool_code` VARCHAR(255) NOT NULL,

    `pool_name` VARCHAR(200) NOT NULL,
    `description` TEXT NULL,

    /*
     * External ID owned by KPI Management Service.
     *
     * NO physical cross-service FK.
     */
    `input_frequency_id` BIGINT NOT NULL,

    `valid_from` DATE NOT NULL,
    `valid_to` DATE NOT NULL,

    /*
     * Year used in the business code.
     *
     * Example: OPS-01-2026 (final component)
     */
    `issue_year` SMALLINT UNSIGNED NOT NULL,

    /*
     * Sequence within:
     *
     * Area Set + Issue Year
     */
    `pool_sequence` INT UNSIGNED NOT NULL,

    /*
     * Canonical normalized scope.
     *
     * Examples:
     *
     * area_scope_key:
     * OPS|SEG|FIN
     *
     * These are internal technical keys.
     * They are NOT shown to users.
     */
    `area_scope_key`
        VARCHAR(300)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    `status_code` VARCHAR(30) NOT NULL DEFAULT 'DRAFT',

    `notes` TEXT NULL,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_kpi_pools`
        PRIMARY KEY (`kpi_pool_id`),

    CONSTRAINT `uq_kpi_pools_code`
        UNIQUE (`pool_code`),

    /*
     * Prevent:
     *
     * OPS-SEG-01-2026
     * OPS-SEG-01-2026
     *
     * for the exact same normalized scope.
     */
    CONSTRAINT `uq_kpi_pools_scope_sequence`
        UNIQUE (
            `area_scope_key`,
            `issue_year`,
            `pool_sequence`
        ),

    CONSTRAINT `chk_kpi_pools_code_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`pool_code`)) > 0),

    CONSTRAINT `chk_kpi_pools_name_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`pool_name`)) > 0),

    CONSTRAINT `chk_kpi_pools_validity`
        CHECK (`valid_to` >= `valid_from`),

    CONSTRAINT `chk_kpi_pools_issue_year`
        CHECK (`issue_year` BETWEEN 2000 AND 9999),

    CONSTRAINT `chk_kpi_pools_sequence`
        CHECK (`pool_sequence` > 0),

    CONSTRAINT `chk_kpi_pools_area_scope_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`area_scope_key`)) > 0),

    CONSTRAINT `chk_kpi_pools_status`
        CHECK (
            `status_code` IN (
                'DRAFT',
                'ACTIVE',
                'INACTIVE',
                'EXPIRED'
            )
        )

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Main KPI Pool entity. Areas and companies are stored through normalized association tables';


CREATE INDEX `ix_kpi_pools_input_frequency`
    ON `kpi_pools` (`input_frequency_id`);

CREATE INDEX `ix_kpi_pools_status`
    ON `kpi_pools` (`status_code`);

CREATE INDEX `ix_kpi_pools_validity`
    ON `kpi_pools` (`valid_from`, `valid_to`);

CREATE INDEX `ix_kpi_pools_issue_year`
    ON `kpi_pools` (`issue_year`);


-- ============================================================
-- 5. POOL CODE SEQUENCES
--
-- Used by the backend to safely obtain:
--
-- 01
-- 02
-- 03
--
-- for the same:
--
-- area set + year
-- ============================================================

CREATE TABLE `kpi_pool_code_sequences` (
    `area_scope_key`
        VARCHAR(300)
        CHARACTER SET ascii
        COLLATE ascii_bin
        NOT NULL,

    `issue_year` SMALLINT UNSIGNED NOT NULL,

    `last_sequence` INT UNSIGNED NOT NULL DEFAULT 0,

    `updated_at`
        DATETIME(3)
        NOT NULL
        DEFAULT CURRENT_TIMESTAMP(3)
        ON UPDATE CURRENT_TIMESTAMP(3),

    CONSTRAINT `pk_kpi_pool_code_sequences`
        PRIMARY KEY (
            `area_scope_key`,
            `issue_year`
        ),

    CONSTRAINT `chk_kpi_pool_code_sequences_year`
        CHECK (`issue_year` BETWEEN 2000 AND 9999)

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Concurrency-safe sequence state used when generating business Pool codes';


-- ============================================================
-- 6. KPI POOL <-> COMPANIES
-- ============================================================

CREATE TABLE `kpi_pool_companies` (
    `kpi_pool_company_id` BIGINT NOT NULL AUTO_INCREMENT,

    `kpi_pool_id` BIGINT NOT NULL,
    `company_id` BIGINT NOT NULL,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_kpi_pool_companies`
        PRIMARY KEY (`kpi_pool_company_id`),

    CONSTRAINT `uq_kpi_pool_company`
        UNIQUE (`kpi_pool_id`, `company_id`),

    CONSTRAINT `fk_kpi_pool_companies_pool`
        FOREIGN KEY (`kpi_pool_id`)
        REFERENCES `kpi_pools` (`kpi_pool_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_kpi_pool_companies_company`
        FOREIGN KEY (`company_id`)
        REFERENCES `companies` (`company_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Companies explicitly included in the organizational scope of a KPI Pool';


CREATE INDEX `ix_kpi_pool_companies_company`
    ON `kpi_pool_companies` (`company_id`);


-- ============================================================
-- 7. KPI POOL <-> POOL AREAS
-- ============================================================

CREATE TABLE `kpi_pool_areas` (
    `kpi_pool_area_id` BIGINT NOT NULL AUTO_INCREMENT,

    `kpi_pool_id` BIGINT NOT NULL,
    `pool_area_id` BIGINT NOT NULL,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_kpi_pool_areas`
        PRIMARY KEY (`kpi_pool_area_id`),

    CONSTRAINT `uq_kpi_pool_area`
        UNIQUE (`kpi_pool_id`, `pool_area_id`),

    CONSTRAINT `fk_kpi_pool_areas_pool`
        FOREIGN KEY (`kpi_pool_id`)
        REFERENCES `kpi_pools` (`kpi_pool_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT `fk_kpi_pool_areas_area`
        FOREIGN KEY (`pool_area_id`)
        REFERENCES `pool_areas` (`pool_area_id`)
        ON DELETE RESTRICT
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Business areas selected for a KPI Pool';


CREATE INDEX `ix_kpi_pool_areas_area`
    ON `kpi_pool_areas` (`pool_area_id`);


-- ============================================================
-- 8. KPI CONFIGURATIONS INCLUDED IN A POOL
-- ============================================================

CREATE TABLE `kpi_pool_kpis` (
    `kpi_pool_kpi_id` BIGINT NOT NULL AUTO_INCREMENT,

    `kpi_pool_id` BIGINT NOT NULL,

    /*
     * External IDs owned by KPI Management Service.
     *
     * NO cross-service physical FK.
     */
    `kpi_definition_id` BIGINT NOT NULL,
    `kpi_configuration_id` BIGINT NOT NULL,

    `display_order` INT UNSIGNED NOT NULL DEFAULT 1,

    `is_required` BOOLEAN NOT NULL DEFAULT TRUE,

    `effective_from` DATE NOT NULL,
    `effective_to` DATE NULL,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_kpi_pool_kpis`
        PRIMARY KEY (`kpi_pool_kpi_id`),

    /* Cross-row overlap is enforced transactionally by Pool Service. */
    CONSTRAINT `chk_kpi_pool_kpis_effective_range`
        CHECK (`effective_to` IS NULL OR `effective_to` >= `effective_from`),

    CONSTRAINT `chk_kpi_pool_kpis_definition_id`
        CHECK (`kpi_definition_id` > 0),

    CONSTRAINT `chk_kpi_pool_kpis_configuration_id`
        CHECK (`kpi_configuration_id` > 0),

    CONSTRAINT `chk_kpi_pool_kpis_display_order`
        CHECK (`display_order` > 0),

    CONSTRAINT `fk_kpi_pool_kpis_pool`
        FOREIGN KEY (`kpi_pool_id`)
        REFERENCES `kpi_pools` (`kpi_pool_id`)
        ON DELETE CASCADE
        ON UPDATE CASCADE

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='KPI Configurations explicitly selected for a Pool';


CREATE INDEX `ix_kpi_pool_kpis_configuration_effective`
    ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_configuration_id`, `effective_from`, `effective_to`);

CREATE INDEX `ix_kpi_pool_kpis_definition_effective`
    ON `kpi_pool_kpis` (`kpi_pool_id`, `kpi_definition_id`, `effective_from`, `effective_to`);

CREATE INDEX `ix_kpi_pool_kpis_effective`
    ON `kpi_pool_kpis` (`kpi_pool_id`, `effective_from`, `effective_to`);


-- ============================================================
-- 9. AVAILABILITY STATUS CATALOG
-- ============================================================

CREATE TABLE `kpi_pool_availability_statuses` (
    `kpi_pool_availability_status_id` BIGINT NOT NULL AUTO_INCREMENT,

    `code` VARCHAR(40) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    `display_order` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `is_active` BOOLEAN NOT NULL DEFAULT TRUE,

    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `created_by_user_id` BIGINT NULL,

    `updated_at` DATETIME(3) NULL,
    `updated_by_user_id` BIGINT NULL,

    CONSTRAINT `pk_kpi_pool_availability_statuses`
        PRIMARY KEY (`kpi_pool_availability_status_id`),

    CONSTRAINT `uq_kpi_pool_availability_statuses_code`
        UNIQUE (`code`),

    CONSTRAINT `chk_kpi_pool_availability_statuses_code_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`code`)) > 0),

    CONSTRAINT `chk_kpi_pool_availability_statuses_name_not_blank`
        CHECK (CHAR_LENGTH(TRIM(`name`)) > 0),

    CONSTRAINT `chk_kpi_pool_availability_statuses_display_order`
        CHECK (`display_order` > 0)

) ENGINE=InnoDB
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci
  COMMENT='Catalog of availability states used by Manage KPIs responses';
