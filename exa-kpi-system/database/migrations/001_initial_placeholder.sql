-- Initial placeholder migration.
-- Next step: add catalog tables, users/roles, KPI definitions and KPI configs.

CREATE TABLE IF NOT EXISTS demo_items (
  demo_item_id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  description VARCHAR(500) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (demo_item_id)
);
