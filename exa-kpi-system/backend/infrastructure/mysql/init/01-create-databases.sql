CREATE DATABASE IF NOT EXISTS `exa_kpi_management` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `exa_kpi_pool` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `exa_scorecard` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `exa_monitoring` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `exa_reporting` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `exa_access` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON `exa_kpi_management`.* TO 'exa_kpi_management'@'%';

CREATE USER IF NOT EXISTS 'exa_kpi_pool'@'%' IDENTIFIED BY 'exa_pool_dev';
GRANT ALL PRIVILEGES ON `exa_kpi_pool`.* TO 'exa_kpi_pool'@'%';
FLUSH PRIVILEGES;
