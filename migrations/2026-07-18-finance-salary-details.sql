-- Parâmetros da calculadora CLT. Idempotente e sem alterar linhas existentes.
SET @has_salary_details := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'salary_details'
);
SET @add_salary_details := IF(
  @has_salary_details = 0,
  'ALTER TABLE transactions ADD COLUMN salary_details LONGTEXT NULL AFTER end_date',
  'SELECT 1'
);
PREPARE salary_details_stmt FROM @add_salary_details;
EXECUTE salary_details_stmt;
DEALLOCATE PREPARE salary_details_stmt;
