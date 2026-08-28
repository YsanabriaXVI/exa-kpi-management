INSERT INTO `input_frequencies` (`code`, `name`, `description`, `months_per_period`, `periods_per_year`, `is_active`)
VALUES
  ('MONTHLY', 'Mensual', 'One Input Period per month', 1, 12, TRUE),
  ('QUARTERLY', 'Trimestral', 'One Input Period every three months', 3, 4, TRUE),
  ('FOUR_MONTHLY', 'Cuatrimestral', 'One Input Period every four months', 4, 3, TRUE),
  ('SEMIANNUAL', 'Semestral', 'One Input Period every six months', 6, 2, TRUE),
  ('ANNUAL', 'Anual', 'One Input Period every twelve months', 12, 1, TRUE)
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `months_per_period` = VALUES(`months_per_period`),
  `periods_per_year` = VALUES(`periods_per_year`),
  `is_active` = TRUE;
