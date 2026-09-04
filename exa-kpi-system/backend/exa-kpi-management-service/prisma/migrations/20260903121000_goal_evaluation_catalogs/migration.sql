INSERT INTO `evaluation_types` (`code`, `name`, `description`, `display_order`, `created_at`)
VALUES
  ('ZERO_IS_BETTER', 'Zero is best', 'The preferred result is zero', 3, CURRENT_TIMESTAMP(3)),
  ('EQUAL_IS_BETTER', 'Exact value is best', 'The preferred result equals the configured target', 4, CURRENT_TIMESTAMP(3)),
  ('RANGE', 'Inside range is best', 'The preferred result is inside the configured range', 5, CURRENT_TIMESTAMP(3))
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `description` = VALUES(`description`), `display_order` = VALUES(`display_order`);
